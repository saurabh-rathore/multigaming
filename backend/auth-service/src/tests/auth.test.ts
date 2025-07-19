import { AuthService } from '../services/authService';
import { RegistrationRequestBody, LoginRequestBody, User } from '../types/auth.types';
// Import mock controls from db.config (adjust path/export if necessary)
import { __टेस्ट_setOneTimeMockResponse, __टेस्ट_clearOneTimeMockResponses } from '../config/db.config';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).testFailures = ((globalThis as any).testFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).testSuccesses = ((globalThis as any).testSuccesses || 0) + 1;
  }
};

// Helper to create mock OkPacket for INSERT/UPDATE
const mockOkPacket = (affectedRows = 1, insertId: string | number = 1) => ({
  okPacket: { fieldCount: 0, affectedRows, insertId, serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: 0 }
});

const MOCK_USER_ID = 'mock_user_id_123';
const MOCK_EMAIL = 'test@example.com';
const MOCK_PASSWORD = 'password123';
const MOCK_HASHED_PASSWORD = 'hashed_password123'; // Placeholder from utils/helpers.ts mock

const runTests = async () => {
  (globalThis as any).testFailures = 0;
  (globalThis as any).testSuccesses = 0;
  let authService: AuthService;

  const beforeEach = () => {
    authService = new AuthService();
    __टेस्ट_clearOneTimeMockResponses(); // Clear any leftover mocks
  };

  console.log('\n--- Running Registration Tests (with DB Mock) ---');
  beforeEach();

  // Test 1: Successful user registration
  const validRegData: RegistrationRequestBody = { email: MOCK_EMAIL, password: MOCK_PASSWORD, phone: '1234567890' };
  // Mock: SELECT for email check -> returns empty (no user exists)
  __टेस्ट_setOneTimeMockResponse({ rows: [] });
  // Mock: INSERT user -> returns success
  __टेस्ट_setOneTimeMockResponse(mockOkPacket(1, MOCK_USER_ID));
  try {
    const user = await authService.register(validRegData);
    assert(user.email === validRegData.email, 'REG-SUCCESS-DB-1: User email should match.');
    assert(user.id !== undefined, 'REG-SUCCESS-DB-2: User ID should be defined (from service logic).');
    assert(!(user as any).password_hash, 'REG-SUCCESS-DB-3: Password hash should not be returned.');
  } catch (e: any) {
    assert(false, `REG-SUCCESS-DB-FAIL: Should not fail: ${e.message}`);
  }

  // Test 2: Attempted registration with an existing email
  beforeEach();
  const existingUserForRegCheck: Partial<User> = { id: 'existing_id', email: MOCK_EMAIL };
  // Mock: SELECT for email check -> returns an existing user
  __टेस्ट_setOneTimeMockResponse({ rows: [existingUserForRegCheck] });
  try {
    await authService.register(validRegData); // Try registering same MOCK_EMAIL
    assert(false, 'REG-EXISTING-EMAIL-DB-FAIL: Should have thrown an error for existing email.');
  } catch (e: any) {
    assert(e.message.includes('User with this email already exists'), `REG-EXISTING-EMAIL-DB-1: Correct error. Got: ${e.message}`);
  }


  // Test 3 & 4: Registration with missing email/password (these are service-level checks before DB)
  beforeEach();
  const missingEmailData: any = { password: MOCK_PASSWORD };
  try { await authService.register(missingEmailData); assert(false, 'REG-MISSING-EMAIL-DB-FAIL'); }
  catch (e: any) { assert(e.message.includes('Email and password are required'), 'REG-MISSING-EMAIL-DB-1: Correct error.');}

  beforeEach();
  const missingPasswordData: any = { email: MOCK_EMAIL };
  try { await authService.register(missingPasswordData); assert(false, 'REG-MISSING-PASSWORD-DB-FAIL'); }
  catch (e: any) { assert(e.message.includes('Email and password are required'), 'REG-MISSING-PASSWORD-DB-1: Correct error.');}


  console.log('\n--- Running Login Tests (with DB Mock) ---');
  const mockUserFromDb: User = {
    id: MOCK_USER_ID, email: MOCK_EMAIL, password_hash: MOCK_HASHED_PASSWORD,
    status: 'active', created_at: new Date(), updated_at: new Date(), phone: '1234567890'
  };

  // Test 5: Successful login
  beforeEach();
  const validLoginData: LoginRequestBody = { email: MOCK_EMAIL, password: MOCK_PASSWORD };
  // Mock: SELECT user by email -> returns active user
  __टेस्ट_setOneTimeMockResponse({ rows: [{...mockUserFromDb, status: 'active'}] });
  // Mock: INSERT session -> returns success
  __टेस्ट_setOneTimeMockResponse(mockOkPacket(1, 'mock_session_id'));
  try {
    const result = await authService.login(validLoginData);
    assert(result.token.startsWith('placeholder_jwt_for_'), 'LOGIN-SUCCESS-DB-1: Token should be a placeholder JWT.');
    assert(result.user.email === validLoginData.email, 'LOGIN-SUCCESS-DB-2: Logged in user email should match.');
    assert(!(result.user as any).password_hash, 'LOGIN-SUCCESS-DB-3: Password hash should not be returned.');
  } catch (e: any) {
    assert(false, `LOGIN-SUCCESS-DB-FAIL: Should not fail for valid login: ${e.message}`);
  }

  // Test 6: Login with non-existent email
  beforeEach();
  // Mock: SELECT user by email -> returns empty (user not found)
  __टेस्ट_setOneTimeMockResponse({ rows: [] });
  try {
    await authService.login(validLoginData);
    assert(false, 'LOGIN-NON-EXISTENT-EMAIL-DB-FAIL: Should have thrown.');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), `LOGIN-NON-EXISTENT-EMAIL-DB-1: Correct error. Got: ${e.message}`);
  }

  // Test 7: Login with incorrect password
  // (comparePassword is a mock in utils/helpers.ts, we assume it works as before,
  // if it needs to be controlled, that's a separate concern from DB mock)
  beforeEach();
  // Mock: SELECT user by email -> returns a user
  __टेस्ट_setOneTimeMockResponse({ rows: [mockUserFromDb] });
  // comparePassword mock will return false for 'wrongpassword'
  try {
    await authService.login({ email: MOCK_EMAIL, password: 'wrongpassword' });
    assert(false, 'LOGIN-INCORRECT-PASS-DB-FAIL: Should have thrown.');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), `LOGIN-INCORRECT-PASS-DB-1: Correct error. Got: ${e.message}`);
  }

  // Test 8: Login for non-active (suspended) account
  beforeEach();
  const suspendedUserFromDb = { ...mockUserFromDb, status: 'suspended' as 'suspended' };
  // Mock: SELECT user by email -> returns suspended user
  __टेस्ट_setOneTimeMockResponse({ rows: [suspendedUserFromDb] });
  try {
    await authService.login(validLoginData);
    assert(false, 'LOGIN-SUSPENDED-DB-FAIL: Should have thrown.');
  } catch (e: any) {
    assert(e.message.includes('User account is not active'), `LOGIN-SUSPENDED-DB-1: Correct error. Got: ${e.message}`);
  }


  console.log('\n--- Test Summary ---');
  console.log(`Successes: ${(globalThis as any).testSuccesses}`);
  console.log(`Failures: ${(globalThis as any).testFailures}`);
  if ((globalThis as any).testFailures > 0) {
    console.error('SOME AUTH SERVICE (DB MOCK) TESTS FAILED!');
  } else {
    console.log('All auth service (DB mock) tests passed!');
  }
};

runTests();

export { runTests };
