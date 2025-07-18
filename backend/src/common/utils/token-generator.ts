import crypto from 'crypto';

const DEFAULT_TOKEN_LENGTH = 32;

/**
 * Generate a secure random token of specified length
 *
 * @param length - Length of the token to generate
 * @returns Hexadecimal string token
 */
export function generateToken(length: number): string {
  if (length <= 0) {
    throw new Error('Token length must be positive');
  }

  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate a confirmation token for email verification
 */
export function generateConfirmationToken(): string {
  return generateToken(DEFAULT_TOKEN_LENGTH);
}

/**
 * Generate a revoke token for unsubscription
 */
export function generateRevokeToken(): string {
  return generateToken(DEFAULT_TOKEN_LENGTH);
}
