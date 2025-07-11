export interface User {
  id: string;
  phone?: string;
  email: string;
  password_hash: string;
  status: 'pending_verification' | 'active' | 'suspended' | 'banned';
  phone_verified?: boolean;
  is_otp_enabled?: boolean; // For 2FA
  created_at?: Date;
  updated_at?: Date;
}

export interface OtpCode {
  id: string;
  phone: string;
  otp_hash: string;
  purpose: 'verification' | 'login_2fa' | 'password_reset';
  used: boolean;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface Session {
  session_id: string;
  user_id: string;
  token_hash: string;
  user_agent?: string;
  ip_address?: string;
  expires_at: Date;
  created_at?: Date;
  last_accessed_at?: Date;
}

export interface RegistrationRequestBody {
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

// --- OTP Related Request/Response Types ---

export interface RequestOtpBody {
  phone: string;
  purpose?: 'verification' | 'login' | 'password_reset'; // Default to 'verification'
}

export interface VerifyOtpBody {
  phone: string;
  otp: string;
  purpose?: 'verification' | 'login' | 'password_reset'; // Should match the purpose used in request
}

export interface OtpResponse {
  message: string;
  // Optionally, include details like OTP expiry time for the user
  otp_retry_delay_seconds?: number; // Example: if you want to tell client when they can request again
  // For verification success, it might include a temporary token or user details
  token?: string; // If OTP verification leads to login
  user?: Omit<User, 'password_hash'>; // If OTP verification leads to login/registration completion
}

// --- Guest Mode Types ---
export interface GuestAuthResponse {
  token: string; // Guest JWT
  guest_id: string; // The unique ID assigned to this guest session
  // Optionally, include a minimal user-like object for consistency if frontends expect it
  user?: {
    id: string; // Same as guest_id
    username: string; // e.g., "Guest"
    is_guest: true;
  };
}
