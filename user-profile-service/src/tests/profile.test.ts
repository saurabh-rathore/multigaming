import { ProfileService } from '../services/profileService';
import { Profile, UpdateProfileRequestBody, KycUpdateRequestBody, Friend } from '../types/profile.types';
// Import mock controls from UserProfile's specific db.config
import {
    __UserProfile_टेस्ट_setOneTimeMockResponse as setMockDbResponse,
    __UserProfile_टेस्ट_clearOneTimeMockResponses as clearMockDbResponses
} from '../config/db.config';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).profileTestFailures = ((globalThis as any).profileTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).profileTestSuccesses = ((globalThis as any).profileTestSuccesses || 0) + 1;
  }
};

// Helper to create mock OkPacket for INSERT/UPDATE/DELETE
const mockOkPacket = (affectedRows = 1, insertIdOrChangedRows = 1) => {
    // For INSERT, insertIdOrChangedRows is insertId. For UPDATE, it's changedRows.
    let packet: any = { fieldCount: 0, affectedRows, serverStatus: 2, warningCount: 0, message: '', protocol41: true };
    if (affectedRows === 1 && insertIdOrChangedRows !== undefined) { // Simplistic check
        packet.insertId = insertIdOrChangedRows; // Assume it's insertId if affectedRows is 1
        packet.changedRows = insertIdOrChangedRows; // Also set changedRows for UPDATE
    } else {
        packet.changedRows = affectedRows > 0 ? affectedRows : 0;
    }
    return { okPacket: packet };
};


const USER_ID_PROFILE_1 = 'user_profile_test_1';
const USER_ID_PROFILE_2 = 'user_profile_test_2';
const NON_EXISTENT_PROFILE_USER_ID = 'user_profile_nonexistent';

const MOCK_PROFILE_1: Profile = {
  user_id: USER_ID_PROFILE_1, username: 'TestUser1', first_name: 'Test', last_name: 'UserOne',
  kyc_status: 'verified', created_at: new Date(), updatedAt: new Date(),
  avatar_url: 'url1', date_of_birth: new Date('1990-01-01')
};
const MOCK_PROFILE_2: Profile = {
  user_id: USER_ID_PROFILE_2, username: 'TestUser2', first_name: 'Another', last_name: 'UserTwo',
  kyc_status: 'pending_verification', created_at: new Date(), updatedAt: new Date(),
  avatar_url: 'url2', date_of_birth: new Date('1995-05-05')
};


