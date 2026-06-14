import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("[seed] users already exist, skipping");
    return;
  }
  const household = await prisma.household.create({
    data: { name: "Demo Family Office", baseCurrency: "USD" },
  });
  await prisma.user.create({
    data: {
      email: "owner@example.com",
      passwordHash: await bcrypt.hash("changeme123", 12),
      role: "OWNER",
      householdId: household.id,
    },
  });
  const member = await prisma.member.create({
    data: { householdId: household.id, fullName: "Jane Founder", relation: "principal" },
  });
  const account = await prisma.account.create({
    data: {
      householdId: household.id,
      name: "Joint Brokerage",
      type: "BROKERAGE",
      currency: "USD",
      ownerMemberId: member.id,
    },
  });
  await prisma.valuation.create({
    data: { accountId: account.id, date: new Date(), value: 1250000 },
  });
  console.log("[seed] done. Login: owner@example.com / changeme123");
}

main().finally(() => prisma.$disconnect());
