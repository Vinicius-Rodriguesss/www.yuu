import crypto from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authCodesTable } from "../../db/schema/authCodes.js";
import { sendMail } from "./mailer.js";
import {
  loginCodeEmailTemplate,
  passwordResetCodeEmailTemplate,
  passwordChangeCodeEmailTemplate,
} from "./templates.js";

export type AuthCodeType = "login" | "password_reset" | "password_change";

const CODE_TTL_MINUTES = 10;

const hashCode = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

const templateByType: Record<AuthCodeType, (name: string, code: string) => { subject: string; html: string }> = {
  login: loginCodeEmailTemplate,
  password_reset: passwordResetCodeEmailTemplate,
  password_change: passwordChangeCodeEmailTemplate,
};

/**
 * Gera um código de 6 dígitos, invalida códigos anteriores do mesmo tipo
 * ainda não usados, salva o hash e envia por email.
 */
export const generateAndSendCode = async (
  userId: number,
  type: AuthCodeType,
  toEmail: string,
  name: string
) => {
  const code = crypto.randomInt(100000, 1000000).toString();

  await db
    .delete(authCodesTable)
    .where(and(eq(authCodesTable.userId, userId), eq(authCodesTable.type, type), isNull(authCodesTable.consumedAt)));

  await db.insert(authCodesTable).values({
    userId,
    type,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
  });

  const { subject, html } = templateByType[type](name, code);
  await sendMail(toEmail, subject, html);
};

/**
 * Verifica um código: precisa bater o hash, não estar consumido e não ter
 * expirado. Se válido, marca como consumido (uso único).
 */
export const verifyCode = async (userId: number, type: AuthCodeType, code: string): Promise<boolean> => {
  const codeHash = hashCode(String(code || "").trim());

  const [match] = await db
    .select({ id: authCodesTable.id, expiresAt: authCodesTable.expiresAt })
    .from(authCodesTable)
    .where(
      and(
        eq(authCodesTable.userId, userId),
        eq(authCodesTable.type, type),
        eq(authCodesTable.codeHash, codeHash),
        isNull(authCodesTable.consumedAt)
      )
    )
    .limit(1);

  if (!match || match.expiresAt.getTime() < Date.now()) {
    return false;
  }

  await db.update(authCodesTable).set({ consumedAt: new Date() }).where(eq(authCodesTable.id, match.id));
  return true;
};
