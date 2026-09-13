// Scripts/createSuperAdmin.ts
//
// Cria (ou promove, se já existir) uma conta de super_admin com o
// email/senha/nome que você quiser — sem passar pelo cadastro normal, já
// que o super admin não é um dono de negócio de verdade.
//
// Uso: npm run create-admin -- --email=admin@yuu.com --password=SenhaForte123 --name="Admin YuU"
import { config } from "dotenv";
config({ path: "../.env" });
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";

const SALT_ROUNDS = 10;

const parseArgs = () => {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match && match[1] && match[2] !== undefined) {
      args[match[1]] = match[2];
    }
  }
  return args;
};

const run = async () => {
  const { email, password, name } = parseArgs();

  if (!email || !password) {
    console.error('Uso: npm run create-admin -- --email=admin@yuu.com --password=SenhaForte123 --name="Admin YuU"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres");
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);

  if (existing) {
    await db
      .update(usersTable)
      .set({ role: "super_admin", password: hashed })
      .where(eq(usersTable.id, existing.id));
    console.log(`Conta existente (id ${existing.id}) promovida a super_admin e senha atualizada.`);
  } else {
    // Placeholder único só pra satisfazer a coluna document (NOT NULL/unique)
    // — super admin não representa um negócio de verdade, não tem CPF/CNPJ real.
    const placeholderDocument = `ADMIN${Date.now()}`.slice(0, 20);

    const [created] = await db
      .insert(usersTable)
      .values({
        name: name?.trim() || "Administrador",
        document: placeholderDocument,
        password: hashed,
        email: cleanEmail,
        accountType: "establishment",
        homeService: false,
        businessType: "Administração da plataforma",
        aiStyle: "profissional",
        privacyAccepted: true,
        role: "super_admin",
      })
      .returning({ id: usersTable.id });

    console.log(`Conta criada (id ${created?.id}) com role super_admin.`);
  }

  console.log(`Login: ${cleanEmail} / senha informada`);
  process.exit(0);
};

run().catch((error) => {
  console.error("Erro ao criar/promover super admin:", error);
  process.exit(1);
});
