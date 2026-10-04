CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  summary text NOT NULL,
  event_count integer NOT NULL DEFAULT 1 CHECK (event_count > 0),
  details jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(details) = 'array'),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_action_last_event_idx
  ON public.audit_logs (actor_id, action_type, last_event_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_last_event_idx
  ON public.audit_logs (last_event_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.audit_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    auth.jwt() -> 'user_metadata' ->> 'role'
  ) = 'admin';
$$;

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT
  USING (public.audit_is_admin());

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text,
  p_action_type text,
  p_target jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_name text;
  v_now timestamptz := clock_timestamp();
  v_detail jsonb;
  v_existing public.audit_logs%ROWTYPE;
  v_event_count integer;
  v_summary text;
  v_record_id uuid;
  v_target_name text;
BEGIN
  IF v_actor_id IS NULL OR p_actor_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Audit actor must match the authenticated user';
  END IF;

  SELECT
    COALESCE(p.role, auth.jwt() -> 'user_metadata' ->> 'role', ''),
    COALESCE(
      NULLIF(p.full_name, ''),
      NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
      NULLIF(auth.jwt() ->> 'email', ''),
      NULLIF(p_actor_name, ''),
      'User'
    )
  INTO v_actor_role, v_actor_name
  FROM (SELECT 1) AS seed
  LEFT JOIN public.profiles p ON p.id = v_actor_id;

  IF v_actor_role = '' OR lower(v_actor_role) <> lower(COALESCE(p_actor_role, '')) THEN
    RAISE EXCEPTION 'Audit actor role does not match the authenticated user';
  END IF;

  IF COALESCE(p_action_type, '') = '' THEN
    RAISE EXCEPTION 'Audit action type is required';
  END IF;

  v_detail := CASE
    WHEN jsonb_typeof(COALESCE(p_target, '{}'::jsonb)) = 'object'
      THEN COALESCE(p_target, '{}'::jsonb) || jsonb_build_object('timestamp', v_now)
    ELSE jsonb_build_object('value', p_target, 'timestamp', v_now)
  END;
  v_target_name := COALESCE(
    NULLIF(v_detail ->> 'student_name', ''),
    NULLIF(v_detail ->> 'user_name', ''),
    NULLIF(v_detail ->> 'name', ''),
    NULLIF(v_detail ->> 'key', ''),
    NULLIF(v_detail ->> 'target_name', '')
  );

  IF p_action_type IN ('student_scan', 'manual_attendance') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::text || ':' || p_action_type, 0));

    SELECT *
    INTO v_existing
    FROM public.audit_logs
    WHERE actor_id = v_actor_id
      AND action_type = p_action_type
      AND last_event_at >= v_now - interval '60 minutes'
    ORDER BY last_event_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    v_event_count := v_existing.event_count + 1;
    v_summary := CASE
      WHEN p_action_type = 'student_scan' THEN
        format('%s student%s scanned', v_event_count, CASE WHEN v_event_count = 1 THEN '' ELSE 's' END)
      ELSE
        format('%s manual attendance entr%s recorded', v_event_count, CASE WHEN v_event_count = 1 THEN 'y' ELSE 'ies' END)
    END;

    UPDATE public.audit_logs
    SET event_count = v_event_count,
        details = COALESCE(details, '[]'::jsonb) || jsonb_build_array(v_detail),
        summary = v_summary,
        last_event_at = v_now
    WHERE id = v_existing.id
    RETURNING id INTO v_record_id;
    RETURN v_record_id;
  END IF;

  v_event_count := 1;
  v_summary := CASE p_action_type
    WHEN 'student_scan' THEN '1 student scanned'
    WHEN 'manual_attendance' THEN '1 manual attendance entry recorded'
    WHEN 'login' THEN 'Signed in'
    WHEN 'logout' THEN 'Signed out'
    WHEN 'guidance_review' THEN format(
      '%s guidance review%s',
      CASE v_detail ->> 'decision'
        WHEN 'approved_for_ml' THEN 'Approved'
        WHEN 'denied_by_guidance' THEN 'Denied'
        ELSE 'Completed'
      END,
      CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END
    )
    WHEN 'student_created' THEN format('Created student%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'student_updated' THEN format('Updated student%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'student_deleted' THEN format('Deleted student%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'user_created' THEN format('Created user%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'user_updated' THEN format('Updated user%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'user_deleted' THEN format('Deleted user%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'role_changed' THEN format('Changed user role%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'settings_changed' THEN format('Changed settings%s', CASE WHEN v_target_name IS NULL THEN '' ELSE ': ' || v_target_name END)
    WHEN 'parent_excuse_letter' THEN 'Submitted an attendance excuse'
    WHEN 'parent_attendance_note' THEN 'Changed an attendance note'
    WHEN 'parent_behavior_checkin' THEN 'Submitted a behavior check-in'
    WHEN 'event_rsvp' THEN 'Responded to a school event'
    ELSE initcap(replace(p_action_type, '_', ' '))
  END;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action_type, summary, event_count,
    details, started_at, last_event_at
  ) VALUES (
    v_actor_id, v_actor_name, v_actor_role, p_action_type, v_summary, v_event_count,
    jsonb_build_array(v_detail), v_now, v_now
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_audit_logs(
  p_search text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS SETOF public.audit_logs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT logs.*
  FROM public.audit_logs logs
  WHERE (NULLIF(p_search, '') IS NULL OR
    logs.actor_name ILIKE '%' || p_search || '%' OR
    logs.summary ILIKE '%' || p_search || '%' OR
    logs.details::text ILIKE '%' || p_search || '%')
    AND (NULLIF(p_action_type, '') IS NULL OR logs.action_type = p_action_type)
    AND (p_actor_id IS NULL OR logs.actor_id = p_actor_id)
    AND (p_from IS NULL OR logs.last_event_at >= p_from)
    AND (p_to IS NULL OR logs.started_at < p_to)
  ORDER BY logs.last_event_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_audit_logs(text, text, uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_audit_logs(text, text, uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_log_metrics(
  p_today_start timestamptz,
  p_yesterday_start timestamptz
)
RETURNS TABLE(metric_key text, today_count bigint, yesterday_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH events AS (
    SELECT
      logs.actor_id,
      logs.action_type,
      COALESCE(NULLIF(detail.value ->> 'timestamp', '')::timestamptz, logs.started_at) AS occurred_at
    FROM public.audit_logs logs
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(logs.details, '[]'::jsonb)) AS detail(value)
  ), metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE occurred_at >= p_today_start AND action_type <> '') AS all_today,
      COUNT(*) FILTER (WHERE occurred_at >= p_yesterday_start AND occurred_at < p_today_start AND action_type <> '') AS all_yesterday,
      COUNT(DISTINCT actor_id) FILTER (WHERE occurred_at >= p_today_start) AS users_today,
      COUNT(DISTINCT actor_id) FILTER (WHERE occurred_at >= p_yesterday_start AND occurred_at < p_today_start) AS users_yesterday,
      COUNT(*) FILTER (WHERE occurred_at >= p_today_start AND action_type IN ('student_scan', 'manual_attendance')) AS scans_today,
      COUNT(*) FILTER (WHERE occurred_at >= p_yesterday_start AND occurred_at < p_today_start AND action_type IN ('student_scan', 'manual_attendance')) AS scans_yesterday,
      COUNT(*) FILTER (WHERE occurred_at >= p_today_start AND action_type IN ('student_deleted', 'student_updated', 'user_deleted', 'user_updated', 'role_changed', 'settings_changed')) AS critical_today,
      COUNT(*) FILTER (WHERE occurred_at >= p_yesterday_start AND occurred_at < p_today_start AND action_type IN ('student_deleted', 'student_updated', 'user_deleted', 'user_updated', 'role_changed', 'settings_changed')) AS critical_yesterday
    FROM events
  )
  SELECT 'total_actions'::text, all_today, all_yesterday FROM metrics
  UNION ALL SELECT 'active_users', users_today, users_yesterday FROM metrics
  UNION ALL SELECT 'students_scanned', scans_today, scans_yesterday FROM metrics
  UNION ALL SELECT 'critical_changes', critical_today, critical_yesterday FROM metrics;
$$;

REVOKE ALL ON FUNCTION public.audit_log_metrics(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_metrics(timestamptz, timestamptz) TO authenticated;