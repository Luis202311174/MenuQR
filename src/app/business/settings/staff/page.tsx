"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import { hasStaffPermission, getDefaultPermissionsForRole, staffModules, type StaffPermissionRow } from "@/lib/staffPermissions";
import StaffPermissionEditor from "@/components/business/StaffPermissionEditor";
import PageShell from "@/components/PageShell";

interface StaffAccount {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  staff_permissions: StaffPermissionRow[];
}

const roleOptions = [
  { label: "Cashier", value: "cashier" },
  { label: "Waiter", value: "waiter" },
  { label: "Kitchen Staff", value: "kitchen staff" },
  { label: "Manager", value: "manager" },
  { label: "Inventory Staff", value: "inventory staff" },
  { label: "Custom Role", value: "custom" },
];
const statusOptions = ["active", "suspended", "disabled"];

export default function StaffManagementPage() {
  const router = useRouter();
  const auth = useBusinessAuth("settings", "access");

  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedLogAccount, setSelectedLogAccount] = useState<StaffAccount | null>(null);
  const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);
  const [staffLogs, setStaffLogs] = useState<Array<{ id: string; action: string; created_at: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [currentLogPage, setCurrentLogPage] = useState(1);
  const LOGS_PER_PAGE = 10;
  // Order activity logs modal state
  const [orderLogModalOpen, setOrderLogModalOpen] = useState(false);
  const [orderDates, setOrderDates] = useState<Array<{ date: string; count?: number }>>([]);
  const [orderDatesLoading, setOrderDatesLoading] = useState(false);
  const [orderDatesError, setOrderDatesError] = useState<string | null>(null);
  const [orderDatePage, setOrderDatePage] = useState(1);
  const ORDAYS_PER_PAGE = 10; // pagination for dates (10 per page)
  const [selectedOrderDate, setSelectedOrderDate] = useState<string | null>(null);
  const [ordersForDate, setOrdersForDate] = useState<Array<any>>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 10;
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderLogs, setSelectedOrderLogs] = useState<Array<any>>([]);
  const [orderLogsLoading, setOrderLogsLoading] = useState(false);
  const [orderLogsError, setOrderLogsError] = useState<string | null>(null);
  const [ownerLogModalOpen, setOwnerLogModalOpen] = useState(false);
  const [ownerLogs, setOwnerLogs] = useState<any[]>([]);
  const [ownerLogsLoading, setOwnerLogsLoading] = useState(false);
  const [ownerLogsError, setOwnerLogsError] = useState<string | null>(null);
  const [selectedOwnerLogDate, setSelectedOwnerLogDate] = useState<string | null>(null);
  const [currentOwnerLogPage, setCurrentOwnerLogPage] = useState(1);
  const [selectedOwnerOrder, setSelectedOwnerOrder] = useState<any | null>(null);
  const [ownerOrdersForDate, setOwnerOrdersForDate] = useState<Array<any>>([]);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "custom",
    status: "active",
  });
  const [permissions, setPermissions] = useState<StaffPermissionRow[]>(getDefaultPermissionsForRole("custom"));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(1);

  const canManageStaff = auth.owner || (auth.staffSession ? hasStaffPermission(auth.staffSession, "settings", "manageStaff") : false);

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "suspended":
        return "bg-amber-100 text-amber-700";
      case "disabled":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const fetchWithAuth = async (endpoint: string, opts: RequestInit = {}) => {
    const sessionData = await supabase.auth.getSession();
    const accessToken = sessionData.data.session?.access_token;
    const response = await fetch(endpoint, {
      credentials: "include",
      headers: {
        ...(opts.headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...opts,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      const errorBody = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      throw new Error(errorBody?.error || errorBody?.message || "API request failed.");
    }

    return response.json();
  };

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    if (!canManageStaff) {
      setError("You do not have permission to load staff accounts.");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter.toLowerCase());
      const data = (await fetchWithAuth(`/api/staff/accounts?${params.toString()}`, {
        cache: "no-store",
        method: "GET",
      })) as StaffAccount[];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Unable to load staff accounts. Refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.checked || !canManageStaff) return;
    setCurrentPage(1);
    loadAccounts();
  }, [auth.checked, canManageStaff, search, roleFilter]);

  useEffect(() => {
    // reset page when accounts or filters change
    setCurrentPage(1);
  }, [accounts.length, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(accounts.length / ITEMS_PER_PAGE));
  const paginatedAccounts = useMemo(
    () => accounts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [accounts, currentPage]
  );

  const roleLabel = (role: string) => {
    const found = roleOptions.find((option) => option.value === role.toLowerCase());
    return found ? found.label : role;
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormState({ fullName: "", email: "", password: "", confirmPassword: "", role: "custom", status: "active" });
    setPermissions(getDefaultPermissionsForRole("custom"));
    setModalStep(1);
    setModalOpen(true);
  };

  const openEditModal = (account: StaffAccount) => {
    setEditingAccount(account);
    setFormState({
      fullName: account.full_name,
      email: account.email,
      password: "",
      confirmPassword: "",
      role: account.role,
      status: account.status,
    });
    setPermissions(account.staff_permissions.length ? account.staff_permissions : getDefaultPermissionsForRole(account.role));
    setModalStep(1);
    setModalOpen(true);
  };

  const resetModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
    setModalStep(1);
    setError(null);
  };

  const canAdvanceFromStep = (step: number) => {
    if (step === 1) {
      if (!formState.fullName || !formState.email) return false;
      if (!editingAccount && !formState.password) return false;
      if (formState.password && formState.password !== formState.confirmPassword) return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError(null);
    if (!canAdvanceFromStep(modalStep)) {
      setError("Please fill in the required fields before continuing.");
      return;
    }
    if (modalStep < 3) {
      setModalStep((current) => current + 1);
    }
  };

  const saveAccount = async () => {
    if (!formState.fullName || !formState.email || (!editingAccount && !formState.password)) {
      setError("Full name, email, and password are required for new accounts.");
      return;
    }

    if (formState.password && formState.password !== formState.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        fullName: formState.fullName,
        email: formState.email,
        role: formState.role.toLowerCase(),
        status: formState.status,
        permissions,
      };
      if (formState.password) {
        payload.password = formState.password;
      }

      const endpoint = editingAccount ? `/api/staff/accounts/${editingAccount.id}` : "/api/staff/accounts";
      const method = editingAccount ? "PATCH" : "POST";
      const sessionData = await supabase.auth.getSession();
      const accessToken = sessionData.data.session?.access_token;
      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const errorBody = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };
        const errorMessage =
          errorBody?.details || errorBody?.error || errorBody?.message || "Unable to save staff account";
        throw new Error(errorMessage);
      }

      setToast(editingAccount ? "Staff account updated." : "Staff account created.");
      resetModal();
      loadAccounts();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to save staff account.");
    } finally {
      setSaving(false);
    }
  };

  const disableAccount = async (account: StaffAccount) => {
    if (!confirm(`Disable ${account.full_name}?`)) return;
    setLoading(true);
    try {
      await fetchWithAuth(`/api/staff/accounts/${account.id}`, {
        method: "DELETE",
      });
      setToast("Staff account disabled.");
      loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Unable to disable staff account.");
    } finally {
      setLoading(false);
    }
  };

  const formatShiftDuration = (start: string, end: string) => {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return "—";
    }
    const diffMinutes = Math.round((endMs - startMs) / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  };

  const dateGroups = useMemo(() => {
    const groups = new Map<string, { date: string; logs: Array<{ id: string; action: string; created_at: string }> }>();
    const sortedLogs = [...staffLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const log of sortedLogs) {
      const date = new Date(log.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const dateKey = date.toLocaleDateString("en-US");
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { date: dateKey, logs: [] });
      }
      groups.get(dateKey)?.logs.push(log);
    }

    return Array.from(groups.values());
  }, [staffLogs]);

  const selectedDateLogs = useMemo(() => {
    if (!selectedLogDate) return [];
    return dateGroups.find((group) => group.date === selectedLogDate)?.logs ?? [];
  }, [dateGroups, selectedLogDate]);

  const shiftRecords = useMemo(() => {
    const sortedLogs = [...selectedDateLogs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const records: Array<{ start: string | null; end: string | null; duration: string }> = [];
    let currentStart: string | null = null;

    for (const log of sortedLogs) {
      const action = log.action?.toLowerCase().trim();
      if (action === "start") {
        currentStart = log.created_at;
      } else if (action === "end") {
        if (currentStart) {
          records.push({
            start: currentStart,
            end: log.created_at,
            duration: formatShiftDuration(currentStart, log.created_at),
          });
          currentStart = null;
        } else {
          records.push({ start: null, end: log.created_at, duration: "—" });
        }
      }
    }

    if (currentStart) {
      records.push({ start: currentStart, end: null, duration: "—" });
    }

    return records.reverse();
  }, [selectedDateLogs]);

  const ownerLogDateGroups = useMemo(() => {
    const groups = new Map<string, { date: string; logs: Array<any> }>();

    const sortedLogs = [...ownerLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const log of sortedLogs) {
      const date = new Date(log.created_at);
      if (Number.isNaN(date.getTime())) continue;

      const dateKey = date.toLocaleDateString("en-US");
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { date: dateKey, logs: [] });
      }

      groups.get(dateKey)?.logs.push(log);
    }

    return Array.from(groups.values());
  }, [ownerLogs]);

  const ownerOrdersForSelectedDate = useMemo(() => {
    if (!selectedOwnerLogDate) return [];

    const selectedDateLogs =
      ownerLogDateGroups.find((group) => group.date === selectedOwnerLogDate)?.logs ?? [];

    const grouped = new Map<
      string,
      {
        order_id: string;
        count: number;
        logs: Array<any>;
      }
    >();

    for (const log of selectedDateLogs) {
      const orderId = log.order_id ?? "Unknown order";

      if (!grouped.has(orderId)) {
        grouped.set(orderId, {
          order_id: orderId,
          count: 0,
          logs: [],
        });
      }

      grouped.get(orderId)!.count += 1;
      grouped.get(orderId)!.logs.push(log);
    }

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }, [ownerLogDateGroups, selectedOwnerLogDate]);

  const selectedOwnerLogRows = useMemo(() => {
    if (!selectedOwnerOrder) return [];
    return (
      ownerOrdersForSelectedDate.find((order) => order.order_id === selectedOwnerOrder.order_id)
        ?.logs ?? []
    );
  }, [ownerOrdersForSelectedDate, selectedOwnerOrder]);

  const isUuid = (value?: string | null) => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  };

  const formatActorLabel = (value?: string | null) => {
    if (!value) return "Owner";
    if (isUuid(value)) return "Owner";
    return value;
  };

  const getByLabel = (log: any) => {
    if (log?.owner_id) return "Owner";

    return formatActorLabel(log?.actor_name ?? log?.actor_id);
  };

  const fetchOwnerLogs = async () => {
    setOwnerLogsLoading(true);
    setOwnerLogsError(null);
    setOwnerLogs([]);
    try {
      const logs = await fetchWithAuth(`/api/staff/owner/logs`, {
        cache: "no-store",
        method: "GET",
      });
      setOwnerLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error(err);
      setOwnerLogsError((err as Error).message || "Unable to load owner logs.");
    } finally {
      setOwnerLogsLoading(false);
    }
  };
  
  const openOwnerLogsModal = async () => {
    setSelectedOwnerLogDate(null);
    setSelectedOwnerOrder(null);
    setCurrentOwnerLogPage(1);
    setOwnerLogModalOpen(true);
    await fetchOwnerLogs();
  };

  const closeOwnerLogsModal = () => {
    setOwnerLogModalOpen(false);
    setSelectedOwnerLogDate(null);
    setSelectedOwnerOrder(null);
    setCurrentOwnerLogPage(1);
    setOwnerLogs([]);
    setOwnerLogsError(null);
    setSelectedOrderLogs([]);
  };

  const fetchStaffLogs = async (staffId: string) => {
    setLogsLoading(true);
    setLogsError(null);
    setStaffLogs([]);
    try {
      const logs = await fetchWithAuth(`/api/staff/shift/logs?staffId=${encodeURIComponent(staffId)}`, {
        cache: "no-store",
        method: "GET",
      });
      setStaffLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error(err);
      setLogsError((err as Error).message || "Unable to load staff logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  // --- Order logs fetching flow ---
  const fetchOrderDates = async (staffId: string) => {
    setOrderDatesLoading(true);
    setOrderDatesError(null);
    setOrderDates([]);
    try {
      const data = await fetchWithAuth(`/api/staff/order/dates?staffId=${encodeURIComponent(staffId)}`, {
        cache: "no-store",
        method: "GET",
      });
      // expected: [{date: 'MM/DD/YYYY', count: number}, ...]
      setOrderDates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrderDatesError((err as Error).message || "Unable to load order dates.");
    } finally {
      setOrderDatesLoading(false);
    }
  };

  const fetchOrdersForDate = async (staffId: string, date: string) => {
    setOrdersLoading(true);
    setOrdersError(null);
    setOrdersForDate([]);
    try {
      const data = await fetchWithAuth(`/api/staff/orders?staffId=${encodeURIComponent(staffId)}&date=${encodeURIComponent(date)}`, {
        cache: "no-store",
        method: "GET",
      });
      setOrdersForDate(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrdersError((err as Error).message || "Unable to load orders for date.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchOrderLogs = async (orderId: string) => {
    setOrderLogsLoading(true);
    setOrderLogsError(null);
    setSelectedOrderLogs([]);
    try {
      const data = await fetchWithAuth(`/api/orders/${encodeURIComponent(orderId)}/logs`, {
        cache: "no-store",
        method: "GET",
      });
      setSelectedOrderLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrderLogsError((err as Error).message || "Unable to load order logs.");
    } finally {
      setOrderLogsLoading(false);
    }
  };

  const openOrderLogsModal = async (account: StaffAccount) => {
    setSelectedLogAccount(account);
    setSelectedOrderDate(null);
    setSelectedOrder(null);
    setOrderDatePage(1);
    setOrdersPage(1);
    setOrderLogModalOpen(true);
    await fetchOrderDates(account.id);
  };

  const closeOrderLogsModal = () => {
    setOrderLogModalOpen(false);
    setSelectedLogAccount(null);
    setOrderDates([]);
    setOrdersForDate([]);
    setSelectedOrderLogs([]);
    setOrderDatesError(null);
    setOrdersError(null);
    setOrderLogsError(null);
  };

  const openLogsModal = async (account: StaffAccount) => {
    setSelectedLogAccount(account);
    setSelectedLogDate(null);
    setCurrentLogPage(1);
    setLogModalOpen(true);
    await fetchStaffLogs(account.id);
  };

  const closeLogsModal = () => {
    setLogModalOpen(false);
    setSelectedLogAccount(null);
    setStaffLogs([]);
    setLogsError(null);
  };

  const activeRole = useMemo(() => formState.role.toLowerCase(), [formState.role]);

  return (
    <PageShell
      title="Staff Management"
      subtitle="Create staff accounts, assign role-based access, and customize sidebar permissions."
      backHref="/business/settings"
    >
      {auth.checked && !canManageStaff ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center text-rose-900">
          <h2 className="text-xl font-semibold">Permission denied</h2>
          <p className="mt-3 text-sm text-rose-700">
            You need staff management permission to view and manage staff accounts.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Manage cashiers, waiters, kitchen staff, inventory staff and custom roles with module-level access control.
                </p>
              </div>
          <button
            disabled={!canManageStaff}
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-full bg-[#4f65ff] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d52d1] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add Staff
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Search
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    placeholder="Search staff by name or email"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Filter role
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  >
                    <option value="">All roles</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Quick permission summary</p>
            <p className="mt-2 text-sm text-slate-500">
              Only staff with the required module access will see matching sidebar navigation and pages.
            </p>
          </div>
        </div>

        {auth.owner && (
          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] font-semibold text-amber-700">
                  Owner logs
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-900">
                  Business activity for owners
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Review owner-level activity directly from the staff management screen.
                </p>
              </div>

              <button
                type="button"
                onClick={openOwnerLogsModal}
                className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                View owner logs
              </button>
            </div>
          </section>
        )}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>}
        {toast && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{toast}</div>}

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Role</th>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Last login</th>
                <th className="px-4 py-4 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading staff accounts…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-4 text-slate-900">{account.full_name}</td>
                    <td className="px-4 py-4 text-slate-700">{account.email}</td>
                    <td className="px-4 py-4 text-slate-700">{roleLabel(account.role)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatDateTime(account.last_login_at)}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(account)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openLogsModal(account)}
                          className="rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                        >
                          View logs
                        </button>
                        <button
                          type="button"
                          onClick={() => openOrderLogsModal(account)}
                          className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          Order logs
                        </button>
                        <button
                          type="button"
                          onClick={() => disableAccount(account)}
                          className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Showing <span className="font-medium">{accounts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, accounts.length)}</span> of <span className="font-medium">{accounts.length}</span> staff members
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-slate-700">Page {currentPage} / {totalPages}</div>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-900 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {editingAccount ? "Edit Staff Account" : "Create Staff Account"}
                  </h2>
                  <p className="text-sm text-slate-300">
                    Complete the form one step at a time and then save the account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
                {[
                  { step: 1, label: "Staff details" },
                  { step: 2, label: "Role & status" },
                  { step: 3, label: "Permissions" },
                ].map((stepInfo) => (
                  <button
                    key={stepInfo.step}
                    type="button"
                    onClick={() => setModalStep(stepInfo.step)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
                      modalStep === stepInfo.step
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-900">
                      {stepInfo.step}
                    </span>
                    {stepInfo.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-6 py-6">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  {error}
                </div>
              )}

              {modalStep === 1 && (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-700">
                      Enter the staff member&apos;s name, email, and password. If editing, leave the password fields blank to keep the current password.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Full name
                      <input
                        value={formState.fullName}
                        onChange={(event) => setFormState({ ...formState, fullName: event.target.value })}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Email address
                      <input
                        type="email"
                        value={formState.email}
                        onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Password
                      <input
                        type="password"
                        value={formState.password}
                        onChange={(event) => setFormState({ ...formState, password: event.target.value })}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        placeholder={editingAccount ? "Leave blank to keep password" : "Enter password"}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Confirm password
                      <input
                        type="password"
                        value={formState.confirmPassword}
                        onChange={(event) => setFormState({ ...formState, confirmPassword: event.target.value })}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        placeholder="Repeat password"
                      />
                    </label>
                  </div>
                </div>
              )}

              {modalStep === 2 && (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-700">
                      Choose a role and status for this account. Role selections load the permission template automatically.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Role
                      <select
                        value={formState.role}
                        onChange={(event) => {
                          setFormState({ ...formState, role: event.target.value });
                          setPermissions(getDefaultPermissionsForRole(event.target.value));
                        }}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Status
                      <select
                        value={formState.status}
                        onChange={(event) => setFormState({ ...formState, status: event.target.value })}
                        className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                      >
                        {statusOptions.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900">Active permission template</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeRole === "custom"
                        ? "Start from scratch and toggle only the modules this user should access."
                        : `The selected role applies a default permission set for ${activeRole}. You can customize below.`}
                    </p>
                  </div>
                </div>
              )}

              {modalStep === 3 && (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-700">
                      Review and customize permissions for this account. Only enabled permissions will be granted.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <StaffPermissionEditor permissions={permissions} onChange={setPermissions} />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-sm text-slate-700">
                      Permissions configured: {permissions.filter((permission) => permission.can_view || permission.can_create || permission.can_edit || permission.can_delete).length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Step {modalStep} of 3</p>
                <p>{modalStep === 3 ? "Review and submit the account." : "Continue to the next step to finish setup."}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setModalStep((current) => Math.max(current - 1, 1))}
                  disabled={modalStep === 1}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  Back
                </button>
                {modalStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="rounded-full bg-[#4f65ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3d52d1]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveAccount}
                    disabled={saving || !canManageStaff}
                    className="rounded-full bg-[#4f65ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3d52d1] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {saving ? "Saving…" : editingAccount ? "Update staff" : "Create staff"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    )}

      {logModalOpen && selectedLogAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {selectedLogAccount?.full_name} {selectedLogDate ? `- ${selectedLogDate}` : "Shift Dates"}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedLogDate
                    ? "Detailed shifts for this date."
                    : "Select a shift date to view start/end and total hours."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedLogDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedLogDate(null)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeLogsModal}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-6 py-6">
              {logsLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Loading staff logs…
                </div>
              ) : logsError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
                  {logsError}
                </div>
              ) : staffLogs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  No logs found for this staff account.
                </div>
              ) : selectedLogDate ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Start</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">End</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Total hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {shiftRecords
                          .slice((currentLogPage - 1) * LOGS_PER_PAGE, currentLogPage * LOGS_PER_PAGE)
                          .map((record, index) => (
                            <tr key={`${record.start ?? "null"}-${record.end ?? "null"}-${index}`}>
                              <td className="px-4 py-4 text-slate-900">
                                {record.start ? new Date(record.start).toLocaleString() : "—"}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                {record.end ? new Date(record.end).toLocaleString() : "—"}
                              </td>
                              <td className="px-4 py-4 text-slate-700">{record.duration}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div>
                      Showing {Math.min((currentLogPage - 1) * LOGS_PER_PAGE + 1, shiftRecords.length)} to {Math.min(currentLogPage * LOGS_PER_PAGE, shiftRecords.length)} of {shiftRecords.length} records
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentLogPage === 1}
                        onClick={() => setCurrentLogPage((page) => Math.max(1, page - 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {currentLogPage} of {Math.max(1, Math.ceil(shiftRecords.length / LOGS_PER_PAGE))}
                      </span>
                      <button
                        type="button"
                        disabled={currentLogPage >= Math.ceil(shiftRecords.length / LOGS_PER_PAGE)}
                        onClick={() => setCurrentLogPage((page) => Math.min(Math.ceil(shiftRecords.length / LOGS_PER_PAGE), page + 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {dateGroups.map((group) => (
                          <tr key={group.date}>
                            <td className="px-4 py-4 text-slate-900">{group.date}</td>
                            <td className="px-4 py-4 text-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLogDate(group.date);
                                  setCurrentLogPage(1);
                                }}
                                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                View logs
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {orderLogModalOpen && selectedLogAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {selectedLogAccount?.full_name} {selectedOrderDate ? `- ${selectedOrderDate}` : "Order Activity"}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedOrder
                    ? "Order details and activity logs."
                    : selectedOrderDate
                    ? "Orders for this date. Click an order to view activity logs."
                    : "Select a date to view orders acted on by this staff."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                {selectedOrderDate && !selectedOrder && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrderDate(null)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeOrderLogsModal}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-6 py-6">
              {orderDatesLoading || ordersLoading || orderLogsLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Loading…
                </div>
              ) : orderDatesError || ordersError || orderLogsError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
                  {orderDatesError || ordersError || orderLogsError}
                </div>
              ) : orderDates.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  No order activity found for this staff account.
                </div>
              ) : selectedOrder ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900">Order #{selectedOrder.id ?? selectedOrder.order_number}</h3>
                    <p className="text-sm text-slate-600">Placed: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : "—"}</p>
                    <p className="mt-2 text-sm text-slate-700">Customer: {selectedOrder.customer_name ?? "—"}</p>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">By</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {selectedOrderLogs.map((log: any, idx: number) => (
                          <tr key={`${log.id ?? idx}`}>
                            <td className="px-4 py-4 text-slate-900">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                            <td className="px-4 py-4 text-slate-700">{log.action}</td>
                            <td className="px-4 py-4 text-slate-700">{formatActorLabel(log.actor_name ?? log.actor_id)}</td>
                            <td className="px-4 py-4 text-slate-700">{log.notes ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedOrderDate ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {ordersForDate.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order: any) => (
                          <tr key={order.id}>
                            <td className="px-4 py-4 text-slate-900">{order.order_number ?? order.id}</td>
                            <td className="px-4 py-4 text-slate-700">{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</td>
                            <td className="px-4 py-4 text-slate-700">{order.status ?? "—"}</td>
                            <td className="px-4 py-4 text-slate-700">
                              <button
                                type="button"
                                onClick={async () => {
                                  setSelectedOrder(order);
                                  await fetchOrderLogs(order.id ?? order.order_number);
                                }}
                                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                View activity
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div>
                      Showing {Math.min((ordersPage - 1) * ORDERS_PER_PAGE + 1, ordersForDate.length)} to {Math.min(ordersPage * ORDERS_PER_PAGE, ordersForDate.length)} of {ordersForDate.length} orders
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={ordersPage === 1}
                        onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">Page {ordersPage} of {Math.max(1, Math.ceil(ordersForDate.length / ORDERS_PER_PAGE))}</span>
                      <button
                        type="button"
                        disabled={ordersPage >= Math.ceil(ordersForDate.length / ORDERS_PER_PAGE)}
                        onClick={() => setOrdersPage((p) => Math.min(Math.ceil(ordersForDate.length / ORDERS_PER_PAGE), p + 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Orders</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {orderDates.slice((orderDatePage - 1) * ORDAYS_PER_PAGE, orderDatePage * ORDAYS_PER_PAGE).map((d) => (
                          <tr key={d.date}>
                            <td className="px-4 py-4 text-slate-900">{d.date}</td>
                            <td className="px-4 py-4 text-slate-700">{d.count ?? "—"}</td>
                            <td className="px-4 py-4 text-slate-700">
                              <button
                                type="button"
                                onClick={async () => {
                                  setSelectedOrderDate(d.date);
                                  setOrdersPage(1);
                                  await fetchOrdersForDate(selectedLogAccount!.id, d.date);
                                }}
                                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                View orders
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div>
                      Showing {Math.min((orderDatePage - 1) * ORDAYS_PER_PAGE + 1, orderDates.length)} to {Math.min(orderDatePage * ORDAYS_PER_PAGE, orderDates.length)} of {orderDates.length} dates
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={orderDatePage === 1}
                        onClick={() => setOrderDatePage((p) => Math.max(1, p - 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">Page {orderDatePage} of {Math.max(1, Math.ceil(orderDates.length / ORDAYS_PER_PAGE))}</span>
                      <button
                        type="button"
                        disabled={orderDatePage >= Math.ceil(orderDates.length / ORDAYS_PER_PAGE)}
                        onClick={() => setOrderDatePage((p) => Math.min(Math.ceil(orderDates.length / ORDAYS_PER_PAGE), p + 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {ownerLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">Owner logs</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Review owner activity for this business.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedOwnerOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOwnerOrder(null);
                      setCurrentOwnerLogPage(1);
                      setSelectedOrderLogs([]);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                {selectedOwnerLogDate && !selectedOwnerOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOwnerLogDate(null);
                      setCurrentOwnerLogPage(1);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeOwnerLogsModal}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-6 py-6">
              {ownerLogsLoading || orderLogsLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Loading owner logs…
                </div>
              ) : ownerLogsError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
                  {ownerLogsError}
                </div>
              ) : ownerLogs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  No owner logs found.
                </div>
              ) : selectedOwnerOrder ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Order #{selectedOwnerOrder.order_id}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedOrderLogs.length} activity record
                      {selectedOrderLogs.length === 1 ? "" : "s"} for this order.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">By</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {selectedOrderLogs
                          .slice((currentOwnerLogPage - 1) * LOGS_PER_PAGE, currentOwnerLogPage * LOGS_PER_PAGE)
                          .map((log: any, idx: number) => {
                            const createdAt = log.created_at ? new Date(log.created_at) : null;
                            const formattedTime =
                              createdAt && !Number.isNaN(createdAt.getTime())
                                ? createdAt.toLocaleString()
                                : "—";
                            return (
                              <tr key={log.id ?? idx}>
                                <td className="px-4 py-4 text-slate-900">{formattedTime}</td>
                                <td className="px-4 py-4 text-slate-700">{log.action}</td>
                                <td className="px-4 py-4 text-slate-700">{getByLabel(log)}</td>
                                <td className="px-4 py-4 text-slate-700">{log.notes ?? ""}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div>
                      Showing {Math.min((currentOwnerLogPage - 1) * LOGS_PER_PAGE + 1, selectedOrderLogs.length)} to{" "}
                      {Math.min(currentOwnerLogPage * LOGS_PER_PAGE, selectedOrderLogs.length)} of {selectedOrderLogs.length} logs
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentOwnerLogPage === 1}
                        onClick={() => setCurrentOwnerLogPage((page) => Math.max(1, page - 1))}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {currentOwnerLogPage} of {Math.max(1, Math.ceil(selectedOrderLogs.length / LOGS_PER_PAGE))}
                      </span>
                      <button
                        type="button"
                        disabled={currentOwnerLogPage >= Math.ceil(selectedOrderLogs.length / LOGS_PER_PAGE)}
                        onClick={() =>
                          setCurrentOwnerLogPage((page) =>
                            Math.min(Math.ceil(selectedOrderLogs.length / LOGS_PER_PAGE), page + 1)
                          )
                        }
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedOwnerLogDate ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Activity count</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {ownerOrdersForSelectedDate.map((order) => (
                          <tr key={order.order_id}>
                            <td className="px-4 py-4 text-slate-900">Order #{order.order_id}</td>
                            <td className="px-4 py-4 text-slate-700">{order.count}</td>
                            <td className="px-4 py-4 text-slate-700">
                              <button
                                type="button"
                                onClick={async () => {
                                  setSelectedOwnerOrder(order);
                                  await fetchOrderLogs(order.order_id);
                                  setCurrentOwnerLogPage(1);
                                }}
                                className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                              >
                                View activity
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Orders</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {ownerLogDateGroups.map((group) => (
                          <tr key={group.date}>
                            <td className="px-4 py-4 text-slate-900">{group.date}</td>
                            <td className="px-4 py-4 text-slate-700">
                              {new Set(group.logs.map((log) => log.order_id ?? "Unknown order")).size}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOwnerLogDate(group.date);
                                  setSelectedOwnerOrder(null);
                                  setCurrentOwnerLogPage(1);
                                }}
                                className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                              >
                                View orders
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
