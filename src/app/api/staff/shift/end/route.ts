import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient, getStaffSessionFromRequest } from "@/lib/serverSupabase";

export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/staff/shift/end] headers:', Object.fromEntries(req.headers.entries()));
    console.log('[POST /api/staff/shift/end] cookie header:', req.headers.get('cookie'));

    const staffSession = await getStaffSessionFromRequest(req);
    if (!staffSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseAdminClient();

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('staff_accounts')
      .update({ status: 'off_shift' })
      .eq('id', staffSession.staffId);

    if (updateError) {
      console.error('[POST /api/staff/shift/end] update error', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to end shift' }, { status: 500 });
    }

    try {
      const { error: logError } = await supabase.from('staff_shift_logs').insert([{ staff_id: staffSession.staffId, business_id: staffSession.businessId, action: 'end', created_at: now }]);
      if (logError) console.warn('[POST /api/staff/shift/end] log insert warning', logError.message);
    } catch (e) {
      console.warn('[POST /api/staff/shift/end] log insert exception', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/staff/shift/end] exception', err);
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
