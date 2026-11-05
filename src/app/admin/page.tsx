"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAdminNavigation, type AdminBusiness } from "@/app/admin/AdminLayoutShell";
import {
  ADMIN_RESOURCES,
  type AdminField,
  type AdminResource,
} from "@/lib/adminResources";

type RecordRow = Record<string, unknown>;

const columnLabels: Record<string, string> = {
  fname: "First name",
  lname: "Last name",
  buss_email: "Business email",
  other_ctgry: "Other category",
  fb: "Facebook",
  fp: "Facebook page",
  ig: "Instagram",
  gr: "Google Maps",
  is_paid: "Paid",
  is_active: "Active",
  is_required: "Required",
  is_available: "Available",
  is_reusable: "Reusable",
  is_trackable: "Inventory tracked",
  current_stock: "Current stock",
  daily_limit: "Daily limit",
  sort_order: "Display order",
  discount_type: "Discount type",
  discount_value: "Discount value",
  payment_method: "Payment method",
  reference_numb: "Payment reference",
  service_type: "Service type",
  total_amount: "Order total",
  total_sales: "Total sales",
  order_number: "Order number",
  created_at: "Created",
  updated_at: "Last updated",
  last_login_at: "Last sign-in",
  changed_at: "Changed",
  started_at: "Started",
  ended_at: "Ended",
  expires_at: "Expires",
  claimed_at: "Claimed",
  used_at: "Used",
  actor_name: "Changed by",
  changed_fields: "Changed fields",
  menu_desc: "Description",
};

const currencyColumns = new Set(["price", "bundle_price", "price_modifier", "amount", "total_amount", "total_sales"]);
const numericColumns = new Set([
  ...currencyColumns,
  "age",
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
  "daily_limit",
  "current_stock",
  "min_select",
  "max_select",
  "usage_limit",
  "usage_count",
  "discount_value",
  "discount_amount",
  "discount",
  "rating",
  "order_number",
  "total_orders",
  "total_guests",
  "senior_pwd_count",
  "sort_order",
  "position",
  "previous_stock",
  "new_stock",
]);

function isTechnicalIdColumn(column: string) {
  return column === "id" || column.endsWith("_id");
}

function columnLabel(column: string) {
  if (columnLabels[column]) return columnLabels[column];
  return column
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getReferenceResource(resourceName: string, fieldKey: string) {
  if (fieldKey === "owner_id") return "users";
  if (fieldKey === "menu_item_id") return "menu_items";
  if (fieldKey === "option_group_id") return "option_groups";
  if (fieldKey === "group_id") {
    return resourceName === "menu_item_options" ? "menu_item_option_groups" : "option_groups";
  }
  if (fieldKey === "bundle_id") return "menu_item_bundles";
  if (fieldKey === "staff_id") return "staff_accounts";
  if (fieldKey === "user_id") return "users";
  return null;
}

function referenceLabel(resourceName: string, row: RecordRow) {
  if (resourceName === "users") {
    const name = [row.fname, row.lname].filter((value) => typeof value === "string" && value).join(" ");
    return name || String(row.email ?? "User");
  }
  return String(row.name ?? row.full_name ?? row.table_number ?? row.email ?? row.code ?? "Record");
}

function readableStructuredValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => readableStructuredValue(item)).filter(Boolean).join("; ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => !isTechnicalIdColumn(key) && item !== null && item !== undefined && item !== "")
      .map(([key, item]) => `${columnLabel(key)}: ${readableStructuredValue(item)}`)
      .join(" · ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

function displayValue(value: unknown, column: string, record: RecordRow) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" || (typeof value === "string" && numericColumns.has(column) && value.trim() !== "")) {
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) {
      if (currencyColumns.has(column)) {
        const currency = typeof record.currency === "string" ? record.currency : "PHP";
        try {
          return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          }).format(number);
        } catch {
          return number.toLocaleString();
        }
      }
      return number.toLocaleString();
    }
  }
  if (typeof value === "number") return value.toLocaleString();
  if (column.endsWith("_at") || column === "date" || column.endsWith("_date")) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      const hasTime = String(value).includes("T") || String(value).includes(":");
      try {
        return new Intl.DateTimeFormat(undefined, hasTime
          ? { dateStyle: "medium", timeStyle: "short" }
          : { dateStyle: "medium" }).format(date);
      } catch {
        return String(value);
      }
    }
  }

  let normalizedValue = value;
  if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
    try {
      normalizedValue = JSON.parse(value);
    } catch {
      normalizedValue = value;
    }
  }
  if (Array.isArray(normalizedValue)) {
    return normalizedValue.length === 0
      ? "—"
      : normalizedValue.map((item) => readableStructuredValue(item)).filter(Boolean).join("; ");
  }
  if (typeof normalizedValue === "object") return readableStructuredValue(normalizedValue);
  return String(normalizedValue).replaceAll("_", " ");
}

