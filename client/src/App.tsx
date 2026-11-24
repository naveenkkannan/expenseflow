import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Summary from "@/pages/Summary";
import Debts from "@/pages/Debts";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/debts" element={<Debts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
