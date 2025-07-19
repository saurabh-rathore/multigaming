// Data structures for the Admin Service

// Represents an aggregated view of a user for admin purposes
export interface AdminUserView {
  userId: string;
  // From Auth Service (conceptual)
  email?: string;
  phone?: string;
  auth_status?: 'active' | 'pending_verification' | 'suspended' | 'banned'; // Renamed to avoid conflict with profile kyc_status
  // From User Profile Service (conceptual)
  firstName?: string;
  lastName?: string;
  username?: string;
  kycStatus?: 'not_started' | 'pending_verification' | 'verified' | 'rejected';
  // Other relevant fields
  createdAt?: Date; // User registration date
  lastLoginAt?: Date; // Conceptual
}

// Represents an aggregated view of a game for admin purposes
export interface AdminGameView {
  // From Game Engine Service (conceptual)
  gameId: string;
  name: string;
  description?: string;
  genre?: string;
  minPlayers?: number;
  maxPlayers?: number;
  stakeOptions?: any; // JSON
  rulesUrl?: string;
  assetsUrl?: string;
  version?: string;
  isActive: boolean;
  createdAt?: Date; // Game creation date
  updatedAt?: Date; // Last update to game metadata
}

// Structure for an entry in the admin audit log
export interface AdminAuditLogEntry {
  logId: string; // Unique ID for the log entry
  adminUserId: string; // ID of the admin performing the action
  action: string; // Description of the action, e.g., "user_banned", "game_toggled_active"
  targetEntityType?: string; // e.g., "user", "game", "wallet"
  targetEntityId?: string;   // ID of the entity that was affected
  timestamp: Date;
  details?: any; // JSON object for additional details about the action (e.g., old_value, new_value)
  ipAddress?: string; // IP address of the admin user
}

// --- Request & Response Types for API Endpoints (conceptual) ---

export interface BanUserRequestBody {
  reason: string; // Reason for banning
  // adminUserId would come from authenticated admin's session
}

export interface ToggleGameActiveRequestBody {
  newStatus: boolean; // The desired new 'isActive' status
  // adminUserId from session
}

export interface ManualWalletOpRequestBody {
    userId: string; // target user for wallet op
    amount: number;
    transactionType: 'manual_credit_cash' | 'manual_debit_cash' | 'manual_credit_bonus' | 'manual_debit_bonus';
    reason: string;
    // adminUserId from session
}
