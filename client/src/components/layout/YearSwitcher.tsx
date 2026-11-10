import { ChevronLeft, ChevronRight } from "lucide-react";
import { useYear } from "@/hooks/useYear";
import { Button } from "@/components/ui/button";

export function YearSwitcher() {
  const { year, setYear } = useYear();

  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-background px-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Previous year"
        onClick={() => setYear(year - 1)}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">{year}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Next year"
        onClick={() => setYear(year + 1)}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
