import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requireAuth } from "./auth/middleware.js";
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import expensesRouter from "./routes/expenses.js";
import groupsRouter from "./routes/groups.js";
import paymentsRouter from "./routes/payments.js";
import dailyRouter from "./routes/daily.js";
import spendsRouter from "./routes/spends.js";
import spendTagsRouter from "./routes/spend-tags.js";
import summaryRouter from "./routes/summary.js";

const app = express();

// Render terminates TLS at its proxy, so Express must trust the
// X-Forwarded-* headers to see requests as secure/https (needed for
// the Secure session cookie and accurate req.ip in rate limiting).
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({ error: { code: "forbidden_origin", message: "Origin not allowed" } });
      return;
    }
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/groups", requireAuth, groupsRouter);
app.use("/api/payments", requireAuth, paymentsRouter);
app.use("/api/daily", requireAuth, dailyRouter);
app.use("/api/spends", requireAuth, spendsRouter);
app.use("/api/spend-tags", requireAuth, spendTagsRouter);
app.use("/api/summary", requireAuth, summaryRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Not found" } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
});

export default app;
