"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode } from "react";
import { GripVertical } from "lucide-react";

export function SortableWidget({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="relative group">
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded"
          style={{ color: "var(--color-ft-text-3)" }}
          aria-label="Reorder widget"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
