import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT list_groups($1) AS data", [req.userId]);
    res.json(result.rows[0].data);
  })
);

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "name is required" } });
      return;
    }
    const result = await pool.query("SELECT create_group($1, $2) AS data", [
      req.userId,
      parsed.data.name,
    ]);
    res.status(201).json(result.rows[0].data);
  })
);

const updateSchema = z.object({ name: z.string().trim().min(1).max(100) });

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "name is required" } });
      return;
    }
    try {
      const result = await pool.query("SELECT update_group($1, $2, $3) AS data", [
        req.userId,
        req.params.id,
        parsed.data.name,
      ]);
      res.json(result.rows[0].data);
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      await pool.query("SELECT delete_group($1, $2)", [req.userId, req.params.id]);
      res.status(204).send();
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
