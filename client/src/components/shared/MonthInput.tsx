import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseValue(value: string): { year: number; month: number } {
  const [y, m] = value.split("-").map(Number);
  const now = new Date();
  return {
    year: Number.isFinite(y) ? y : now.getFullYear(),
    month: Number.isFinite(m) ? m : now.getMonth() + 1,
  };
}

function format(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// A plain two-dropdown month/year picker. Native <input type="month">
// is unreliable in some Android/PWA webviews (the picker commits a
// selection but the field silently reverts), so this avoids that
// platform quirk entirely.
export function MonthInput({
  id,
  value,
  onChange,
  disabled,
  yearSpan = 6,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  yearSpan?: number;
}) {
  const { year, month } = parseValue(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearSpan * 2 + 1 }, (_, i) => currentYear - yearSpan + i);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => a - b);

  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => onChange(format(year, Number(v)))} disabled={disabled}>
        <SelectTrigger id={id} className="flex-[2]" aria-label="Month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((label, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onChange(format(Number(v), month))} disabled={disabled}>
        <SelectTrigger className="flex-1" aria-label="Year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
