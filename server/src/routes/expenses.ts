import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const gridQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = gridQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year is required" } });
      return;
    }
    const result = await pool.query("SELECT get_expense_grid($1, $2) AS data", [
      req.userId,
      parsed.data.year,
    ]);
    res.json(result.rows[0].data);
  })
);

const typeSchema = z.enum(["need", "want", "investment"]);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  groupId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  amount: z.number().positive(),
  activeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: typeSchema.optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid expense data" } });
      return;
    }
    const { name, groupId, color, amount, activeFrom, type } = parsed.data;
    const result = await pool.query(
      "SELECT create_expense($1, $2, $3, $4, $5, $6, $7) AS data",
      [req.userId, name, groupId ?? null, color, amount, activeFrom, type ?? "need"]
    );
    res.status(201).json(result.rows[0].data);
  })
);

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  groupId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  amount: z.number().positive().optional(),
  amountFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activeTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  type: typeSchema.optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "Invalid expense data" } });
      return;
    }
    const data = parsed.data;

    if (data.amount !== undefined && !data.amountFrom) {
      res.status(400).json({ error: { code: "invalid_input", message: "amountFrom is required with amount" } });
      return;
    }

    try {
      const hasBasicFields =
        data.name !== undefined || data.color !== undefined || data.type !== undefined || "activeTo" in req.body;
      if (hasBasicFields) {
        const clearActiveTo = "activeTo" in req.body && data.activeTo === null;
        await pool.query(
          "SELECT update_expense($1, $2, $3, NULL, $4, $5, $6, $7)",
          [
            req.userId,
            req.params.id,
            data.name ?? null,
            data.color ?? null,
            clearActiveTo ? null : data.activeTo ?? null,
            clearActiveTo,
            data.type ?? null,
          ]
        );
      }

      if ("groupId" in req.body) {
        await pool.query("SELECT set_expense_group($1, $2, $3)", [
          req.userId,
          req.params.id,
          data.groupId ?? null,
        ]);
      }

      if (data.amount !== undefined && data.amountFrom) {
        await pool.query("SELECT set_expense_amount($1, $2, $3, $4)", [
          req.userId,
          req.params.id,
          data.amountFrom,
          data.amount,
        ]);
      }

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
      await pool.query("SELECT delete_expense($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
