import type { NextFunction, Request, Response } from "express";

// Simple role gate. Extend to a permission matrix when modules grow.
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.session?.role;
    if (!role || (roles.length && !roles.includes(role))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
