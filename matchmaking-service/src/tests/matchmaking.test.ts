import { MatchmakingService } from '../services/matchmakingService';
import { JoinQueueRequestBody, JoinQueueResponse, Room } from '../types/matchmaking.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).matchmakingTestFailures = ((globalThis as any).matchmakingTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).matchmakingTestSuccesses = ((globalThis as any).matchmakingTestSuccesses || 0) + 1;
  }
};

// Mock Game IDs from MatchmakingService's mockGameData for testing
const LUDO_GAME_ID = 'ludo_masters_game_id'; // minPlayers: 2, maxPlayers: 4
const RUMMY_GAME_ID = 'rummy_royale_game_id'; // minPlayers: 2, maxPlayers: 5
const SOLO_GAME_ID = 'solo_challenge_game_id'; // minPlayers: 1, maxPlayers: 1
const INVALID_GAME_ID = 'non_existent_game_id';

const USER_A = 'userA_match_test';
const USER_B = 'userB_match_test';
const USER_C = 'userC_match_test';
const USER_D = 'userD_match_test';
const USER_E = 'userE_match_test';

const STAKE_10 = { amount: 10, currency: "INR" };
const STAKE_25 = { amount: 25, currency: "INR" };


const runMatchmakingTests = async () => {
  (globalThis as any).matchmakingTestFailures = 0;
  (globalThis as any).matchmakingTestSuccesses = 0;

  let matchmakingService: MatchmakingService; // Will be reset for some test groups

  console.log('\n--- Running MatchmakingService: Basic Queue Join Tests ---');
  matchmakingService = new MatchmakingService(); // Fresh service instance

  // Test 1: User joins a queue, not enough players for a room
  const joinReqA_Ludo: JoinQueueRequestBody = { gameId: LUDO_GAME_ID, stake: STAKE_10 };
  let responseA = await matchmakingService.joinQueue(USER_A, joinReqA_Ludo);
  assert(responseA.status === 'queued', 'JOIN-QUEUE-1: User A should be queued for Ludo.');
  assert(responseA.room === undefined, 'JOIN-QUEUE-2: No room should be formed yet for User A.');
  assert(responseA.entryId !== undefined, 'JOIN-QUEUE-3: User A should receive an entryId.');
  const entryIdA = responseA.entryId;

  // Test 2: Attempt to join with an invalid game ID
  const joinReqInvalidGame: JoinQueueRequestBody = { gameId: INVALID_GAME_ID, stake: STAKE_10 };
  try {
    await matchmakingService.joinQueue(USER_B, joinReqInvalidGame);
    assert(false, 'JOIN-INVALID-GAME-FAIL: Should have thrown error for invalid game ID.');
  } catch (e: any) {
    assert(e.message.includes('not found or not supported'), `JOIN-INVALID-GAME-1: Correct error. Got: ${e.message}`);
  }

  // Test 3: User attempts to join the same queue again
  try {
    await matchmakingService.joinQueue(USER_A, joinReqA_Ludo);
    assert(false, 'JOIN-DUPLICATE-FAIL: Should throw error for duplicate queue entry.');
  } catch (e: any) {
    assert(e.message.includes('already in the queue'), `JOIN-DUPLICATE-1: Correct error message for duplicate. Got: ${e.message}`);
  }

  console.log('\n--- Running MatchmakingService: Room Formation Tests (Ludo) ---');
  // USER_A is already in Ludo queue (entryIdA)

  // Test 4: Second user (USER_B) joins, Ludo game (min 2 players) should form a room
  const joinReqB_Ludo: JoinQueueRequestBody = { gameId: LUDO_GAME_ID, stake: STAKE_10 };
  let responseB = await matchmakingService.joinQueue(USER_B, joinReqB_Ludo);
  assert(responseB.status === 'matched', 'ROOM-LUDO-1: User B joining should trigger a match for Ludo.');
  assert(responseB.room !== undefined, 'ROOM-LUDO-2: Room details should be provided for User B.');
  const ludoRoom1 = responseB.room as Room;
  assert(ludoRoom1.gameId === LUDO_GAME_ID, 'ROOM-LUDO-3: Room gameId should be Ludo.');
  assert(ludoRoom1.players.length === 2, 'ROOM-LUDO-4: Room should have 2 players.');
  assert(ludoRoom1.players.some(p => p.userId === USER_A) && ludoRoom1.players.some(p => p.userId === USER_B), 'ROOM-LUDO-5: Room should contain User A and User B.');
  assert(ludoRoom1.stake.amount === STAKE_10.amount, 'ROOM-LUDO-6: Room stake should be correct.');

  // Test 5: Verify original User A's entry status (conceptually, User A would get this via different mechanism like event)
  // We can check the internal queue state for this test.
  const queuesSnapshot = (matchmakingService as any).getQueuesSnapshot();
  const ludoQueueKey = (matchmakingService as any).getQueueKey(LUDO_GAME_ID, STAKE_10);
  const ludoQueue = queuesSnapshot.get(ludoQueueKey) || [];
  assert(ludoQueue.every(e => e.status !== 'pending' || (e.userId !== USER_A && e.userId !== USER_B) ),
        'ROOM-LUDO-7: User A and B should no longer be pending in Ludo queue after match.');
  // More accurately, the queue for this game/stake should now be empty or not contain these users as 'pending'.
  assert(ludoQueue.filter(e => e.status === 'pending').length === 0, 'ROOM-LUDO-8: Ludo queue for STAKE_10 should be empty of pending players.');


  // Test 6: Get Room Details
  const fetchedRoom = await matchmakingService.getRoomDetails(ludoRoom1.roomId);
  assert(fetchedRoom !== undefined, 'GET-ROOM-1: Fetched room should not be undefined.');
  assert(fetchedRoom?.roomId === ludoRoom1.roomId, 'GET-ROOM-2: Fetched room ID should match.');
  assert(fetchedRoom?.players.length === 2, 'GET-ROOM-3: Fetched room should have 2 players.');

  console.log('\n--- Running MatchmakingService: Leave Queue Tests ---');
  matchmakingService = new MatchmakingService(); // Reset service for cleaner queue state

  // Test 7: User joins queue then leaves
  const joinReqC_Rummy: JoinQueueRequestBody = { gameId: RUMMY_GAME_ID, stake: STAKE_25 };
  const responseC_join = await matchmakingService.joinQueue(USER_C, joinReqC_Rummy);
  assert(responseC_join.status === 'queued', 'LEAVE-QUEUE-1: User C queued for Rummy.');
  const entryIdC = responseC_join.entryId;

  const leaveResponseC = await matchmakingService.leaveQueue(USER_C, entryIdC);
  assert(leaveResponseC.success === true, 'LEAVE-QUEUE-2: User C successfully left queue.');

  const rummyQueueKey = (matchmakingService as any).getQueueKey(RUMMY_GAME_ID, STAKE_25);
  const rummyQueueAfterLeave = (matchmakingService as any).getQueuesSnapshot().get(rummyQueueKey) || [];
  assert(rummyQueueAfterLeave.find(e => e.entryId === entryIdC) === undefined, 'LEAVE-QUEUE-3: User C entry should be removed from Rummy queue.');

  // Test 8: Attempt to leave with invalid entryId or already matched/left user
  try {
    await matchmakingService.leaveQueue(USER_C, entryIdC); // Try leaving again
    assert(false, 'LEAVE-INVALID-FAIL-1: Should throw error trying to leave with already processed entryId.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `LEAVE-INVALID-1: Correct error for leaving again. Got: ${e.message}`);
  }
  try {
    await matchmakingService.leaveQueue(USER_D, 'non_existent_entry_id');
    assert(false, 'LEAVE-INVALID-FAIL-2: Should throw error for non-existent entryId.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `LEAVE-INVALID-2: Correct error for non-existent entry. Got: ${e.message}`);
  }

  console.log('\n--- Running MatchmakingService: Max Player Room Formation (Ludo) ---');
  matchmakingService = new MatchmakingService(); // Reset
  // Ludo: min 2, max 4
  await matchmakingService.joinQueue(USER_A, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // P1
  await matchmakingService.joinQueue(USER_B, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // P2 - Room 1 forms (A,B)
  const respC = await matchmakingService.joinQueue(USER_C, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // P3
  assert(respC.status === 'queued', 'MAX-PLAYER-1: User C should be queued, first room (A,B) is full for minPlayers.');

  const respD = await matchmakingService.joinQueue(USER_D, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // P4 - Room 2 forms (C,D)
  assert(respD.status === 'matched', 'MAX-PLAYER-2: User D joining should form a new Ludo room (C,D).');
  assert(respD.room?.players.length === 2, 'MAX-PLAYER-3: Second Ludo room should have 2 players (C,D).');
  assert(respD.room?.players.some(p=>p.userId === USER_C) && respD.room?.players.some(p=>p.userId === USER_D), 'MAX-PLAYER-4: Second room has C & D.');

  // This test relies on the simple matchmaking logic that forms a room once minPlayers is met.
  // A more advanced one might try to fill up to maxPlayers. The current mock forms a room as soon as min is met.
  // The test above assumes that if 2 players are enough for Ludo, a room is made.
  // If the logic was to wait for maxPlayers or a timeout, this test would need adjustment.
  // Current logic: forms room with minPlayers, up to maxPlayers from queue.
  // Let's re-test with 5 players for Ludo (max 4)
  matchmakingService = new MatchmakingService(); // Reset
  await matchmakingService.joinQueue(USER_A, { gameId: LUDO_GAME_ID, stake: STAKE_10 });
  await matchmakingService.joinQueue(USER_B, { gameId: LUDO_GAME_ID, stake: STAKE_10 });
  await matchmakingService.joinQueue(USER_C, { gameId: LUDO_GAME_ID, stake: STAKE_10 });
  const respE_Ludo = await matchmakingService.joinQueue(USER_D, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // 4th player

  assert(respE_Ludo.status === 'matched', 'MAX-PLAYER-5: 4th player should complete a room of 4 for Ludo.');
  assert(respE_Ludo.room?.players.length === 4, 'MAX-PLAYER-6: Ludo room should now have 4 players (A,B,C,D).');

  const respF_Ludo = await matchmakingService.joinQueue(USER_E, { gameId: LUDO_GAME_ID, stake: STAKE_10 }); // 5th player
  assert(respF_Ludo.status === 'queued', 'MAX-PLAYER-7: 5th player (USER_E) should be queued for a new Ludo game.');


  console.log('\n--- Matchmaking Test Summary ---');
  console.log(`Successes: ${(globalThis as any).matchmakingTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).matchmakingTestFailures || 0}`);
  if ((globalThis as any).matchmakingTestFailures > 0) {
    console.error('SOME MATCHMAKING TESTS FAILED!');
  } else {
    console.log('All matchmaking tests passed (within this simulated environment)!');
  }
};

runMatchmakingTests();

export { runMatchmakingTests };
