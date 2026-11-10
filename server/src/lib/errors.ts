import type { Request, Response, NextFunction } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export class NotFoundError extends Error {}

export function handleRouteError(err: unknown, res: Response) {
  if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P0002") {
    res.status(404).json({ error: { code: "not_found", message: "Resource not found" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
}
