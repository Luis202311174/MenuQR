"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  open: boolean;
  orderId: string;
  businessId: string;
  onClose: () => void;
  onRated?: () => void;
}

const emojis = ["😡", "😕", "😐", "🙂", "🤩"];

export default function OrderRatingModal({
  open,
  orderId,
  businessId,
  onClose,
  onRated,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submitRating = async () => {
    if (!selected) return;

    setSubmitting(true);

    const { error } = await supabase.from("order_ratings").insert({
      order_id: orderId,
      business_id: businessId,
      rating: selected,
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      return;
    }

    onRated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">

        <h2 className="text-lg font-bold mb-2">
          How was your order?
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Tap an emoji to rate your experience
        </p>

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