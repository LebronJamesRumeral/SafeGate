import { createClient } from '@supabase/supabase-js';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getUserDisplayName(user: any): string {
  const fromUserMetadata =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name;

  const fromAppMetadata =
    user.app_metadata?.display_name ||
    user.app_metadata?.full_name ||
    user.app_metadata?.name;

  const candidate = (fromUserMetadata || fromAppMetadata || '').toString().trim();
  if (candidate) {
    return candidate;
  }

  return user.email?.split('@')[0] || 'User';
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

    const users: UserAccount[] = (data?.users || [])
      .map((user) => {
        const role = (user.user_metadata?.role || user.app_metadata?.role || '').toString().toLowerCase();
        return {
          id: user.id,
          name: getUserDisplayName(user),
          email: user.email || '',
          role: role || 'unknown',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      success: true,
      data: users,
      count: users.length,
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
