// Mirrors request/response types from auth-service/openapi.yaml and auth-service/src/types/auth.types.ts
import { User } from './user.model';

export interface UserRegistrationRequest {
  email: string;
  password: string;
  phone?: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

// UserResponse is essentially the User model itself for registration success
// export type UserRegistrationResponse = User;

// AuthSuccessResponse from backend (for login)
export interface AuthSuccessResponse {
  token: string;
  user: User;
  otp_required?: boolean; // True if 2FA OTP is needed
}

export interface OtpRequest {
  phone: string;
  purpose?: 'verification' | 'login' | 'login_2fa' | 'password_reset';
}

// OtpResponse from backend (for OTP request)
export interface OtpResponse {
  message: string;
  otp_retry_delay_seconds?: number;
}

export interface OtpVerificationRequest {
  phone: string;
  otp: string;
  purpose?: 'verification' | 'login' | 'login_2fa' | 'password_reset';
}

// OtpVerificationSuccessResponse from backend
export interface OtpVerificationSuccessResponse {
  message: string;
  token?: string | null; // Present if OTP verification completes login (e.g., 2FA)
  user?: User | null;    // Updated user details
}

export interface SetTwoFactorAuthRequest {
  enable: boolean;
}

export interface SetTwoFactorAuthResponse {
  message: string;
  user: User;
}

// Enum for detailed auth status tracking in AuthService/UI
export enum AuthStatus {
  Uninitialized = 'Uninitialized',
  Authenticated = 'Authenticated',
  Authenticating = 'Authenticating',
  Unauthenticated = 'Unauthenticated',
  OtpRequired = 'OtpRequired', // After password login, 2FA OTP is needed
  PhoneVerificationRequired = 'PhoneVerificationRequired', // After registration with phone
  Error = 'Error'
}

// Interface for general API error responses from backend
export interface ApiErrorResponse {
  statusCode?: number;
  message: string;
  error?: string;
}
