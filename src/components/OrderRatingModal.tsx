"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface RewardCouponInfo {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  description?: string | null;
}

interface Props {
  open: boolean;
  orderId: string;
  businessId: string;
  rewardCouponInfo?: RewardCouponInfo | null;
  onClose: () => void;
  onRated?: () => void;
}

const emojis = ["😡", "😕", "😐", "🙂", "🤩"];

export default function OrderRatingModal({
  open,
  orderId,
  businessId,
  rewardCouponInfo,
  onClose,
  onRated,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submitRating = async () => {
    if (selected === null) return;

    if (!orderId || !businessId) {
      alert("Unable to submit rating: missing order or business information.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_id: orderId,
        business_id: businessId,
        rating: Number(selected),
      };

      const { data, error } = await supabase
        .from("order_ratings")
        .upsert([payload], { onConflict: "order_id" })
        .select("*")
        .maybeSingle();

      setSubmitting(false);

      if (error) {
        const errorMessage =
          error?.message ||
          error?.hint ||
          error?.details ||
          error?.toString?.() ||
          (error && JSON.stringify(error, Object.getOwnPropertyNames(error), 2)) ||
          "Unknown error inserting rating.";

        console.error(
          "Failed inserting order rating:",
          {
            errorMessage,
            error,
            payload,
            rawError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
          }
        );

        if (error?.code === "23505" || errorMessage.toLowerCase().includes("unique")) {
          alert("You have already rated this order.");
        } else {
          alert(`Failed to submit rating: ${errorMessage}`);
        }
        return;
      }

      if (!data) {
        console.warn(
          "Order rating inserted successfully but server returned no response data.",
          { payload }
        );
      }

      onRated?.();
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      console.error("Unexpected error submitting rating:", err);
      alert(`Unexpected error submitting rating: ${err?.message || String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">

        <h2 className="text-lg font-bold mb-2">
          How was your order?
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          Tap an emoji to rate your experience
        </p>

        {rewardCouponInfo && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-left">
            <p className="text-xs uppercase tracking-wider text-emerald-600">Reward Coupon</p>
            <p className="mt-2 font-semibold text-slate-900">{rewardCouponInfo.code}</p>
            <p className="text-sm text-slate-700 mt-1">
              {rewardCouponInfo.discount_type === 'percentage'
                ? `${rewardCouponInfo.discount_value}% OFF`
                : `₱${rewardCouponInfo.discount_value.toFixed(2)} OFF`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Valid until {rewardCouponInfo.expires_at ? new Date(rewardCouponInfo.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry'}
            </p>
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2">
              <p className="text-xs font-semibold text-amber-900 flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <span>Screenshot or save this code now!</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between text-3xl mb-6">
          {emojis.map((emoji, idx) => {
            const value = idx + 1;
            return (
              <button
                key={value}
                onClick={() => setSelected(value)}
                className={`transition transform hover:scale-125 ${
                  selected === value ? "scale-125" : "opacity-60"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected || submitting}
          onClick={submitRating}
          className="w-full bg-[#E23838] text-white py-2 rounded-xl font-semibold disabled:bg-gray-300"
        >
          {submitting ? "Submitting..." : "Submit Rating"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 text-sm text-gray-500"
        >
          Skip
        </button>
      </div>
    </div>
  );
}