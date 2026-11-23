import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const directionSchema = z.enum(["owed_to_me", "i_owe"]);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT list_debts($1) AS data", [req.userId]);
    res.json(result.rows[0].data);
  })
);

const createSchema = z.object({
  personName: z.string().trim().min(1).max(100),
  direction: directionSchema,
  principal: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().trim().max(500).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid debt data" } });
      return;
    }
    const { personName, direction, principal, dueDate, note } = parsed.data;
    const result = await pool.query(
      "SELECT create_debt($1, $2, $3, $4, $5, $6) AS data",
      [req.userId, personName, direction, principal, dueDate ?? null, note ?? null]
    );
    res.status(201).json(result.rows[0].data);
  })
);

const updateSchema = z.object({
  personName: z.string().trim().min(1).max(100).optional(),
  direction: directionSchema.optional(),
  principal: z.number().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid debt data" } });
      return;
    }
    const data = parsed.data;
    const clearDueDate = "dueDate" in req.body && data.dueDate === null;
    const clearNote = "note" in req.body && data.note === null;
    try {
      await pool.query(
        "SELECT update_debt($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          req.userId,
          req.params.id,
          data.personName ?? null,
          data.direction ?? null,
          data.principal ?? null,
          clearDueDate ? null : data.dueDate ?? null,
          clearDueDate,
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
      await pool.query("SELECT delete_debt($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
