import {
  User,
  Session,
  RegistrationRequestBody,
  LoginRequestBody,
  OtpCode,
  RequestOtpBody,
  VerifyOtpBody,
  OtpResponse,
  GuestAuthResponse
} from '../types/auth.types';
import { hashPassword, comparePassword, generateJwtToken, generateId, generateNumericOtp } from '../utils/helpers';
import pool from '../config/db.config';
import twilioConfig, { isTwilioConfigured } from '../config/twilio.config';
// import { twilioClient } from '../config/twilio.config'; // If Twilio client is initialized in config

// Define a type for what a user row from the DB might look like (matches User type mostly)
// MySQL drivers often return RowDataPacket or similar. For our conceptual model,
// we'll assume it maps closely to our User type after parsing.
type UserRow = User & { [key: string]: any }; // Allow for other DB fields if any
type SessionRow = Session & { [key: string]: any };
type OtpCodeRow = OtpCode & { [key: string]: any };

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

    // If phone is provided, initiate OTP verification for the phone
    if (newUser.phone) {
      try {
        await this.requestOtp({ phone: newUser.phone, purpose: 'verification' });
        console.log(`[AuthService] OTP requested for phone verification: ${newUser.phone} during registration.`);
        // Note: The user is created, but phone_verified will be false until OTP is confirmed.
        // The client should be informed to proceed to OTP verification step.
      } catch (otpError: any) {
        // Log the error, but don't fail the registration itself.
        // Phone verification can be attempted later.
        console.error(`[AuthService] Failed to send OTP for phone ${newUser.phone} during registration: ${otpError.message}`);
      }
    }
    return userWithoutPassword;
  }

  async login(data: LoginRequestBody): Promise<{ token: string; user: Omit<User, 'password_hash'>; otp_required?: boolean }> {
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

    // Check if OTP is enabled for this user (2FA)
    if (foundUser.is_otp_enabled && foundUser.phone_verified) {
        // Don't issue JWT yet. Require OTP.
        try {
            await this.requestOtp({ phone: foundUser.phone!, purpose: 'login_2fa' });
            console.log(`[AuthService] OTP required for 2FA login for user: ${foundUser.id}. OTP sent to ${foundUser.phone}.`);
            // Return a response indicating OTP is required.
            // The actual JWT will be issued after successful OTP verification in a separate step.
            return {
                token: '', // No token yet
                user: { id: foundUser.id, email: foundUser.email, phone: foundUser.phone }, // Send minimal user info
                otp_required: true
            };
        } catch (otpError: any) {
            console.error(`[AuthService] Failed to send OTP for 2FA login for user ${foundUser.id}: ${otpError.message}`);
            throw new Error('Failed to send OTP for 2FA. Please try again.');
        }
    }

    // If 2FA is not enabled or phone not verified, proceed with normal token generation
    return { token, user: userWithoutPassword };
  }

  // --- OTP Methods ---

  async requestOtp(data: RequestOtpBody): Promise<OtpResponse> {
    const { phone, purpose = 'verification' } = data;
    if (!phone) {
      throw new Error('Phone number is required to send OTP.');
    }

    // Basic phone validation (conceptual)
    if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
        console.warn(`[AuthService] Invalid phone format for OTP request: ${phone}`);
        throw new Error('Invalid phone number format. Please use E.164 format (e.g., +11234567890).');
    }

    // Rate limiting check (conceptual - would need a more robust mechanism e.g. Redis)
    // For now, just check if an active OTP already exists for this phone & purpose
    const checkActiveOtpSql = 'SELECT id, created_at FROM otp_codes WHERE phone = ? AND purpose = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1';
    const [activeOtps]: [OtpCodeRow[], any] = await pool.query(checkActiveOtpSql, [phone, purpose]) as [OtpCodeRow[], any];

    if (activeOtps.length > 0) {
        const lastOtpTime = new Date(activeOtps[0].created_at!).getTime();
        const retryDelaySeconds = 60; // Allow retry after 60 seconds
        if (new Date().getTime() - lastOtpTime < retryDelaySeconds * 1000) {
            console.warn(`[AuthService] OTP request too soon for phone: ${phone}, purpose: ${purpose}`);
            throw new Error(`Please wait for ${retryDelaySeconds} seconds before requesting another OTP.`);
        }
    }

    const otp = generateNumericOtp(6); // Generate 6-digit OTP
    const otpHash = await hashPassword(otp); // Hash the OTP for storage
    const otpId = generateId('otp');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // OTP expires in 5 minutes

    const insertOtpSql = `
      INSERT INTO otp_codes (id, phone, otp_hash, purpose, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: [OkPacket, any] = await pool.query(insertOtpSql, [
      otpId, phone, otpHash, purpose, expiresAt, now, now
    ]) as [OkPacket, any];

    if (result.affectedRows !== 1) {
      console.error('[AuthService-DB] Failed to store OTP code for phone:', phone);
      throw new Error('Failed to generate OTP. Please try again.');
    }

    // Send OTP via Twilio (or mock)
    try {
      if (isTwilioConfigured()) {
        // const message = await twilioClient.messages.create({ // If using twilioClient from config
        //   body: `Your StackGamez verification code is: ${otp}. It expires in 5 minutes.`,
        //   from: twilioConfig.twilioPhoneNumber,
        //   to: phone,
        // });
        // console.log(`[AuthService-Twilio] OTP SMS sent to ${phone}. Message SID: ${message.sid}`);
        console.log(`[AuthService-Twilio-Mock] OTP for ${phone} is ${otp} (Twilio configured but sending is mocked)`);
      } else {
        console.warn(`[AuthService-Twilio-Mock] OTP for ${phone} is ${otp} (Twilio not configured, SIMULATING SEND)`);
      }
    } catch (error: any) {
      console.error(`[AuthService-Twilio] Failed to send OTP SMS to ${phone}:`, error.message);
      // Potentially delete the OTP record or mark as failed if sending is critical
      throw new Error('Failed to send OTP. Please check the phone number or try again later.');
    }

    console.log(`[AuthService] OTP generated and stored for phone: ${phone}, purpose: ${purpose}, OTP ID: ${otpId}`);
    return { message: 'OTP has been sent to your phone number.' , otp_retry_delay_seconds: 60 };
  }

  async verifyOtp(data: VerifyOtpBody): Promise<OtpResponse & { user?: Omit<User, 'password_hash'>, token?: string }> {
    const { phone, otp, purpose = 'verification' } = data;
    if (!phone || !otp) {
      throw new Error('Phone number and OTP are required.');
    }

    const findOtpSql = `
      SELECT * FROM otp_codes
      WHERE phone = ? AND purpose = ? AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `;
    const [otps]: [OtpCodeRow[], any] = await pool.query(findOtpSql, [phone, purpose]) as [OtpCodeRow[], any];

    if (otps.length === 0) {
      console.warn(`[AuthService] No valid OTP found for phone: ${phone}, purpose: ${purpose}`);
      throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    const storedOtp = otps[0];
    const isOtpValid = await comparePassword(otp, storedOtp.otp_hash); // Using comparePassword for OTPs too

    if (!isOtpValid) {
      console.warn(`[AuthService] Invalid OTP attempt for phone: ${phone}, purpose: ${purpose}`);
      // Consider adding attempt tracking here to prevent brute-force
      throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    // Mark OTP as used
    const markUsedSql = 'UPDATE otp_codes SET used = TRUE, updated_at = NOW() WHERE id = ?';
    const [updateResult]: [OkPacket, any] = await pool.query(markUsedSql, [storedOtp.id]) as [OkPacket, any];

    if (updateResult.changedRows !== 1) {
        console.error(`[AuthService-DB] Failed to mark OTP ${storedOtp.id} as used for phone ${phone}.`);
        // This is an internal error, but the OTP was valid. Proceed cautiously.
        // Depending on policy, you might throw or just log.
    }
    console.log(`[AuthService] OTP ${storedOtp.id} successfully verified and marked as used for phone: ${phone}, purpose: ${purpose}`);

    let response: OtpResponse & { user?: Omit<User, 'password_hash'>, token?: string } = {
        message: 'OTP verified successfully.'
    };

    // Post-verification actions based on purpose
    if (purpose === 'verification') {
      // Update user's phone_verified status
      const updateUserSql = 'UPDATE users SET phone_verified = TRUE, status = IF(status = \'pending_verification\', \'active\', status), updated_at = NOW() WHERE phone = ?';
      const [userUpdateResult]: [OkPacket, any] = await pool.query(updateUserSql, [phone]) as [OkPacket, any];
      if (userUpdateResult.affectedRows > 0) {
        console.log(`[AuthService-DB] User phone ${phone} marked as verified. Affected rows: ${userUpdateResult.affectedRows}`);
         // Optionally, fetch the updated user record if needed for the response
        const [usersRows]: [UserRow[], any] = await pool.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]) as [UserRow[], any];
        if (usersRows.length > 0) {
            const { password_hash, ...userWithoutPassword } = usersRows[0];
            response.user = userWithoutPassword;
            // If user was pending and now active, maybe issue a token?
            // For now, just confirming verification. Login is separate.
        }
      } else {
        console.warn(`[AuthService-DB] No user found to update phone_verified status for phone ${phone}, or phone already verified.`);
        // This isn't necessarily an error if OTP was requested for a non-existent user's phone for some reason,
        // or if the phone was already verified.
      }
    } else if (purpose === 'login_2fa') {
        // User has passed password check and now 2FA OTP check. Issue JWT.
        const [usersRows]: [UserRow[], any] = await pool.query('SELECT * FROM users WHERE phone = ? AND is_otp_enabled = TRUE LIMIT 1', [phone]) as [UserRow[], any];
        if (usersRows.length === 0) {
            console.error(`[AuthService] User for 2FA login not found or 2FA not enabled for phone ${phone}. This shouldn't happen if login flow was correct.`);
            throw new Error('User not found or 2FA not properly configured.');
        }
        const foundUser = usersRows[0];
        const sessionId = generateId('sess');
        const token = generateJwtToken(foundUser.id, sessionId);
        const tokenHashPlaceholder = `hashed_jwt_placeholder_${sessionId}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const userAgent = 'conceptual-user-agent-2fa'; // Should come from request
        const ipAddress = '127.0.0.1'; // Should come from request

        const insertSessionSql = `
            INSERT INTO sessions (session_id, user_id, token_hash, user_agent, ip_address, expires_at, created_at, last_accessed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await pool.query(insertSessionSql, [sessionId, foundUser.id, tokenHashPlaceholder, userAgent, ipAddress, expiresAt, now, now]);

        const { password_hash, ...userWithoutPassword } = foundUser;
        response.token = token;
        response.user = userWithoutPassword;
        response.message = 'Login successful with 2FA.';
        console.log(`[AuthService] 2FA Login successful for user ${foundUser.id}. JWT issued.`);
    }
    // Add cases for 'password_reset' or other purposes if needed

    return response;
  }

  // Method to allow users to enable/disable 2FA (conceptual)
  async setTwoFactorAuth(userId: string, enable: boolean): Promise<Omit<User, 'password_hash'>> {
    console.log(`[AuthService] Setting 2FA for user ${userId} to ${enable}`);
    const [usersRows]: [UserRow[], any] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]) as [UserRow[], any];
    if (usersRows.length === 0) {
        throw new Error('User not found.');
    }
    const user = usersRows[0];

    if (enable && !user.phone_verified) {
        throw new Error('Phone number must be verified before enabling 2FA.');
    }
    if (enable && !user.phone) {
        throw new Error('Phone number must be set before enabling 2FA.');
    }


    const updateSql = 'UPDATE users SET is_otp_enabled = ?, updated_at = NOW() WHERE id = ?';
    const [result]: [OkPacket, any] = await pool.query(updateSql, [enable, userId]) as [OkPacket, any];

    if (result.affectedRows !== 1) {
        throw new Error('Failed to update 2FA status.');
    }
    user.is_otp_enabled = enable;
    const {password_hash, ...userWithoutPassword} = user;
    return userWithoutPassword;
  }

  // --- Guest Mode Method ---
  async loginAsGuest(): Promise<GuestAuthResponse> {
    console.log('[AuthService] Logging in as Guest.');
    const guestId = generateId('gst'); // Generate a unique ID for the guest

    // Generate a JWT for the guest
    // Guest tokens might have shorter expiry, e.g., '3h' or '1h'
    const guestTokenExpiry = '3h';
    const token = generateJwtToken(guestId, undefined, true, guestTokenExpiry);

    console.log(`[AuthService] Guest login successful. Guest ID: ${guestId}`);
    return {
      token,
      guest_id: guestId,
      user: { // Provide a minimal user-like object for frontend consistency
        id: guestId,
        username: `Guest-${guestId.substring(0,6)}`, // Example guest username
        is_guest: true,
      }
    };
  }
}
