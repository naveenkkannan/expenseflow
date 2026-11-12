import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler } from "../lib/errors.js";
import {
  buildYearSummary,
  buildTypeSummary,
  yearSummaryToCsv,
  monthSummaryToCsv,
  type YearSummaryRow,
  type MonthSummary,
  type TypeSummaryRow,
} from "../lib/summary.js";

const router = Router();

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const typesQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

async function getCurrentYearMonth(): Promise<{ year: number; month: number }> {
  const result = await pool.query(
    "SELECT EXTRACT(YEAR FROM current_month_ist())::int AS year, EXTRACT(MONTH FROM current_month_ist())::int AS month"
  );
  return result.rows[0];
}

async function loadYearSummary(userId: string, year: number) {
  const [rowsResult, current] = await Promise.all([
    pool.query<YearSummaryRow>("SELECT * FROM fn_year_summary($1, $2)", [userId, year]),
    getCurrentYearMonth(),
  ]);
  return buildYearSummary(rowsResult.rows, year, current.year, current.month);
}

async function loadMonthSummary(userId: string, year: number, month: number): Promise<MonthSummary> {
  const result = await pool.query("SELECT fn_month_summary($1, $2, $3) AS data", [userId, year, month]);
  return result.rows[0].data;
}

router.get(
  "/year",
  asyncHandler(async (req, res) => {
    const parsed = yearQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year is required" } });
      return;
    }
    const summary = await loadYearSummary(req.userId!, parsed.data.year);
    res.json(summary);
  })
);

router.get(
  "/month",
  asyncHandler(async (req, res) => {
    const parsed = monthQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year and month are required" } });
      return;
    }
    const summary = await loadMonthSummary(req.userId!, parsed.data.year, parsed.data.month);
    res.json(summary);
  })
);

router.get(
  "/types",
  asyncHandler(async (req, res) => {
    const parsed = typesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year is required" } });
      return;
    }
    const { year, month } = parsed.data;
    const result = await pool.query<TypeSummaryRow>("SELECT * FROM fn_type_summary($1, $2, $3)", [
      req.userId,
      year,
      month ?? null,
    ]);
    res.json(buildTypeSummary(result.rows));
  })
);

router.get(
  "/year.csv",
  asyncHandler(async (req, res) => {
    const parsed = yearQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year is required" } });
      return;
    }
    const summary = await loadYearSummary(req.userId!, parsed.data.year);
    const csv = yearSummaryToCsv(summary);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="expense-flow-${parsed.data.year}.csv"`);
    res.send(csv);
  })
);

router.get(
  "/month.csv",
  asyncHandler(async (req, res) => {
    const parsed = monthQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year and month are required" } });
      return;
    }
    const { year, month } = parsed.data;
    const summary = await loadMonthSummary(req.userId!, year, month);
    const csv = monthSummaryToCsv(summary);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="expense-flow-${year}-${String(month).padStart(2, "0")}.csv"`
    );
    res.send(csv);
  })
);

export default router;
