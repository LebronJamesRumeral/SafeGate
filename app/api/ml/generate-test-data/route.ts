/**
 * Generate Test Data API Route
 * Utility endpoint for generating test/demo data
 * This is a development-only endpoint
 */

import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // This endpoint is kept for development/testing purposes
  // It directly accesses Supabase to generate test data
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { error: 'Missing Supabase credentials' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: 'Test data generation temporarily disabled. Use Supabase dashboard to insert data.',
    });
  } catch (error) {
    return Response.json(
      { error: 'Test data generation failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
