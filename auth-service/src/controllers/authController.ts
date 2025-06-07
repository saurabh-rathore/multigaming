import { AuthService } from '../services/authService';
import { RegistrationRequestBody, LoginRequestBody } from '../types/auth.types';

// Placeholder for Express request/response types.
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
