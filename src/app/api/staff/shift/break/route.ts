import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/staff/shift/break] headers:', Object.fromEntries(req.headers.entries()));
    console.log('[POST /api/staff/shift/break] cookie header:', req.headers.get('cookie'));

    const staffSession = await getStaffSessionFromRequest(req);
    if (!staffSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseAdminClient();

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('staff_accounts')
      .update({ status: 'on_break' })
      .eq('id', staffSession.staffId);

    if (updateError) {
      console.error('[POST /api/staff/shift/break] update error', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to start break' }, { status: 500 });
    }

    try {
      const { error: logError } = await supabase.from('staff_shift_logs').insert([{ staff_id: staffSession.staffId, business_id: staffSession.businessId, action: 'break', created_at: now }]);
      if (logError) {
        console.warn('[POST /api/staff/shift/break] log insert warning', logError.message);
      }
    } catch (e) {
      console.warn('[POST /api/staff/shift/break] log insert exception', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/staff/shift/break] exception', err);
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
