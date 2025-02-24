import crypto from 'crypto';

/**
 * Generate a random token.
 *
 * @returns string
 */
export const generateRandomToken = (): string => {
  return crypto.randomBytes(8).toString('hex');
};
