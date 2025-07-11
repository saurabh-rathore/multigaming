// Based on schema.sql for profiles table
export interface Profile {
  user_id: string; // FK to Auth service user ID
  username?: string;
  // Daily Rewards / Engagement Tracking fields from schema
  last_login_date?: Date | string | null;
  login_streak_days?: number;
  last_reward_claimed_date?: Date | string | null;
  last_wheel_spin_date?: Date | string | null;
  available_wheel_spins?: number;
  // Original fields
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

// --- Badge Related Types ---
export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon_url: string;
  created_at?: Date;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: Date;
  // Optionally, denormalize badge details here if frequently needed together
  badge_name?: string;
  badge_icon_url?: string;
}

// --- Game History Related Types ---
export type GameOutcome = 'win' | 'loss' | 'draw' | 'incomplete' | 'abandoned';

export interface GameHistoryEntry {
  id: string;
  user_id: string;
  game_id: string; // e.g., "ludo", "chess_router_wars"
  game_type?: 'classic' | 'telecom_themed'; // From schema default
  score?: number;
  win_loss_draw: GameOutcome;
  played_at: Date;
  opponent_id?: string | null; // user_id of opponent or "AI"
  game_duration_seconds?: number;
}

export type CreateGameHistoryEntryBody = Omit<GameHistoryEntry, 'id' | 'played_at' | 'user_id'>; // user_id will come from path param

// For responses that might include enriched data (e.g., profile with badges and recent history)
export interface EnrichedUserProfile extends Profile {
    badges?: UserBadge[]; // Or full Badge objects
    recent_history?: GameHistoryEntry[];
    daily_reward_status?: DailyRewardInfo; // Add daily reward status here
    wheel_spin_status?: WheelSpinStatus; // Add wheel spin status here
}

// --- Daily Reward & Wheel Spin Types ---

export interface RewardDefinition {
    streak_day: number;
    reward_type: string; // "coins", "power_up_id", "avatar_item_id", "wheel_spin"
    reward_value: string; // "100", "extra_life", "1"
    description?: string;
    icon_url?: string;
}

export interface DailyRewardInfo {
    is_eligible_to_claim: boolean;
    current_streak_day: number; // User's current login streak
    reward_for_today?: RewardDefinition | null; // Reward for current_streak_day if eligible & unclaimed
    message?: string; // e.g., "Reward already claimed today", "Come back tomorrow!"
    next_reward_at?: Date | string; // When the next reward cycle starts (e.g., midnight)
}

export interface WheelSpinPrize {
    prize_id: string;
    prize_type: string; // "coins", "game_entry_ticket", "badge_id", "no_prize"
    prize_value: string;
    prize_display_name: string;
    icon_url?: string;
    probability_weight: number;
    is_jackpot?: boolean;
    is_active?: boolean;
}

export interface WheelSpinStatus {
    available_spins: number; // From user's profile
    next_free_spin_at?: Date | string; // If there's a daily free spin reset by cron
}

// Could also be combined with WheelSpinPrize if prize details are always returned
export interface WheelSpinResult {
    success: boolean;
    prize_won?: WheelSpinPrize; // Details of the prize won
    message: string; // "Congratulations!", "Not enough spins", "Try again tomorrow"
    updated_available_spins?: number;
}

// Request body for claiming daily reward (might be empty if just claiming current)
export interface ClaimDailyRewardBody {
    // Potentially empty, or could include expected_streak_day for validation
}

// Response for claiming daily reward
export interface ClaimDailyRewardResponse {
    success: boolean;
    reward_granted?: RewardDefinition & { actual_value_granted?: any }; // actual_value_granted if complex like item object
    message: string;
    updated_profile_fields?: { // Fields that changed on the profile
        login_streak_days?: number;
        last_reward_claimed_date?: Date | string;
        available_wheel_spins?: number;
    };
}
