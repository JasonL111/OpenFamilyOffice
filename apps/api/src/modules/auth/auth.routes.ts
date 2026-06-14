import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import { signSession } from "../../auth/jwt.js";
import { authenticate } from "../../middleware/authenticate.js";
import { audit } from "../../middleware/audit.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function setSessionCookie(res: import("express").Response, token: string) {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookie.secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Bootstrap-or-login. The FIRST account ever created becomes the OWNER and
// gets a fresh Household. Afterwards, registration should be invite-only
// (TODO: gate behind an admin-issued invite token).
authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password } = credentials.parse(req.body);
    const existing = await prisma.user.count();
    if (existing > 0) {
      return res.status(403).json({ error: "Registration is invite-only" });
    }
    const household = await prisma.household.create({
      data: { name: "My Family Office" },
    });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role: "OWNER",
        householdId: household.id,
      },
    });
    const token = signSession({ sub: user.id, householdId: household.id, role: user.role });
    setSessionCookie(res, token);
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = credentials.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signSession({ sub: user.id, householdId: user.householdId, role: user.role });
    setSessionCookie(res, token);
    req.session = { sub: user.id, householdId: user.householdId, role: user.role };
    await audit(req, "auth.login");
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.cookie.name);
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const user = await prisma.user.findUnique({
      where: { id: req.session!.sub },
      select: { id: true, email: true, role: true, householdId: true },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});
