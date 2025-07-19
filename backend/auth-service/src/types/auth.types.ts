export interface User {
  id: string;
  phone?: string;
  email: string;
  password_hash: string;
  status: 'pending_verification' | 'active' | 'suspended' | 'banned';
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
