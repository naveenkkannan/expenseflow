import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const listQuerySchema = z.object({
  expense_id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid query params" } });
      return;
    }
    const { expense_id, year, month } = parsed.data;
    const result = await pool.query("SELECT list_payments($1, $2, $3, $4) AS data", [
      req.userId,
      expense_id ?? null,
      year ?? null,
      month ?? null,
    ]);
    res.json(result.rows[0].data);
  })
);

const createSchema = z.object({
  expenseId: z.string().uuid(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid payment data" } });
      return;
    }
    try {
      const { expenseId, paidOn, amount, note } = parsed.data;
      const result = await pool.query(
        "SELECT create_payment($1, $2, $3, $4, $5) AS data",
        [req.userId, expenseId, paidOn, amount, note ?? null]
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
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid payment data" } });
      return;
    }
    try {
      const { paidOn, amount, note } = parsed.data;
      await pool.query("SELECT update_payment($1, $2, $3, $4, $5)", [
        req.userId,
        req.params.id,
        paidOn ?? null,
        amount ?? null,
        note ?? null,
      ]);
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
      await pool.query("SELECT delete_payment($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
