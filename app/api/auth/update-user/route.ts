import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, password, full_name, role } = body;

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
