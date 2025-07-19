import { AdminService } from '../services/adminService';
import { AdminUserView, AdminGameView, AdminAuditLogEntry, BanUserRequestBody } from '../types/admin.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).adminTestFailures = ((globalThis as any).adminTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).adminTestSuccesses = ((globalThis as any).adminTestSuccesses || 0) + 1;
  }
};

// Mock IDs from AdminService's mock data for testing
const MOCK_USER_A_ID = 'userA_auth_id'; // Exists, initially active
const MOCK_USER_B_ID = 'userB_auth_id'; // Exists, initially pending
const NON_EXISTENT_USER_ID = 'user_does_not_exist';

const MOCK_LUDO_GAME_ID = 'ludo_masters_game_id'; // Exists, initially active
const MOCK_INACTIVE_GAME_ID = 'inactive_puzzle_game_id'; // Exists, initially inactive
const NON_EXISTENT_GAME_ID = 'game_does_not_exist';

const MOCK_ADMIN_ID = 'test_admin_001';
const MOCK_ADMIN_IP = '192.168.1.100';

const runAdminServiceTests = async () => {
  (globalThis as any).adminTestFailures = 0;
  (globalThis as any).adminTestSuccesses = 0;

  let adminService: AdminService; // Will be reset for test groups

  console.log('\n--- Running AdminService: Get Users & Games Tests ---');
  adminService = new AdminService(); // Fresh service instance

  // Test 1: Get Users
  const users = await adminService.getUsers();
  assert(users.length >= 2, 'GET-USERS-1: Should retrieve at least 2 mock users.');
  const userA = users.find(u => u.userId === MOCK_USER_A_ID);
  assert(userA !== undefined, 'GET-USERS-2: Mock User A should be present.');
  assert(userA?.email === 'usera@example.com', 'GET-USERS-3: User A email should be correct.');

  // Test 2: Get Games
  const games = await adminService.getGames();
  assert(games.length >= 2, 'GET-GAMES-1: Should retrieve at least 2 mock games.');
  const ludoGame = games.find(g => g.gameId === MOCK_LUDO_GAME_ID);
  assert(ludoGame !== undefined, 'GET-GAMES-2: Mock Ludo game should be present.');
  assert(ludoGame?.name === 'Ludo Masters', 'GET-GAMES-3: Ludo game name should be correct.');
  assert(ludoGame?.isActive === true, 'GET-GAMES-4: Ludo game should initially be active.');


  console.log('\n--- Running AdminService: Ban User Tests ---');
  adminService = new AdminService(); // Reset service for action tests

  // Test 3: Ban an existing user
  const banReason: BanUserRequestBody = { reason: "Violation of terms." };
  let bannedUserA = await adminService.banUser(MOCK_ADMIN_ID, MOCK_USER_A_ID, banReason, MOCK_ADMIN_IP);
  assert(bannedUserA !== null, 'BAN-USER-1: Banned user object should be returned.');
  assert(bannedUserA?.auth_status === 'banned', 'BAN-USER-2: User A status should be updated to banned in returned object.');

  // Verify directly from mock store (simulating DB check)
  const updatedUsersList = await adminService.getUsers();
  const userAAfterBan = updatedUsersList.find(u => u.userId === MOCK_USER_A_ID);
  assert(userAAfterBan?.auth_status === 'banned', 'BAN-USER-3: User A status should be banned in mock store.');

  // Test 4: Check Audit Log for ban action
  let auditLogs = adminService.getAuditLogs();
  const banLog = auditLogs.find(log => log.action === 'USER_BANNED' && log.targetEntityId === MOCK_USER_A_ID);
  assert(banLog !== undefined, 'BAN-USER-AUDIT-1: Ban action should be logged.');
  assert(banLog?.adminUserId === MOCK_ADMIN_ID, 'BAN-USER-AUDIT-2: Admin ID in log should be correct.');
  assert(banLog?.details?.reason === banReason.reason, 'BAN-USER-AUDIT-3: Ban reason in log details should be correct.');
  assert(banLog?.ipAddress === MOCK_ADMIN_IP, 'BAN-USER-AUDIT-4: IP address in log should be correct.');

  // Test 5: Attempt to ban a non-existent user
  try {
    await adminService.banUser(MOCK_ADMIN_ID, NON_EXISTENT_USER_ID, banReason, MOCK_ADMIN_IP);
    assert(false, 'BAN-NON-EXISTENT-FAIL: Should have thrown error.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `BAN-NON-EXISTENT-1: Correct error message. Got: ${e.message}`);
  }
  const initialAuditLogCount = auditLogs.length; // Before this failed attempt

  console.log('\n--- Running AdminService: Toggle Game Active Status Tests ---');
  adminService = new AdminService(); // Reset service
  auditLogs = adminService.getAuditLogs(); // Reset audit log view for this section

  // Test 6: Deactivate an active game (Ludo)
  let toggledLudoGame = await adminService.toggleGameActiveStatus(MOCK_ADMIN_ID, MOCK_LUDO_GAME_ID, false, MOCK_ADMIN_IP);
  assert(toggledLudoGame !== null, 'TOGGLE-GAME-1: Toggled game object should be returned.');
  assert(toggledLudoGame?.isActive === false, 'TOGGLE-GAME-2: Ludo game isActive should be false in returned object.');

  const updatedGamesList = await adminService.getGames();
  const ludoAfterToggle = updatedGamesList.find(g => g.gameId === MOCK_LUDO_GAME_ID);
  assert(ludoAfterToggle?.isActive === false, 'TOGGLE-GAME-3: Ludo game isActive should be false in mock store.');

  // Test 7: Check Audit Log for deactivate action
  auditLogs = adminService.getAuditLogs(); // Refresh audit logs
  const deactivateLog = auditLogs.find(log => log.action === 'GAME_DEACTIVATED' && log.targetEntityId === MOCK_LUDO_GAME_ID);
  assert(deactivateLog !== undefined, 'TOGGLE-GAME-AUDIT-1: Deactivate action should be logged.');
  assert(deactivateLog?.adminUserId === MOCK_ADMIN_ID, 'TOGGLE-GAME-AUDIT-2: Admin ID in log correct.');
  assert(deactivateLog?.details?.new_status === false, 'TOGGLE-GAME-AUDIT-3: New status in log details correct.');
  assert(deactivateLog?.ipAddress === MOCK_ADMIN_IP, 'TOGGLE-GAME-AUDIT-4: IP address in log correct.');

  // Test 8: Activate an inactive game (Puzzle Blocks)
  const initialPuzzleGame = (await adminService.getGames()).find(g=>g.gameId === MOCK_INACTIVE_GAME_ID);
  assert(initialPuzzleGame?.isActive === false, 'TOGGLE-GAME-PRECHECK-1: Puzzle game should be initially inactive.');

  let toggledPuzzleGame = await adminService.toggleGameActiveStatus(MOCK_ADMIN_ID, MOCK_INACTIVE_GAME_ID, true, MOCK_ADMIN_IP);
  assert(toggledPuzzleGame?.isActive === true, 'TOGGLE-GAME-4: Puzzle game isActive should be true after toggle.');

  const puzzleAfterToggle = (await adminService.getGames()).find(g => g.gameId === MOCK_INACTIVE_GAME_ID);
  assert(puzzleAfterToggle?.isActive === true, 'TOGGLE-GAME-5: Puzzle game isActive should be true in mock store.');

  // Test 9: Check Audit Log for activate action
  auditLogs = adminService.getAuditLogs(); // Refresh
  const activateLog = auditLogs.find(log => log.action === 'GAME_ACTIVATED' && log.targetEntityId === MOCK_INACTIVE_GAME_ID);
  assert(activateLog !== undefined, 'TOGGLE-GAME-AUDIT-5: Activate action should be logged for puzzle game.');
  assert(activateLog?.details?.new_status === true, 'TOGGLE-GAME-AUDIT-6: New status in log details correct for puzzle game.');


  // Test 10: Attempt to toggle status for a non-existent game
  try {
    await adminService.toggleGameActiveStatus(MOCK_ADMIN_ID, NON_EXISTENT_GAME_ID, true, MOCK_ADMIN_IP);
    assert(false, 'TOGGLE-NON-EXISTENT-FAIL: Should have thrown error.');
  } catch (e: any) {
    assert(e.message.includes('not found'), `TOGGLE-NON-EXISTENT-1: Correct error. Got: ${e.message}`);
  }


  console.log('\n--- Admin Service Test Summary ---');
  console.log(`Successes: ${(globalThis as any).adminTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).adminTestFailures || 0}`);
  if ((globalThis as any).adminTestFailures > 0) {
    console.error('SOME ADMIN SERVICE TESTS FAILED!');
  } else {
    console.log('All admin service tests passed (within this simulated environment)!');
  }
};

runAdminServiceTests();

export { runAdminServiceTests };
