import { WalletService } from '../services/walletService';
import { Wallet, Transaction, DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody } from '../types/wallet.types';
import { roundCurrency } from '../utils/helpers'; // For verifying rounded amounts

// Simple assertion function for testing
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error('Assertion Failed:', message);
    (globalThis as any).walletTestFailures = ((globalThis as any).walletTestFailures || 0) + 1;
  } else {
    console.log('Assertion Passed:', message);
    (globalThis as any).walletTestSuccesses = ((globalThis as any).walletTestSuccesses || 0) + 1;
  }
};

const USER_ID_1 = 'testuser_wallet_1';
const USER_ID_2 = 'testuser_wallet_2';

const runWalletTests = async () => {
  (globalThis as any).walletTestFailures = 0;
  (globalThis as any).walletTestSuccesses = 0;

  const walletService = new WalletService();

  console.log('\n--- Running WalletService Initial State and Deposit Tests ---');

  // Test 1: Get or create wallet for a new user
  let wallet1 = await walletService.getOrCreateWallet(USER_ID_1);
  assert(wallet1 !== undefined, 'INIT-1: Wallet should be created for new user.');
  assert(wallet1.user_id === USER_ID_1, 'INIT-2: Wallet user_id should match.');
  assert(wallet1.cash_balance === 0, 'INIT-3: Initial cash balance should be 0.');
  assert(wallet1.bonus_balance === 0, 'INIT-4: Initial bonus balance should be 0.');

  // Test 2: Deposit funds
  const depositData1: DepositRequestBody = { amount: 100, description: "Initial deposit" };
  let depositResult = await walletService.deposit(USER_ID_1, depositData1);
  wallet1 = depositResult.wallet;
  let tx1 = depositResult.transaction;
  assert(wallet1.cash_balance === 100, 'DEPOSIT-1: Cash balance should be 100 after deposit.');
  assert(tx1.type === 'deposit' && tx1.amount === 100 && tx1.status === 'completed', 'DEPOSIT-2: Transaction details should be correct.');

  // Test 3: Second deposit
  const depositData2: DepositRequestBody = { amount: 50, external_payment_id: "ext_pay_123" };
  depositResult = await walletService.deposit(USER_ID_1, depositData2);
  wallet1 = depositResult.wallet;
  assert(wallet1.cash_balance === 150, 'DEPOSIT-3: Cash balance should be 150 after second deposit.');


  console.log('\n--- Running WalletService Withdrawal Tests ---');

  // Test 4: Attempt withdrawal with insufficient funds
  const insufficientWithdrawal: WithdrawalRequestBody = { amount: 200 };
  try {
    await walletService.withdraw(USER_ID_1, insufficientWithdrawal);
    assert(false, 'WITHDRAW-INSUFFICIENT-FAIL: Should have thrown error for insufficient funds.');
  } catch (e: any) {
    assert(e.message.includes('Insufficient cash balance'), `WITHDRAW-INSUFFICIENT-1: Correct error message. Got: ${e.message}`);
  }
  assert(wallet1.cash_balance === 150, 'WITHDRAW-INSUFFICIENT-2: Balance should remain unchanged.');


  // Test 5: Successful withdrawal
  const validWithdrawal: WithdrawalRequestBody = { amount: 70 };
  let withdrawalResult = await walletService.withdraw(USER_ID_1, validWithdrawal);
  wallet1 = withdrawalResult.wallet;
  let tx2 = withdrawalResult.transaction;
  assert(wallet1.cash_balance === 80, 'WITHDRAW-SUCCESS-1: Cash balance should be 80 after withdrawal.');
  assert(tx2.type === 'withdrawal' && tx2.amount === 70 && tx2.status === 'pending', 'WITHDRAW-SUCCESS-2: Withdrawal transaction correct (pending).');


  console.log('\n--- Running WalletService Generic Debit Tests ---');
  // Setup: Add some bonus balance to USER_ID_1
  wallet1.bonus_balance = 50;
  (walletService as any).db.wallets.set(wallet1.wallet_id, wallet1); // Simulate direct update for test setup

  // Test 6: Debit from cash only
  const debitCashOnly: DebitRequestBody = { amount: 30, cash_amount_to_use: 30, bonus_amount_to_use: 0, description: "Cash wager" };
  let debitResult = await walletService.genericDebit(USER_ID_1, debitCashOnly);
  wallet1 = debitResult.wallet;
  assert(wallet1.cash_balance === 50, 'DEBIT-CASH-1: Cash balance should be 50.');
  assert(wallet1.bonus_balance === 50, 'DEBIT-CASH-2: Bonus balance should remain 50.');
  assert(debitResult.transaction.amount === 30, 'DEBIT-CASH-3: Transaction amount correct.');

  // Test 7: Debit from bonus only
  const debitBonusOnly: DebitRequestBody = { amount: 20, cash_amount_to_use: 0, bonus_amount_to_use: 20, description: "Bonus wager" };
  debitResult = await walletService.genericDebit(USER_ID_1, debitBonusOnly);
  wallet1 = debitResult.wallet;
  assert(wallet1.cash_balance === 50, 'DEBIT-BONUS-1: Cash balance should remain 50.');
  assert(wallet1.bonus_balance === 30, 'DEBIT-BONUS-2: Bonus balance should be 30.');

  // Test 8: Debit from mixed (cash and bonus)
  const debitMixed: DebitRequestBody = { amount: 40, cash_amount_to_use: 20, bonus_amount_to_use: 20, description: "Mixed wager" };
  debitResult = await walletService.genericDebit(USER_ID_1, debitMixed);
  wallet1 = debitResult.wallet;
  assert(wallet1.cash_balance === 30, 'DEBIT-MIXED-1: Cash balance should be 30.');
  assert(wallet1.bonus_balance === 10, 'DEBIT-MIXED-2: Bonus balance should be 10.');

  // Test 9: Attempt debit with insufficient cash
  const debitInsufficientCash: DebitRequestBody = { amount: 40, cash_amount_to_use: 35, bonus_amount_to_use: 5 };
  try {
    await walletService.genericDebit(USER_ID_1, debitInsufficientCash);
    assert(false, 'DEBIT-INSUF-CASH-FAIL: Should throw error.');
  } catch (e: any) {
    assert(e.message.includes('Insufficient cash balance'), `DEBIT-INSUF-CASH-1: Correct error. Got: ${e.message}`);
  }

  // Test 10: Attempt debit with mismatched total amount
  const debitMismatchedAmount: DebitRequestBody = { amount: 40, cash_amount_to_use: 10, bonus_amount_to_use: 10 };
   try {
    await walletService.genericDebit(USER_ID_1, debitMismatchedAmount);
    assert(false, 'DEBIT-MISMATCH-FAIL: Should throw error.');
  } catch (e: any) {
    assert(e.message.includes('Sum of cash and bonus amounts'), `DEBIT-MISMATCH-1: Correct error. Got: ${e.message}`);
  }

  console.log('\n--- Running WalletService Generic Credit Tests ---');
  // Test 11: Credit to cash only
  const creditCashOnly: CreditRequestBody = { amount: 100, credit_to_cash: 100, credit_to_bonus: 0, description: "Cash payout" };
  let creditResult = await walletService.genericCredit(USER_ID_1, creditCashOnly);
  wallet1 = creditResult.wallet;
  assert(wallet1.cash_balance === 130, 'CREDIT-CASH-1: Cash balance should be 130.');
  assert(wallet1.bonus_balance === 10, 'CREDIT-CASH-2: Bonus balance should remain 10.');

  // Test 12: Credit to bonus only
  const creditBonusOnly: CreditRequestBody = { amount: 25, credit_to_cash: 0, credit_to_bonus: 25, description: "Bonus award" };
  creditResult = await walletService.genericCredit(USER_ID_1, creditBonusOnly);
  wallet1 = creditResult.wallet;
  assert(wallet1.cash_balance === 130, 'CREDIT-BONUS-1: Cash balance should remain 130.');
  assert(wallet1.bonus_balance === 35, 'CREDIT-BONUS-2: Bonus balance should be 35.');

  // Test 13: Credit mixed
  const creditMixed: CreditRequestBody = { amount: 50, credit_to_cash: 30, credit_to_bonus: 20, description: "Mixed payout/bonus" };
  creditResult = await walletService.genericCredit(USER_ID_1, creditMixed);
  wallet1 = creditResult.wallet;
  assert(wallet1.cash_balance === 160, 'CREDIT-MIXED-1: Cash balance should be 160.');
  assert(wallet1.bonus_balance === 55, 'CREDIT-MIXED-2: Bonus balance should be 55.');

  // Test 14: Attempt credit with mismatched total amount
  const creditMismatchedAmount: CreditRequestBody = { amount: 50, credit_to_cash: 20, credit_to_bonus: 20 };
   try {
    await walletService.genericCredit(USER_ID_1, creditMismatchedAmount);
    assert(false, 'CREDIT-MISMATCH-FAIL: Should throw error.');
  } catch (e: any) {
    assert(e.message.includes('Sum of amounts to credit'), `CREDIT-MISMATCH-1: Correct error. Got: ${e.message}`);
  }

  console.log('\n--- Running Transaction History Test ---');
  // Test 15: Get transactions for user
  const transactions = await walletService.getTransactions(USER_ID_1);
  assert(transactions.length > 5, 'TXN-HISTORY-1: Should retrieve multiple transactions for USER_ID_1.'); // Based on above tests
  assert(transactions[0].amount === creditMixed.amount, 'TXN-HISTORY-2: Last transaction should be the mixed credit.');


  console.log('\n--- Wallet Test Summary ---');
  console.log(`Successes: ${(globalThis as any).walletTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).walletTestFailures || 0}`);
  if ((globalThis as any).walletTestFailures > 0) {
    console.error('SOME WALLET TESTS FAILED!');
  } else {
    console.log('All wallet tests passed (within this simulated environment)!');
  }
};

// To run these tests conceptually:
// import { runWalletTests } from './tests/wallet.test';
// runWalletTests();

export { runWalletTests };
