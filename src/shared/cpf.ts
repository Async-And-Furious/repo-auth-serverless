export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calcCheckDigit(9);
  const secondCheckDigit = calcCheckDigit(10);

  return firstCheckDigit === digits[9] && secondCheckDigit === digits[10];
}
