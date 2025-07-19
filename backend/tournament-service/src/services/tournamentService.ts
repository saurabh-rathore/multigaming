import {
  Tournament, TournamentParticipant, TournamentStatus, ParticipantStatus,
  PrizeDistributionRule, FinalizeTournamentParticipantResult
} from '../types/tournament.types';
import { generateId, simulateWalletDebit, simulateWalletCredit } from '../utils/helpers';

// --- Mock Data Store ---
const mockTournaments = new Map<string, Tournament>();
const mockParticipants = new Map<string, TournamentParticipant[]>(); // Key: tournamentId

// Pre-populate with some mock tournaments
const now = new Date();
const T_LUDO_ID = generateId('tLudo');
const T_RUMMY_ID = generateId('tRummy');
const T_CHESS_ID = generateId('tChess');

const mockLudoTournament: Tournament = {
  tournamentId: T_LUDO_ID, gameId: 'ludo_masters_game_id', name: 'Ludo Weekly Challenge', status: 'registration_open',
  scheduledStartTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
  registrationOpenTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Opened yesterday
  registrationCloseTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // Closes in 1.5 days
  minParticipants: 2, maxParticipants: 100, entryFee: 10, currency: 'INR', prizePool: 0, // Prize pool can grow with entry fees
  prizePoolDistribution: [{ rank: 1, percentage: 70 }, { rank: 2, percentage: 30 }],
  createdAt: new Date(), updatedAt: new Date(),
};
mockTournaments.set(T_LUDO_ID, mockLudoTournament);
mockParticipants.set(T_LUDO_ID, []);

const mockRummyTournament: Tournament = {
  tournamentId: T_RUMMY_ID, gameId: 'rummy_royale_game_id', name: 'Rummy Weekend Bash', status: 'active',
  scheduledStartTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Started 1 hour ago
  actualStartTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
  registrationOpenTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  registrationCloseTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Closed 2 hours ago
  minParticipants: 4, maxParticipants: 50, entryFee: 25, currency: 'INR', prizePool: 1000, // Fixed prize pool
  prizePoolDistribution: [{ rank: 1, fixedAmount: 500 }, { rank: 2, fixedAmount: 300 }, { rank: 3, fixedAmount: 200 }],
  createdAt: new Date(), updatedAt: new Date(),
};
mockTournaments.set(T_RUMMY_ID, mockRummyTournament);
// Add some participants to active rummy tournament
mockParticipants.set(T_RUMMY_ID, [
    { participantEntryId: generateId('p'), tournamentId: T_RUMMY_ID, userId: 'userA', displayName: 'UserA', registrationTime: new Date(), status: 'playing'},
    { participantEntryId: generateId('p'), tournamentId: T_RUMMY_ID, userId: 'userB', displayName: 'UserB', registrationTime: new Date(), status: 'playing'},
    { participantEntryId: generateId('p'), tournamentId: T_RUMMY_ID, userId: 'userC', displayName: 'UserC', registrationTime: new Date(), status: 'playing'},
    { participantEntryId: generateId('p'), tournamentId: T_RUMMY_ID, userId: 'userD', displayName: 'UserD', registrationTime: new Date(), status: 'playing'},
]);


const mockChessTournamentCompleted: Tournament = {
  tournamentId: T_CHESS_ID, gameId: 'chess_grandmaster_id', name: 'Chess Monthly Final', status: 'completed',
  scheduledStartTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  actualStartTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  registrationOpenTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
  registrationCloseTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
  actualEndTime: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
  minParticipants: 2, entryFee: 0, currency: 'INR', prizePool: 100,
  prizePoolDistribution: [{ rank: 1, fixedAmount: 100 }],
  createdAt: new Date(), updatedAt: new Date(),
};
mockTournaments.set(T_CHESS_ID, mockChessTournamentCompleted);
mockParticipants.set(T_CHESS_ID, [
    { participantEntryId: generateId('p'), tournamentId: T_CHESS_ID, userId: 'userWinner', displayName: 'Winner', registrationTime: new Date(), status: 'completed', finalRank: 1, winnings: 100, payoutStatus: 'processed'},
    { participantEntryId: generateId('p'), tournamentId: T_CHESS_ID, userId: 'userLoser', displayName: 'Loser', registrationTime: new Date(), status: 'completed', finalRank: 2, winnings: 0},
]);


export class TournamentService {

