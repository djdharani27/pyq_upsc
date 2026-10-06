"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

type Option = { name: string; count?: number };

export function FilterDropdown({
  label,
  icon,
  options,
  selected,
  onChange,
  disabled,
  allLabel,
}: {
  label: string;
  icon?: React.ReactNode;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOne = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else onChange([...selected, name]);
  };

  const display =
    selected.length === 0
      ? allLabel || label
      : selected.length === 1
        ? selected[0]
        : `${label} (${selected.length})`;

  return (
    <div className="relative inline-block text-left" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
          disabled
            ? "cursor-not-allowed border-border bg-card opacity-50"
            : selected.length > 0
              ? "cursor-pointer border-primary/50 bg-primary/10 text-primary"
              : "cursor-pointer border-border bg-card text-foreground hover:bg-secondary"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {icon}
        <span className="max-w-[125px] truncate sm:max-w-[220px]">
          {display}
        </span>
        <svg
          className={`h-3.5 w-3.5 flex-none transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-border bg-popover p-3 shadow-xl scrollbar-thin sm:w-72">
          <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold text-foreground">
              Select {label}
            </span>
            <div className="flex gap-2 text-[0.7rem] font-medium">
              <button
                type="button"
                onClick={() => onChange(options.map((o) => o.name))}
                className="cursor-pointer text-primary hover:underline"
              >
                Select All
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="cursor-pointer text-muted-fg hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin">
            {options.map((opt) => {
              const active = selected.includes(opt.name);
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => toggleOne(opt.name)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary font-semibold text-primary-fg"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="truncate pr-2">{opt.name}</span>
                  <span className="flex flex-none items-center gap-1.5">
                    {typeof opt.count === "number" && (
                      <span
                        className={`text-[0.65rem] ${active ? "opacity-80" : "text-muted-fg"}`}
                      >
                        {opt.count}
                      </span>
                    )}
                    {active && <Check className="h-3 w-3 flex-none" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ActiveChips({
  label,
  items,
  onRemove,
  onClearAll,
}: {
  label: string;
  items: string[];
  onRemove: (name: string) => void;
  onClearAll: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
      <span className="mr-1 text-xs text-muted-fg">{label}:</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onRemove(item)}
          className="group inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          title={`Remove ${item}`}
        >
          <span className="max-w-[180px] truncate sm:max-w-xs">{item}</span>
          <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      {items.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 cursor-pointer text-[0.7rem] text-muted-fg underline hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
