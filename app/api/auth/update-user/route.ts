import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, email, password, full_name, role } = body;

    if (!id) {
      return Response.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { success: false, error: 'Missing Supabase service credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const updateData: any = {};
    const userMetadata: any = {};

    if (email && email.trim() !== '') {
      updateData.email = email.trim();
      updateData.email_confirm = true;
    }

    if (password && password.trim() !== '') {
      updateData.password = password.trim();
    }

    if (full_name !== undefined) {
      userMetadata.full_name = full_name;
    }

    if (role !== undefined) {
      userMetadata.role = role;
    }

    if (Object.keys(userMetadata).length > 0) {
      updateData.user_metadata = userMetadata;
    }

    // Update user in Supabase Auth Admin API
    const { data: userData, error: authError } = await supabase.auth.admin.updateUserById(
      id,
      updateData
    );

    if (authError) {
      return Response.json({ success: false, error: authError.message }, { status: 500 });
    }

    // Keep the profiles table in sync
    if (full_name !== undefined || role !== undefined) {
      const profileUpdates: any = {};
      if (full_name !== undefined) profileUpdates.full_name = full_name;
      if (role !== undefined) profileUpdates.role = role;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);

      if (profileError) {
        console.warn('Failed to sync profile updates to profiles table:', profileError.message);
      }
    }

    // Keep the parents table in sync
    const actualRole = role || (userData.user?.user_metadata?.role || userData.user?.app_metadata?.role || '').toString().toLowerCase();
    const isParent = actualRole === 'parent';

    if (isParent) {
      const { data: parentRecord } = await supabase
        .from('parents')
        .select('id, parent_email')
        .eq('user_id', id)
        .maybeSingle();

      const newEmail = email ? email.trim() : null;

      if (parentRecord) {
        const oldEmail = parentRecord.parent_email;

        if (newEmail && newEmail !== oldEmail) {
          const { data: duplicateParent } = await supabase
            .from('parents')
            .select('id')
            .eq('parent_email', newEmail)
            .maybeSingle();

          if (!duplicateParent) {
            const { error: insertError } = await supabase.from('parents').insert({
              parent_email: newEmail,
              full_name: full_name !== undefined ? full_name.trim() : (parentRecord as any).full_name || '',
              user_id: null,
            });

            if (!insertError) {
              await supabase
                .from('parent_attendance_notes')
                .update({ parent_email: newEmail })
                .eq('parent_email', oldEmail);

              await supabase
                .from('students')
                .update({ parent_email: newEmail })
                .eq('parent_email', oldEmail);

              await supabase
                .from('parents')
                .update({ user_id: id, full_name: full_name !== undefined ? full_name.trim() : undefined })
                .eq('parent_email', newEmail);

              await supabase
                .from('parents')
                .delete()
                .eq('parent_email', oldEmail);
            } else {
              console.warn('Failed to insert new parent record for cascade:', insertError.message);
            }
          } else {
            await supabase
              .from('parents')
              .update({ user_id: id, full_name: full_name !== undefined ? full_name.trim() : undefined })
              .eq('id', duplicateParent.id);

            await supabase
              .from('parents')
              .update({ user_id: null })
              .eq('id', parentRecord.id);
          }
        } else {
          if (full_name !== undefined) {
            await supabase
              .from('parents')
              .update({ full_name: full_name.trim() })
              .eq('user_id', id);
          }
        }
      } else if (newEmail) {
        const { data: existingParent } = await supabase
          .from('parents')
          .select('id')
          .eq('parent_email', newEmail)
          .maybeSingle();

        if (existingParent) {
          await supabase
            .from('parents')
            .update({ user_id: id, full_name: full_name !== undefined ? full_name.trim() : undefined })
            .eq('id', existingParent.id);
        } else {
          await supabase.from('parents').insert({
            parent_email: newEmail,
            full_name: full_name !== undefined ? full_name.trim() : '',
            user_id: id,
          });
        }
      }
    }

    return Response.json({ success: true, user: userData.user });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
