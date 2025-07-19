import { GameEngineService } from '../services/gameEngineService';
import { Game, GameResult, GameResultRequestBody } from '../types/game.types';
import { LudoGameState } from '../types/ludo.types'; // For Ludo tests
// Import mock controls from GameEngineService's specific db.config
import {
    __GameEngine_टेस्ट_setOneTimeMockResponse as setMockDbResponse,
    __GameEngine_टेस्ट_clearOneTimeMockResponses as clearMockDbResponses
} from '../config/db.config';

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

// Helper for mock OkPacket
const mockOkPacket = (affectedRows = 1, insertId: string | number = 1) => ({
  okPacket: { affectedRows, insertId, changedRows: affectedRows }
});
const mockSelectEmpty = () => ({ rows: [] });

// Mock Game Metadata (consistent with what might be in DB)
const LUDO_META_ID = 'ludo_game_official_id'; // Used by Ludo logic in service
const MOCK_LUDO_META: Game = {
  game_id: LUDO_META_ID, name: 'Ludo Classic', description: 'The game of Ludo.', genre: 'Board',
  min_players: 2, max_players: 4, is_active: true,
  stake_options: [{amount: 10, currency: "INR"}], // Will be stringified in DB, parsed on read
  created_at: new Date(), updatedAt: new Date()
};
const MOCK_RUMMY_META: Game = {
  game_id: 'rummy_meta_id', name: 'Rummy Royale', description: 'Card game.', genre: 'Card',
  min_players: 2, max_players: 5, is_active: true,
  stake_options: [{amount: 25, currency: "INR"}],
  created_at: new Date(), updatedAt: new Date()
};
const MOCK_INACTIVE_GAME_META: Game = {
  game_id: 'inactive_meta_id', name: 'Inactive Puzzle', description: 'Puzzle game.', genre: 'Puzzle',
  min_players: 1, max_players: 1, is_active: false,
  created_at: new Date(), updatedAt: new Date()
};

const NON_EXISTENT_GAME_ID_META = 'game_meta_does_not_exist';
const USER_A_GE = 'userA_ge_test';
const USER_B_GE = 'userB_ge_test';
const ROOM_ID_GE_1 = 'room_ge_alpha_101';


