import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../../middleware/audit.js";

// This module is the reference implementation. The other modules follow the
// same shape: authenticate -> validate (zod) -> scope by householdId -> audit.
export const accountsRouter = Router();
accountsRouter.use(authenticate);

const accountInput = z.object({
  name: z.string().min(1),
  type: z.enum([
    "CASH", "BANK", "BROKERAGE", "RETIREMENT", "CRYPTO",
    "REAL_ESTATE", "PRIVATE_EQUITY", "LOAN", "OTHER",
  ]),
  currency: z.string().length(3).default("USD"),
  institution: z.string().optional(),
  ownerMemberId: z.string().optional(),
  ownerEntityId: z.string().optional(),
});

// List all accounts in the household, with their latest valuation.
accountsRouter.get("/", async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { householdId: req.session!.householdId },
      include: { valuations: { orderBy: { date: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
    });
    res.json(accounts);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post("/", authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const data = accountInput.parse(req.body);
    const account = await prisma.account.create({
      data: { ...data, householdId: req.session!.householdId },
    });
    await audit(req, "account.create", { type: "Account", id: account.id });
    res.status(201).json(account);
  } catch (e) {
    next(e);
  }
});

// Net worth = sum of latest valuation per account, in the household base currency.
// NOTE (v1 simplification): assumes a single currency. Add FX conversion before
// mixing currencies — that's a deliberate TODO, not an oversight.
accountsRouter.get("/net-worth", async (req, res, next) => {
  try {
    const householdId = req.session!.householdId;
    const accounts = await prisma.account.findMany({
      where: { householdId },
      include: { valuations: { orderBy: { date: "desc" }, take: 1 } },
    });
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      const latest = a.valuations[0];
      if (!latest) continue;
      const v = Number(latest.value);
      if (a.type === "LOAN") liabilities += Math.abs(v);
      else assets += v;
    }
    res.json({ assets, liabilities, netWorth: assets - liabilities });
  } catch (e) {
    next(e);
  }
});

// Net-worth history: one data point per date that has at least one valuation.
// Assets minus liabilities (LOAN accounts count as liabilities), ascending by date.
accountsRouter.get("/net-worth/history", async (req, res, next) => {
  try {
    const householdId = req.session!.householdId;
    const accounts = await prisma.account.findMany({
      where: { householdId },
      include: { valuations: { orderBy: { date: "asc" } } },
    });

    // bucket valuations by date string (YYYY-MM-DD)
    const byDate = new Map<string, { assets: number; liabilities: number }>();
    for (const a of accounts) {
      const isLoan = a.type === "LOAN";
      for (const v of a.valuations) {
        const key = v.date.toISOString().slice(0, 10);
        let bucket = byDate.get(key);
        if (!bucket) {
          bucket = { assets: 0, liabilities: 0 };
          byDate.set(key, bucket);
        }
        const val = Number(v.value);
        if (isLoan) bucket.liabilities += Math.abs(val);
        else bucket.assets += val;
      }
    }

    const history = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { assets, liabilities }]) => ({
        date,
        netWorth: assets - liabilities,
      }));

    res.json(history);
  } catch (e) {
    next(e);
  }
});

// Record a point-in-time value for an account (drives net-worth-over-time).
accountsRouter.post("/:id/valuations", authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      date: z.coerce.date(),
      value: z.number(),
      currency: z.string().length(3).default("USD"),
    }).parse(req.body);

    const account = await prisma.account.findFirst({
      where: { id: req.params.id, householdId: req.session!.householdId },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const valuation = await prisma.valuation.upsert({
      where: { accountId_date: { accountId: account.id, date: body.date } },
      create: { accountId: account.id, ...body },
      update: { value: body.value, currency: body.currency },
    });
    await audit(req, "valuation.upsert", { type: "Account", id: account.id });
    res.status(201).json(valuation);
  } catch (e) {
    next(e);
  }
});