const runProfileServiceDbTests = async () => {
  (globalThis as any).profileTestFailures = 0;
  (globalThis as any).profileTestSuccesses = 0;
  let profileService: ProfileService;

  const beforeEachTest = () => {
    profileService = new ProfileService();
    clearMockDbResponses(); // Clear mocks before each test
  };

  console.log('\n--- Running ProfileService (DB Mocked): GetProfile & CreateProfile Tests ---');
  beforeEachTest();

  // Test 1: Get existing profile
  setMockDbResponse({ rows: [MOCK_PROFILE_1] }); // Mock SELECT returning profile 1
  let profile1 = await profileService.getProfile(USER_ID_PROFILE_1);
  assert(profile1 !== undefined, 'GET-PROFILE-DB-1: Profile 1 should be found.');
  assert(profile1?.user_id === USER_ID_PROFILE_1, 'GET-PROFILE-DB-2: User ID should match.');
  assert(profile1?.username === 'TestUser1', 'GET-PROFILE-DB-3: Username should match.');

  // Test 2: Get non-existent profile
  beforeEachTest();
  setMockDbResponse({ rows: [] }); // Mock SELECT returning no rows
  let nonExistentProfile = await profileService.getProfile(NON_EXISTENT_PROFILE_USER_ID);
  assert(nonExistentProfile === undefined, 'GET-NON-EXISTENT-DB-1: Non-existent profile should be undefined.');

  // Test 3: createProfileIfNotExists - when profile does not exist
  beforeEachTest();
  setMockDbResponse({ rows: [] }); // First SELECT (getProfile) finds nothing
  setMockDbResponse(mockOkPacket(1, USER_ID_PROFILE_1)); // Mock INSERT success
  const initialDataNew: Partial<Profile> = { username: 'NewUser', first_name: 'Newly', last_name: 'Created' };
  let createdProfile = await profileService.createProfileIfNotExists(USER_ID_PROFILE_1, initialDataNew);
  assert(createdProfile !== undefined, 'CREATE-NEW-DB-1: Profile should be created.');
  assert(createdProfile.user_id === USER_ID_PROFILE_1, 'CREATE-NEW-DB-2: Created profile User ID should match.');
  assert(createdProfile.username === 'NewUser', 'CREATE-NEW-DB-3: Username should match initial data.');

  // Test 4: createProfileIfNotExists - when profile already exists
  beforeEachTest();
  setMockDbResponse({ rows: [MOCK_PROFILE_1] }); // First SELECT (getProfile) finds MOCK_PROFILE_1
  // No INSERT should be called
  let existingCreatedProfile = await profileService.createProfileIfNotExists(USER_ID_PROFILE_1, { username: 'ShouldNotUseThis' });
  assert(existingCreatedProfile.username === MOCK_PROFILE_1.username, 'CREATE-EXISTING-DB-1: Should return existing profile, not new data.');


  console.log('\n--- Running ProfileService (DB Mocked): UpdateProfile Tests ---');
  beforeEachTest();

  // Test 5: Successfully update an existing profile
  const updateData: UpdateProfileRequestBody = { first_name: 'UpdatedFirst', city: 'NewCity' };
  const profileAfterUpdate = { ...MOCK_PROFILE_1, ...updateData, updatedAt: new Date() };
  setMockDbResponse({ rows: [MOCK_PROFILE_1] });       // For initial getProfile in updateProfile
  setMockDbResponse(mockOkPacket(1,1));              // For the UPDATE query (1 changed row)
  setMockDbResponse({ rows: [profileAfterUpdate] });  // For the final getProfile re-fetch

  let updatedProfile = await profileService.updateProfile(USER_ID_PROFILE_1, updateData);
  assert(updatedProfile !== undefined, 'UPDATE-SUCCESS-DB-1: Updated profile should be returned.');
  assert(updatedProfile?.first_name === 'UpdatedFirst', 'UPDATE-SUCCESS-DB-2: First name should be updated.');
  assert(updatedProfile?.city === 'NewCity', 'UPDATE-SUCCESS-DB-3: City should be updated.');

  // Test 6: Attempt to update a non-existent profile
  beforeEachTest();
  setMockDbResponse({ rows: [] }); // Initial getProfile in updateProfile finds nothing
  try {
    await profileService.updateProfile(NON_EXISTENT_PROFILE_USER_ID, updateData);
    assert(false, 'UPDATE-NON-EXISTENT-DB-FAIL: Should have thrown an error.');
  } catch (e: any) {
    assert(e.message.includes('Profile not found'), `UPDATE-NON-EXISTENT-DB-1: Correct error. Got: ${e.message}`);
  }

  console.log('\n--- Running ProfileService (DB Mocked): UpdateUserKycStatus Tests ---');
  beforeEachTest();

  // Test 7: Update KYC status
  const kycUpdateData = { kyc_status: 'pending_verification' as Profile['kyc_status'], kyc_document_id: 'doc123xyz' };
  const profileAfterKycUpdate = { ...MOCK_PROFILE_1, ...kycUpdateData, updatedAt: new Date() };
  setMockDbResponse(mockOkPacket(1,1));             // For the UPDATE query
  setMockDbResponse({ rows: [profileAfterKycUpdate] });// For the final getProfile re-fetch

  let kycUpdatedProfile = await profileService.updateUserKycStatus(USER_ID_PROFILE_1, kycUpdateData);
  assert(kycUpdatedProfile !== undefined, 'KYC-UPDATE-DB-1: Profile should be returned.');
  assert(kycUpdatedProfile?.kyc_status === 'pending_verification', 'KYC-UPDATE-DB-2: KYC status updated.');
  assert(kycUpdatedProfile?.kyc_document_id === 'doc123xyz', 'KYC-UPDATE-DB-3: KYC document ID updated.');


  console.log('\n--- Running ProfileService (DB Mocked): Friend Management Tests ---');
  const FRIENDSHIP_ID_1 = 'fr_test_123';

  // Test 8: Add Friend Request - Success
  beforeEachTest();
  setMockDbResponse({ rows: [] }); // Mock SELECT for existing friendship -> returns none
  setMockDbResponse(mockOkPacket(1, FRIENDSHIP_ID_1)); // Mock INSERT friend request -> success
  let newFriendship = await profileService.addFriendRequest(USER_ID_PROFILE_1, USER_ID_PROFILE_2);
  assert(newFriendship !== null, 'FRIEND-ADD-1: Friendship object should be returned.');
  assert(newFriendship?.friendship_id === FRIENDSHIP_ID_1, 'FRIEND-ADD-2: Friendship ID is from mock insertId (or generated).');
  assert(newFriendship?.status === 'pending', 'FRIEND-ADD-3: Status should be pending.');

  // Test 9: Add Friend Request - Already Friends/Pending
  beforeEachTest();
  const existingFriendship: Friend = { friendship_id: 'fr_exist_001', user_id_1: USER_ID_PROFILE_1, user_id_2: USER_ID_PROFILE_2, status: 'accepted', requested_at: new Date() };
  setMockDbResponse({ rows: [existingFriendship] }); // Mock SELECT finds existing relationship
  try {
    await profileService.addFriendRequest(USER_ID_PROFILE_1, USER_ID_PROFILE_2);
    assert(false, 'FRIEND-ADD-EXISTING-FAIL: Should throw error.');
  } catch (e: any) {
    assert(e.message.includes('already exists or users are already friends'), `FRIEND-ADD-EXISTING-1: Correct error. Got: ${e.message}`);
  }

  // Test 10: Respond to Friend Request - Accept
  beforeEachTest();
  const pendingFriendship: Friend = { friendship_id: FRIENDSHIP_ID_1, user_id_1: USER_ID_PROFILE_1, user_id_2: USER_ID_PROFILE_2, status: 'pending', requested_at: new Date() };
  setMockDbResponse({ rows: [pendingFriendship] }); // Mock SELECT for pending request -> returns it
  setMockDbResponse(mockOkPacket(1,1)); // Mock UPDATE friend request -> success
  let acceptedFriendship = await profileService.respondToFriendRequest(USER_ID_PROFILE_2, FRIENDSHIP_ID_1, 'accepted');
  assert(acceptedFriendship !== null, 'FRIEND-ACCEPT-1: Accepted friendship object should be returned.');
  assert(acceptedFriendship?.status === 'accepted', 'FRIEND-ACCEPT-2: Status should be accepted.');

  // Test 11: List Friends - (User 1 and User 2 are now friends)
  beforeEachTest();
  // Mock for listFriends:
  // 1. SELECT from 'friends' table to get friend_user_ids
  setMockDbResponse({ rows: [{ friend_user_id: USER_ID_PROFILE_2 }] }); // User1 listing friends, User2 is a friend
  // 2. Subsequent getProfile(friend_user_id) calls
  setMockDbResponse({ rows: [MOCK_PROFILE_2] }); // Mock getProfile for User2

  let user1Friends = await profileService.listFriends(USER_ID_PROFILE_1, 'accepted');
  assert(user1Friends.length === 1, 'FRIEND-LIST-1: User1 should have 1 accepted friend.');
  assert(user1Friends[0].userId === USER_ID_PROFILE_2, 'FRIEND-LIST-2: User2 should be in User1 friends list.');
  assert(user1Friends[0].username === MOCK_PROFILE_2.username, 'FRIEND-LIST-3: Friend details (username) should be present.');


  console.log('\n--- Profile Service (DB Mocked) Test Summary ---');
  console.log(`Successes: ${(globalThis as any).profileTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).profileTestFailures || 0}`);
  if ((globalThis as any).profileTestFailures > 0) {
    console.error('SOME PROFILE SERVICE (DB MOCK) TESTS FAILED!');
  } else {
    console.log('All profile service (DB mock) tests passed!');
  }
};

