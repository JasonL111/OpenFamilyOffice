import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { prisma } from "../../db.js";
import { config } from "../../config.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../../middleware/audit.js";

export const documentsRouter = Router();
documentsRouter.use(authenticate);

// Files are stored on disk under DATA_DIR/documents with a random storage key.
// The DB only holds metadata + the pointer.
// TODO (security): encrypt files at rest. A self-hosted vault holding wills and
//       tax records should not store plaintext on disk. Wrap the write/read in
//       AES-256-GCM with a key from env or a KMS before going to production.
const uploadDir = path.join(config.dataDir, "documents");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const docMeta = z.object({
  title: z.string().min(1),
  category: z.enum([
    "LEGAL", "TAX", "INSURANCE", "ESTATE",
    "STATEMENT", "CONTRACT", "IDENTITY", "OTHER",
  ]).default("OTHER"),
  relatedMemberId: z.string().optional(),
  relatedEntityId: z.string().optional(),
  relatedAccountId: z.string().optional(),
});

documentsRouter.get("/", async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { householdId: req.session!.householdId },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (e) {
    next(e);
  }
});

documentsRouter.post(
  "/",
  authorize("OWNER", "ADMIN", "ADVISOR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const meta = docMeta.parse(req.body);
      const doc = await prisma.document.create({
        data: {
          ...meta,
          householdId: req.session!.householdId,
          storageKey: req.file.filename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          uploadedById: req.session!.sub,
        },
      });
      await audit(req, "document.upload", { type: "Document", id: doc.id });
      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  },
);

documentsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, householdId: req.session!.householdId },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    await audit(req, "document.download", { type: "Document", id: doc.id });
    res.download(path.join(uploadDir, doc.storageKey), doc.title);
  } catch (e) {
    next(e);
  }
});
