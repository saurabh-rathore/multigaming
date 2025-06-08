import { User, Session, RegistrationRequestBody, LoginRequestBody } from '../types/auth.types';
import { hashPassword, comparePassword, generateJwtToken, generateId } from '../utils/helpers';
import pool from '../config/db.config'; // Import the conceptual MySQL pool

// Define a type for what a user row from the DB might look like (matches User type mostly)
// MySQL drivers often return RowDataPacket or similar. For our conceptual model,
// we'll assume it maps closely to our User type after parsing.
type UserRow = User & { [key: string]: any }; // Allow for other DB fields if any
type SessionRow = Session & { [key: string]: any };

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  fieldCount: number;
  affectedRows: number;
  insertId: number | string; // Can be number for auto_increment, string for our generated IDs
  serverStatus: number;
  warningCount: number;
  message: string;
  protocol41: boolean;
  changedRows: number;
}


export class AuthService {
  async register(data: RegistrationRequestBody): Promise<Omit<User, 'password_hash'>> {
    console.log('[AuthService-DB] Registering user:', data.email);
    if (!data.email || !data.password) {
      throw new Error('Email and password are required.');
    }

    // Check if user already exists
    const checkUserSql = 'SELECT id, email FROM users WHERE email = ? LIMIT 1';
    // Conceptual: const [existingUsers] = await pool.query<UserRow[]>(checkUserSql, [data.email]);
    const [existingUsersRows]: [UserRow[], any] = await pool.query(checkUserSql, [data.email]) as [UserRow[], any];


    if (existingUsersRows.length > 0) {
      console.warn(`[AuthService-DB] Registration attempt for existing email: ${data.email}`);
      throw new Error('User with this email already exists.');
    }

    const userId = generateId(); // Our app-level ID generation
    const hashedPassword = await hashPassword(data.password);
    const now = new Date();

    const newUser: User = {
      id: userId,
      email: data.email,
      phone: data.phone,
      password_hash: hashedPassword,
      status: 'pending_verification', // Default status
      created_at: now,
      updated_at: now,
    };

    const insertUserSql = `
      INSERT INTO users (id, email, phone, password_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
        newUser.id, newUser.email, newUser.phone || null, newUser.password_hash,
        newUser.status, newUser.created_at, newUser.updated_at
    ];

    // Conceptual: const [result] = await pool.query<OkPacket>(insertUserSql, insertParams);
    const [result]: [OkPacket, any] = await pool.query(insertUserSql, insertParams) as [OkPacket, any];

    if (result.affectedRows !== 1) {
        console.error('[AuthService-DB] Failed to insert new user, affectedRows:', result.affectedRows);
        throw new Error('Could not register user due to a database error.');
    }

    console.log(`[AuthService-DB] User ${userId} registered successfully via DB.`);

    // Omit password_hash from returned user object for security
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(data: LoginRequestBody): Promise<{ token: string; user: Omit<User, 'password_hash'> }> {
    console.log('[AuthService-DB] Logging in user:', data.email);
    if (!data.email || !data.password) {
      throw new Error('Email and password are required.');
    }

    const findUserSql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    // Conceptual: const [users] = await pool.query<UserRow[]>(findUserSql, [data.email]);
    const [usersRows]: [UserRow[], any] = await pool.query(findUserSql, [data.email]) as [UserRow[], any];

    if (usersRows.length === 0) {
      console.warn(`[AuthService-DB] Login attempt for non-existent email: ${data.email}`);
      throw new Error('Invalid email or password.');
    }

    const foundUser: User = usersRows[0] as User; // Assume mapping is direct for conceptual model

    const isPasswordValid = await comparePassword(data.password, foundUser.password_hash);
    if (!isPasswordValid) {
      console.warn(`[AuthService-DB] Invalid password attempt for user: ${foundUser.id}`);
      throw new Error('Invalid email or password.');
    }

    if (foundUser.status !== 'active' && foundUser.status !== 'pending_verification') {
      console.warn(`[AuthService-DB] Login attempt for non-active account: ${foundUser.id}, status: ${foundUser.status}`);
      throw new Error(`User account is not active. Current status: ${foundUser.status}`);
    }

    const sessionId = generateId('sess'); // Our app-level ID generation for session
    const token = generateJwtToken(foundUser.id, sessionId);
    // const tokenHash = await hashPassword(token); // Hashing the token itself before storing is good practice
                                                // but the schema has token_hash which might mean hash of an opaque session token, not JWT.
                                                // For now, let's assume it's a hash of our generated JWT for consistency with previous logic.
    const tokenHashPlaceholder = `hashed_jwt_placeholder_${sessionId}`; // Placeholder as hashPassword is a stub

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Conceptual user_agent and ip_address would come from the request object in a real controller
    const userAgent = 'conceptual-user-agent';
    const ipAddress = '127.0.0.1';

    const insertSessionSql = `
      INSERT INTO sessions (session_id, user_id, token_hash, user_agent, ip_address, expires_at, created_at, last_accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const sessionParams = [
        sessionId, foundUser.id, tokenHashPlaceholder, userAgent, ipAddress,
        expiresAt, now, now
    ];

    // Conceptual: const [sessionResult] = await pool.query<OkPacket>(insertSessionSql, sessionParams);
    const [sessionResult]: [OkPacket, any] = await pool.query(insertSessionSql, sessionParams) as [OkPacket, any];

    if (sessionResult.affectedRows !== 1) {
        console.error('[AuthService-DB] Failed to insert new session, affectedRows:', sessionResult.affectedRows);
        throw new Error('Could not create user session due to a database error.');
    }

    console.log(`[AuthService-DB] Session ${sessionId} created for user ${foundUser.id} via DB.`);

    const { password_hash, ...userWithoutPassword } = foundUser;
    return { token, user: userWithoutPassword };
  }
}
