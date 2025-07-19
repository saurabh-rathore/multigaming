// Based on schema.sql for profiles table
export interface Profile {
  user_id: string; // FK to Auth service user ID
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  date_of_birth?: Date | string; // string for input, Date for storage
  kyc_status: 'not_started' | 'pending_verification' | 'verified' | 'rejected';
  kyc_document_id?: string;
  kyc_rejection_reason?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
}

export type UpdateProfileRequestBody = Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at' | 'kyc_status' | 'kyc_document_id' | 'kyc_rejection_reason'>>;

export interface KycUpdateRequestParams {
  userId: string;
}
export interface KycUpdateRequestBody {
  document_id?: string; // e.g., ID of an uploaded document
  status_to_set?: 'pending_verification'; // Example, admin might set other statuses
}

// Friends related types (minimal for now, can be expanded)
export interface Friend {
    friendship_id: string;
    user_id_1: string;
    user_id_2: string;
    status: 'pending' | 'accepted' | 'declined' | 'blocked';
    requested_at: Date;
    responded_at?: Date;
}
