import { User, Session, RegistrationRequestBody, LoginRequestBody } from '../types/auth.types';
import { hashPassword, comparePassword, generateJwtToken, generateId } from '../utils/helpers';

// Placeholder for database interactions.
// In a real app, this would use an ORM (like Prisma, TypeORM) or a DB driver (like pg, mysql2).
const db = {
  users: new Map<string, User>(),
  sessions: new Map<string, Session>(),
};

export class AuthService {
  async register(data: RegistrationRequestBody): Promise<User> {
    console.log('[AuthService] Registering user:', data.email);
    if (!data.email || !data.password) {
      throw new Error('Email and password are required.');
    }

    // Check if user already exists (conceptual)
    for (const user of db.users.values()) {
      if (user.email === data.email) {
        throw new Error('User with this email already exists.');
      }
    }

    const userId = generateId();
    const hashedPassword = await hashPassword(data.password);

    const newUser: User = {
      id: userId,
      email: data.email,
      phone: data.phone,
      password_hash: hashedPassword,
      status: 'pending_verification',
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Simulate DB insert
    db.users.set(userId, newUser);
    console.log('[AuthService] User registered (simulated):', newUser.id);
    // Omit password_hash from returned user object for security
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(data: LoginRequestBody): Promise<{ token: string; user: Partial<User> }> {
    console.log('[AuthService] Logging in user:', data.email);
    if (!data.email || !data.password) {
      throw new Error('Email and password are required.');
    }

    let foundUser: User | undefined;
    for (const user of db.users.values()) {
      if (user.email === data.email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Invalid email or password.');
    }

    const isPasswordValid = await comparePassword(data.password, foundUser.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    if (foundUser.status !== 'active' && foundUser.status !== 'pending_verification') {
        throw new Error('User account is not active.');
    }

    const sessionId = generateId();
    const token = generateJwtToken(foundUser.id, sessionId);
    const tokenHash = await hashPassword(token); // Hash the token for storage in session

    const newSession: Session = {
      session_id: sessionId,
      user_id: foundUser.id,
      token_hash: tokenHash, // Store hash of the token
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
      created_at: new Date(),
      last_accessed_at: new Date(),
    };
    db.sessions.set(sessionId, newSession);
    console.log('[AuthService] Session created (simulated):', sessionId);

    const { password_hash, ...userWithoutPassword } = foundUser;
    return { token, user: userWithoutPassword };
  }
}
