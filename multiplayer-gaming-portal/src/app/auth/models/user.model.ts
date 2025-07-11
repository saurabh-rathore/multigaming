// Mirrors User definition from backend (auth-service/src/types/auth.types.ts and openapi.yaml)

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  status: 'pending_verification' | 'active' | 'suspended' | 'banned';
  phone_verified?: boolean;
  is_otp_enabled?: boolean;
  created_at?: string | Date; // Allow string for JSON, Date for internal use
  updated_at?: string | Date;
}

// Helper function to convert date strings to Date objects if needed
export function parseUserDates(user: User): User {
  return {
    ...user,
    created_at: user.created_at ? new Date(user.created_at) : undefined,
    updated_at: user.updated_at ? new Date(user.updated_at) : undefined,
  };
}
