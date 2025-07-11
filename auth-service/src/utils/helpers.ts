import { v4 as uuidv4 } from 'uuid'; // Placeholder: Assume uuid is available

/**
 * Placeholder for password hashing.
 * In a real app, use bcrypt.hash().
 */
export const hashPassword = async (password: string): Promise<string> => {
  console.log('[AuthService] Hashing password (placeholder)');
  if (!password) throw new Error('Password cannot be empty');
  return `hashed_${password}_${new Date().getTime()}`; // Simple placeholder
};

/**
 * Placeholder for comparing password with hash.
 * In a real app, use bcrypt.compare().
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  console.log('[AuthService] Comparing password (placeholder)');
  if (!password || !hash) return false;
  return `hashed_${password}_${hash.split('_')[2]}` === hash; // Crude placeholder check
};

/**
 * Placeholder for JWT generation.
 * In a real app, use jsonwebtoken.sign().
 * @param userId User ID or Guest ID
 * @param sessionId Optional session ID (might not be relevant for guests if not stored in DB)
 * @param isGuest Boolean flag to include in token claims
 * @param expiresIn Optional token expiry time (e.g., '1h', '7d')
 */
export const generateJwtToken = (
    userId: string,
    sessionId?: string,
    isGuest: boolean = false,
    expiresIn: string = '1d' // Default expiry, can be shorter for guests
): string => {
  console.log(`[AuthService] Generating JWT for ${isGuest ? 'Guest' : 'User'}: ${userId} (placeholder)`);
  // In a real app using jsonwebtoken:
  // const payload = {
  //   sub: userId,
  //   ...(sessionId && { sid: sessionId }), // session ID
  //   is_guest: isGuest,
  //   // Add other claims like username, roles if needed, but keep it minimal
  // };
  // const secret = process.env.JWT_SECRET || 'your-very-secret-key-for-dev';
  // return jwt.sign(payload, secret, { expiresIn });

  let token = `placeholder_jwt_for_${isGuest ? 'guest_' : ''}${userId}`;
  if (sessionId) {
    token += `_session_${sessionId}`;
  }
  token += `_is_guest_${isGuest}_expires_${expiresIn.replace(' ','')}`;
  return token;
};

/**
 * Placeholder for generating a unique ID.
 * @param prefix Optional prefix for the ID (e.g., 'user_', 'sess_', 'otp_')
 */
export const generateId = (prefix: string = 'id'): string => {
  // In a real app, ensure uuid is properly installed and imported
  // For now, this is a conceptual placeholder as direct uuid import might fail if not installed
  // return prefix + uuidv4();
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

/**
 * Generates a numeric OTP of a specified length.
 * @param length The number of digits for the OTP (default is 6).
 */
export const generateNumericOtp = (length: number = 6): string => {
  if (length <= 0) throw new Error('OTP length must be positive.');
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = Math.floor(min + Math.random() * (max - min + 1));
  return otp.toString().padStart(length, '0');
};
