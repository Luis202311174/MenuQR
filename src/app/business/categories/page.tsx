"use client";

import { FormEvent, useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import SortableList from "@/components/business/SortableList";
import { saveDisplayOrder } from "@/utils/reorderApi";
import {
  createMenuCategory,
  deleteMenuCategory,
  fetchMenuCategories,
  MenuCategory,
  updateMenuCategory,
} from "@/utils/menuCategoriesApi";

type CategoriesTab = "categories" | "archives";

export default function BusinessCategoriesPage() {
  const auth = useBusinessAuth("menu", "view");
  const [activeTab, setActiveTab] = useState<CategoriesTab>("categories");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const menuPermission = auth.staffSession?.permissions.find((permission) => permission.module_name === "menu");
  const canCreate = auth.owner || Boolean(menuPermission?.can_create);
  const canEdit = auth.owner || Boolean(menuPermission?.can_edit);
  const canDelete = auth.owner || Boolean(menuPermission?.can_delete);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchMenuCategories(true));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.businessId) void loadCategories();
  }, [auth.businessId]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createMenuCategory(newName);
      setNewName("");
      setNotice("Category added.");
      await loadCategories();
      setActiveTab("categories");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to add category.");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>, categoryId: string) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateMenuCategory(categoryId, "rename", editingName);
      setEditingId(null);
      setNotice("Category renamed. Menu items were updated too.");
      await loadCategories();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Failed to rename category.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (category: MenuCategory, action: "archive" | "restore") => {
    const message = action === "archive"
      ? `Archive "${category.name}"? Existing menu items will keep this category.`
      : `Restore "${category.name}" for new menu items?`;
    if (!window.confirm(message)) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateMenuCategory(category.id, action);
      setNotice(action === "archive" ? "Category archived." : "Category restored.");
      await loadCategories();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: MenuCategory) => {
    if (!window.confirm(`Permanently delete the unused category "${category.name}"?`)) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteMenuCategory(category.id);
      setNotice("Category deleted.");
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete category.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderCategories = (orderedCategories: MenuCategory[]) => {
    const isActiveOrder = orderedCategories[0]?.is_active ?? true;
    let nextIndex = 0;
    setCategories((current) => current.map((category) =>
      category.is_active === isActiveOrder
        ? orderedCategories[nextIndex++]
        : category
    ));
    setError(null);
    setNotice(null);
  };

  const handleEditModeToggle = async () => {
    if (!editMode) {
      setError(null);
      setNotice(null);
      setEditingId(null);
      setEditMode(true);
      return;
    }

    if (categories.length === 0) {
      setEditMode(false);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveDisplayOrder("categories", [
        ...activeCategories,
        ...archivedCategories,
      ].map((category) => category.id));
      await loadCategories();
      setEditingId(null);
      setEditMode(false);
      setNotice("Category order saved.");
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder categories.");
    } finally {
      setSaving(false);
    }
  };

  if (!auth.checked) return <div className="p-10">Loading...</div>;

  const activeCategories = categories.filter((category) => category.is_active);
  const archivedCategories = categories.filter((category) => !category.is_active);
  const renderEditButton = () => canEdit && (
    <button
      type="button"
      disabled={saving}
      aria-pressed={editMode}
      onClick={() => void handleEditModeToggle()}
      aria-label={editMode ? "Save category order" : "Edit category order"}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold sm:text-sm ${
        editMode
          ? "bg-blue-700 text-white hover:bg-blue-800"
          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {editMode ? "Done" : "Edit"}
    </button>
  );

  const renderCategory = (category: MenuCategory) => (
    <div className="border-b border-slate-200 last:border-b-0">
      {editingId === category.id ? (
        <form
          onSubmit={(event) => void handleRename(event, category.id)}
          className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3 sm:py-4"
        >
          <label className="sr-only" htmlFor={`rename-${category.id}`}>Category name</label>
          <input
            id={`rename-${category.id}`}
            autoFocus
            maxLength={60}
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-blue-600 sm:px-3 sm:text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !editingName.trim()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-4">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-slate-900 sm:text-base">{category.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
              {category.item_count} menu {category.item_count === 1 ? "item" : "items"}
              {!category.is_active && " · Archived"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {canEdit && editMode && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-3 sm:text-sm"
              >
                Rename
              </button>
            )}
            {category.is_active && canDelete && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleStatusChange(category, "archive")}
                className="rounded-lg border border-amber-300 px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50 sm:px-3 sm:text-sm"
              >
                Archive
              </button>
            )}
            {!category.is_active && canEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleStatusChange(category, "restore")}
                className="rounded-lg border border-emerald-300 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 sm:px-3 sm:text-sm"
              >
                Restore
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={saving || category.item_count > 0}
                title={category.item_count > 0 ? "Archive categories that still contain menu items." : "Delete category"}
                onClick={() => void handleDelete(category)}
                className="rounded-lg border border-rose-300 px-2.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PageShell
      title="Categories"
      subtitle="Create and organize the categories used by your menu."
      backHref="/business/menu"
    >
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-8">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <div role="tablist" aria-label="Category views" className="grid min-w-0 grid-cols-2 border-b border-slate-200">
          <button
            id="categories-tab-list"
            type="button"
            role="tab"
            aria-label={`Categories, ${activeCategories.length} active`}
            aria-selected={activeTab === "categories"}
            aria-controls="categories-panel-list"
            onClick={() => setActiveTab("categories")}
            className={`min-w-0 whitespace-nowrap border-b-2 px-1.5 py-3 text-[10px] font-semibold leading-tight transition sm:px-4 sm:text-sm sm:leading-normal ${activeTab === "categories" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            Categories ({activeCategories.length})
          </button>
          <button
            id="categories-tab-archives"
            type="button"
            role="tab"
            aria-label={`Archives, ${archivedCategories.length}`}
            aria-selected={activeTab === "archives"}
            aria-controls="categories-panel-archives"
            onClick={() => setActiveTab("archives")}
            className={`min-w-0 whitespace-nowrap border-b-2 px-1.5 py-3 text-[10px] font-semibold leading-tight transition sm:px-4 sm:text-sm sm:leading-normal ${activeTab === "archives" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <span className="sm:hidden">Archives ({archivedCategories.length})</span>
            <span className="hidden sm:inline">Archives ({archivedCategories.length})</span>
          </button>
        </div>

        {activeTab === "categories" && (
          <section
            id="categories-panel-list"
            role="tabpanel"
            aria-labelledby="categories-tab-list"
          >
            {canCreate && (
              <form onSubmit={(event) => void handleCreate(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                  New category
                  <input
                    maxLength={60}
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Breakfast"
                    className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-600"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving || !newName.trim()}
                  className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Add category
                </button>
              </form>
            )}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <h2 className="text-sm font-bold text-slate-900 sm:text-lg">Active Categories</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 sm:text-sm">{activeCategories.length}</span>
                {renderEditButton()}
              </div>
            </div>
            {loading ? (
              <p className="py-4 text-xs text-slate-500 sm:py-6 sm:text-sm">Loading categories...</p>
            ) : activeCategories.length ? (
              <SortableList
                items={activeCategories}
                onReorder={handleReorderCategories}
                renderItem={renderCategory}
                className="divide-y divide-slate-200"
                disabled={!canEdit || !editMode || saving || activeCategories.length < 2}
                label="Reorder categories"
                showHandle={editMode}
              />
            ) : (
              <p className="py-4 text-xs text-slate-500 sm:py-6 sm:text-sm">No active categories yet.</p>
            )}
          </section>
        )}
        {activeTab === "archives" && (
          <section
            id="categories-panel-archives"
            role="tabpanel"
            aria-labelledby="categories-tab-archives"
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 sm:mb-3 sm:gap-3 sm:pb-3">
              <h2 className="text-sm font-bold text-slate-900 sm:text-lg">Archived Categories</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 sm:text-sm">{archivedCategories.length}</span>
                {renderEditButton()}
              </div>
            </div>
            {loading ? (
              <p className="py-4 text-xs text-slate-500 sm:py-6 sm:text-sm">Loading categories...</p>
            ) : archivedCategories.length ? (
              <SortableList
                items={archivedCategories}
                onReorder={handleReorderCategories}
                renderItem={renderCategory}
                className="divide-y divide-slate-200"
                disabled={!canEdit || !editMode || saving || archivedCategories.length < 2}
                label="Reorder archived categories"
                showHandle={editMode}
              />
            ) : (
              <p className="py-4 text-xs text-slate-500 sm:py-6 sm:text-sm">No archived categories.</p>
            )}
          </section>
        )}
      </div>
    </PageShell>
  );
}