import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { verifySession, type SessionToken } from "../auth/jwt.js";

// Augment Express Request with the authenticated session.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionToken;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[config.cookie.name];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.session = verifySession(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
