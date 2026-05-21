import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/serverSupabase";

const generateRewardCouponCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isCouponAvailable = (coupon: any) => {
  if (!coupon || coupon.is_active !== true) return false;
  if (coupon.usage_count >= coupon.usage_limit) return false;
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) return false;
  return true;
};

const createCouponAttempt = async (
  supabase: ReturnType<typeof createServerSupabaseAdminClient>,
  payload: Record<string, any>,
  attemptsRemaining: number
): Promise<any | null> => {
  if (attemptsRemaining <= 0) return null;

  if (!payload.code) {
    payload.code = generateRewardCouponCode();
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    const message = error.message || JSON.stringify(error);
    const isDuplicate = /duplicate|unique constraint|23505/i.test(message);
    if (isDuplicate) {
      delete payload.code;
      return createCouponAttempt(supabase, payload, attemptsRemaining - 1);
    }
    return null;
  }

  return data;
};

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const {
    businessId,
    discountType,
    discountValue,
    description,
    usageLimit,
    expiresAt,
    customCode,
  } = body ?? {};

  if (!businessId || !discountType || typeof discountValue !== "number" || !description || typeof usageLimit !== "number") {
    return new NextResponse("Missing required coupon creation fields", { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();

  const normalizedCode = typeof customCode === "string" && customCode.trim().length > 0
    ? customCode.trim().toUpperCase()
    : null;

  if (normalizedCode) {
    const { data: existingCoupon, error: existingError } = await supabase
      .from("coupons")
      .select("*")
      .eq("business_id", businessId)
      .eq("code", normalizedCode)
      .maybeSingle();

    if (existingError) {
      return new NextResponse(existingError.message || "Failed to check existing reward coupon", { status: 500 });
    }

    if (existingCoupon) {
      if (isCouponAvailable(existingCoupon)) {
        return NextResponse.json(existingCoupon);
      }
      return new NextResponse("Reward coupon is not currently available", { status: 409 });
    }
  }

  const { data: matchingCoupons, error: matchingError } = await supabase
    .from("coupons")
    .select("*")
    .eq("business_id", businessId)
    .eq("discount_type", discountType)
    .eq("discount_value", discountValue)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (matchingError) {
    return new NextResponse(matchingError.message || "Failed to search reward coupons", { status: 500 });
  }

  const existingMatch = matchingCoupons?.[0] ?? null;
  if (existingMatch && isCouponAvailable(existingMatch)) {
    return NextResponse.json(existingMatch);
  }

  const insertPayload: Record<string, any> = {
    business_id: businessId,
    discount_type: discountType,
    discount_value: discountValue,
    description,
    is_active: true,
    usage_limit: usageLimit,
  };

  if (normalizedCode) {
    insertPayload.code = normalizedCode;
  }

  if (expiresAt) {
    insertPayload.expires_at = expiresAt;
  }

  const coupon = await createCouponAttempt(supabase, insertPayload, 3);
  if (!coupon) {
    return new NextResponse("Failed to create reward coupon", { status: 500 });
  }

  return NextResponse.json(coupon);
}
