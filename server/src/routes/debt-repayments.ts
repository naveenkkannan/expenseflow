import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const listQuerySchema = z.object({
  debt_id: z.string().uuid(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "debt_id is required" } });
      return;
    }
    const result = await pool.query("SELECT list_debt_repayments($1, $2) AS data", [
      req.userId,
      parsed.data.debt_id,
    ]);
    res.json(result.rows[0].data);
  })
);

const createSchema = z.object({
  debtId: z.string().uuid(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid repayment data" } });
      return;
    }
    const { debtId, paidOn, amount, note } = parsed.data;
    try {
      const result = await pool.query(
        "SELECT add_debt_repayment($1, $2, $3, $4, $5) AS data",
        [req.userId, debtId, paidOn, amount, note ?? null]
      );
      res.status(201).json(result.rows[0].data);
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

const updateSchema = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid repayment data" } });
      return;
    }
    const data = parsed.data;
    const clearNote = "note" in req.body && data.note === null;
    try {
      await pool.query(
        "SELECT update_debt_repayment($1, $2, $3, $4, $5, $6)",
        [
          req.userId,
          req.params.id,
          data.paidOn ?? null,
          data.amount ?? null,
          clearNote ? null : data.note ?? null,
          clearNote,
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      await pool.query("SELECT delete_debt_repayment($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
