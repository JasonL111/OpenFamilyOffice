import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import { signSession } from "../../auth/jwt.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../../middleware/audit.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const inviteInput = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "ADVISOR", "MEMBER", "VIEWER"]).default("MEMBER"),
  expiresInSeconds: z.number().int().min(1).max(7 * 24 * 3600).default(7 * 24 * 3600),
});

const registerWithToken = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string().min(1),
});

function setSessionCookie(res: import("express").Response, token: string) {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookie.secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const existing = await prisma.user.count();

    // Bootstrap: first user becomes OWNER with a fresh Household
    if (existing === 0) {
      const { email, password } = credentials.parse(req.body);
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
      return res.status(201).json({ id: user.id, email: user.email, role: user.role });
    }

    // Invite-only: must supply a valid invite token
    const { email, password, token } = registerWithToken.parse(req.body);
    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite) {
      return res.status(400).json({ error: "Invalid invite token" });
    }
    if (invite.usedAt) {
      return res.status(400).json({ error: "Invite token already used" });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invite token has expired" });
    }
    if (invite.email && invite.email !== email) {
      return res.status(400).json({ error: "Email does not match the invite" });
    }
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role: invite.role,
        householdId: invite.householdId,
        status: "ACTIVE",
      },
    });
    await prisma.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

    const session = signSession({ sub: user.id, householdId: user.householdId, role: user.role });
    setSessionCookie(res, session);

    req.session = { sub: user.id, householdId: user.householdId, role: user.role };
    await audit(req, "auth.register", { type: "InviteToken", id: invite.id });

    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
});

// Create an invite token (OWNER / ADMIN only)
authRouter.post("/invite", authenticate, authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const data = inviteInput.parse(req.body);
    const token = crypto.randomBytes(32).toString("hex");
    const invite = await prisma.inviteToken.create({
      data: {
        token,
        householdId: req.session!.householdId,
        role: data.role,
        email: data.email,
        createdById: req.session!.sub,
        expiresAt: new Date(Date.now() + data.expiresInSeconds * 1000),
      },
    });
    await audit(req, "auth.invite", { type: "InviteToken", id: invite.id });
    res.status(201).json({ token: invite.token, role: invite.role, email: invite.email, expiresAt: invite.expiresAt });
  } catch (e) {
    next(e);
  }
});

// Validate an invite token (for frontend to check before showing the form)
authRouter.get("/invite/:token", async (req, res, next) => {
  try {
    const invite = await prisma.inviteToken.findUnique({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.usedAt) return res.status(410).json({ error: "Invite already used" });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: "Invite has expired" });
    res.json({ email: invite.email, role: invite.role, expiresAt: invite.expiresAt });
  } catch (e) {
    next(e);
  }
});

// List invite tokens for the current household (OWNER / ADMIN only)
authRouter.get("/invites", authenticate, authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const invites = await prisma.inviteToken.findMany({
      where: { householdId: req.session!.householdId },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, email: true, role: true, usedAt: true, expiresAt: true, createdAt: true },
    });
    res.json(invites);
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
