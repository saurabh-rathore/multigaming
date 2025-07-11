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

// runTests(); // Don't auto-run if this file is imported elsewhere or run by a test runner

export { runTests as runAuthServiceDbMockTests }; // Export with a more specific name


// --- New Test Section for OTP and 2FA ---
const runOtpAnd2FATests = async () => {
    console.log('\n--- Running OTP & 2FA Tests (with DB Mock) ---');
    let authService: AuthService;
    const MOCK_PHONE = '+15551234567';
    const MOCK_OTP = '123456'; // Example OTP
    const MOCK_OTP_HASH = `hashed_${MOCK_OTP}_placeholder`; // Simplified hash

    const beforeEachOtp = () => {
        authService = new AuthService();
        __टेस्ट_clearOneTimeMockResponses();
         // Mock twilioConfig to be "configured" for these tests to simulate sending
        // This is a conceptual mock; actual twilio.config.ts might need its own mock setup
        // (jest.mock('../config/twilio.config', () => ({ ...jest.requireActual('../config/twilio.config'), isTwilioConfigured: () => true })));
        console.log("Conceptual: Twilio config mocked as 'configured' for OTP tests.");
    };

    // Test: Request OTP successfully
    beforeEachOtp();
    // Mock: Check for active OTPs (return none)
    __टेस्ट_setOneTimeMockResponse({ rows: [] });
    // Mock: INSERT OTP code
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1, 'mock_otp_id'));
    try {
        const result = await authService.requestOtp({ phone: MOCK_PHONE, purpose: 'verification' });
        assert(result.message.includes('OTP has been sent'), 'OTP-REQ-SUCCESS-1: Success message should be returned.');
        assert(result.otp_retry_delay_seconds === 60, 'OTP-REQ-SUCCESS-2: Retry delay should be set.');
    } catch (e: any) {
        assert(false, `OTP-REQ-SUCCESS-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Request OTP - rate limited
    beforeEachOtp();
    const recentOtpEntry = { id: 'recent_otp', created_at: new Date(Date.now() - 30 * 1000) }; // 30s ago
    __टेस्ट_setOneTimeMockResponse({ rows: [recentOtpEntry] }); // Active OTP exists
    try {
        await authService.requestOtp({ phone: MOCK_PHONE, purpose: 'verification' });
        assert(false, 'OTP-REQ-RATE-LIMIT-FAIL: Should have been rate limited.');
    } catch (e: any) {
        assert(e.message.includes('Please wait for 60 seconds'), `OTP-REQ-RATE-LIMIT-1: Correct error. Got: ${e.message}`);
    }

    // Test: Verify OTP successfully (for phone verification)
    beforeEachOtp();
    const validOtpDbEntry = { id: 'otp_to_verify', phone: MOCK_PHONE, otp_hash: MOCK_OTP_HASH, purpose: 'verification', used: false, expires_at: new Date(Date.now() + 5*60*1000), created_at: new Date() };
    // Mock: Find valid OTP
    __टेस्ट_setOneTimeMockResponse({ rows: [validOtpDbEntry] });
    // Mock: Mark OTP as used
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1));
    // Mock: Update user's phone_verified status (assume user exists with this phone)
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1));
    // Mock: Fetch updated user (optional, if service returns it)
    __टेस्ट_setOneTimeMockResponse({ rows: [{ ...mockUserFromDb, phone: MOCK_PHONE, phone_verified: true, status: 'active' }] });
    try {
        const result = await authService.verifyOtp({ phone: MOCK_PHONE, otp: MOCK_OTP, purpose: 'verification' });
        assert(result.message.includes('OTP verified successfully'), 'OTP-VERIFY-SUCCESS-1: Success message.');
        assert(result.user?.phone_verified === true, 'OTP-VERIFY-SUCCESS-2: User phone should be verified.');
        // In this flow, token is not typically issued just for phone verification.
    } catch (e: any) {
        assert(false, `OTP-VERIFY-SUCCESS-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Verify OTP - invalid OTP
    beforeEachOtp();
    __टेस्ट_setOneTimeMockResponse({ rows: [validOtpDbEntry] }); // Valid OTP exists in DB
    try {
        await authService.verifyOtp({ phone: MOCK_PHONE, otp: '654321', purpose: 'verification' }); // Incorrect OTP
        assert(false, 'OTP-VERIFY-INVALID-FAIL: Should have failed for invalid OTP.');
    } catch (e: any) {
        assert(e.message.includes('Invalid or expired OTP'), `OTP-VERIFY-INVALID-1: Correct error. Got: ${e.message}`);
    }

    // Test: Login with 2FA enabled - OTP required
    beforeEachOtp();
    const userWith2FA = { ...mockUserFromDb, is_otp_enabled: true, phone_verified: true, phone: MOCK_PHONE, status: 'active' as 'active' };
    // Mock: Find user by email
    __टेस्ट_setOneTimeMockResponse({ rows: [userWith2FA] });
    // Mock: (requestOtp) Check for active OTPs (return none)
    __टेस्ट_setOneTimeMockResponse({ rows: [] });
    // Mock: (requestOtp) INSERT OTP code
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1, 'mock_2fa_otp_id'));
    try {
        const result = await authService.login({ email: MOCK_EMAIL, password: MOCK_PASSWORD });
        assert(result.otp_required === true, 'LOGIN-2FA-OTP-REQ-1: otp_required should be true.');
        assert(result.token === '', 'LOGIN-2FA-OTP-REQ-2: Token should be empty when OTP is required.');
        assert(result.user?.id === userWith2FA.id, 'LOGIN-2FA-OTP-REQ-3: User ID should be returned.');
    } catch (e: any) {
        assert(false, `LOGIN-2FA-OTP-REQ-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Verify OTP for 2FA login - success
    beforeEachOtp();
    const valid2FAOtpEntry = { ...validOtpDbEntry, purpose: 'login_2fa' as 'login_2fa' };
     // Mock: Find valid OTP for login_2fa
    __टेस्ट_setOneTimeMockResponse({ rows: [valid2FAOtpEntry] });
    // Mock: Mark OTP as used
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1));
    // Mock: Find user by phone for 2FA (to get full user details for token)
    __टेस्ट_setOneTimeMockResponse({ rows: [{ ...mockUserFromDb, is_otp_enabled: true, phone_verified: true, phone: MOCK_PHONE }] });
    // Mock: Insert session
    __टेस्ट_setOneTimeMockResponse(mockOkPacket(1, 'mock_2fa_session_id'));
    try {
        const result = await authService.verifyOtp({ phone: MOCK_PHONE, otp: MOCK_OTP, purpose: 'login_2fa' });
        assert(result.message.includes('Login successful with 2FA'), 'OTP-VERIFY-2FA-SUCCESS-1: Success message.');
        assert(result.token && result.token.startsWith('placeholder_jwt_for_'), 'OTP-VERIFY-2FA-SUCCESS-2: JWT token should be issued.');
        assert(result.user?.id === mockUserFromDb.id, 'OTP-VERIFY-2FA-SUCCESS-3: Full user details returned.');
    } catch (e: any) {
        assert(false, `OTP-VERIFY-2FA-SUCCESS-FAIL: Should not fail: ${e.message}`);
    }

    // Test: Login as Guest
    beforeEachOtp();
    try {
        const result = await authService.loginAsGuest();
        assert(result.token.includes('_is_guest_true_'), 'GUEST-LOGIN-SUCCESS-1: Guest token should indicate guest status.');
        assert(result.guest_id.startsWith('gst_'), 'GUEST-LOGIN-SUCCESS-2: Guest ID should have prefix.');
        assert(result.user?.is_guest === true, 'GUEST-LOGIN-SUCCESS-3: User object should indicate guest.');
        assert(result.user?.id === result.guest_id, 'GUEST-LOGIN-SUCCESS-4: User ID should match guest_id.');
    } catch (e: any) {
        assert(false, `GUEST-LOGIN-FAIL: Should not fail: ${e.message}`);
    }


    console.log('\n--- OTP & 2FA Test Summary ---');
    console.log(`Successes: ${(globalThis as any).testSuccesses - (globalThis as any).initialSuccessesOtp}`); // Crude count for this block
    console.log(`Failures: ${(globalThis as any).testFailures - (globalThis as any).initialFailuresOtp}`);
    if (((globalThis as any).testFailures - (globalThis as any).initialFailuresOtp) > 0) {
        console.error('SOME OTP/2FA TESTS FAILED!');
    } else {
        console.log('All OTP/2FA tests passed!');
    }
};

const runAllAuthTests = async () => {
    (globalThis as any).initialSuccessesOtp = (globalThis as any).testSuccesses || 0;
    (globalThis as any).initialFailuresOtp = (globalThis as any).testFailures || 0;

    await runAuthServiceDbMockTests(); // Run original tests
    await runOtpAnd2FATests(); // Run new tests

    // Overall summary could be aggregated if needed
};

// If running this file directly:
if (typeof require !== 'undefined' && require.main === module) {
    runAllAuthTests();
}

export { runAllAuthTests };
