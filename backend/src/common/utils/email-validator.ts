export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email format');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.toLowerCase().trim();

  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Invalid email format');
  }

  return trimmedEmail;
}

export function isValidEmail(email: string): boolean {
  try {
    validateEmail(email);
    return true;
  } catch {
    return false;
  }
}
