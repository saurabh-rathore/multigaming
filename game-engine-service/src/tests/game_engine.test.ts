import { GameEngineService } from '../services/gameEngineService';
import { Game, GameResult, GameResultRequestBody } from '../types/game.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).gameEngineTestFailures = ((globalThis as any).gameEngineTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).gameEngineTestSuccesses = ((globalThis as any).gameEngineTestSuccesses || 0) + 1;
  }
};

// Get mock game IDs from the service's db for stable testing if possible
// This requires access to the db instance or specific IDs.
// For simplicity, we'll assume we know one or two active game IDs and one inactive from the mock data setup.
// Let's find them by properties, assuming names are unique for mock data.
let ACTIVE_GAME_ID_1: string | undefined;
let ACTIVE_GAME_ID_2: string | undefined;
let INACTIVE_GAME_ID: string | undefined;

const tempServiceForIds = new GameEngineService(); // Temporary instance to get IDs
(async () => {
    const games = await tempServiceForIds.listActiveGames();
    if (games.length > 0) ACTIVE_GAME_ID_1 = games.find(g => g.name === 'Ludo Masters')?.game_id;
    if (games.length > 1) ACTIVE_GAME_ID_2 = games.find(g => g.name === 'Rummy Royale')?.game_id;
    // To get inactive game ID, we'd need a method like listAllGames or access db directly
    // For now, let's assume we know its name from mock data setup in service
    const allGames = Array.from((tempServiceForIds as any).db.games.values()) as Game[];
    INACTIVE_GAME_ID = allGames.find(g => g.name === 'Inactive Game')?.game_id;
})();


const NON_EXISTENT_GAME_ID = 'game_id_does_not_exist';

