import * as React from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { YearSwitcher } from "@/components/layout/YearSwitcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ title, subtitle, actions, hideYearSwitcher, children }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  hideYearSwitcher?: boolean;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-secondary/40 print:bg-white">
      <Sidebar className="hidden md:flex" />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar className="relative z-50 flex" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-white px-4 py-4 print:hidden sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hideYearSwitcher && <YearSwitcher />}
            {actions}
          </div>
        </header>

        <main className={cn("flex-1 px-4 py-6 pb-24 print:p-0 md:px-8 md:pb-6")}>{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
