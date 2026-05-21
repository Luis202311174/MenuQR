"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import { useStaffSession } from "@/hooks/useStaffSession";
import { getStaffStatusLabel } from "@/lib/staffPermissions";

type ShiftLog = {
  id: string;
  action: string;
  created_at: string;
};

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StaffDashboardPage() {
  const { staffSession, loading } = useStaffSession();
  const [staffInfo, setStaffInfo] = useState<typeof staffSession | null>(null);
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedLog, setSelectedLog] = useState<ShiftLog | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (staffSession) {
      setStaffInfo(staffSession);
    }
  }, [staffSession]);

  const statusLabel = useMemo(() => getStaffStatusLabel(staffInfo?.status || "off_shift"), [staffInfo?.status]);

  const loadLogs = async (date: string) => {
    if (!staffInfo) return;
    setLoadingLogs(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/staff/shift/logs?date=${date}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to fetch logs");
      }

      const data = (await res.json()) as ShiftLog[];
      setLogs(data || []);
    } catch (error: any) {
      console.error("Unable to load shift logs:", error);
      setLogs([]);
      setErrorMessage(error?.message || "Unable to load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!staffInfo) return;
    loadLogs(selectedDate);
  }, [staffInfo, selectedDate]);

  const refreshStaffInfo = async () => {
    try {
      const res = await fetch("/api/staff/session", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setStaffInfo(data);
    } catch (error) {
      console.warn("Unable to refresh staff session:", error);
    }
  };

  const handleShiftAction = async (action: "start" | "break" | "end") => {
    if (!staffInfo) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/staff/shift/${action}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `${action} shift failed`);
      }

      await refreshStaffInfo();
      await loadLogs(selectedDate);
    } catch (error: any) {
      console.error(`${action} shift failed`, error);
      setErrorMessage(error?.message || "Shift action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const actionButtons = () => {
    if (!staffInfo) {
      return null;
    }

    switch (staffInfo.status) {
      case "on_shift":
        return (
          <>
            <button
              type="button"
              onClick={() => handleShiftAction("break")}
              disabled={actionLoading}
              className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Take Break
            </button>
            <button
              type="button"
              onClick={() => handleShiftAction("end")}
              disabled={actionLoading}
              className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              End Shift
            </button>
          </>
        );
      case "on_break":
        return (
          <>
            <button
              type="button"
              onClick={() => handleShiftAction("start")}
              disabled={actionLoading}
              className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Resume Shift
            </button>
            <button
              type="button"
              onClick={() => handleShiftAction("end")}
              disabled={actionLoading}
              className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              End Shift
            </button>
          </>
        );
      default:
        return (
          <button
            type="button"
            onClick={() => handleShiftAction("start")}
            disabled={actionLoading}
            className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Start Shift
          </button>
        );
    }
  };

  return (
    <PageShell title="Staff Dashboard" subtitle="Your profile, shift controls and daily log history">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Profile & shift status</h2>
                <p className="mt-1 text-sm text-slate-600">Manage your staff session and track today’s activity.</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="text-sm text-slate-600">Log date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Name</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{loading ? 'Loading…' : staffInfo?.fullName || '—'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Email</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{loading ? 'Loading…' : staffInfo?.email || '—'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{loading ? 'Loading…' : staffInfo?.role || '—'}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Current status</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{loading ? 'Loading…' : statusLabel}</p>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actionButtons()}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Shift summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Date:</span> {selectedDate}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Last login:</span> {staffInfo?.lastLoginAt ? formatDate(staffInfo.lastLoginAt) : '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Log entries:</span> {logs.length}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Daily shift log</h2>
              <p className="mt-1 text-sm text-slate-600">Review each event and open details in the modal.</p>
            </div>
            <button
              type="button"
              onClick={() => loadLogs(selectedDate)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Refresh log
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-900">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-slate-500">Loading logs…</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-slate-500">No shift events recorded for this day.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-900">{formatTime(log.created_at)}</td>
                      <td className="px-3 py-3 capitalize text-slate-700">{log.action.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="rounded-2xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Log entry details</h3>
                <p className="mt-1 text-sm text-slate-600">Review a single shift event for the selected day.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Action</p>
                <p className="mt-2 text-base font-semibold text-slate-900 capitalize">{selectedLog.action.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Timestamp</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(selectedLog.created_at)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Staff information</p>
              <p className="mt-2">{staffInfo?.fullName || "—"} • {staffInfo?.email || "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