const runGameEngineTests = async () => {
  (globalThis as any).gameEngineTestFailures = 0;
  (globalThis as any).gameEngineTestSuccesses = 0;

  const gameEngineService = new GameEngineService(); // Fresh instance for tests

  // Wait a moment for async ID fetching if tests run immediately
  await new Promise(resolve => setTimeout(resolve, 100));

  assert(ACTIVE_GAME_ID_1 !== undefined, 'PRE-TEST: ACTIVE_GAME_ID_1 must be found.');
  assert(INACTIVE_GAME_ID !== undefined, 'PRE-TEST: INACTIVE_GAME_ID must be found.');


  console.log('\n--- Running GameEngineService List & Get Game Tests ---');

  // Test 1: List active games
  const activeGames = await gameEngineService.listActiveGames();
  assert(activeGames.length === 2, 'LIST-GAMES-1: Should list 2 active games from mock data.');
  assert(activeGames.every(g => g.is_active), 'LIST-GAMES-2: All listed games should be active.');
  assert(activeGames.find(g => g.game_id === ACTIVE_GAME_ID_1) !== undefined, 'LIST-GAMES-3: Active game 1 should be in the list.');

  // Test 2: Get existing active game by ID
  if (ACTIVE_GAME_ID_1) {
    const game1 = await gameEngineService.getGameById(ACTIVE_GAME_ID_1);
    assert(game1 !== undefined, 'GET-GAME-1: Game 1 should be found.');
    assert(game1?.game_id === ACTIVE_GAME_ID_1, 'GET-GAME-2: Game 1 ID should match.');
    assert(game1?.name === 'Ludo Masters', 'GET-GAME-3: Game 1 name should be Ludo Masters.');
  }

  // Test 3: Get existing inactive game by ID
   if (INACTIVE_GAME_ID) {
    const inactiveGame = await gameEngineService.getGameById(INACTIVE_GAME_ID);
    assert(inactiveGame !== undefined, 'GET-INACTIVE-1: Inactive game should be found by ID.');
    assert(inactiveGame?.is_active === false, 'GET-INACTIVE-2: Game should be marked as inactive.');
  }

  // Test 4: Get non-existent game by ID
  const nonExistentGame = await gameEngineService.getGameById(NON_EXISTENT_GAME_ID);
  assert(nonExistentGame === undefined, 'GET-NON-EXISTENT-1: Non-existent game should return undefined.');


  console.log('\n--- Running GameEngineService Record Game Result Tests ---');
  const ROOM_ID_1 = 'room_alpha_101';
  const USER_ID_A = 'user_test_A';
  const USER_ID_B = 'user_test_B';

  // Test 5: Successfully record a new game result for an active game
  const resultData1: GameResultRequestBody = { room_id: ROOM_ID_1, user_id: USER_ID_A, score: 100, rank: 1, winnings: 50 };
  let recordedResult1: GameResult | undefined;
  if (ACTIVE_GAME_ID_1) {
    try {
      recordedResult1 = await gameEngineService.recordGameResult(ACTIVE_GAME_ID_1, resultData1);
      assert(recordedResult1 !== undefined, 'RECORD-RESULT-SUCCESS-1: Result should be recorded.');
      assert(recordedResult1.game_id === ACTIVE_GAME_ID_1, 'RECORD-RESULT-SUCCESS-2: Game ID should match.');
      assert(recordedResult1.user_id === USER_ID_A, 'RECORD-RESULT-SUCCESS-3: User ID should match.');
      assert(recordedResult1.score === 100, 'RECORD-RESULT-SUCCESS-4: Score should match.');
    } catch (e: any) {
      assert(false, `RECORD-RESULT-SUCCESS-FAIL: Should not fail: ${e.message}`);
    }
  }

  // Test 6: Attempt to record result for a non-existent game
  try {
    await gameEngineService.recordGameResult(NON_EXISTENT_GAME_ID, resultData1);
    assert(false, 'RECORD-NON-EXISTENT-GAME-FAIL: Should have thrown error.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `RECORD-NON-EXISTENT-GAME-1: Correct error. Got: ${e.message}`);
  }

  // Test 7: Attempt to record result for an inactive game
  if (INACTIVE_GAME_ID) {
    try {
      await gameEngineService.recordGameResult(INACTIVE_GAME_ID, resultData1);
      assert(false, 'RECORD-INACTIVE-GAME-FAIL: Should have thrown error.');
    } catch (e: any) {
      assert(e.message.includes('not active'), `RECORD-INACTIVE-GAME-1: Correct error. Got: ${e.message}`);
    }
  }

  // Test 8: Attempt to record a duplicate game result
  if (ACTIVE_GAME_ID_1 && recordedResult1) { // Ensure first result was recorded
    try {
      await gameEngineService.recordGameResult(ACTIVE_GAME_ID_1, resultData1); // Same data as resultData1
      assert(false, 'RECORD-DUPLICATE-FAIL: Should have thrown error for duplicate result.');
    } catch (e: any) {
      assert(e.message.includes('Duplicate game result'), `RECORD-DUPLICATE-1: Correct error. Got: ${e.message}`);
    }
  }

  // Test 9: Record another result for the same room, different user
  const resultData2: GameResultRequestBody = { room_id: ROOM_ID_1, user_id: USER_ID_B, score: 90, rank: 2, winnings: 10 };
  if (ACTIVE_GAME_ID_1) {
    try {
      const recordedResult2 = await gameEngineService.recordGameResult(ACTIVE_GAME_ID_1, resultData2);
      assert(recordedResult2 !== undefined, 'RECORD-RESULT-MULTIUSER-1: Second user result should record.');
      assert(recordedResult2.user_id === USER_ID_B, 'RECORD-RESULT-MULTIUSER-2: User ID B should match.');
    } catch (e: any) {
       assert(false, `RECORD-RESULT-MULTIUSER-FAIL: Should not fail: ${e.message}`);
    }
  }

  console.log('\n--- Running GameEngineService Get Results By Room Test ---');
  // Test 10: Get results by room ID
  const roomResults = await gameEngineService.getResultsByRoom(ROOM_ID_1);
  assert(roomResults.length === 2, 'GET-ROOM-RESULTS-1: Should find 2 results for ROOM_ID_1.');
  assert(roomResults.find(r => r.user_id === USER_ID_A) !== undefined, 'GET-ROOM-RESULTS-2: User A result should be present.');
  assert(roomResults.find(r => r.user_id === USER_ID_B) !== undefined, 'GET-ROOM-RESULTS-3: User B result should be present.');
  // Check sorting by rank (rank 1 should be first if ranks are defined)
  if (roomResults.length === 2 && roomResults[0].rank !== undefined && roomResults[1].rank !== undefined) {
    assert(roomResults[0].rank <= roomResults[1].rank, 'GET-ROOM-RESULTS-4: Results should be sorted by rank (ascending).');
  }


  console.log('\n--- Game Engine Test Summary ---');
  console.log(`Successes: ${(globalThis as any).gameEngineTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).gameEngineTestFailures || 0}`);
  if ((globalThis as any).gameEngineTestFailures > 0) {
    console.error('SOME GAME ENGINE TESTS FAILED!');
  } else {
    console.log('All game engine tests passed (within this simulated environment)!');
  }
};

// Run tests after a slight delay to ensure mock IDs are fetched.
// This is a workaround for the simple async ID fetching.
// In a real test setup, this would be handled by test runner's lifecycle hooks.
setTimeout(runGameEngineTests, 200);


export { runGameEngineTests }; // Export if it needs to be called from elsewhere
