"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BusinessOrdersNotifierProps = {
  businessId: string | null;
  onCountChange?: (count: number) => void;
};

const activeOrderStatuses = [
  "pending",
  "pending_payment",
  "received",
  "paid",
  "preparing",
  "ready",
  "served",
];

const isActiveOrderStatus = (status?: string | null) => {
  return !!status && activeOrderStatuses.includes(status);
};

export default function BusinessOrdersNotifier({
  businessId,
  onCountChange,
}: BusinessOrdersNotifierProps) {
  const [ordersCount, setOrdersCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [latestTableNumber, setLatestTableNumber] = useState("N/A");
  const audioRef = useRef<AudioContext | null>(null);
  const lastNotifiedOrderIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const router = useRouter();

  const playNewOrderSound = () => {
    if (typeof window === "undefined") return;

    const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioConstructor) return;

    if (!audioRef.current) {
      audioRef.current = new AudioConstructor();
    }

    const context = audioRef.current;
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const gain = context.createGain();
    gain.gain.value = 0.65;
    gain.connect(context.destination);

    const now = context.currentTime;
    const tones = [880, 660, 1040];

    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 1 ? "square" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.05);
      oscillator.stop(now + 0.22 + index * 0.05);
    });
  };

  const fetchOrderCount = async () => {
    if (!businessId) return;

    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", activeOrderStatuses);

    if (!error) {
      const value = count ?? 0;
      setOrdersCount(value);
      onCountChange?.(value);
    }
  };

  useEffect(() => {
    if (!businessId) return;

    fetchOrderCount();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`business-orders-notifier-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            await fetchOrderCount();
            return;
          }

          const order = payload.new as any;
          if (!order) return;

          const isNewActiveOrder = payload.eventType === "INSERT" && isActiveOrderStatus(order.status);
          const becameActiveOrder =
            payload.eventType === "UPDATE" &&
            !isActiveOrderStatus((payload.old as any)?.status) &&
            isActiveOrderStatus(order.status);

          if ((isNewActiveOrder || becameActiveOrder) && order.id !== lastNotifiedOrderIdRef.current) {
            lastNotifiedOrderIdRef.current = order.id;
            setLatestTableNumber(order.table?.table_number || "N/A");
            playNewOrderSound();
            setShowModal(true);
          }

          await fetchOrderCount();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [businessId]);

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => setShowModal(false), 10000);
    return () => clearTimeout(timer);
  }, [showModal]);

  if (!businessId) return null;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">New Order</p>
              <h2 className="text-2xl font-bold text-slate-900">Incoming order received</h2>
              <p className="text-sm text-slate-600">
                A new order arrived for Table {latestTableNumber}. Check it now.
              </p>

              <div className="mt-4 flex gap-3 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    router.push("/business/orders");
                  }}
                  className="inline-flex justify-center rounded-2xl bg-[#E23838] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c72d2d]"
                >
                  Go to Orders
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inline-flex justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
