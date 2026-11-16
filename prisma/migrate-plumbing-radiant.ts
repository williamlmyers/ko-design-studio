import { prisma } from "../src/lib/prisma";
import { ensureSplitPlumbingAndRadiantTrades } from "../src/lib/seed-data";

async function main() {
  console.log("Running non-destructive Plumbing Fixtures & Hydronic Radiant trade split migration...");
  await ensureSplitPlumbingAndRadiantTrades();

  const trades = await prisma.tradeCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { selections: true } },
    },
  });

  console.log("Active Trade Categories after migration:");
  for (const t of trades) {
    console.log(`  [${t.sortOrder}] ${t.name} (${t.slug}) -> ${t._count.selections} items`);
  }
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
