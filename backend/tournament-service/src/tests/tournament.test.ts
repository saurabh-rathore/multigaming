import { TournamentService } from '../services/tournamentService';
import {
    Tournament, TournamentParticipant, TournamentStatus, ParticipantStatus,
    FinalizeTournamentParticipantResult
} from '../types/tournament.types';
// We might need to access mock IDs if they are dynamically generated in service,
// or use known properties like names to fetch them.
// For simplicity, we'll assume we can retrieve them or use names.

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).tournamentTestFailures = ((globalThis as any).tournamentTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).tournamentTestSuccesses = ((globalThis as any).tournamentTestSuccesses || 0) + 1;
  }
};

const USER_X = 'userX_tourney_test';
const USER_Y = 'userY_tourney_test';
const USER_Z = 'userZ_tourney_test';
const ADMIN_USER_ID = 'admin_for_tourney_ops';

// Helper to find a tournament by name from the service's mock data (since IDs are dynamic)
const findTournamentByName = async (service: TournamentService, name: string): Promise<Tournament | undefined> => {
    const allTournaments = await service.listTournaments({});
    return allTournaments.find(t => t.name === name);
};


const runTournamentServiceTests = async () => {
  (globalThis as any).tournamentTestFailures = 0;
  (globalThis as any).tournamentTestSuccesses = 0;

  let tournamentService: TournamentService;

  console.log('\n--- Running TournamentService: List & Get Details Tests ---');
  tournamentService = new TournamentService(); // Fresh instance

  // Test 1: List tournaments (initial state)
  const initialTournaments = await tournamentService.listTournaments({});
  assert(initialTournaments.length >= 2, 'LIST-1: Should list at least 2 initial mock tournaments.'); // Ludo, Rummy, Chess

  // Test 2: Filter tournaments by status 'registration_open'
  const openTournaments = await tournamentService.listTournaments({ status: 'registration_open' });
  assert(openTournaments.length === 1 && openTournaments[0].name === 'Ludo Weekly Challenge', 'LIST-2: Should find Ludo tournament open for registration.');
  const LUDO_ID = openTournaments[0].tournamentId; // Get ID for later tests

  // Test 3: Filter tournaments by status 'active'
  const activeTournaments = await tournamentService.listTournaments({ status: 'active' });
  assert(activeTournaments.length === 1 && activeTournaments[0].name === 'Rummy Weekend Bash', 'LIST-3: Should find Rummy tournament as active.');
  const RUMMY_ID = activeTournaments[0].tournamentId;

  // Test 4: Get specific tournament details
  const ludoDetails = await tournamentService.getTournamentById(LUDO_ID);
  assert(ludoDetails !== undefined && ludoDetails.name === 'Ludo Weekly Challenge', 'GET-DETAILS-1: Correct Ludo tournament details fetched.');


  console.log('\n--- Running TournamentService: Registration Tests ---');
  tournamentService = new TournamentService(); // Reset for registration tests to use fresh Ludo
  const freshLudo = await findTournamentByName(tournamentService, 'Ludo Weekly Challenge');
  const FRESH_LUDO_ID = freshLudo!.tournamentId;

  // Test 5: Successful registration for Ludo
  let regUserX = await tournamentService.registerForTournament(FRESH_LUDO_ID, USER_X, 'UserX_Display');
  assert(regUserX.userId === USER_X && regUserX.status === 'registered', 'REG-SUCCESS-1: User X registered successfully for Ludo.');
  assert(regUserX.displayName === 'UserX_Display', 'REG-SUCCESS-2: Display name stored.');

  // Test 6: Check prize pool update after registration (if dynamic)
  const ludoAfterRegX = await tournamentService.getTournamentById(FRESH_LUDO_ID);
  // Ludo mock has entryFee: 10, initial prizePool: 0
  assert(ludoAfterRegX?.prizePool === 10, `REG-PRIZEPOOL-1: Ludo prize pool should be 10. Got: ${ludoAfterRegX?.prizePool}`);

  // Test 7: User Y registers successfully
  await tournamentService.registerForTournament(FRESH_LUDO_ID, USER_Y);
  const ludoAfterRegY = await tournamentService.getTournamentById(FRESH_LUDO_ID);
  assert(ludoAfterRegY?.prizePool === 20, `REG-PRIZEPOOL-2: Ludo prize pool should be 20. Got: ${ludoAfterRegY?.prizePool}`);

  // Test 8: Attempt to register same user again
  try {
    await tournamentService.registerForTournament(FRESH_LUDO_ID, USER_X);
    assert(false, 'REG-DUPLICATE-FAIL: Should not allow duplicate registration.');
  } catch (e: any) {
    assert(e.message.includes('already registered'), `REG-DUPLICATE-1: Correct error. Got: ${e.message}`);
  }

  // Test 9: List participants for Ludo
  let ludoParticipants = await tournamentService.getTournamentParticipants(FRESH_LUDO_ID);
  assert(ludoParticipants.length === 2, 'LIST-PARTICIPANTS-1: Ludo should have 2 participants (X, Y).');
  assert(ludoParticipants.some(p => p.userId === USER_X) && ludoParticipants.some(p => p.userId === USER_Y), 'LIST-PARTICIPANTS-2: User X and Y should be in list.');

  // Test 10: Registration for a tournament not open (e.g., 'active' Rummy tournament)
  const activeRummy = await findTournamentByName(tournamentService, 'Rummy Weekend Bash');
  try {
    await tournamentService.registerForTournament(activeRummy!.tournamentId, USER_Z);
    assert(false, 'REG-NOT-OPEN-FAIL: Should not allow registration for active tournament.');
  } catch (e: any) {
    assert(e.message.includes('not open'), `REG-NOT-OPEN-1: Correct error for non-open registration. Got: ${e.message}`);
  }

  // Test 11: Max participants (Need a tournament with max participants reached)
  // For this, we'd need to adjust mock data or register many users. Simulating this conceptually.
  // Let's assume Ludo's maxParticipants was 2.
  const tempLudo = await tournamentService.getTournamentById(FRESH_LUDO_ID);
  if (tempLudo) (tempLudo as any).maxParticipants = 2; // Temporarily modify for test
  try {
    await tournamentService.registerForTournament(FRESH_LUDO_ID, USER_Z); // X and Y already in
    assert(false, 'REG-FULL-FAIL: Should not allow registration if tournament is full.');
  } catch (e: any) {
    assert(e.message.includes('full'), `REG-FULL-1: Correct error for full tournament. Got: ${e.message}`);
  }
  if (tempLudo) (tempLudo as any).maxParticipants = 100; // Reset


  console.log('\n--- Running TournamentService: Admin Flow Tests (Start & Finalize) ---');
  // USER_X and USER_Y are registered in FRESH_LUDO_ID. Min participants is 2.

  // Test 12: Admin starts Ludo tournament
  let startedLudo = await tournamentService.startTournament(FRESH_LUDO_ID, ADMIN_USER_ID);
  assert(startedLudo.status === 'active', 'ADMIN-START-1: Ludo status should be active.');
  assert(startedLudo.actualStartTime !== undefined, 'ADMIN-START-2: Actual start time should be set.');

  // Test 13: Attempt to start already active tournament
  try {
    await tournamentService.startTournament(FRESH_LUDO_ID, ADMIN_USER_ID);
    assert(false, 'ADMIN-START-ACTIVE-FAIL: Should not start an_already active tournament.');
  } catch (e:any) {
    assert(e.message.includes('cannot be started'), `ADMIN-START-ACTIVE-1: Correct error. Got: ${e.message}`);
  }

  // Test 14: Admin finalizes Ludo tournament with results
  // Ludo Prize Pool: 20 (from 2 entries of 10). Rules: 1st 70%, 2nd 30%
  // Winnings: UserX (Rank 1) = 20 * 0.7 = 14. UserY (Rank 2) = 20 * 0.3 = 6.
  const finalResults: FinalizeTournamentParticipantResult[] = [
    { userId: USER_X, rank: 1, score: 1000 },
    { userId: USER_Y, rank: 2, score: 800 },
  ];
  let finalizedLudo = await tournamentService.finalizeTournament(FRESH_LUDO_ID, ADMIN_USER_ID, finalResults);
  assert(finalizedLudo.status === 'completed', 'ADMIN-FINALIZE-1: Ludo status should be completed.');
  assert(finalizedLudo.actualEndTime !== undefined, 'ADMIN-FINALIZE-2: Actual end time should be set.');

  // Test 15: Verify participant ranks and winnings
  ludoParticipants = await tournamentService.getTournamentParticipants(FRESH_LUDO_ID);
  const participantX = ludoParticipants.find(p => p.userId === USER_X);
  const participantY = ludoParticipants.find(p => p.userId === USER_Y);

  assert(participantX !== undefined, 'ADMIN-FINALIZE-PART-X-1: Participant X should exist.');
  assert(participantX?.finalRank === 1, 'ADMIN-FINALIZE-PART-X-2: User X rank should be 1.');
  assert(participantX?.winnings === 14, `ADMIN-FINALIZE-PART-X-3: User X winnings should be 14. Got: ${participantX?.winnings}`);
  assert(participantX?.status === 'completed', 'ADMIN-FINALIZE-PART-X-4: User X status should be completed.');
  assert(participantX?.payoutStatus === 'processed', 'ADMIN-FINALIZE-PART-X-5: User X payout status should be processed (simulated).');

  assert(participantY !== undefined, 'ADMIN-FINALIZE-PART-Y-1: Participant Y should exist.');
  assert(participantY?.finalRank === 2, 'ADMIN-FINALIZE-PART-Y-2: User Y rank should be 2.');
  assert(participantY?.winnings === 6, `ADMIN-FINALIZE-PART-Y-3: User Y winnings should be 6. Got: ${participantY?.winnings}`);
  assert(participantY?.status === 'completed', 'ADMIN-FINALIZE-PART-Y-4: User Y status should be completed.');
  assert(participantY?.payoutStatus === 'processed', 'ADMIN-FINALIZE-PART-Y-5: User Y payout status should be processed (simulated).');

  // Test 16: Attempt to start a tournament with insufficient participants
  tournamentService = new TournamentService(); // Reset
  const newSoloTournament: Tournament = {
      tournamentId: 'solo_test_id', gameId: 'some_game', name: 'Solo Test', status: 'registration_open',
      scheduledStartTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      registrationOpenTime: now, registrationCloseTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      minParticipants: 2, entryFee: 0, currency: 'INR', prizePool: 0, prizePoolDistribution: [],
      createdAt: now, updatedAt: now
  };
  (tournamentService as any).mockTournaments.set(newSoloTournament.tournamentId, newSoloTournament); // Add to service
  (tournamentService as any).mockParticipants.set(newSoloTournament.tournamentId, []);

  try {
      await tournamentService.startTournament(newSoloTournament.tournamentId, ADMIN_USER_ID);
      assert(false, 'ADMIN-START-INSUFFICIENT-FAIL: Should not start with 0 participants if min is 2.');
  } catch (e: any) {
      assert(e.message.includes('Minimum 2 participants required'), `ADMIN-START-INSUFFICIENT-1: Correct error. Got: ${e.message}`);
  }


  console.log('\n--- Tournament Service Test Summary ---');
  console.log(`Successes: ${(globalThis as any).tournamentTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).tournamentTestFailures || 0}`);
  if ((globalThis as any).tournamentTestFailures > 0) {
    console.error('SOME TOURNAMENT SERVICE TESTS FAILED!');
  } else {
    console.log('All tournament service tests passed (within this simulated environment)!');
  }
};

runTournamentServiceTests();

export { runTournamentServiceTests };
