import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import { YearProvider } from "@/hooks/useYear";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <YearProvider>
        <App />
        <Toaster richColors position="top-right" />
      </YearProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
