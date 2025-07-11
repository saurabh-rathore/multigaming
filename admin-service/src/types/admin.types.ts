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


// --- Dashboard Specific Types ---

export interface DashboardData {
  active_users_now: number;         // Users active in the last X minutes (e.g., 5-15 mins)
  active_users_daily: number;       // Unique users active today
  new_registrations_today: number;
  total_matches_today: number;
  satisfaction_score_avg_weekly?: number; // e.g., on a scale of 1-5, if feedback system exists
  total_revenue_today?: number;          // If monetization is implemented
  top_games_by_playtime_today?: GameActivityStat[];
  // Add more dashboard metrics as needed
}

export interface GameActivityStat {
    game_id: string;
    game_name?: string; // Denormalized
    matches_played: number;
    total_playtime_minutes: number;
    unique_players: number;
}

// For a more detailed list of active users for the dashboard
export interface ActiveUserSnapshot {
    user_id: string;
    username?: string; // Denormalized
    email?: string; // Denormalized
    current_game_id?: string | null; // Game they are currently playing, if any
    last_activity_at: Date | string;
    session_duration_minutes?: number;
}

// For match statistics display on dashboard or reports
export interface MatchStatistics {
    game_id: string;
    game_name?: string; // Denormalized
    total_matches_period: number; // In a given period (e.g., today, last 7 days)
    average_duration_seconds?: number;
    total_players_participated: number;
    peak_concurrent_matches?: number;
}

// For user satisfaction feedback (conceptual)
export interface SatisfactionFeedbackSummary {
    average_rating_overall: number; // e.g. 4.2 / 5
    total_feedback_count: number;
    // Could include breakdown by category or sentiment analysis results
}
