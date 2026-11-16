import { seedDatabase } from "../src/lib/seed-data";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding KO Builders Custom Home Selections & Takeoff Portal...");
  const result = await seedDatabase();
  console.log(`Seeded project: ${result.projectName} (${result.projectId})`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
