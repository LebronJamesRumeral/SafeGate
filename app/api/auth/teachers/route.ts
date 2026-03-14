import { createClient } from '@supabase/supabase-js';

interface TeacherAccount {
  id: string;
  name: string;
  email: string;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase service credentials',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const teachers: TeacherAccount[] = (data?.users || [])
      .filter((user) => {
        const role = (user.user_metadata?.role || user.app_metadata?.role || '').toString().toLowerCase();
        return role === 'teacher';
      })
      .map((user) => ({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Teacher',
        email: user.email || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      success: true,
      data: teachers,
      count: teachers.length,
    });
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