const runGameEngineDbTests = async () => {
  (globalThis as any).gameEngineTestFailures = 0;
  (globalThis as any).gameEngineTestSuccesses = 0;
  let gameEngineService: GameEngineService;

  const beforeEachTest = () => {
    gameEngineService = new GameEngineService();
    // Crucially, clear Ludo game states for Ludo tests, as that part is still in-memory
    gameEngineService.clearLudoGames();
    clearMockDbResponses();
  };

  console.log('\n--- Running GameEngineService (DB Mocked): Metadata Tests ---');
  beforeEachTest();

  // Test 1: List active games (metadata)
  // Mock the SELECT query for active games
  setMockDbResponse({ rows: [MOCK_LUDO_META, MOCK_RUMMY_META].map(g => ({...g, stake_options: JSON.stringify(g.stake_options)})) });
  const activeGames = await gameEngineService.listActiveGames();
  assert(activeGames.length === 2, 'LIST-GAMES-DB-1: Should list 2 active games from mock DB.');
  assert(activeGames.every(g => g.is_active), 'LIST-GAMES-DB-2: All listed games should be active.');
  assert(activeGames.find(g => g.game_id === LUDO_META_ID) !== undefined, 'LIST-GAMES-DB-3: Ludo meta should be in list.');
  assert(typeof activeGames[0].stake_options === 'object', 'LIST-GAMES-DB-4: stake_options should be parsed to object.');


  // Test 2: Get existing active game by ID (metadata)
  beforeEachTest();
  setMockDbResponse({ rows: [{...MOCK_LUDO_META, stake_options: JSON.stringify(MOCK_LUDO_META.stake_options)}] });
  const game1 = await gameEngineService.getGameById(LUDO_META_ID);
  assert(game1 !== undefined, 'GET-GAME-DB-1: Ludo meta should be found.');
  assert(game1?.name === 'Ludo Classic', 'GET-GAME-DB-2: Ludo meta name correct.');
  assert(typeof game1?.stake_options === 'object', 'GET-GAME-DB-3: stake_options parsed on getGameById.');

  // Test 3: Get non-existent game by ID (metadata)
  beforeEachTest();
  setMockDbResponse(mockSelectEmpty());
  const nonExistentGame = await gameEngineService.getGameById(NON_EXISTENT_GAME_ID_META);
  assert(nonExistentGame === undefined, 'GET-NON-EXISTENT-DB-1: Non-existent game meta should be undefined.');


  console.log('\n--- Running GameEngineService (DB Mocked): Game Results Tests ---');
  beforeEachTest();

  // Test 4: Successfully record a new game result
  const resultData1: GameResultRequestBody = { room_id: ROOM_ID_GE_1, user_id: USER_A_GE, score: 100, rank: 1, winnings: 50 };
  // 1. Mock getGameById (for game active check)
  setMockDbResponse({ rows: [{...MOCK_LUDO_META, stake_options: JSON.stringify(MOCK_LUDO_META.stake_options)}] });
  // 2. Mock SELECT for duplicate check (no existing result)
  setMockDbResponse(mockSelectEmpty());
  // 3. Mock INSERT for the new game_result
  setMockDbResponse(mockOkPacket(1, 'result_xyz_123'));

  let recordedResult1: GameResult | undefined;
  try {
    recordedResult1 = await gameEngineService.recordGameResult(LUDO_META_ID, resultData1);
    assert(recordedResult1 !== undefined, 'RECORD-RESULT-DB-SUCCESS-1: Result should be recorded.');
    assert(recordedResult1.game_id === LUDO_META_ID, 'RECORD-RESULT-DB-SUCCESS-2: Game ID matches.');
    assert(recordedResult1.user_id === USER_A_GE, 'RECORD-RESULT-DB-SUCCESS-3: User ID matches.');
    assert(recordedResult1.score === 100, 'RECORD-RESULT-DB-SUCCESS-4: Score matches.');
  } catch (e: any) {
    assert(false, `RECORD-RESULT-DB-SUCCESS-FAIL: Should not fail: ${e.message}`);
  }

  // Test 5: Attempt to record result for an inactive game
  beforeEachTest();
  // 1. Mock getGameById -> returns inactive game
  setMockDbResponse({ rows: [{...MOCK_INACTIVE_GAME_META, stake_options: MOCK_INACTIVE_GAME_META.stake_options ? JSON.stringify(MOCK_INACTIVE_GAME_META.stake_options) : null}] });
  try {
    await gameEngineService.recordGameResult(MOCK_INACTIVE_GAME_META.game_id, resultData1);
    assert(false, 'RECORD-INACTIVE-GAME-DB-FAIL: Should have thrown error.');
  } catch (e: any) {
    assert(e.message.includes('not active'), `RECORD-INACTIVE-GAME-DB-1: Correct error. Got: ${e.message}`);
  }

  // Test 6: Attempt to record a duplicate game result
  beforeEachTest();
  // 1. Mock getGameById -> returns active game
  setMockDbResponse({ rows: [{...MOCK_LUDO_META, stake_options: JSON.stringify(MOCK_LUDO_META.stake_options)}] });
  // 2. Mock SELECT for duplicate check -> returns an existing result
  setMockDbResponse({ rows: [{ result_id: 'existing_res_id', ...resultData1, game_id: LUDO_META_ID, recorded_at: new Date() }] });
  try {
    await gameEngineService.recordGameResult(LUDO_META_ID, resultData1);
    assert(false, 'RECORD-DUPLICATE-DB-FAIL: Should have thrown error.');
  } catch (e: any) {
    assert(e.message.includes('Duplicate game result'), `RECORD-DUPLICATE-DB-1: Correct error. Got: ${e.message}`);
  }

  // Test 7: Get results by room ID
  beforeEachTest();
  const mockResultsForRoom: GameResult[] = [
      { result_id: 'res1', game_id: LUDO_META_ID, room_id: ROOM_ID_GE_1, user_id: USER_A_GE, score: 100, rank:1, recorded_at: new Date()},
      { result_id: 'res2', game_id: LUDO_META_ID, room_id: ROOM_ID_GE_1, user_id: USER_B_GE, score: 90, rank:2, recorded_at: new Date()},
  ];
  setMockDbResponse({ rows: mockResultsForRoom.map(r => ({...r, game_specific_data: r.game_specific_data ? JSON.stringify(r.game_specific_data) : null})) });
  const roomResults = await gameEngineService.getResultsByRoom(ROOM_ID_GE_1);
  assert(roomResults.length === 2, 'GET-ROOM-RESULTS-DB-1: Should find 2 results for room.');
  assert(roomResults.some(r => r.user_id === USER_A_GE), 'GET-ROOM-RESULTS-DB-2: User A result present.');


  console.log('\n--- Running GameEngineService: Ludo Game Logic (DB Mock for Meta) Tests ---');
  beforeEachTest(); // Clears Ludo games too

  // Test 8: startLudoGame - successfully
  // 1. Mock for getGameById(LUDO_GAME_ID_CONST) inside startLudoGame
  setMockDbResponse({ rows: [{...MOCK_LUDO_META, stake_options: JSON.stringify(MOCK_LUDO_META.stake_options)}] });
  let ludoState: LudoGameState | undefined;
  try {
    ludoState = await gameEngineService.startLudoGame(ROOM_ID_GE_1, [USER_A_GE, USER_B_GE]);
    assert(ludoState !== undefined, 'LUDO-START-DB-1: Ludo game state should be created.');
    assert(ludoState.roomId === ROOM_ID_GE_1, 'LUDO-START-DB-2: Room ID correct.');
    assert(ludoState.players.length === 2, 'LUDO-START-DB-3: Correct number of players.');
    assert(ludoState.gameId === LUDO_META_ID, 'LUDO-START-DB-4: Game ID is Ludo meta ID.');
  } catch (e: any) {
    assert(false, `LUDO-START-DB-FAIL: Should not fail. Error: ${e.message}`);
  }

  // Test 9: startLudoGame - Ludo metadata not found in DB
  beforeEachTest();
  setMockDbResponse(mockSelectEmpty()); // Mock getGameById(LUDO_GAME_ID_CONST) returns nothing
  try {
    await gameEngineService.startLudoGame(ROOM_ID_GE_1, [USER_A_GE, USER_B_GE]);
    assert(false, 'LUDO-START-NO-META-FAIL: Should fail if Ludo meta not found.');
  } catch (e: any) {
    assert(e.message.includes('Ludo game metadata not found'), `LUDO-START-NO-META-1: Correct error. Got: ${e.message}`);
  }

  // Tests for rollDiceForLudo and moveLudoPiece remain largely unchanged as they primarily
  // interact with the in-memory activeLudoGames map. The key change was that startLudoGame
  // now relies on DB for game metadata (min/max players), which we've tested above.
  // We can add a simple scenario for roll/move to ensure they still function.
  console.log('\n--- Running GameEngineService: Ludo In-Memory Actions (Post Meta DB Mock) ---');
  beforeEachTest();
  // Setup: Start a game first (mocking the DB call for its metadata)
  setMockDbResponse({ rows: [{...MOCK_LUDO_META, stake_options: JSON.stringify(MOCK_LUDO_META.stake_options)}] });
  await gameEngineService.startLudoGame(ROOM_ID_GE_1, [USER_A_GE, USER_B_GE]);

  // Test 10: Roll dice in the started Ludo game
  try {
    const stateAfterRoll = await gameEngineService.rollDiceForLudo(ROOM_ID_GE_1, USER_A_GE); // USER_A_GE is current player
    assert(stateAfterRoll.currentDiceRoll !== undefined && stateAfterRoll.currentDiceRoll! >= 1 && stateAfterRoll.currentDiceRoll! <= 6, 'LUDO-ROLL-1: Dice roll is valid.');
    assert(stateAfterRoll.gamePhase === 'piece_to_move', 'LUDO-ROLL-2: Game phase updated to piece_to_move.');
  } catch (e: any) {
    assert(false, `LUDO-ROLL-FAIL: Should not fail. Error: ${e.message}`);
  }


  console.log('\n--- Game Engine Service (DB Mocked) Test Summary ---');
  console.log(`Successes: ${(globalThis as any).gameEngineTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).gameEngineTestFailures || 0}`);
  if ((globalThis as any).gameEngineTestFailures > 0) {
    console.error('SOME GAME ENGINE SERVICE (DB MOCK) TESTS FAILED!');
  } else {
    console.log('All game engine service (DB mock for metadata/results) tests passed!');
  }
};

runGameEngineDbTests();

export { runGameEngineDbTests };
