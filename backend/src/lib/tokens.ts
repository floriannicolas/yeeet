import crypto from 'crypto';

/**
 * Generate a random token.
 *
 * @returns string
 */
export const generateRandomToken = () => {
    return crypto.randomBytes(8).toString('hex');
};