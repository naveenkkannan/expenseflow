import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

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

export default app;
