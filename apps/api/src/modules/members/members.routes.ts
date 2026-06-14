import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../../middleware/audit.js";

export const membersRouter = Router();
membersRouter.use(authenticate);

const memberInput = z.object({
  fullName: z.string().min(1),
  relation: z.string().optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  notes: z.string().optional(),
});

membersRouter.get("/", async (req, res, next) => {
  try {
    const members = await prisma.member.findMany({
      where: { householdId: req.session!.householdId },
      orderBy: { fullName: "asc" },
    });
    res.json(members);
  } catch (e) {
    next(e);
  }
});

membersRouter.post("/", authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const data = memberInput.parse(req.body);
    const member = await prisma.member.create({
      data: { ...data, householdId: req.session!.householdId },
    });
    await audit(req, "member.create", { type: "Member", id: member.id });
    res.status(201).json(member);
  } catch (e) {
    next(e);
  }
});

// TODO: PATCH /:id, DELETE /:id, and invite-to-user flow
//       (create a User with role + INVITED status linked to this member).
