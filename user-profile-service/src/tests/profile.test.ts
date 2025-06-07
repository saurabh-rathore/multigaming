import { ProfileService } from '../services/profileService';
import { Profile, UpdateProfileRequestBody, KycUpdateRequestBody } from '../types/profile.types';

// Simple assertion function for testing (can be moved to a shared util if multiple test files adopt this)
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).profileTestFailures = ((globalThis as any).profileTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).profileTestSuccesses = ((globalThis as any).profileTestSuccesses || 0) + 1;
  }
};

// Mock user IDs from ProfileService for consistent testing
const MOCK_USER_ID_1 = 'id_1700000000000_abc123xyz'; // Exists from ProfileService mock data
const MOCK_USER_ID_2 = 'id_1700000000001_def456uvw'; // Exists from ProfileService mock data
const NON_EXISTENT_USER_ID = 'id_nonexistent_user';

const runProfileTests = async () => {
  // Initialize test counters
  (globalThis as any).profileTestFailures = 0;
  (globalThis as any).profileTestSuccesses = 0;

  const profileService = new ProfileService();

  console.log('\n--- Running ProfileService GetProfile Tests ---');

  // Test 1: Get existing profile
  try {
    const profile = await profileService.getProfile(MOCK_USER_ID_1);
    assert(profile !== undefined, 'GET-EXISTING-1: Profile should be found.');
    assert(profile?.user_id === MOCK_USER_ID_1, 'GET-EXISTING-2: User ID should match.');
    assert(profile?.username === 'user1', 'GET-EXISTING-3: Username should match mock data.');
  } catch (e: any) {
    assert(false, `GET-EXISTING-FAIL: Should not fail: ${e.message}`);
  }

  // Test 2: Get non-existent profile (service currently returns undefined without creating)
  // Modify: The service's getProfile doesn't auto-create, createProfileIfNotExists does.
  // So, first ensure it doesn't exist, then test createProfileIfNotExists
  try {
    let profile = await profileService.getProfile(NON_EXISTENT_USER_ID);
    assert(profile === undefined, 'GET-NON-EXISTENT-1: Profile should initially be undefined.');

    // Now test creation
    profile = await profileService.createProfileIfNotExists(NON_EXISTENT_USER_ID, { first_name: "New", last_name: "User" });
    assert(profile !== undefined, 'GET-NON-EXISTENT-2: Profile should be created.');
    assert(profile.user_id === NON_EXISTENT_USER_ID, 'GET-NON-EXISTENT-3: Created profile User ID should match.');
    assert(profile.first_name === "New", 'GET-NON-EXISTENT-4: Created profile first_name should match.');
  } catch (e: any) {
    assert(false, `GET-NON-EXISTENT-FAIL: Should not fail: ${e.message}`);
  }

  console.log('\n--- Running ProfileService UpdateProfile Tests ---');

  // Test 3: Successfully update an existing profile
  const updateData: UpdateProfileRequestBody = { first_name: 'UpdatedFirst', city: 'NewCity' };
  try {
    const updatedProfile = await profileService.updateProfile(MOCK_USER_ID_1, updateData);
    assert(updatedProfile !== undefined, 'UPDATE-SUCCESS-1: Updated profile should be returned.');
    assert(updatedProfile?.first_name === 'UpdatedFirst', 'UPDATE-SUCCESS-2: First name should be updated.');
    assert(updatedProfile?.city === 'NewCity', 'UPDATE-SUCCESS-3: City should be updated.');

    // Verify change is persisted (by getting it again)
    const refetchedProfile = await profileService.getProfile(MOCK_USER_ID_1);
    assert(refetchedProfile?.first_name === 'UpdatedFirst', 'UPDATE-SUCCESS-4: Refetched first name should reflect update.');
  } catch (e: any) {
    assert(false, `UPDATE-SUCCESS-FAIL: Should not fail for valid update: ${e.message}`);
  }

  // Test 4: Attempt to update a non-existent profile
  try {
    await profileService.updateProfile(NON_EXISTENT_USER_ID + "_another", updateData); // a truly non-existent one
    assert(false, 'UPDATE-NON-EXISTENT-FAIL: Should have thrown an error.');
  } catch (e: any) {
    assert(e.message.includes('Profile not found'), `UPDATE-NON-EXISTENT-1: Error message should indicate profile not found. Got: ${e.message}`);
  }

  // Test 5: Update with partial data (e.g., only bio)
  const bioUpdate: UpdateProfileRequestBody = { bio: "This is a new bio." };
  try {
    const profileWithBio = await profileService.updateProfile(MOCK_USER_ID_2, bioUpdate);
    assert(profileWithBio?.bio === "This is a new bio.", 'UPDATE-PARTIAL-1: Bio should be updated.');
    assert(profileWithBio?.first_name === 'Test', 'UPDATE-PARTIAL-2: First name should remain unchanged.'); // Assuming 'TestUser2' from mock
  } catch (e: any) {
     assert(false, `UPDATE-PARTIAL-FAIL: Should not fail: ${e.message}`);
  }

  console.log('\n--- Running ProfileService UpdateUserKycStatus Tests ---');

  // Test 6: Update KYC status for an existing user
  const kycUpdateData: KycUpdateRequestBody = { document_id: 'doc123', status_to_set: 'pending_verification' };
  try {
    const kycUpdatedProfile = await profileService.updateUserKycStatus(MOCK_USER_ID_1, kycUpdateData);
    assert(kycUpdatedProfile !== undefined, 'KYC-UPDATE-1: Profile should be returned after KYC update.');
    assert(kycUpdatedProfile?.kyc_status === 'pending_verification', 'KYC-UPDATE-2: KYC status should be pending_verification.');
    assert(kycUpdatedProfile?.kyc_document_id === 'doc123', 'KYC-UPDATE-3: KYC document ID should be updated.');

    const refetchedKycProfile = await profileService.getProfile(MOCK_USER_ID_1);
    assert(refetchedKycProfile?.kyc_status === 'pending_verification', 'KYC-UPDATE-4: Refetched KYC status should reflect update.');
  } catch (e: any) {
    assert(false, `KYC-UPDATE-FAIL: Should not fail for valid KYC update: ${e.message}`);
  }

  // Test 7: Update KYC with only document_id (should set status to pending_verification by default)
  const kycDocOnlyData: KycUpdateRequestBody = { document_id: 'doc456' };
   try {
    const kycDocOnlyProfile = await profileService.updateUserKycStatus(MOCK_USER_ID_2, kycDocOnlyData);
    assert(kycDocOnlyProfile?.kyc_status === 'pending_verification', 'KYC-DOC-ONLY-1: KYC status should default to pending_verification.');
    assert(kycDocOnlyProfile?.kyc_document_id === 'doc456', 'KYC-DOC-ONLY-2: KYC document ID should be updated.');
  } catch (e: any) {
    assert(false, `KYC-DOC-ONLY-FAIL: Should not fail: ${e.message}`);
  }


  // Test 8: Attempt to update KYC for a non-existent profile
  try {
    await profileService.updateUserKycStatus(NON_EXISTENT_USER_ID + "_another_kyc", kycUpdateData);
    assert(false, 'KYC-NON-EXISTENT-FAIL: Should have thrown an error.');
  } catch (e: any) {
    assert(e.message.includes('Profile not found'), `KYC-NON-EXISTENT-1: Error message for non-existent profile. Got: ${e.message}`);
  }

  console.log('\n--- Profile Test Summary ---');
  console.log(`Successes: ${(globalThis as any).profileTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).profileTestFailures || 0}`);
  if ((globalThis as any).profileTestFailures > 0) {
    console.error('SOME PROFILE TESTS FAILED!');
  } else {
    console.log('All profile tests passed (within this simulated environment)!');
  }
};

// To run these tests conceptually:
// import { runProfileTests } from './tests/profile.test';
// runProfileTests();

export { runProfileTests };
