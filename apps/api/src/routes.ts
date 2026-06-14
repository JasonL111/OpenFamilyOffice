import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { membersRouter } from "./modules/members/members.routes.js";
import { accountsRouter } from "./modules/accounts/accounts.routes.js";
import { portfolioRouter } from "./modules/portfolio/portfolio.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";

export const api = Router();

api.get("/health", (_req, res) => res.json({ ok: true }));
api.use("/auth", authRouter);
api.use("/members", membersRouter);
api.use("/accounts", accountsRouter);
api.use("/portfolio", portfolioRouter);
api.use("/documents", documentsRouter);