function recordId(resource: AdminResource, row: RecordRow) {
  return (resource.keyColumns ?? [resource.idColumn])
    .map((column) => String(row[column]))
    .join("~");
}

function initialValue(field: AdminField, record?: RecordRow) {
  const value = record?.[field.key];
  if (value === undefined || value === null) {
    if (field.type === "boolean") return "false";
    if (field.type === "enum" && field.options?.length) return field.options[0];
    return "";
  }
  if (field.type === "json") return JSON.stringify(value, null, 2);
  if (field.type === "date") return String(value).slice(0, 10);
  return String(value);
}

function parseFieldValue(field: AdminField, value: string): unknown {
  if (value === "") return null;
  if (field.type === "boolean") return value === "true";
  if (field.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${field.label} must be a valid number.`);
    return parsed;
  }
  if (field.type === "json") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${field.label} must contain valid JSON.`);
    }
  }
  if (field.type === "date") return new Date(`${value}T00:00:00`).toISOString();
  return value;
}

export default function AdminPage() {
  const router = useRouter();
  const { resourceName, setResourceName, selectedBusiness, setSelectedBusiness } = useAdminNavigation();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState<Record<string, RecordRow[]>>({});

  const resource = ADMIN_RESOURCES[resourceName];
  const editableFields = useMemo(
    () => resource.fields.filter((item) => item.key !== "business_id"),
    [resource.fields],
  );

  useEffect(() => {
    setOffset(0);
    setSearch("");
    setSelectedRecord(null);
    setFormValues({});
    setNotice("");
  }, [resourceName, selectedBusiness?.id]);

  const authenticatedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const token = data.session?.access_token;
    if (!token) {
      router.replace("/admin/login");
      throw new Error("Please sign in with a platform-admin account.");
    }

    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  }, [router]);

  useEffect(() => {
    if (!selectedBusiness && resourceName !== "businesses") {
      setReferenceOptions({});
      return;
    }

    let cancelled = false;
    const businessId = selectedBusiness?.id;
    const references: Array<[string, string]> = editableFields.flatMap((item) => {
      const referenceResource = getReferenceResource(resourceName, item.key);
      return referenceResource ? [[item.key, referenceResource]] : [];
    });
    if (references.length === 0) {
      setReferenceOptions({});
      return;
    }

    async function loadReferences() {
      try {
        const options = await Promise.all(references.map(async ([fieldKey, referenceResource]) => {
            const params = new URLSearchParams({ limit: "100" });
            if (selectedBusiness && fieldKey !== "owner_id" && businessId) params.set("business_id", businessId);
            const response = await authenticatedFetch(`/api/admin/${referenceResource}?${params}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? `Unable to load ${referenceResource}.`);
          return [fieldKey, result.records ?? []] as const;
        }));
        if (!cancelled) setReferenceOptions(Object.fromEntries(options));
      } catch (referenceError) {
        if (!cancelled) {
          setError(referenceError instanceof Error ? referenceError.message : "Unable to load related records.");
        }
      }
    }

    void loadReferences();
    return () => { cancelled = true; };
  }, [authenticatedFetch, editableFields, resourceName, selectedBusiness]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "50",
        offset: String(offset),
      });
      if (selectedBusiness) params.set("business_id", selectedBusiness.id);
      if (search.trim()) params.set("search", search.trim());
      const response = await authenticatedFetch(`/api/admin/${resourceName}?${params}`);
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) router.replace("/admin/login");
        throw new Error(result.error ?? "Unable to load records.");
      }
      setRecords(result.records ?? []);
      setTotal(result.count ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, offset, resourceName, router, search, selectedBusiness]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  function startCreate() {
    if (!resource.create) return;
    setSelectedRecord(null);
    setFormValues(Object.fromEntries(editableFields.map((item) => [item.key, initialValue(item)])));
    setError("");
  }

  async function startEdit(row: RecordRow) {
    setError("");
    setNotice("");
    let record = row;
    if (resourceName === "users") {
      try {
        const params = new URLSearchParams({
          id: recordId(resource, row),
          business_id: selectedBusiness?.id ?? "",
        });
        const response = await authenticatedFetch(`/api/admin/users?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load account details.");
        record = result.record;
      } catch (editError) {
        setError(editError instanceof Error ? editError.message : "Unable to load account details.");
        return;
      }
    }
    setSelectedRecord(record);
    setFormValues(Object.fromEntries(editableFields.map((item) => [item.key, initialValue(item, record)])));
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      for (const item of editableFields) {
        const rawValue = formValues[item.key] ?? "";
        if (item.required && rawValue.trim() === "") {
          throw new Error(`${item.label} is required.`);
        }
        payload[item.key] = parseFieldValue(item, rawValue);
      }

      const isEditing = Boolean(selectedRecord);
      if (isEditing && selectedRecord) payload.id = recordId(resource, selectedRecord);
      if (selectedBusiness && resourceName !== "businesses") payload.business_id = selectedBusiness.id;
      const params = new URLSearchParams();
      if (selectedBusiness) params.set("business_id", selectedBusiness.id);
      const response = await authenticatedFetch(`/api/admin/${resourceName}?${params}`, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save record.");
      setSelectedRecord(null);
      setNotice(result.warning ?? "Changes saved.");
      await loadRecords();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(row: RecordRow) {
    const label = displayValue(row.name ?? row.full_name ?? row.code ?? "record", "name", row);
    if (!window.confirm(`Permanently delete "${label}"? Related or historical records may prevent deletion.`)) return;
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ id: recordId(resource, row) });
      if (selectedBusiness) params.set("business_id", selectedBusiness.id);
      const response = await authenticatedFetch(`/api/admin/${resourceName}?${params}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete record.");
      setNotice("Record deleted.");
      await loadRecords();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete record.");
    }
  }

  function renderField(item: AdminField) {
    const commonProps = {
      id: item.key,
      name: item.key,
      value: formValues[item.key] ?? "",
      required: item.required,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFormValues((current) => ({ ...current, [item.key]: event.target.value })),
      className: "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900",
    };

    const referenceResource = getReferenceResource(resourceName, item.key);
    if (referenceResource) {
      const options = referenceOptions[item.key] ?? [];
      return (
        <select {...commonProps}>
          <option value="">Select a record…</option>
          {options.map((row) => {
            const optionValue = recordId(ADMIN_RESOURCES[referenceResource], row);
            return <option key={optionValue} value={optionValue}>{referenceLabel(referenceResource, row)}</option>;
          })}
        </select>
      );
    }
    if (item.type === "json") {
      return <textarea {...commonProps} rows={4} spellCheck={false} />;
    }
    if (item.type === "enum") {
      return (
        <select {...commonProps}>
          <option value="">Select…</option>
          {item.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    if (item.type === "boolean") {
      return (
        <select {...commonProps}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    return (
      <input
        {...commonProps}
        type={item.type === "number" ? "number" : item.type === "date" ? "date" : "text"}
        step={item.type === "number" ? "any" : undefined}
      />
    );
  }

  const recordKeys = resource.columns.filter((column) =>
    !isTechnicalIdColumn(column) &&
    records.some((row) => row[column] !== undefined),
  );
  const pageSize = 50;

  if (!selectedBusiness) {
    return (
      <div className="text-slate-900">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4f65ff]">Platform directory</p>
            <h1 className="mt-1 text-2xl font-bold text-[#102A43]">Choose a restaurant</h1>
            <p className="mt-2 text-sm text-slate-600">Select a restaurant to manage its menu, orders, staff, promotions, and operations.</p>
          </div>
          {resource.create && (resourceName !== "businesses" || !selectedBusiness) && (
            <button onClick={startCreate} className="rounded-full bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#4f65ff]/20 transition hover:brightness-105">
              Add restaurant
            </button>
          )}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600">
            {loading ? "Loading restaurants…" : `${total.toLocaleString()} restaurant${total === 1 ? "" : "s"}`}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="Search restaurants"
              aria-label="Search restaurants"
              className="w-full rounded-xl border border-[#d8e3f7] bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-[#4f65ff] focus:ring-2 focus:ring-[#4f65ff]/15 sm:w-72"
            />
            <button onClick={() => void loadRecords()} className="rounded-xl border border-[#d8e3f7] bg-white px-4 py-2.5 text-sm font-semibold text-[#102A43] shadow-sm hover:bg-[#eef4ff]">
              Refresh
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

        {Object.keys(formValues).length > 0 && (
          <form onSubmit={saveRecord} className="mb-6 rounded-2xl border border-[#d8e3f7] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Add restaurant</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {editableFields.map((item) => (
                <label key={item.key} htmlFor={item.key} className="text-sm font-medium">
                  {item.label}{item.required ? " *" : ""}
                  {renderField(item)}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-[#4f65ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Create restaurant"}
              </button>
              <button type="button" onClick={() => setFormValues({})} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!loading && records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd7f0] bg-white p-10 text-center">
            <h2 className="font-semibold text-[#102A43]">No restaurants found</h2>
            <p className="mt-2 text-sm text-slate-600">{search ? "Try a different search." : "Restaurants will appear here after they are registered."}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((row) => {
              const restaurant: AdminBusiness = {
                id: String(row.id),
                name: String(row.name ?? "Unnamed restaurant"),
                slug: typeof row.slug === "string" ? row.slug : null,
                logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
                address: typeof row.address === "string" ? row.address : null,
                store_category: typeof row.store_category === "string" ? row.store_category : null,
                buss_email: typeof row.buss_email === "string" ? row.buss_email : null,
              };
              return (
                <button
                  type="button"
                  key={restaurant.id}
                  onClick={() => {
                    setSelectedBusiness(restaurant);
                    setResourceName("businesses");
                  }}
                  className="group overflow-hidden rounded-2xl border border-[#d8e3f7] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9eafff] hover:shadow-xl hover:shadow-[#4f65ff]/10"
                >
                  <div className="h-2 bg-gradient-to-r from-[#4f65ff] to-[#8e7ffd]" />
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {restaurant.logo_url ? (
                        <img src={restaurant.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover" />
                      ) : (
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#eef4ff] text-2xl font-bold text-[#4f65ff]">
                          {restaurant.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold text-[#102A43] group-hover:text-[#4f65ff]">{restaurant.name}</h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#4f65ff]">
                          {(restaurant.store_category ?? "restaurant").replaceAll("_", " ")}
                        </p>
                      </div>
                      <span aria-hidden="true" className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#4f65ff]">›</span>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      {restaurant.address && <p className="line-clamp-2">{restaurant.address}</p>}
                      {restaurant.buss_email && <p className="truncate">{restaurant.buss_email}</p>}
                      {restaurant.slug && <p className="truncate text-xs text-slate-400">menuqr.app/{restaurant.slug}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
          <span>{total === 0 ? "0 restaurants" : `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(offset - pageSize, 0))} className="rounded-xl border border-[#d8e3f7] bg-white px-4 py-2 disabled:opacity-50">Previous</button>
            <button disabled={offset + pageSize >= total || loading} onClick={() => setOffset(offset + pageSize)} className="rounded-xl border border-[#d8e3f7] bg-white px-4 py-2 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-900">
      <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4f65ff]">{selectedBusiness.name}</p>
              <h2 className="mt-1 text-xl font-semibold">{resource.label}</h2>
              <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
            </div>
            {resource.create && (
              <button onClick={startCreate} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Add {resource.label.toLowerCase().replace(/s$/, "")}
              </button>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={search}
              disabled={!resource.searchColumns?.length}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder={resource.searchColumns?.length ? `Search ${resource.label.toLowerCase()}` : "Search unavailable"}
              aria-label={`Search ${resource.label}`}
              className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button onClick={() => void loadRecords()} className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              Refresh
            </button>
          </div>

          {error && <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

          {selectedRecord !== null || (!selectedRecord && Object.keys(formValues).length > 0) ? (
            <form onSubmit={saveRecord} className="mb-6 rounded border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{selectedRecord ? "Edit record" : "Create record"}</h3>
                <button type="button" onClick={() => { setSelectedRecord(null); setFormValues({}); }} className="text-sm text-slate-600 underline">
                  Close
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {editableFields.map((item) => (
                  <label key={item.key} htmlFor={item.key} className="text-sm font-medium">
                    {item.label}{item.required ? " *" : ""}
                    {renderField(item)}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" disabled={saving} onClick={() => { setSelectedRecord(null); setFormValues({}); }} className="rounded border border-slate-300 px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {recordKeys.map((key) => <th key={key} className="whitespace-nowrap px-3 py-2 font-semibold">{columnLabel(key)}</th>)}
                  {(resource.update || resource.delete) && <th className="px-3 py-2 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-slate-600" colSpan={recordKeys.length + 1}>Loading…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-600" colSpan={recordKeys.length + 1}>No records found.</td></tr>
                ) : records.map((row) => (
                  <tr key={recordId(resource, row)} className="border-t border-slate-200 align-top">
                    {recordKeys.map((key) => {
                      const value = displayValue(row[key], key, row);
                      return (
                        <td key={key} title={value} className="max-w-xs px-3 py-2">
                          <span className="line-clamp-3 break-words">{value}</span>
                        </td>
                      );
                    })}
                    {(resource.update || resource.delete) && (
                      <td className="whitespace-nowrap px-3 py-2">
                        {resource.update && (
                          <button onClick={() => void startEdit(row)} className="mr-3 text-blue-700 underline">Edit</button>
                        )}
                        {resource.delete && (
                          <button onClick={() => void deleteRecord(row)} className="text-red-700 underline">Delete</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>{total === 0 ? "0 records" : `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(offset - pageSize, 0))} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50">
                Previous
              </button>
              <button disabled={offset + pageSize >= total || loading} onClick={() => setOffset(offset + pageSize)} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
      </section>
    </div>
  );
}
