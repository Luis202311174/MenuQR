"use client";

import { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableItem = { id: string };

type SortableListProps<T extends SortableItem> = {
  items: T[];
  onReorder: (items: T[]) => void | Promise<void>;
  renderItem: (item: T, dragHandle?: ReactNode) => ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
  handleInside?: boolean;
  showHandle?: boolean;
  strategy?: SortingStrategy;
};

function SortableRow({
  id,
  children,
  disabled,
  handleInside,
  showHandle,
}: {
  id: string;
  children: (mobileDragHandle?: ReactNode) => ReactNode;
  disabled: boolean;
  handleInside: boolean;
  showHandle: boolean;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled });

  const dragHandle = handleInside && showHandle ? (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label="Drag to reorder"
      title="Drag to reorder"
      className="grid min-h-16 w-9 shrink-0 touch-none place-items-center self-stretch border-r border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <FontAwesomeIcon icon={faGripVertical} className="text-xs" />
    </button>
  ) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-w-0 items-start ${handleInside ? "gap-0" : "gap-2"} ${isDragging ? "z-10 opacity-60" : ""}`}
    >
      {!handleInside && showHandle && <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="mt-2 grid h-9 w-8 shrink-0 touch-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faGripVertical} className="text-xs" />
      </button>}
      <div className="min-w-0 flex-1">
        {children(dragHandle)}
      </div>
    </div>
  );
}

export default function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className = "space-y-3",
  disabled = false,
  label = "Reorder items",
  handleInside = false,
  showHandle = true,
  strategy = verticalListSortingStrategy,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    void onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={strategy}>
        <div role="list" aria-label={label} className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} disabled={disabled} handleInside={handleInside} showHandle={showHandle}>
              {(dragHandle) => renderItem(item, dragHandle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}