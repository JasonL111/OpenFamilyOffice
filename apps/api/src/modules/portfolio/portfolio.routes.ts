import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../../middleware/audit.js";

export const portfolioRouter = Router();
portfolioRouter.use(authenticate);

// All holdings across the household's accounts, with instrument + account.
portfolioRouter.get("/holdings", async (req, res, next) => {
  try {
    const holdings = await prisma.holding.findMany({
      where: { account: { householdId: req.session!.householdId } },
      include: { instrument: true, account: { select: { id: true, name: true } } },
    });
    res.json(holdings);
  } catch (e) {
    next(e);
  }
});

// Create a holding: find-or-create the Instrument, then link it to an account.
portfolioRouter.post("/holdings", authorize("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      accountId: z.string().min(1),
      instrumentName: z.string().min(1),
      symbol: z.string().optional(),
      assetClass: z.enum([
        "EQUITY", "FIXED_INCOME", "FUND", "CASH",
        "CRYPTO", "REAL_ESTATE", "PRIVATE", "COMMODITY", "OTHER",
      ]),
      quantity: z.number().positive(),
      costBasis: z.number().optional(),
    }).parse(req.body);

    const account = await prisma.account.findFirst({
      where: { id: body.accountId, householdId: req.session!.householdId },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    let instrument = await prisma.instrument.findFirst({
      where: {
        symbol: body.symbol ?? null,
        assetClass: body.assetClass,
      },
    });
    if (!instrument) {
      instrument = await prisma.instrument.create({
        data: {
          name: body.instrumentName,
          symbol: body.symbol,
          assetClass: body.assetClass,
        },
      });
    }

    const holding = await prisma.holding.create({
      data: {
        accountId: body.accountId,
        instrumentId: instrument.id,
        quantity: body.quantity,
        costBasis: body.costBasis,
      },
      include: { instrument: true, account: { select: { id: true, name: true } } },
    });

    await audit(req, "holding.create", { type: "Holding", id: holding.id });
    res.status(201).json(holding);
  } catch (e) {
    next(e);
  }
});

// Allocation by asset class (current value uses the latest Price per instrument).
// TODO: time-weighted return (TWR) and money-weighted return (IRR) from
//       Transactions + Price history. This is the heart of "performance" —
//       build it next. See docs/PERFORMANCE.md (to be written).
portfolioRouter.get("/allocation", async (req, res, next) => {
  try {
    const holdings = await prisma.holding.findMany({
      where: { account: { householdId: req.session!.householdId } },
      include: {
        instrument: { include: { prices: { orderBy: { date: "desc" }, take: 1 } } },
      },
    });
    const byClass: Record<string, number> = {};
    for (const h of holdings) {
      const px = h.instrument.prices[0];
      const value = px ? Number(h.quantity) * Number(px.close) : 0;
      byClass[h.instrument.assetClass] = (byClass[h.instrument.assetClass] ?? 0) + value;
    }
    res.json(byClass);
  } catch (e) {
    next(e);
  }
});