  async listTournaments(filters: { gameId?: string; status?: TournamentStatus }): Promise<Tournament[]> {
    let results = Array.from(mockTournaments.values());
    if (filters.gameId) {
      results = results.filter(t => t.gameId === filters.gameId);
    }
    if (filters.status) {
      results = results.filter(t => t.status === filters.status);
    }
    return results.sort((a,b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime());
  }

  async getTournamentById(tournamentId: string): Promise<Tournament | undefined> {
    return mockTournaments.get(tournamentId);
  }

  async registerForTournament(tournamentId: string, userId: string, displayName?: string): Promise<TournamentParticipant> {
    const tournament = mockTournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');
    if (tournament.status !== 'registration_open') throw new Error('Tournament registration is not open.');
    if (new Date() > tournament.registrationCloseTime) throw new Error('Registration period has ended.');
    if (new Date() < tournament.registrationOpenTime) throw new Error('Registration has not opened yet.');

    const participants = mockParticipants.get(tournamentId) || [];
    if (tournament.maxParticipants && participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full.');
    }
    if (participants.some(p => p.userId === userId)) {
      throw new Error('User already registered for this tournament.');
    }

    // Simulate entry fee debit
    if (tournament.entryFee > 0) {
      const paymentSuccess = await simulateWalletDebit(userId, tournament.entryFee, tournament.currency);
      if (!paymentSuccess) {
        throw new Error('Entry fee payment failed (simulated).');
      }
      // If prize pool is dynamic, add entry fee to it
      if (mockTournaments.has(tournamentId)) { // Re-fetch to update prize pool
          const currentTournament = mockTournaments.get(tournamentId)!;
          currentTournament.prizePool += tournament.entryFee;
          currentTournament.updatedAt = new Date();
      }
    }

    const newParticipant: TournamentParticipant = {
      participantEntryId: generateId('pt'),
      tournamentId, userId, displayName: displayName || userId,
      registrationTime: new Date(), status: 'registered',
    };
    participants.push(newParticipant);
    mockParticipants.set(tournamentId, participants);
    return newParticipant;
  }

  async getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    const tournament = mockTournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');
    return mockParticipants.get(tournamentId) || [];
  }

  // --- Admin-like conceptual endpoints ---
  async startTournament(tournamentId: string, adminUserId: string): Promise<Tournament> {
    const tournament = mockTournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');
    // Typically, status should be registration_closed or similar
    if (tournament.status !== 'registration_open' && tournament.status !== 'registration_closed' && tournament.status !== 'upcoming') {
      throw new Error(`Tournament cannot be started from status: ${tournament.status}.`);
    }
    const participants = mockParticipants.get(tournamentId) || [];
    if (participants.length < tournament.minParticipants) {
        throw new Error(`Tournament cannot start. Minimum ${tournament.minParticipants} participants required, found ${participants.length}.`);
    }

    tournament.status = 'active';
    tournament.actualStartTime = new Date();
    tournament.updatedAt = new Date();
    // Audit log for admin action would be created here
    console.log(`[TournamentService] Admin ${adminUserId} started tournament ${tournamentId}`);
    return tournament;
  }

  async finalizeTournament(tournamentId: string, adminUserId: string, results: FinalizeTournamentParticipantResult[]): Promise<Tournament> {
    const tournament = mockTournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');
    if (tournament.status !== 'active' && tournament.status !== 'paused') { // Allow finalizing if paused too
      throw new Error(`Tournament cannot be finalized from status: ${tournament.status}.`);
    }

    const participants = mockParticipants.get(tournamentId) || [];
    for (const result of results) {
      const participant = participants.find(p => p.userId === result.userId);
      if (participant) {
        participant.finalRank = result.rank;
        // participant.score = result.score; // If score is part of finalization data
        participant.status = 'completed';

        // Calculate winnings
        for (const rule of tournament.prizePoolDistribution) {
          if (rule.rank === result.rank) {
            if (rule.percentage) {
              participant.winnings = (tournament.prizePool * rule.percentage) / 100;
            } else if (rule.fixedAmount) {
              participant.winnings = rule.fixedAmount;
            }
            participant.winningsCurrency = tournament.currency; // Assume winnings in tournament currency
            if (participant.winnings && participant.winnings > 0) {
                participant.payoutStatus = 'pending'; // conceptual
                // Simulate payout via wallet service
                await simulateWalletCredit(participant.userId, participant.winnings, tournament.currency, `Tournament ${tournament.name} payout`);
                participant.payoutStatus = 'processed'; // if simulated credit is successful
            }
            break;
          }
        }
      }
    }

    tournament.status = 'completed';
    tournament.actualEndTime = new Date();
    tournament.updatedAt = new Date();
    // Audit log for admin action
    console.log(`[TournamentService] Admin ${adminUserId} finalized tournament ${tournamentId}`);
    return tournament;
  }
}
