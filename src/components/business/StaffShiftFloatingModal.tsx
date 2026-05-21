"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { getStaffStatusLabel } from "@/lib/staffPermissions";
import { supabase } from "@/lib/supabaseClient";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faRightToBracket,
  faMugHot,
  faDoorOpen,
  faClock,
  faUserTie,
  faXmark,
  faCircleCheck,
  faPowerOff,
} from "@fortawesome/free-solid-svg-icons";

type StaffStatus = "on_shift" | "on_break" | "off_shift";
type ShiftAction = "start" | "break" | "end";

const statusStyles: Record<StaffStatus, string> = {
  on_shift:
    "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
  on_break:
    "bg-amber-500/15 text-amber-300 border border-amber-400/20",
  off_shift:
    "bg-slate-500/15 text-slate-300 border border-slate-400/20",
};

export default function StaffShiftFloatingModal() {
  const router = useRouter();
  const { staffSession } = useStaffSession();

  const [isOpen, setIsOpen] = useState(true);
  const [actionLoading, setActionLoading] = useState<ShiftAction | null>(null);

  /**
   * ✅ FIX: NO early return BEFORE hooks
   * (we move it AFTER hooks)
   */

  const staffId = staffSession?.staffId;

  /**
   * 🔥 IMPORTANT CHANGE:
   * instead of replacing status source,
   * we ONLY override when realtime pushes updates
   */
  const [liveStatus, setLiveStatus] = useState<StaffStatus | null>(null);

  /**
   * FINAL status = realtime override OR session value
   */
  const currentStatus: StaffStatus =
    liveStatus ?? (staffSession?.status as StaffStatus) ?? "off_shift";

  const staffStatusLabel = getStaffStatusLabel(currentStatus);

  const isOnShift = currentStatus === "on_shift";
  const isOnBreak = currentStatus === "on_break";

  const currentStatusStyle =
    statusStyles[currentStatus] ?? statusStyles.off_shift;

  const floatingDotColor =
    currentStatus === "on_shift"
      ? "bg-emerald-400"
      : currentStatus === "on_break"
      ? "bg-amber-400"
      : "bg-slate-400";

  /**
   * ✅ REALTIME FIX (safe overlay, no corruption of session state)
   */
  useEffect(() => {
    if (!staffId) return;

    const channel = supabase
      .channel(`staff-shift-${staffId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "staff_accounts",
          filter: `id=eq.${staffId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;

          if (
            newStatus === "on_shift" ||
            newStatus === "on_break" ||
            newStatus === "off_shift"
          ) {
            setLiveStatus(newStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  const callShiftAction = async (action: ShiftAction) => {
    setActionLoading(action);

    try {
      const res = await fetch(`/api/staff/shift/${action}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();

        const label =
          action === "start"
            ? "START"
            : action === "break"
            ? "BREAK"
            : "END";

        alert(`${label} shift failed: ${text}`);
        return;
      }

      /**
       * 🔥 IMPORTANT:
       * clear realtime override after server confirms update
       * so session stays source of truth again
       */
      setLiveStatus(null);

      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * NOW safe to guard AFTER hooks
   */
  if (!staffSession) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* COLLAPSED */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-5 py-3 text-sm font-semibold text-slate-900 shadow-xl backdrop-blur-xl transition hover:-translate-y-1"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${floatingDotColor}`} />
          Shift Controls
        </button>
      )}

      {/* PANEL */}
      {isOpen && (
        <div className="w-[340px] overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl">
          {/* HEADER */}
          <div className="border-b border-slate-100 bg-slate-900 p-5 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <FontAwesomeIcon icon={faUserTie} className="text-white" />
                </div>

                <div>
                  <p className="text-sm font-bold">Shift Controls</p>

                  <div
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${currentStatusStyle}`}
                  >
                    <FontAwesomeIcon icon={faClock} />
                    {staffStatusLabel}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-300 hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="space-y-3 p-5">
            <button
              onClick={() => callShiftAction("start")}
              disabled={actionLoading !== null || isOnShift}
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:bg-emerald-100 disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <FontAwesomeIcon icon={faRightToBracket} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {isOnBreak ? "Resume Shift" : "Start Shift"}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {isOnBreak ? "Continue working" : "Clock in and begin work"}
                  </p>
                </div>
              </div>

              <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
            </button>

            <button
              onClick={() => callShiftAction("break")}
              disabled={actionLoading !== null || !isOnShift}
              className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <FontAwesomeIcon icon={faMugHot} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Take Break
                  </p>
                  <p className="text-[11px] text-amber-700">Have a breather</p>
                </div>
              </div>

              <FontAwesomeIcon icon={faCircleCheck} className="text-amber-500" />
            </button>

            <button
              onClick={() => callShiftAction("end")}
              disabled={actionLoading !== null || (!isOnShift && !isOnBreak)}
              className="flex w-full items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 hover:bg-rose-100 disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-rose-900">
                    End Shift
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Clock out and finish session
                  </p>
                </div>
              </div>

              <FontAwesomeIcon icon={faPowerOff} className="text-rose-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}