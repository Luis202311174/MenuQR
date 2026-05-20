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
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);
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

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    if (!canManageStaff) {
      setError("You do not have permission to load staff accounts.");
      setLoading(false);
      return;
    }

    try {
      const sessionData = await supabase.auth.getSession();
      const accessToken = sessionData.data.session?.access_token;
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter.toLowerCase());
      const response = await fetch(`/api/staff/accounts?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const errorBody = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };
        const errorMessage = errorBody?.error || errorBody?.message || "Unable to load staff accounts";
        throw new Error(errorMessage);
      }
      const data = (await response.json()) as StaffAccount[];
      setAccounts(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load staff accounts. Refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.checked || !canManageStaff) return;
    loadAccounts();
  }, [auth.checked, canManageStaff, search, roleFilter]);

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
          errorBody?.error || errorBody?.message || errorBody?.details || "Unable to save staff account";
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
      const sessionData = await supabase.auth.getSession();
      const accessToken = sessionData.data.session?.access_token;
      const response = await fetch(`/api/staff/accounts/${account.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const errorBody = contentType.includes("application/json")
          ? await response.json()
          : { error: await response.text() };
        const errorMessage = errorBody?.error || errorBody?.message || "Unable to disable account";
        throw new Error(errorMessage);
      }
      setToast("Staff account disabled.");
      loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Unable to disable staff account.");
    } finally {
      setLoading(false);
    }
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
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-4 text-slate-900">{account.full_name}</td>
                    <td className="px-4 py-4 text-slate-700">{account.email}</td>
                    <td className="px-4 py-4 text-slate-700 capitalize">{account.role}</td>
                    <td className="px-4 py-4 text-slate-700 capitalize">{account.status}</td>
                    <td className="px-4 py-4 text-slate-700">{account.last_login_at ? new Date(account.last_login_at).toLocaleString() : "Never"}</td>
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
    </PageShell>
  );
}
