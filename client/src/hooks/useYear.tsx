import * as React from "react";

interface YearContextValue {
  year: number;
  setYear: (year: number) => void;
}

const YearContext = React.createContext<YearContextValue | null>(null);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  return <YearContext.Provider value={{ year, setYear }}>{children}</YearContext.Provider>;
}

export function useYear(): YearContextValue {
  const ctx = React.useContext(YearContext);
  if (!ctx) {
    throw new Error("useYear must be used within a YearProvider");
  }
  return ctx;
}
