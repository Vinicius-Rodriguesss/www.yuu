/**
 * Traduz a violação dos índices únicos de customers (por profissional) em
 * uma mensagem amigável. Retorna null se o erro não for uma dessas violações.
 */
const MESSAGES: Record<string, string> = {
  customers_user_document_unique: "Já existe um cliente cadastrado com esse CPF/CNPJ",
  customers_user_phone_unique: "Já existe um cliente cadastrado com esse telefone",
  customers_user_email_unique: "Já existe um cliente cadastrado com esse email",
};

export const duplicateCustomerFieldError = (error: any): string | null => {
  if (error?.code !== "23505") return null;
  return MESSAGES[error?.constraint] || "Já existe um cliente cadastrado com esses dados";
};
