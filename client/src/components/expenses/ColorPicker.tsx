import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#3b82f6",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
];

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Use color ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "h-8 w-8 shrink-0 rounded-full ring-offset-2 transition-shadow",
            value.toLowerCase() === c ? "ring-2 ring-ring" : ""
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-input">
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -left-1 -top-1 h-10 w-10 cursor-pointer"
        />
      </label>
    </div>
  );
}
