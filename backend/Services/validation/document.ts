// Services/validation/document.ts
// Validação de CPF/CNPJ pelos dígitos verificadores (não consulta a Receita).
// Espelha src/SignUp/passwordValidation.ts (validateCPF / validateCNPJ).

const onlyDigits = (v: string) => String(v || "").replace(/\D/g, "");
const toArray = (s: string) => s.split("").map((d) => Number(d));

export const isValidCPF = (cpf: string): boolean => {
  const n = onlyDigits(cpf);
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;

  const d = toArray(n);

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += d[i]! * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== d[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += d[i]! * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === d[10];
};

export const isValidCNPJ = (cnpj: string): boolean => {
  const n = onlyDigits(cnpj);
  if (n.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(n)) return false;

  const d = toArray(n);

  const calcDigit = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += d[i]! * weights[i]!;
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (calcDigit(12) !== d[12]) return false;
  if (calcDigit(13) !== d[13]) return false;
  return true;
};

/** true se for um CPF (11) OU CNPJ (14) estruturalmente válido. */
export const isValidDocument = (document: string): boolean => {
  const n = onlyDigits(document);
  if (n.length === 11) return isValidCPF(n);
  if (n.length === 14) return isValidCNPJ(n);
  return false;
};
