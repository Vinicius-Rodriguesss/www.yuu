export interface PasswordChecks {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export interface NameValidation {
  valid: boolean;
  message: string;
}

export const validatePassword = (password: string): PasswordChecks => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

export const isAllValid = (checks: PasswordChecks): boolean =>
  checks.minLength &&
  checks.uppercase &&
  checks.lowercase &&
  checks.number &&
  checks.special;

export const isPasswordMatch = (password: string, confirmPassword: string): boolean =>
  password === confirmPassword && confirmPassword.length > 0;

export const passwordRequirements = [
  { key: "minLength" as const, label: "Mínimo 8 caracteres" },
  { key: "uppercase" as const, label: "Pelo menos uma letra maiúscula" },
  { key: "lowercase" as const, label: "Pelo menos uma letra minúscula" },
  { key: "number" as const, label: "Pelo menos um número" },
  { key: "special" as const, label: "Pelo menos um caractere especial" },
];

export const validateFullName = (value: string): NameValidation => {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, message: "O nome é obrigatório." };
  }

  const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

  if (!regex.test(trimmed)) {
    return { valid: false, message: "Digite um nome válido." };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return { valid: false, message: "Digite seu nome completo." };
  }

  return { valid: true, message: "" };
};

export interface CPFValidation {
  valid: boolean;
  message: string;
}

/**
 * Valida um CPF usando o algoritmo dos dígitos verificadores.
 * Verifica se o CPF é matematicamente válido (não consulta a Receita Federal).
 * O CPF deve conter apenas números (sem formatação).
 */
export const validateCPF = (cpf: string): CPFValidation => {
  // Remove caracteres não numéricos
  const numbers = cpf.replace(/\D/g, "");

  if (numbers.length !== 11) {
    return { valid: false, message: "CPF deve conter 11 dígitos." };
  }

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numbers)) {
    return { valid: false, message: "CPF inválido." };
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(numbers[9])) {
    return { valid: false, message: "CPF inválido." };
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(numbers[10])) {
    return { valid: false, message: "CPF inválido." };
  }

  return { valid: true, message: "CPF válido." };
};

// ===================== Validações de Endereço =====================

export interface AddressValidation {
  valid: boolean;
  message: string;
}

export const validateCEP = (cep: string): AddressValidation => {
  const numbers = cep.replace(/\D/g, "");
  if (!numbers) return { valid: false, message: "O CEP é obrigatório." };
  if (numbers.length !== 8) return { valid: false, message: "CEP deve conter 8 dígitos." };
  return { valid: true, message: "" };
};

export const validateStreet = (street: string): AddressValidation => {
  const trimmed = street.trim();
  if (!trimmed) return { valid: false, message: "A rua é obrigatória." };
  if (trimmed.length < 3) return { valid: false, message: "A rua deve ter pelo menos 3 caracteres." };
  return { valid: true, message: "" };
};

export const validateNumber = (number: string): AddressValidation => {
  const trimmed = number.trim();
  if (!trimmed) return { valid: false, message: "O número é obrigatório." };
  return { valid: true, message: "" };
};

export const validateNeighborhood = (neighborhood: string): AddressValidation => {
  const trimmed = neighborhood.trim();
  if (!trimmed) return { valid: false, message: "O bairro é obrigatório." };
  if (trimmed.length < 2) return { valid: false, message: "O bairro deve ter pelo menos 2 caracteres." };
  return { valid: true, message: "" };
};

export const validateCity = (city: string): AddressValidation => {
  const trimmed = city.trim();
  if (!trimmed) return { valid: false, message: "A cidade é obrigatória." };
  if (trimmed.length < 2) return { valid: false, message: "A cidade deve ter pelo menos 2 caracteres." };
  return { valid: true, message: "" };
};

export const validateState = (state: string): AddressValidation => {
  const trimmed = state.trim();
  if (!trimmed) return { valid: false, message: "O estado é obrigatório." };
  if (trimmed.length !== 2) return { valid: false, message: "Use a sigla do estado (ex: SP)." };
  return { valid: true, message: "" };
};

export const isAddressValid = (
  cep: string,
  street: string,
  number: string,
  neighborhood: string,
  city: string,
  state: string
): boolean => {
  return (
    validateCEP(cep).valid &&
    validateStreet(street).valid &&
    validateNumber(number).valid &&
    validateNeighborhood(neighborhood).valid &&
    validateCity(city).valid &&
    validateState(state).valid
  );
};

export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  if (numbers.length > 5) {
    return numbers.slice(0, 5) + "-" + numbers.slice(5);
  }
  return numbers;
};

export interface ViaCEPResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento: string;
}