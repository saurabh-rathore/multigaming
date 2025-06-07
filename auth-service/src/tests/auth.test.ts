import { AuthService } from '../services/authService';
import { RegistrationRequestBody, LoginRequestBody, User } from '../types/auth.types';

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    // In a real test runner, this would throw or mark a test as failed.
    // For this simulation, we'll count failures.
    (globalThis as any).testFailures = ((globalThis as any).testFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).testSuccesses = ((globalThis as any).testSuccesses || 0) + 1;
  }
};

const runTests = async () => {
  // Initialize test counters
  (globalThis as any).testFailures = 0;
  (globalThis as any).testSuccesses = 0;

  const authService = new AuthService();

  console.log('\n--- Running Registration Tests ---');

  // Test 1: Successful user registration
  const validRegData: RegistrationRequestBody = { email: 'test@example.com', password: 'password123', phone: '1234567890' };
  try {
    const user = await authService.register(validRegData);
    assert(user.email === validRegData.email, 'REG-SUCCESS-1: User email should match.');
    assert(user.id !== undefined, 'REG-SUCCESS-2: User ID should be defined.');
    assert((user as any).password_hash === undefined, 'REG-SUCCESS-3: Password hash should not be returned.');
  } catch (e: any) {
    assert(false, `REG-SUCCESS-FAIL: Should not fail: ${e.message}`);
  }

  // Test 2: Attempted registration with an existing email
  try {
    await authService.register(validRegData); // Try registering the same user again
    assert(false, 'REG-EXISTING-EMAIL-FAIL: Should have thrown an error for existing email.');
  } catch (e: any) {
    assert(e.message.includes('User with this email already exists'), `REG-EXISTING-EMAIL-1: Error message should indicate existing email. Got: ${e.message}`);
  }

  // Test 3: Registration with missing email
  const missingEmailData: any = { password: 'password123' };
  try {
    await authService.register(missingEmailData);
    assert(false, 'REG-MISSING-EMAIL-FAIL: Should have thrown an error for missing email.');
  } catch (e: any) {
    assert(e.message.includes('Email and password are required'), `REG-MISSING-EMAIL-1: Error message for missing email. Got: ${e.message}`);
  }

  // Test 4: Registration with missing password
  const missingPasswordData: any = { email: 'test2@example.com' };
  try {
    await authService.register(missingPasswordData);
    assert(false, 'REG-MISSING-PASSWORD-FAIL: Should have thrown an error for missing password.');
  } catch (e: any) {
    assert(e.message.includes('Email and password are required'), `REG-MISSING-PASSWORD-1: Error message for missing password. Got: ${e.message}`);
  }

  // Note: More specific input validations (e.g., password length, email format) are in controller placeholders.
  // These tests focus on the AuthService logic.

  console.log('\n--- Running Login Tests ---');
  // For login tests, we need an active user. Let's assume 'test@example.com' is now 'active'.
  // This requires modifying the mock db or the user object directly for testing purposes.
  const userToActivate = (authService as any).db.users.values().next().value;
  if (userToActivate) {
    userToActivate.status = 'active';
  }


  // Test 5: Successful login
  const validLoginData: LoginRequestBody = { email: 'test@example.com', password: 'password123' };
  try {
    const result = await authService.login(validLoginData);
    assert(result.token.startsWith('placeholder_jwt_for_'), 'LOGIN-SUCCESS-1: Token should be a placeholder JWT.');
    assert(result.user.email === validLoginData.email, 'LOGIN-SUCCESS-2: Logged in user email should match.');
    assert((result.user as any).password_hash === undefined, 'LOGIN-SUCCESS-3: Password hash should not be returned on login.');
  } catch (e: any) {
    assert(false, `LOGIN-SUCCESS-FAIL: Should not fail for valid login: ${e.message}`);
  }

  // Test 6: Login with incorrect password
  const incorrectPasswordData: LoginRequestBody = { email: 'test@example.com', password: 'wrongpassword' };
  try {
    await authService.login(incorrectPasswordData);
    assert(false, 'LOGIN-INCORRECT-PASS-FAIL: Should have thrown an error for incorrect password.');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), `LOGIN-INCORRECT-PASS-1: Error message for incorrect password. Got: ${e.message}`);
  }

  // Test 7: Login with non-existent email
  const nonExistentEmailData: LoginRequestBody = { email: 'nouser@example.com', password: 'password123' };
  try {
    await authService.login(nonExistentEmailData);
    assert(false, 'LOGIN-NON-EXISTENT-EMAIL-FAIL: Should have thrown an error for non-existent email.');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), `LOGIN-NON-EXISTENT-EMAIL-1: Error message for non-existent email. Got: ${e.message}`);
  }

  // Test 8: Login with missing email
  const loginMissingEmail: any = { password: 'password123' };
  try {
    await authService.login(loginMissingEmail);
    assert(false, 'LOGIN-MISSING-EMAIL-FAIL: Should have thrown an error for missing email.');
  } catch (e: any) {
    assert(e.message.includes('Email and password are required'), `LOGIN-MISSING-EMAIL-1: Error message for missing email. Got: ${e.message}`);
  }

  // Test 9: Login with missing password
  const loginMissingPassword: any = { email: 'test@example.com' };
  try {
    await authService.login(loginMissingPassword);
    assert(false, 'LOGIN-MISSING-PASSWORD-FAIL: Should have thrown an error for missing password.');
  } catch (e: any) {
    assert(e.message.includes('Email and password are required'), `LOGIN-MISSING-PASSWORD-1: Error message for missing password. Got: ${e.message}`);
  }

  // Test 10: Login with non-active (e.g. suspended) user
  const suspendedUserRegData: RegistrationRequestBody = { email: 'suspended@example.com', password: 'password123'};
  try {
    const suspendedUser = await authService.register(suspendedUserRegData);
    // Manually suspend user for test
    const userToSuspend = Array.from((authService as any).db.users.values()).find((u: any) => u.email === suspendedUser.email);
    if(userToSuspend) (userToSuspend as User).status = 'suspended';

    await authService.login({email: suspendedUser.email, password: 'password123'});
    assert(false, 'LOGIN-SUSPENDED-USER-FAIL: Should have thrown an error for suspended user.');
  } catch (e: any) {
    assert(e.message.includes('User account is not active'), `LOGIN-SUSPENDED-USER-1: Error message for suspended user. Got: ${e.message}`);
  }


  console.log('\n--- Test Summary ---');
  console.log(`Successes: ${(globalThis as any).testSuccesses}`);
  console.log(`Failures: ${(globalThis as any).testFailures}`);
  if ((globalThis as any).testFailures > 0) {
    console.error('SOME TESTS FAILED!');
  } else {
    console.log('All tests passed (within this simulated environment)!');
  }
};

// To run these tests conceptually:
// import { runTests } from './tests/auth.test';
// runTests();
// This would need an environment that can execute TypeScript/JavaScript and handle imports.
// For now, the file is created with the test logic.

// Export if needed, or just have it ready to be executed.
export { runTests };