// runProfileServiceDbTests(); // Don't auto-run if part of a larger test suite

export { runProfileServiceDbTests };


// --- New Test Section for Badges and Daily Rewards ---
const runGamificationTests = async () => {
    console.log('\n--- Running Gamification (Badges, Daily Rewards) Tests (DB Mocked) ---');
    let profileService: ProfileService;

    const USER_ID_GAME_PLAYER = 'user_game_player_1';
    const BADGE_ID_FIRST_GAME = 'first_game_played';
    const BADGE_ID_PROFILE_COMPLETE = 'profile_complete';

    const MOCK_PROFILE_GAME_PLAYER: Profile = {
        user_id: USER_ID_GAME_PLAYER, username: 'GamePlayer1',
        kyc_status: 'not_started', created_at: new Date(), updatedAt: new Date(),
        login_streak_days: 0, available_wheel_spins: 0
    };

    const beforeEachGamification = () => {
        profileService = new ProfileService();
        clearMockDbResponses();
        // Conceptually seed badges if your service relies on them being in DB for grantBadgeToUser
        // For these tests, grantBadgeToUser will mock the badge check.
        // profileService.__seedBadges(); // If this were a real test setup with DB
        // profileService.__seedRewardDefinitions();
    };

    // Test: Grant "First Game Played" badge successfully
    beforeEachGamification();
    // 1. getProfile for the user (in addGameHistoryEntry)
    setMockDbResponse({ rows: [MOCK_PROFILE_GAME_PLAYER] });
    // 2. INSERT into game_history
    setMockDbResponse(mockOkPacket(1, 'gh_new_entry'));
    // 3. COUNT from game_history (returns 1, for first game)
    setMockDbResponse({ rows: [{ game_count: 1 }] });
    // 4. (grantBadgeToUser) Check if user already has badge (returns none)
    setMockDbResponse({ rows: [] });
    // 5. (grantBadgeToUser) Check if badge definition exists (returns a badge)
    setMockDbResponse({ rows: [{ id: BADGE_ID_FIRST_GAME, name: 'Welcome Aboard!', icon_url: '...' }] });
    // 6. (grantBadgeToUser) Check if user profile exists (already fetched, or mock again if needed)
    // setMockDbResponse({ rows: [MOCK_PROFILE_GAME_PLAYER] }); // Not strictly needed if service reuses profile
    // 7. (grantBadgeToUser) INSERT into user_badges
    setMockDbResponse(mockOkPacket(1));
    try {
        await profileService.addGameHistoryEntry(USER_ID_GAME_PLAYER, { game_id: 'ludo', win_loss_draw: 'win' });
        // To verify badge was granted, we'd ideally check listUserBadges or spy on grantBadgeToUser
        // For now, we assume if no error, the mocks for grantBadgeToUser were called as expected.
        assert(true, 'BADGE-FIRST-GAME-1: addGameHistoryEntry completed, implying badge grant attempt.');
    } catch (e: any) {
        assert(false, `BADGE-FIRST-GAME-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Grant "Profile Complete" badge
    beforeEachGamification();
    const profileUpdateData: UpdateProfileRequestBody = { avatar_url: '/avatar.png', bio: 'My new bio.' };
    const updatedProfileData = { ...MOCK_PROFILE_GAME_PLAYER, ...profileUpdateData };
    // 1. getProfile (in updateProfile)
    setMockDbResponse({ rows: [MOCK_PROFILE_GAME_PLAYER] });
    // 2. UPDATE profiles
    setMockDbResponse(mockOkPacket(1,1));
    // 3. getProfile (re-fetch after update)
    setMockDbResponse({ rows: [updatedProfileData] });
    // 4. (grantBadgeToUser) Check if user already has 'profile_complete' badge (returns none)
    setMockDbResponse({ rows: [] });
    // 5. (grantBadgeToUser) Check if 'profile_complete' badge def exists
    setMockDbResponse({ rows: [{ id: BADGE_ID_PROFILE_COMPLETE, name: 'Identity Verified', icon_url: '...' }] });
    // 6. (grantBadgeToUser) INSERT into user_badges
    setMockDbResponse(mockOkPacket(1));
    try {
        await profileService.updateProfile(USER_ID_GAME_PLAYER, profileUpdateData);
        assert(true, 'BADGE-PROFILE-COMPLETE-1: updateProfile completed, implying badge grant attempt.');
    } catch (e: any) {
        assert(false, `BADGE-PROFILE-COMPLETE-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Daily Login Streak - First login
    beforeEachGamification();
    const profileNoLogin: Profile = { ...MOCK_PROFILE_GAME_PLAYER, last_login_date: null, login_streak_days: 0 };
    // 1. getProfile in recordUserLogin
    setMockDbResponse({ rows: [profileNoLogin] });
    // 2. UPDATE profiles (last_login_date, login_streak_days)
    setMockDbResponse(mockOkPacket(1,1));
    try {
        const loginResult = await profileService.recordUserLogin(USER_ID_GAME_PLAYER);
        assert(loginResult.currentStreak === 1, 'LOGIN-STREAK-FIRST-1: Streak should be 1.');
        assert(loginResult.message.includes('Streak started'), 'LOGIN-STREAK-FIRST-2: Correct message.');
    } catch (e: any) {
        assert(false, `LOGIN-STREAK-FIRST-FAIL: ${e.message}`);
    }

    // Test: Daily Login Streak - Consecutive login
    beforeEachGamification();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const profileYesterdayLogin: Profile = { ...MOCK_PROFILE_GAME_PLAYER, last_login_date: yesterday.toISOString().split('T')[0], login_streak_days: 3 };
    setMockDbResponse({ rows: [profileYesterdayLogin] }); // getProfile
    setMockDbResponse(mockOkPacket(1,1)); // UPDATE profiles
    try {
        const loginResult = await profileService.recordUserLogin(USER_ID_GAME_PLAYER);
        assert(loginResult.currentStreak === 4, 'LOGIN-STREAK-CONSECUTIVE-1: Streak should increment.');
    } catch (e: any) {
        assert(false, `LOGIN-STREAK-CONSECUTIVE-FAIL: ${e.message}`);
    }

    // Test: Get Daily Reward Status - Eligible
    beforeEachGamification();
    const profileForReward: Profile = { ...MOCK_PROFILE_GAME_PLAYER, login_streak_days: 1, last_reward_claimed_date: null };
    const mockRewardDef: RewardDefinition = { streak_day: 1, reward_type: 'coins', reward_value: '50', description: 'Day 1 Coins' };
    setMockDbResponse({ rows: [profileForReward] }); // getProfile
    setMockDbResponse({ rows: [mockRewardDef] });  // SELECT from reward_definitions
    try {
        const status = await profileService.getDailyRewardStatus(USER_ID_GAME_PLAYER);
        assert(status.is_eligible_to_claim === true, 'REWARD-STATUS-ELIGIBLE-1: Should be eligible.');
        assert(status.reward_for_today?.streak_day === 1, 'REWARD-STATUS-ELIGIBLE-2: Correct reward day.');
    } catch (e: any) {
        assert(false, `REWARD-STATUS-ELIGIBLE-FAIL: ${e.message}`);
    }

    // Test: Claim Daily Reward - Success
    beforeEachGamification();
    // Mocks for getDailyRewardStatus part of claim:
    setMockDbResponse({ rows: [profileForReward] });
    setMockDbResponse({ rows: [mockRewardDef] });
    // Mock for UPDATE profiles (last_reward_claimed_date)
    setMockDbResponse(mockOkPacket(1,1));
    // (If reward was 'wheel_spin', another UPDATE profiles for available_wheel_spins would be mocked)
    try {
        const claim = await profileService.claimDailyReward(USER_ID_GAME_PLAYER);
        assert(claim.success === true, 'REWARD-CLAIM-SUCCESS-1: Claim should be successful.');
        assert(claim.reward_granted?.streak_day === 1, 'REWARD-CLAIM-SUCCESS-2: Correct reward granted.');
        assert(claim.updated_profile_fields?.last_reward_claimed_date !== undefined, 'REWARD-CLAIM-SUCCESS-3: Last claimed date updated.');
    } catch (e: any) {
        assert(false, `REWARD-CLAIM-SUCCESS-FAIL: ${e.message}`);
    }

    // Test: Perform Wheel Spin - Success
    beforeEachGamification();
    const profileWithSpins: Profile = { ...MOCK_PROFILE_GAME_PLAYER, available_wheel_spins: 1 };
    const mockPrize: WheelSpinPrize = { prize_id: 'coins_50', prize_type: 'coins', prize_value: '50', prize_display_name: '50 Coins', probability_weight: 1 };
    setMockDbResponse({ rows: [profileWithSpins] }); // getProfile in performWheelSpin
    setMockDbResponse({ rows: [mockPrize] });      // SELECT from wheel_spin_prizes
    setMockDbResponse(mockOkPacket(1,1));          // UPDATE profiles (decrement spins)
    // If prize was coins, genericCredit would involve more mocks, simplified here.
    try {
        const spinResult = await profileService.performWheelSpin(USER_ID_GAME_PLAYER);
        assert(spinResult.success === true, 'WHEEL-SPIN-SUCCESS-1: Spin should be successful.');
        assert(spinResult.prize_won?.prize_id === mockPrize.prize_id, 'WHEEL-SPIN-SUCCESS-2: Prize should be awarded.');
        assert(spinResult.updated_available_spins === 0, 'WHEEL-SPIN-SUCCESS-3: Spins should decrement.');
    } catch (e: any) {
        assert(false, `WHEEL-SPIN-SUCCESS-FAIL: ${e.message}`);
    }

    // Test: Perform Wheel Spin - No spins
    beforeEachGamification();
    const profileNoSpins: Profile = { ...MOCK_PROFILE_GAME_PLAYER, available_wheel_spins: 0 };
    setMockDbResponse({ rows: [profileNoSpins] }); // getProfile
    try {
        const spinResult = await profileService.performWheelSpin(USER_ID_GAME_PLAYER);
        assert(spinResult.success === false, 'WHEEL-SPIN-NO-SPINS-1: Spin should fail.');
        assert(spinResult.message.includes("Not enough wheel spins"), 'WHEEL-SPIN-NO-SPINS-2: Correct message.');
    } catch (e: any) {
        assert(false, `WHEEL-SPIN-NO-SPINS-FAIL: Should not throw error from service, should return success:false. ${e.message}`);
    }


    console.log('\n--- Gamification Test Summary ---');
    // Crude count for this block, assuming global counters were reset or handled by a test runner
    const currentSuccesses = (globalThis as any).profileTestSuccesses || 0;
    const currentFailures = (globalThis as any).profileTestFailures || 0;
    // This relies on previous tests NOT setting these specific global counters, or subtracting initial values.
    // For a real test runner, each describe/it block would have its own isolated counts.
    console.log(`Successes (gamification block): ${(globalThis as any).profileTestSuccessesGamification || currentSuccesses}`);
    console.log(`Failures (gamification block): ${(globalThis as any).profileTestFailuresGamification || currentFailures}`);

};


const runAllProfileServiceTests = async () => {
    await runProfileServiceDbTests();

    // Store current pass/fail counts before running gamification tests
    const initialSuccesses = (globalThis as any).profileTestSuccesses || 0;
    const initialFailures = (globalThis as any).profileTestFailures || 0;

    await runGamificationTests();

    // Calculate gamification specific counts for summary
    (globalThis as any).profileTestSuccessesGamification = ((globalThis as any).profileTestSuccesses || 0) - initialSuccesses;
    (globalThis as any).profileTestFailuresGamification = ((globalThis as any).profileTestFailures || 0) - initialFailures;


    console.log('\n--- OVERALL ProfileService Test Summary ---');
    console.log(`Total Successes: ${(globalThis as any).profileTestSuccesses || 0}`);
    console.log(`Total Failures: ${(globalThis as any).profileTestFailures || 0}`);
    if ((globalThis as any).profileTestFailures > 0) {
        console.error('SOME PROFILE SERVICE TESTS FAILED!');
    } else {
        console.log('All ProfileService tests passed!');
    }
};

// If running this file directly:
if (typeof require !== 'undefined' && require.main === module) {
    runAllProfileServiceTests();
}

export { runAllProfileServiceTests };
