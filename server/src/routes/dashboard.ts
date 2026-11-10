import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { asyncHandler, handleRouteError } from "../lib/errors.js";

const router = Router();

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: "invalid_input", message: "year and month are required" } });
      return;
    }

    try {
      const result = await pool.query("SELECT get_dashboard($1, $2, $3) AS data", [
        req.userId,
        parsed.data.year,
        parsed.data.month,
      ]);
      res.json(result.rows[0].data);
    } catch (err) {
      handleRouteError(err, res);
    }
  })
);

export default router;
