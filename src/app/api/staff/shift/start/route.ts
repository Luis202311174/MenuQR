import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/staff/shift/start] headers:', Object.fromEntries(req.headers.entries()));
    console.log('[POST /api/staff/shift/start] cookie header:', req.headers.get('cookie'));

    const staffSession = await getStaffSessionFromRequest(req);
    if (!staffSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseAdminClient();

    // Update last_login_at only (do not change account status)
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('staff_accounts')
      .update({ status: 'on_shift', last_login_at: now })
      .eq('id', staffSession.staffId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[POST /api/staff/shift/start] update error', error);
      return NextResponse.json({ error: error.message || 'Failed to start shift' }, { status: 500 });
    }

    // Record shift log (non-fatal if table doesn't exist)
    try {
      const { error: logError } = await supabase.from('staff_shift_logs').insert([{ staff_id: staffSession.staffId, business_id: staffSession.businessId, action: 'start', created_at: new Date().toISOString() }]);
      if (logError) console.warn('[POST /api/staff/shift/start] log insert warning', logError.message);
    } catch (e) {
      console.warn('[POST /api/staff/shift/start] log insert exception', e);
    }

    return NextResponse.json({ success: true, staff: data });
  } catch (err) {
    console.error('[POST /api/staff/shift/start] exception', err);
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
