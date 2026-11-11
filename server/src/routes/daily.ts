import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler } from "../lib/errors.js";

const router = Router();

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  tag_id: z.string().uuid().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = monthQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year and month are required" } });
      return;
    }
    const { year, month, tag_id } = parsed.data;
    const result = await pool.query("SELECT get_daily_month($1, $2, $3, $4) AS data", [
      req.userId,
      year,
      month,
      tag_id ?? null,
    ]);
    res.json(result.rows[0].data);
  })
);

router.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT get_spend_suggestions($1) AS data", [req.userId]);
    res.json(result.rows[0].data);
  })
);

export default router;
