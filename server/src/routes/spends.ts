import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const paymentMethodSchema = z.enum(["upi", "card", "cash"]);

const createSchema = z.object({
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  tagId: z.string().uuid().nullable().optional(),
  paymentMethod: paymentMethodSchema,
  note: z.string().trim().max(500).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid spend data" } });
      return;
    }
    const { spentOn, amount, tagId, paymentMethod, note } = parsed.data;
    const result = await pool.query(
      "SELECT add_spend($1, $2, $3, $4, $5, $6) AS data",
      [req.userId, spentOn, amount, tagId ?? null, paymentMethod, note ?? null]
    );
    res.status(201).json(result.rows[0].data);
  })
);

const updateSchema = z.object({
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  tagId: z.string().uuid().nullable().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid spend data" } });
      return;
    }
    const data = parsed.data;
    const clearTag = "tagId" in req.body && data.tagId === null;
    const clearNote = "note" in req.body && data.note === null;
    try {
      await pool.query(
        "SELECT update_spend($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          req.userId,
          req.params.id,
          data.spentOn ?? null,
          data.amount ?? null,
          clearTag ? null : data.tagId ?? null,
          clearTag,
          data.paymentMethod ?? null,
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
      await pool.query("SELECT delete_spend($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
