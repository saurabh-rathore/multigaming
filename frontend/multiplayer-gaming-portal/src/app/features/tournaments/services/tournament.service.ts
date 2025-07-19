import { Injectable } from '@angular/core';
// import { HttpClient, HttpParams } from '@angular/common/http'; // Conceptual
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

// Mirroring Tournament types from backend conceptual service
export type TournamentStatus =
  | 'upcoming' | 'registration_open' | 'registration_closed'
  | 'active' | 'paused' | 'completed' | 'cancelled';

export interface PrizeDistributionRule {
  rank: number;
  percentage?: number;
  fixedAmount?: number;
  otherReward?: string;
}

export interface Tournament {
  tournamentId: string;
  gameId: string;
  gameName?: string; // Denormalized from GameService for display
  name: string;
  description?: string;
  status: TournamentStatus;
  scheduledStartTime: Date | string;
  actualStartTime?: Date | string;
  registrationOpenTime: Date | string;
  registrationCloseTime: Date | string;
  minParticipants: number;
  maxParticipants?: number;
  currentParticipants?: number; // Added for frontend display
  entryFee: number;
  currency: string;
  prizePool: number;
  prizePoolDistribution: PrizeDistributionRule[];
  rules?: string;
}

export interface TournamentParticipant {
    participantEntryId: string;
    tournamentId: string;
    userId: string;
    displayName?: string;
    registrationTime: Date;
    status: string; // e.g. 'registered', 'eliminated', 'winner'
    finalRank?: number;
    winnings?: number;
    winningsCurrency?: string;
}

export interface RegisterResponse {
    participantEntryId: string;
    status: string; // e.g. 'registered'
    message: string;
}

// Mock data
const now = new Date();
const MOCK_TOURNAMENTS: Tournament[] = [
  {
    tournamentId: 'ludo_weekly_001', gameId: 'ludo_masters_game_id', gameName: 'Ludo Masters',
    name: 'Ludo Weekly Challenge', status: 'registration_open',
    scheduledStartTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    registrationOpenTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    registrationCloseTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
    minParticipants: 10, maxParticipants: 100, currentParticipants: 15, entryFee: 10, currency: 'INR', prizePool: 150,
    prizePoolDistribution: [{ rank: 1, percentage: 70 }, { rank: 2, percentage: 30 }],
    description: 'Join the weekly Ludo challenge and win big prizes!'
  },
  {
    tournamentId: 'rummy_bash_002', gameId: 'rummy_royale_game_id', gameName: 'Rummy Royale',
    name: 'Rummy Weekend Bash', status: 'active',
    scheduledStartTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    actualStartTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    registrationOpenTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    registrationCloseTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    minParticipants: 4, maxParticipants: 50, currentParticipants: 30, entryFee: 25, currency: 'INR', prizePool: 1000,
    prizePoolDistribution: [{ rank: 1, fixedAmount: 500 }, { rank: 2, fixedAmount: 300 }, {rank: 3, fixedAmount: 200}],
    description: 'High stakes Rummy action all weekend.'
  },
  {
    tournamentId: 'chess_monthly_003', gameId: 'chess_grandmaster_id', gameName: 'Chess GM',
    name: 'Chess Monthly Final', status: 'completed',
    scheduledStartTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    actualStartTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    registrationOpenTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    registrationCloseTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    minParticipants: 2, currentParticipants: 20, entryFee: 0, currency: 'INR', prizePool: 100,
    prizePoolDistribution: [{ rank: 1, fixedAmount: 100 }],
    description: 'The grand finale of our monthly chess championship.'
  },
   {
    tournamentId: 'upcoming_ludo_004', gameId: 'ludo_masters_game_id', gameName: 'Ludo Masters',
    name: 'Upcoming Ludo Spark', status: 'upcoming',
    scheduledStartTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Starts next week
    registrationOpenTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Reg opens in 5 days
    registrationCloseTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
    minParticipants: 10, maxParticipants: 100, currentParticipants: 0, entryFee: 5, currency: 'INR', prizePool: 0,
    prizePoolDistribution: [{ rank: 1, percentage: 70 }, { rank: 2, percentage: 30 }],
    description: 'Get ready for the Ludo Spark tournament next week!'
  }
];

