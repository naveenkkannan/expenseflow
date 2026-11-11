import * as React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, Eye, EyeOff, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useMe } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

const BRAND_COLORS = ["#3b82f6", "#16a34a", "#ea580c", "#7c3aed"];

export default function Login() {
  const { data: user, isLoading } = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isLoading && user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[480px] lg:shrink-0 lg:px-14">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Expense Flow</span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and password to open your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={login.isPending} className="mt-2">
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-zinc-950 px-14 py-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <BadgeCheck className="h-4 w-4" />
          Expense flow
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Plan it. Pay it. Track it.
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            See where your money goes each month and what is still left to pay.
          </p>
        </div>

        <div className="flex gap-2">
          {BRAND_COLORS.map((color) => (
            <span
              key={color}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
