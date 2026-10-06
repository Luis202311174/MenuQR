"use client";

import { FormEvent, useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { useBusinessAuth } from "@/hooks/useBusinessAuth";
import SortableList from "@/components/business/SortableList";
import {
  createGlobalOptionGroup,
  createOptionChoice,
  deleteGlobalOptionGroup,
  deleteOptionChoice,
  fetchOptionGroupData,
  GlobalOptionGroup,
  OptionChoice,
  OptionGroupData,
  setOptionGroupArchived,
  setOptionGroupItems,
  updateGlobalOptionGroup,
  updateOptionChoice,
} from "@/utils/optionGroupsApi";
import { saveDisplayOrder } from "@/utils/reorderApi";

type GroupDraft = Pick<GlobalOptionGroup, "name" | "is_required" | "min_select" | "max_select">;
type ChoiceDraft = Pick<OptionChoice, "name" | "price_modifier" | "is_available">;
type OptionGroupsTab = "create" | "groups" | "archives";

const emptyData: OptionGroupData = { groups: [], items: [] };

export default function BusinessOptionGroupsPage() {
  const auth = useBusinessAuth("menu", "view");
  const [activeTab, setActiveTab] = useState<OptionGroupsTab>("groups");
  const [data, setData] = useState<OptionGroupData>(emptyData);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
  const [groupDrafts, setGroupDrafts] = useState<Record<string, GroupDraft>>({});
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, ChoiceDraft>>({});
  const [assignedItems, setAssignedItems] = useState<Record<string, string[]>>({});
  const [newGroup, setNewGroup] = useState<GroupDraft>({
    name: "",
    is_required: false,
    min_select: 0,
    max_select: 1,
  });
  const [newChoices, setNewChoices] = useState<Record<string, { name: string; price: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const menuPermission = auth.staffSession?.permissions.find((permission) => permission.module_name === "menu");
  const canCreate = auth.owner || Boolean(menuPermission?.can_create);
  const canEdit = auth.owner || Boolean(menuPermission?.can_edit);
  const canDelete = auth.owner || Boolean(menuPermission?.can_delete);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOptionGroupData();
      setData(result);
      setGroupDrafts(Object.fromEntries(result.groups.map((group) => [group.id, {
        name: group.name,
        is_required: group.is_required,
        min_select: group.min_select,
        max_select: group.max_select,
      }])));
      setChoiceDrafts(Object.fromEntries(result.groups.flatMap((group) => group.choices.map((choice) => [choice.id, {
        name: choice.name,
        price_modifier: Number(choice.price_modifier),
        is_available: choice.is_available,
      }]))));
      setAssignedItems(Object.fromEntries(result.groups.map((group) => [group.id, group.menu_item_ids])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load option groups.");
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = (groupId: string, update: (group: GlobalOptionGroup) => GlobalOptionGroup) => {
    setData((current) => ({
      ...current,
      groups: current.groups.map((group) => group.id === groupId ? update(group) : group),
    }));
  };

  useEffect(() => {
    if (auth.businessId) void loadData();
  }, [auth.businessId]);

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const createdGroup = await createGlobalOptionGroup(newGroup);
      setData((current) => ({ ...current, groups: [...current.groups, createdGroup] }));
      setGroupDrafts((current) => ({
        ...current,
        [createdGroup.id]: {
          name: createdGroup.name,
          is_required: createdGroup.is_required,
          min_select: createdGroup.min_select,
          max_select: createdGroup.max_select,
        },
      }));
      setAssignedItems((current) => ({ ...current, [createdGroup.id]: [] }));
      setExpandedGroupIds((current) => new Set(current).add(createdGroup.id));
      setNewGroup({ name: "", is_required: false, min_select: 0, max_select: 1 });
      setNotice("Option group created.");
      setActiveTab("groups");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create option group.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroup = async (groupId: string) => {
    const draft = groupDrafts[groupId];
    if (!draft) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedGroup = await updateGlobalOptionGroup(groupId, draft);
      updateGroup(groupId, (group) => ({ ...group, ...updatedGroup }));
      setGroupDrafts((current) => ({ ...current, [groupId]: draft }));
      setNotice("Option group updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update option group.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: GlobalOptionGroup) => {
    if (!window.confirm(`Delete "${group.name}" and remove it from all assigned menu items?`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteGlobalOptionGroup(group.id);
      setData((current) => ({
        ...current,
        groups: current.groups.filter((item) => item.id !== group.id),
      }));
      setExpandedGroupIds((current) => {
        const next = new Set(current);
        next.delete(group.id);
        return next;
      });
      setNotice("Option group deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete option group.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveGroup = async (group: GlobalOptionGroup) => {
    const nextArchivedState = group.is_active;
    const message = nextArchivedState
      ? `Archive "${group.name}"? It will be hidden from every linked menu until restored.`
      : `Restore "${group.name}" to linked menus?`;
    if (!window.confirm(message)) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedGroup = await setOptionGroupArchived(group.id, nextArchivedState);
      updateGroup(group.id, (current) => ({ ...current, is_active: updatedGroup.is_active }));
      setNotice(nextArchivedState ? "Option group archived." : "Option group restored.");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Failed to update option group status.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignItems = async (groupId: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const menuItemIds = assignedItems[groupId] ?? [];
      await setOptionGroupItems(groupId, menuItemIds);
      updateGroup(groupId, (group) => ({ ...group, menu_item_ids: menuItemIds }));
      setNotice("Menu item assignments saved.");
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign option group.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderGroups = async (orderedGroups: GlobalOptionGroup[]) => {
    setSaving(true);
    setError(null);
    try {
      await saveDisplayOrder("option-groups", orderedGroups.map((group) => group.id));
      const sortOrderById = new Map(orderedGroups.map((group, index) => [group.id, index]));
      setData((current) => ({
        ...current,
        groups: current.groups.map((group) => {
          const sort_order = sortOrderById.get(group.id);
          return sort_order === undefined ? group : { ...group, sort_order };
        }),
      }));
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder option groups.");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderChoices = async (groupId: string, orderedChoices: OptionChoice[]) => {
    setSaving(true);
    setError(null);
    try {
      await saveDisplayOrder("option-choices", orderedChoices.map((choice) => choice.id), groupId);
      updateGroup(groupId, (group) => ({ ...group, choices: orderedChoices }));
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder choices.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChoice = async (event: FormEvent<HTMLFormElement>, groupId: string) => {
    event.preventDefault();
    const draft = newChoices[groupId] ?? { name: "", price: "" };
    const price = Number(draft.price || 0);
    if (!draft.name.trim() || !Number.isFinite(price)) {
      setError("Enter a choice name and a valid price modifier.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const createdChoice = await createOptionChoice(groupId, { name: draft.name.trim(), price_modifier: price, is_available: true });
      updateGroup(groupId, (group) => ({ ...group, choices: [...group.choices, createdChoice] }));
      setChoiceDrafts((current) => ({
        ...current,
        [createdChoice.id]: {
          name: createdChoice.name,
          price_modifier: Number(createdChoice.price_modifier),
          is_available: createdChoice.is_available,
        },
      }));
      setNewChoices((current) => ({ ...current, [groupId]: { name: "", price: "" } }));
      setNotice("Choice added.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to add choice.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChoice = async (groupId: string, choiceId: string) => {
    const draft = choiceDrafts[choiceId];
    if (!draft || !draft.name.trim() || !Number.isFinite(Number(draft.price_modifier))) {
      setError("Enter a choice name and a valid price modifier.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedChoice = await updateOptionChoice(groupId, choiceId, { ...draft, name: draft.name.trim(), price_modifier: Number(draft.price_modifier) });
      updateGroup(groupId, (group) => ({
        ...group,
        choices: group.choices.map((choice) => choice.id === choiceId ? updatedChoice : choice),
      }));
      setChoiceDrafts((current) => ({
        ...current,
        [choiceId]: {
          name: updatedChoice.name,
          price_modifier: Number(updatedChoice.price_modifier),
          is_available: updatedChoice.is_available,
        },
      }));
      setNotice("Choice updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update choice.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChoice = async (groupId: string, choice: OptionChoice) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedChoice = await updateOptionChoice(groupId, choice.id, {
        name: choice.name,
        price_modifier: Number(choice.price_modifier),
        is_available: !choice.is_available,
      });
      updateGroup(groupId, (group) => ({
        ...group,
        choices: group.choices.map((currentChoice) => currentChoice.id === choice.id ? updatedChoice : currentChoice),
      }));
      setChoiceDrafts((current) => ({
        ...current,
        [choice.id]: {
          name: updatedChoice.name,
          price_modifier: Number(updatedChoice.price_modifier),
          is_available: updatedChoice.is_available,
        },
      }));
      setNotice(choice.is_available ? `${choice.name} is now unavailable.` : `${choice.name} is available again.`);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to change choice availability.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChoice = async (groupId: string, choice: OptionChoice) => {
    if (!window.confirm(`Remove "${choice.name}" from this option group?`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteOptionChoice(groupId, choice.id);
      updateGroup(groupId, (group) => ({
        ...group,
        choices: group.choices.filter((item) => item.id !== choice.id),
      }));
      setChoiceDrafts((current) => {
        const next = { ...current };
        delete next[choice.id];
        return next;
      });
      setNotice("Choice removed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove choice.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignedItem = (groupId: string, itemId: string) => {
    setAssignedItems((current) => {
      const currentIds = current[groupId] ?? [];
      return {
        ...current,
        [groupId]: currentIds.includes(itemId)
          ? currentIds.filter((id) => id !== itemId)
          : [...currentIds, itemId],
      };
    });
  };

  if (!auth.checked) return <div className="p-10">Loading...</div>;

  const activeGroups = data.groups.filter((group) => group.is_active);
  const archivedGroups = data.groups.filter((group) => !group.is_active);
  const visibleGroups = activeTab === "archives" ? archivedGroups : activeGroups;

  return (
    <PageShell
      title="Option Groups"
      subtitle="Build reusable modifiers and assign them to menu items."
      backHref="/business/menu"
    >
      <div className="mx-auto max-w-5xl space-y-8">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <div role="tablist" aria-label="Option group views" className="grid min-w-0 grid-cols-3 border-b border-slate-200">
          {canCreate && (
            <button
              id="option-group-tab-create"
              type="button"
              role="tab"
              aria-label="Create Option Group"
              aria-selected={activeTab === "create"}
              aria-controls="option-group-panel-create"
              onClick={() => setActiveTab("create")}
              className={`min-w-0 whitespace-nowrap border-b-2 px-1.5 py-3 text-[10px] font-semibold leading-tight transition sm:px-4 sm:text-sm sm:leading-normal ${activeTab === "create" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Option Group</span>
            </button>
          )}
          <button
            id="option-group-tab-groups"
            type="button"
            role="tab"
            aria-label={`Your Option Group, ${activeGroups.length}`}
            aria-selected={activeTab === "groups"}
            aria-controls="option-group-panel-groups"
            onClick={() => setActiveTab("groups")}
            className={`min-w-0 whitespace-nowrap border-b-2 px-1.5 py-3 text-[10px] font-semibold leading-tight transition sm:px-4 sm:text-sm sm:leading-normal ${activeTab === "groups" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <span className="sm:hidden">Groups ({activeGroups.length})</span>
            <span className="hidden sm:inline">Your Option Group ({activeGroups.length})</span>
          </button>
          <button
            id="option-group-tab-archives"
            type="button"
            role="tab"
            aria-label={`Archives, ${archivedGroups.length}`}
            aria-selected={activeTab === "archives"}
            aria-controls="option-group-panel-archives"
            onClick={() => setActiveTab("archives")}
            className={`min-w-0 whitespace-nowrap border-b-2 px-1.5 py-3 text-[10px] font-semibold leading-tight transition sm:px-4 sm:text-sm sm:leading-normal ${activeTab === "archives" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <span className="sm:hidden">Archives ({archivedGroups.length})</span>
            <span className="hidden sm:inline">Archives ({archivedGroups.length})</span>
          </button>
        </div>

        {canCreate && activeTab === "create" && (
          <section id="option-group-panel-create" role="tabpanel" aria-labelledby="option-group-tab-create">
          <form onSubmit={(event) => void handleCreateGroup(event)} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Create option group</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Group name
                <input
                  required
                  maxLength={80}
                  value={newGroup.name}
                  onChange={(event) => setNewGroup((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Wing Flavors"
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Minimum selections
                <input type="number" min="0" value={newGroup.min_select} onChange={(event) => setNewGroup((current) => ({ ...current, min_select: Number(event.target.value) }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Maximum selections
                <input type="number" min="1" value={newGroup.max_select} onChange={(event) => setNewGroup((current) => ({ ...current, max_select: Number(event.target.value) }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={newGroup.is_required} onChange={(event) => setNewGroup((current) => ({ ...current, is_required: event.target.checked }))} className="h-4 w-4 accent-blue-700" />
                Required selection
              </label>
              <button type="submit" disabled={saving || !newGroup.name.trim()} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Create group</button>
            </div>
          </form>
          </section>
        )}

        {activeTab !== "create" && (
        <section id={`option-group-panel-${activeTab}`} role="tabpanel" aria-labelledby={`option-group-tab-${activeTab}`}>
          <div className="mb-3 flex items-baseline justify-between border-b border-slate-200 pb-3">
            <h2 id={activeTab === "archives" ? "archives-heading" : "groups-heading"} className="text-lg font-bold text-slate-900">
              {activeTab === "archives" ? "Archives" : "Your Option Group"}
            </h2>
            <span className="text-sm text-slate-500">{visibleGroups.length}</span>
          </div>
          {loading ? <p className="py-6 text-sm text-slate-500">Loading option groups...</p> : visibleGroups.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">{activeTab === "archives" ? "No archived option groups." : "No option groups yet."}</p>
          ) : (
            <SortableList
              items={visibleGroups}
              onReorder={handleReorderGroups}
              className="space-y-5"
              disabled={!canEdit || saving || visibleGroups.length < 2}
              label={activeTab === "archives" ? "Reorder archived option groups" : "Reorder option groups"}
              renderItem={(group) => {
                const draft = groupDrafts[group.id] ?? group;
                const isExpanded = expandedGroupIds.has(group.id);
                const toggleExpanded = () => setExpandedGroupIds((current) => {
                  const next = new Set(current);
                  if (next.has(group.id)) next.delete(group.id);
                  else next.add(group.id);
                  return next;
                });
                return (
                  <article
                    key={group.id}
                    onClick={(event) => {
                      const target = event.target;
                      if (
                        !(target instanceof HTMLElement) ||
                        target.closest("button, input, select, textarea, a, [role='button'], [data-option-group-details]")
                      ) {
                        return;
                      }
                      toggleExpanded();
                    }}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`option-group-details-${group.id}`}
                        onClick={toggleExpanded}
                        className="min-w-0 flex-1 cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
                          {!group.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Archived</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{group.choices.length} choices · linked to {group.menu_item_ids.length} menu {group.menu_item_ids.length === 1 ? "item" : "items"}</p>
                      </button>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`option-group-details-${group.id}`}
                          onClick={toggleExpanded}
                          className="whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-3 sm:text-sm"
                        >
                          {isExpanded ? "Hide details" : "Edit details"}
                        </button>
                        {canEdit && <button type="button" disabled={saving} onClick={() => void handleArchiveGroup(group)} className="whitespace-nowrap rounded-lg border border-amber-300 px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50 sm:px-3 sm:text-sm">{group.is_active ? "Archive" : "Restore"}</button>}
                        {canDelete && <button type="button" disabled={saving} onClick={() => void handleDeleteGroup(group)} className="whitespace-nowrap rounded-lg border border-rose-300 px-2.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50 sm:px-3 sm:text-sm">Delete group</button>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div id={`option-group-details-${group.id}`} data-option-group-details className="mt-5">
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                        Group name
                        <input disabled={!canEdit} maxLength={80} value={draft.name} onChange={(event) => setGroupDrafts((current) => ({ ...current, [group.id]: { ...draft, name: event.target.value } }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 disabled:bg-slate-100" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Minimum selections
                        <input disabled={!canEdit} type="number" min="0" value={draft.min_select} onChange={(event) => setGroupDrafts((current) => ({ ...current, [group.id]: { ...draft, min_select: Number(event.target.value) } }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 disabled:bg-slate-100" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Maximum selections
                        <input disabled={!canEdit} type="number" min="1" value={draft.max_select} onChange={(event) => setGroupDrafts((current) => ({ ...current, [group.id]: { ...draft, max_select: Number(event.target.value) } }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 disabled:bg-slate-100" />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input disabled={!canEdit} type="checkbox" checked={draft.is_required} onChange={(event) => setGroupDrafts((current) => ({ ...current, [group.id]: { ...draft, is_required: event.target.checked } }))} className="h-4 w-4 accent-blue-700" />
                        Required selection
                      </label>
                      {canEdit && <button type="button" disabled={saving} onClick={() => void handleSaveGroup(group.id)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Save group</button>}
                    </div>

                      <div className="mt-6 border-t border-slate-200 pt-5">
                      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Choices</h4>
                        <span className="text-xs text-slate-500">Unavailable choices stay saved, but customers cannot select them.</span>
                      </div>
                      {group.choices.length === 0 ? <p className="py-3 text-sm text-slate-500">No choices added.</p> : (
                        <SortableList
                          items={group.choices}
                          onReorder={(orderedChoices) => handleReorderChoices(group.id, orderedChoices)}
                          className="divide-y divide-slate-200"
                          disabled={!canEdit || saving || group.choices.length < 2}
                          label={`Reorder ${group.name} choices`}
                          renderItem={(choice) => {
                            const choiceDraft = choiceDrafts[choice.id] ?? choice;
                            return (
                              <div key={choice.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                                <label className="text-xs font-semibold text-slate-600">
                                  Choice
                                  <input disabled={!canEdit} value={choiceDraft.name} onChange={(event) => setChoiceDrafts((current) => ({ ...current, [choice.id]: { ...choiceDraft, name: event.target.value } }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100" />
                                </label>
                                <label className="text-xs font-semibold text-slate-600">
                                  Price modifier
                                  <input disabled={!canEdit} type="number" step="0.01" value={choiceDraft.price_modifier} onChange={(event) => setChoiceDrafts((current) => ({ ...current, [choice.id]: { ...choiceDraft, price_modifier: Number(event.target.value) } }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100" />
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <input disabled={!canEdit || saving} type="checkbox" checked={choice.is_available} onChange={() => void handleToggleChoice(group.id, choice)} className="h-4 w-4 accent-emerald-700" />
                                    Available
                                  </label>
                                  {canEdit && <button type="button" disabled={saving} onClick={() => void handleSaveChoice(group.id, choice.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Save</button>}
                                  {canDelete && <button type="button" disabled={saving} onClick={() => void handleDeleteChoice(group.id, choice)} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Remove</button>}
                                </div>
                              </div>
                            );
                          }}
                        />
                      )}
                      {canCreate && (
                        <form onSubmit={(event) => void handleCreateChoice(event, group.id)} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                          <label className="text-xs font-semibold text-slate-600">
                            Add a choice
                            <input required maxLength={80} value={newChoices[group.id]?.name ?? ""} onChange={(event) => setNewChoices((current) => ({ ...current, [group.id]: { ...current[group.id], name: event.target.value, price: current[group.id]?.price ?? "" } }))} placeholder="e.g. Garlic Parmesan" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" />
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            Price modifier
                            <input type="number" step="0.01" value={newChoices[group.id]?.price ?? ""} onChange={(event) => setNewChoices((current) => ({ ...current, [group.id]: { ...current[group.id], name: current[group.id]?.name ?? "", price: event.target.value } }))} placeholder="0.00" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" />
                          </label>
                          <button type="submit" disabled={saving || !newChoices[group.id]?.name.trim()} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Add choice</button>
                        </form>
                      )}
                    </div>

                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Assigned menu items</h4>
                        {canEdit && <button type="button" disabled={saving} onClick={() => void handleAssignItems(group.id)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Save assignments</button>}
                      </div>
                      {data.items.length === 0 ? <p className="text-sm text-slate-500">Add menu items before assigning this group.</p> : (
                        <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                          {data.items.map((item) => (
                            <label key={item.id} className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              <input disabled={!canEdit} type="checkbox" checked={(assignedItems[group.id] ?? []).includes(item.id)} onChange={() => toggleAssignedItem(group.id, item.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700" />
                              <span className="min-w-0 break-words">{item.name}<span className="block text-xs text-slate-500">{item.category || "Uncategorized"}</span></span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                      </div>
                    )}
                  </article>
                );
              }}
            />
          )}
        </section>
        )}
      </div>
    </PageShell>
  );
}