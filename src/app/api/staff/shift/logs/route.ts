import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAdminClient,
  getOwnerUserFromRequest,
  getStaffSessionFromRequest,
} from "@/lib/serverSupabase";

function createJsonError(message: string, status = 500, details?: string) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function GET(req: NextRequest) {
  try {
    console.log('[GET /api/staff/shift/logs] headers:', Object.fromEntries(req.headers.entries()));
    console.log('[GET /api/staff/shift/logs] cookie header:', req.headers.get('cookie'));

    const owner = await getOwnerUserFromRequest(req);
    const staffSession = await getStaffSessionFromRequest(req);
    const url = new URL(req.url);
    const staffIdFromQuery = url.searchParams.get('staffId')?.trim() || null;
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD

    if (!owner && !staffSession) {
      return createJsonError('Unauthorized', 401);
    }

    let staffId: string;
    if (owner) {
      if (!staffIdFromQuery) {
        return createJsonError('Staff ID is required for owner requests', 400);
      }
      staffId = staffIdFromQuery;
    } else {
      if (staffIdFromQuery && staffIdFromQuery !== staffSession.staffId) {
        return createJsonError('Forbidden', 403);
      }
      staffId = staffSession.staffId;
    }

    const supabase = createServerSupabaseAdminClient();

    const { data: staffRecord, error: staffError } = await supabase
      .from('staff_accounts')
      .select('id, business_id')
      .eq('id', staffId)
      .limit(1)
      .maybeSingle();

    if (staffError || !staffRecord) {
      return createJsonError('Staff account not found', 404, staffError?.message);
    }

    const businessId = owner
      ? (
          await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', owner.id)
            .limit(1)
            .maybeSingle()
        ).data?.id
      : staffSession.businessId;

    if (!businessId || staffRecord.business_id !== businessId) {
      return createJsonError('Forbidden', 403, 'Staff does not belong to this business.');
    }

    const query = supabase
      .from('staff_shift_logs')
      .select('id, action, created_at')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(100);

    let logQuery = query;
    if (dateParam) {
      logQuery = logQuery.filter('created_at', 'gte', `${dateParam}T00:00:00Z`).filter('created_at', 'lte', `${dateParam}T23:59:59Z`);
    }

    const { data, error } = await logQuery;

    if (error) {
      console.error('[GET /api/staff/shift/logs] error', error);
      return createJsonError(error.message || 'Failed to load logs', 500);
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[GET /api/staff/shift/logs] exception', err);
    return createJsonError('Server error', 500, String(err));
  }
}