// Simulate participants for detail view - simple map for now
const MOCK_PARTICIPANTS = new Map<string, TournamentParticipant[]>();
MOCK_PARTICIPANTS.set('ludo_weekly_001', [
    {participantEntryId: 'p1', tournamentId: 'ludo_weekly_001', userId: 'userA', displayName: 'UserA', registrationTime: new Date(), status: 'registered', winnings: 100, winningsCurrency: 'INR'},
    {participantEntryId: 'p2', tournamentId: 'ludo_weekly_001', userId: 'userB', displayName: 'UserB', registrationTime: new Date(), status: 'registered', winnings: 50, winningsCurrency: 'INR'}
]);


@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  // private apiUrl = '/api/v1/tournaments'; // Conceptual

  constructor(/*private http: HttpClient*/) {}

  getTournaments(filters?: { gameId?: string; status?: TournamentStatus }): Observable<Tournament[]> {
    console.log('[TournamentService] Fetching tournaments (mocked) with filters:', filters);
    let tournaments = MOCK_TOURNAMENTS;
    if (filters?.gameId) {
      tournaments = tournaments.filter(t => t.gameId === filters.gameId);
    }
    if (filters?.status) {
      tournaments = tournaments.filter(t => t.status === filters.status);
    }
    return of(tournaments).pipe(delay(400));
  }

  getTournamentDetails(tournamentId: string): Observable<Tournament | undefined> {
    console.log(`[TournamentService] Fetching details for tournament ID: ${tournamentId} (mocked)`);
    const tournament = MOCK_TOURNAMENTS.find(t => t.tournamentId === tournamentId);
    return of(tournament).pipe(delay(300));
  }

  getTournamentParticipants(tournamentId: string): Observable<TournamentParticipant[]> {
    console.log(`[TournamentService] Fetching participants for tournament ID: ${tournamentId} (mocked)`);
    const participants = MOCK_PARTICIPANTS.get(tournamentId) || [];
    return of(participants).pipe(delay(250));
  }

  registerForTournament(tournamentId: string, userId: string): Observable<RegisterResponse> {
    console.log(`[TournamentService] Attempting registration for user ${userId} in tournament ${tournamentId} (mocked)`);
    const tournament = MOCK_TOURNAMENTS.find(t => t.tournamentId === tournamentId);

    if (!tournament) {
      return throwError(() => new Error('Tournament not found.')).pipe(delay(200));
    }
    if (tournament.status !== 'registration_open') {
      return throwError(() => new Error('Tournament registration is not currently open.')).pipe(delay(200));
    }
    // Add more checks: maxParticipants, already registered, fee payment (conceptual)
    if (tournament.maxParticipants && (tournament.currentParticipants || 0) >= tournament.maxParticipants) {
        return throwError(() => new Error('Tournament is full.')).pipe(delay(200));
    }

    // Simulate successful registration
    tournament.currentParticipants = (tournament.currentParticipants || 0) + 1;
    const newParticipantEntryId = `entry_${userId}_${tournamentId}`;

    const currentParticipants = MOCK_PARTICIPANTS.get(tournamentId) || [];
    currentParticipants.push({
        participantEntryId: newParticipantEntryId, tournamentId, userId,
        displayName: userId, registrationTime: new Date(), status: 'registered'
    });
    MOCK_PARTICIPANTS.set(tournamentId, currentParticipants);

    return of({
        participantEntryId: newParticipantEntryId,
        status: 'registered',
        message: 'Successfully registered for the tournament! (mocked)'
    }).pipe(delay(500));
  }
}
