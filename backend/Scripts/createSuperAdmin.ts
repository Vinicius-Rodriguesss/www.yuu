// Scripts/createSuperAdmin.ts
//
// Cria (ou promove, se já existir) uma conta de super_admin com o
// email/senha/nome que você quiser — sem passar pelo cadastro normal, já
// que o super admin não é um dono de negócio de verdade.
//
// Uso interativo (pergunta email, senha e nome passo a passo):
//   npm run create-admin
// Uso direto (tudo em uma linha, se preferir):
//   npm run create-admin -- --email=admin@yuu.com --password=SenhaForte123 --name="Admin YuU"
import { config } from "dotenv";
config({ path: "../.env" });
import { createInterface } from "node:readline/promises";
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

// Pergunta passo a passo o que faltar (email/senha/nome). A senha aparece
// visível no terminal — não tem como esconder digitação sem libs extras,
// mas é uma conta interna, não algo digitado em tela compartilhada.
//
// Usa o iterador assíncrono (não rl.question() encadeado): quando a entrada
// chega tudo de uma vez (ex: colada, ou piped num script), question() perde
// as linhas que chegam antes de cada chamada ser registrada — o iterador
// enfileira os eventos de linha corretamente.
const promptMissing = async (args: Record<string, string>) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();

  const ask = async (question: string) => {
    process.stdout.write(question);
    const { value, done } = await lines.next();
    return done ? "" : value.trim();
  };

  try {
    let email = args.email;
    while (!email) {
      email = await ask("Email: ");
    }

    let password = args.password;
    while (!password || password.length < 8) {
      password = await ask("Senha (mínimo 8 caracteres): ");
      if (password.length < 8) console.log("  → muito curta, tente de novo.");
    }

    const name = args.name || (await ask("Nome (opcional, Enter pra pular): "));

    return { email, password, name };
  } finally {
    rl.close();
  }
};

const run = async () => {
  const argv = parseArgs();
  const { email, password, name } = await promptMissing(argv);

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
