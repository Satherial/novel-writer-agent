import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crea utente di test
  const existingUser = await prisma.user.findUnique({
    where: { email: "test@example.com" },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password: hashedPassword,
      },
    });

    console.log("✅ Utente di test creato:", user.email);
  } else {
    console.log("ℹ️ Utente di test già esistente");
  }
}

main()
  .catch((e) => {
    console.error("❌ Errore seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
