// Data structures for the Tournament Service

export type TournamentStatus =
  | 'upcoming'        // Tournament is scheduled but registration is not yet open
  | 'registration_open' // Players can register
  | 'registration_closed'// Registration period has ended, tournament about to start or ongoing
  | 'active'          // Tournament is currently in progress
  | 'paused'          // Tournament is temporarily paused
  | 'completed'       // Tournament has finished, results are final
  | 'cancelled';      // Tournament was cancelled

export interface PrizeDistributionRule {
  rank: number; // e.g., 1 for 1st place, 2 for 2nd, or a range like "1-10"
  percentage?: number; // Percentage of the prize pool
  fixedAmount?: number; // Fixed amount
  otherReward?: string; // e.g., "In-game item"
}

export interface Tournament {
  tournamentId: string;
  gameId: string; // Which game this tournament is for
  name: string;
  description?: string;
  status: TournamentStatus;

  scheduledStartTime: Date; // When the tournament is planned to start
  actualStartTime?: Date;   // When it actually started
  scheduledEndTime?: Date;  // Approximate end time, or registration close time for some formats
  actualEndTime?: Date;     // When it actually ended

  registrationOpenTime: Date;
  registrationCloseTime: Date;

  minParticipants: number;
  maxParticipants?: number; // Optional, some tournaments might be open

  entryFee: number; // 0 for free tournaments
  currency: string; // e.g., "INR", "USD", or "BONUS_COINS"

  prizePool: number; // Total prize pool, can be fixed or dynamic (e.g., sum of entry fees)
  prizePoolDistribution: PrizeDistributionRule[]; // How the prize pool is divided

  rules?: string; // Detailed rules or link to rules page

  // Metadata
  createdBy?: string; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}

export type ParticipantStatus =
  | 'registered'
  | 'checked_in' // If there's a check-in phase
  | 'playing'
  | 'eliminated'
  | 'completed' // Finished playing, rank/winnings might be pending
  | 'disqualified'
  | 'cancelled_registration';

export interface TournamentParticipant {
  participantEntryId: string; // Unique ID for this user's entry in this tournament
  tournamentId: string;
  userId: string;
  displayName?: string; // Denormalized for convenience

  registrationTime: Date;
  status: ParticipantStatus;

  finalRank?: number;
  winnings?: number; // Amount won
  winningsCurrency?: string;
  payoutStatus?: 'pending' | 'processed' | 'failed';

  // For bracketed tournaments, current match, etc. - advanced
  // currentMatchId?: string;
  // scores?: number[]; // Scores in different rounds
}

// --- Request & Response Types (conceptual) ---
export interface RegisterForTournamentResponse {
    participantEntryId: string;
    status: ParticipantStatus;
    message: string;
}

export interface FinalizeTournamentParticipantResult {
    userId: string;
    rank: number;
    score?: number; // If applicable
    // any other game-specific result data needed for payout if prize is score-dependent beyond rank
}
export interface FinalizeTournamentRequestBody {
    participantResults: FinalizeTournamentParticipantResult[];
    // any other overall tournament result data
}
