import { AuthService } from '../services/authService';
import { RegistrationRequestBody, LoginRequestBody, RequestOtpBody, VerifyOtpBody } from '../types/auth.types';

// Placeholder for Express request/response types.
// In a real app, import { Request, Response } from 'express';
// In a real app, import these from 'express'.
type Request = any;
type Response = any;

const authService = new AuthService();

export const registerUser = async (req: Request, res: Response) => {
  try {
    const userData: RegistrationRequestBody = req.body;
    // Basic validation
    if (!userData.email || !userData.password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (userData.password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    // Add email format validation (conceptual)
    if (!/\S+@\S+\.\S+/.test(userData.email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    const user = await authService.register(userData);
    // In a real Express app: res.status(201).json(user);
    console.log('[AuthController] User registration successful (simulated response):', user);
    return { statusCode: 201, body: user }; // Simulated response
  } catch (error: any) {
    console.error('[AuthController] Registration error:', error.message);
    // In a real Express app: res.status(500).json({ message: error.message });
    const statusCode = error.message.includes('already exists') ? 409 : 500;
    return { statusCode: statusCode, body: { message: error.message } }; // Simulated response
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequestBody = req.body;
     if (!loginData.email || !loginData.password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const result = await authService.login(loginData);
    // In a real Express app: res.status(200).json(result);
    console.log('[AuthController] User login successful (simulated response):', result.token);
    return { statusCode: 200, body: result }; // Simulated response
  } catch (error: any) {
    console.error('[AuthController] Login error:', error.message);
    // In a real Express app: res.status(401).json({ message: error.message });
    return { statusCode: 401, body: { message: error.message } }; // Simulated response
  }
};

export const requestOtpController = async (req: Request, res: Response) => {
  try {
    const otpRequestBody: RequestOtpBody = req.body;
    if (!otpRequestBody.phone) {
      // In Express: return res.status(400).json({ message: 'Phone number is required.' });
      return { statusCode: 400, body: { message: 'Phone number is required.' }};
    }
    // Basic validation for phone can also be here, or primarily in service
    // Example: if (!/^\+[1-9]\d{1,14}$/.test(otpRequestBody.phone)) { ... }

    const result = await authService.requestOtp(otpRequestBody);
    // In Express: return res.status(200).json(result);
    console.log('[AuthController] OTP request successful (simulated response):', result.message);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    console.error('[AuthController] Request OTP error:', error.message);
    // In Express: return res.status(error.message.includes('Please wait') ? 429 : (error.message.includes('Invalid phone') ? 400 : 500)).json({ message: error.message });
    let statusCode = 500;
    if (error.message.includes('Please wait')) statusCode = 429; // Too Many Requests
    else if (error.message.includes('Invalid phone')) statusCode = 400; // Bad Request
    return { statusCode, body: { message: error.message } };
  }
};

export const guestLoginController = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginAsGuest();
    // In a real Express app: res.status(200).json(result);
    console.log('[AuthController] Guest login successful (simulated response):', result.token);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    console.error('[AuthController] Guest login error:', error.message);
    // In a real Express app: res.status(500).json({ message: error.message });
    return { statusCode: 500, body: { message: 'Failed to login as guest.' } };
  }
};

export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const otpVerifyBody: VerifyOtpBody = req.body;
    if (!otpVerifyBody.phone || !otpVerifyBody.otp) {
      // In Express: return res.status(400).json({ message: 'Phone number and OTP are required.' });
      return { statusCode: 400, body: { message: 'Phone number and OTP are required.' }};
    }
    // Basic validation for OTP format (e.g. 6 digits)
    // Example: if (!/^\d{6}$/.test(otpVerifyBody.otp)) { ... }

    const result = await authService.verifyOtp(otpVerifyBody);
    // In Express: return res.status(200).json(result);
    console.log('[AuthController] OTP verification successful (simulated response):', result.message);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    console.error('[AuthController] Verify OTP error:', error.message);
    // In Express: return res.status(error.message.includes('Invalid or expired OTP') ? 400 : 500).json({ message: error.message });
    const statusCode = error.message.includes('Invalid or expired OTP') ? 400 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

// Conceptual controller for enabling/disabling 2FA
export const setTwoFactorAuthController = async (req: Request, res: Response) => {
  try {
    // Assuming userId is available from authenticated request (e.g., req.user.id from JWT middleware)
    const userId = req.user?.id; // This is a placeholder for actual auth middleware
    if (!userId) {
        // In Express: return res.status(401).json({ message: 'User not authenticated.' });
        return { statusCode: 401, body: { message: 'User not authenticated.' }};
    }
    const { enable } = req.body; // Expecting { enable: true/false } in request body

    if (typeof enable !== 'boolean') {
        // In Express: return res.status(400).json({ message: 'Invalid request body: "enable" must be a boolean.'});
      return { statusCode: 400, body: { message: 'Invalid request body: "enable" must be a boolean.' }};
    }

    const updatedUser = await authService.setTwoFactorAuth(userId, enable);
    // In Express: return res.status(200).json({ message: `2FA ${enable ? 'enabled' : 'disabled'} successfully.`, user: updatedUser });
    console.log(`[AuthController] 2FA status updated for user ${userId} (simulated response)`);
    return { statusCode: 200, body: { message: `2FA ${enable ? 'enabled' : 'disabled'} successfully.`, user: updatedUser } };
  } catch (error: any) {
    console.error('[AuthController] Set 2FA error:', error.message);
    // In Express: return res.status(error.message.includes('User not found') || error.message.includes('Phone number must be') ? 400 : 500).json({ message: error.message });
    let statusCode = 500;
    if (error.message.includes('User not found') || error.message.includes('Phone number must be')) statusCode = 400;
    return { statusCode, body: { message: error.message } };
  }
};
