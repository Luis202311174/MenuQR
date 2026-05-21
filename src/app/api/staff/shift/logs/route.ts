import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  try {
    console.log('[GET /api/staff/shift/logs] headers:', Object.fromEntries(req.headers.entries()));
    console.log('[GET /api/staff/shift/logs] cookie header:', req.headers.get('cookie'));

    const staffSession = await getStaffSessionFromRequest(req);
    if (!staffSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseAdminClient();

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD

    let query = supabase.from('staff_shift_logs').select('id, action, created_at').eq('staff_id', staffSession.staffId).order('created_at', { ascending: false }).limit(100);

    if (dateParam) {
      query = query.filter('created_at', 'gte', `${dateParam}T00:00:00Z`).filter('created_at', 'lte', `${dateParam}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/staff/shift/logs] error', error);
      return NextResponse.json({ error: error.message || 'Failed to load logs' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[GET /api/staff/shift/logs] exception', err);
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
