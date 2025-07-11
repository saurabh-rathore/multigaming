import { WalletService } from '../services/walletService';
import { Wallet, Transaction, DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody, TransactionType } from '../types/wallet.types';
import { roundCurrency } from '../utils/helpers';
// Import mock controls from WalletService's specific db.config
import {
    __Wallet_टेस्ट_setOneTimeMockResponse as setMockDbResponse,
    __Wallet_टेस्ट_clearOneTimeMockResponses as clearMockDbResponses
} from '../config/db.config';

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

// Helper to create mock OkPacket for INSERT/UPDATE/DELETE
const mockOkPacket = (affectedRows = 1, insertId: string | number = 1) => ({
  okPacket: { fieldCount: 0, affectedRows, insertId, serverStatus: 2, warningCount: 0, message: '', protocol41: true, changedRows: affectedRows }
});
// Helper for SELECT returning no rows
const mockSelectEmpty = () => ({ rows: [] });
// Helper for SELECT returning one wallet row
const mockSelectWallet = (wallet: Wallet) => ({ rows: [wallet] });


const USER_ID_WALLET_1 = 'user_wallet_test_001';
const USER_ID_WALLET_2 = 'user_wallet_test_002';
const WALLET_ID_USER_1 = 'wallet_for_user1'; // Assume this is known or consistent from getOrCreateWallet mock

const createMockWallet = (userId: string, walletId: string, cash: number, bonus: number, currency = 'INR'): Wallet => ({
    wallet_id: walletId, userId, cash_balance: cash, bonus_balance: bonus, currency,
    created_at: new Date(), updatedAt: new Date()
});


const runWalletServiceDbTests = async () => {
  (globalThis as any).walletTestFailures = 0;
  (globalThis as any).walletTestSuccesses = 0;
  let walletService: WalletService;

  const beforeEachTest = () => {
    walletService = new WalletService();
    clearMockDbResponses(); // Clear mocks before each test
  };

  console.log('\n--- Running WalletService (DB Mocked): GetOrCreateWallet Tests ---');
  beforeEachTest();

  // Test 1: getOrCreateWallet - user has existing wallet
  const existingWallet = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 100, 50);
  setMockDbResponse(mockSelectWallet(existingWallet)); // Mock SELECT for user_id finds this wallet
  let wallet = await walletService.getOrCreateWallet(USER_ID_WALLET_1);
  assert(wallet.wallet_id === WALLET_ID_USER_1, 'GETCREATE-EXISTING-1: Wallet ID should match existing.');
  assert(wallet.cash_balance === 100, 'GETCREATE-EXISTING-2: Cash balance correct.');

  // Test 2: getOrCreateWallet - user has no wallet, new one created
  beforeEachTest();
  setMockDbResponse(mockSelectEmpty());       // Mock SELECT for user_id finds nothing
  setMockDbResponse(mockOkPacket(1, 'new_wallet_id_from_insert')); // Mock INSERT new wallet success
  wallet = await walletService.getOrCreateWallet(USER_ID_WALLET_2);
  assert(wallet.userId === USER_ID_WALLET_2, 'GETCREATE-NEW-1: New wallet created for correct user.');
  assert(wallet.cash_balance === 0, 'GETCREATE-NEW-2: New wallet initial cash balance 0.');
  assert(wallet.wallet_id.startsWith('wallet_'), 'GETCREATE-NEW-3: New wallet has a generated ID.');


  console.log('\n--- Running WalletService (DB Mocked): Deposit Tests ---');
  beforeEachTest();
  const initialWalletForDeposit = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 50, 10);
  const depositAmount = 100;
  // Mocks for deposit transaction:
  // 1. getConnection (implicit in mock pool)
  // 2. beginTransaction (implicit)
  // 3. SELECT ... FOR UPDATE (wallet)
  setMockDbResponse(mockSelectWallet(initialWalletForDeposit));
  // 4. UPDATE wallets SET cash_balance = ...
  setMockDbResponse(mockOkPacket(1,1)); // 1 changed row
  // 5. INSERT INTO transactions ...
  setMockDbResponse(mockOkPacket(1, 'txn_deposit_id'));
  // 6. commit (implicit)
  // 7. release (implicit)

  const depositData: DepositRequestBody = { amount: depositAmount, description: "Test Deposit" };
  try {
    const result = await walletService.deposit(USER_ID_WALLET_1, depositData);
    assert(result.wallet.cash_balance === initialWalletForDeposit.cash_balance + depositAmount, 'DEPOSIT-DB-1: Wallet cash balance updated correctly.');
    assert(result.transaction.type === 'deposit', 'DEPOSIT-DB-2: Transaction type is deposit.');
    assert(result.transaction.amount === depositAmount, 'DEPOSIT-DB-3: Transaction amount correct.');
    assert(result.transaction.status === 'completed', 'DEPOSIT-DB-4: Transaction status completed.');
  } catch (e: any) {
    assert(false, `DEPOSIT-DB-FAIL: Deposit should succeed. Error: ${e.message}`);
  }

  // Test deposit creating wallet
  beforeEachTest();
  // Mocks for deposit transaction for new user:
  // 1. getConnection, beginTransaction
  // 2. SELECT ... FOR UPDATE (wallet) -> returns empty
  setMockDbResponse(mockSelectEmpty());
  // 3. INSERT INTO wallets (new wallet)
  setMockDbResponse(mockOkPacket(1, 'new_wallet_for_deposit'));
  // 4. UPDATE wallets SET cash_balance = ... (effectively on the just inserted wallet, but logic might re-fetch or just update values)
  //    The service logic updates cash_balance on the 'wallet' object then does the UPDATE.
  //    The actual update query will set cash_balance to the deposit amount.
  setMockDbResponse(mockOkPacket(1,1));
  // 5. INSERT INTO transactions ...
  setMockDbResponse(mockOkPacket(1, 'txn_deposit_new_wallet_id'));
  // 6. commit, release
  const newDepositData: DepositRequestBody = { amount: 200, description: "First Deposit New User" };
  try {
    const result = await walletService.deposit(USER_ID_WALLET_2, newDepositData); // User doesn't have a wallet yet
    assert(result.wallet.cash_balance === 200, 'DEPOSIT-NEWUSER-DB-1: Wallet cash balance is deposit amount.');
    assert(result.wallet.userId === USER_ID_WALLET_2, 'DEPOSIT-NEWUSER-DB-2: Wallet created for correct user.');
    assert(result.transaction.type === 'deposit' && result.transaction.amount === 200, 'DEPOSIT-NEWUSER-DB-3: Transaction details correct.');
  } catch (e: any) {
    assert(false, `DEPOSIT-NEWUSER-DB-FAIL: Deposit for new user should succeed. Error: ${e.message}`);
  }


  console.log('\n--- Running WalletService (DB Mocked): Withdrawal Tests ---');
  beforeEachTest();
  const initialWalletForWithdraw = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 200, 50);
  const withdrawAmount = 75;
  // Mocks for withdrawal:
  // 1. SELECT ... FOR UPDATE
  setMockDbResponse(mockSelectWallet(initialWalletForWithdraw));
  // 2. UPDATE wallets
  setMockDbResponse(mockOkPacket(1,1));
  // 3. INSERT INTO transactions
  setMockDbResponse(mockOkPacket(1, 'txn_withdraw_id'));

  const withdrawalData: WithdrawalRequestBody = { amount: withdrawAmount, description: "Test Withdrawal" };
  try {
    const result = await walletService.withdraw(USER_ID_WALLET_1, withdrawalData);
    assert(result.wallet.cash_balance === initialWalletForWithdraw.cash_balance - withdrawAmount, 'WITHDRAW-DB-1: Cash balance updated.');
    assert(result.transaction.type === 'withdrawal' && result.transaction.status === 'pending', 'WITHDRAW-DB-2: Transaction correct (pending).');
  } catch (e: any) {
    assert(false, `WITHDRAW-DB-FAIL: Withdrawal should succeed. Error: ${e.message}`);
  }

  // Test: Withdrawal with insufficient funds
  beforeEachTest();
  const lowBalanceWallet = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 50, 10);
  // Mocks for insufficient withdrawal:
  // 1. SELECT ... FOR UPDATE
  setMockDbResponse(mockSelectWallet(lowBalanceWallet));
  // Transaction should rollback, no UPDATE or INSERT for transaction should be mocked if error is thrown before them.
  try {
    await walletService.withdraw(USER_ID_WALLET_1, { amount: 100 }); // Try to withdraw more than balance
    assert(false, 'WITHDRAW-INSUFFICIENT-DB-FAIL: Should throw insufficient funds error.');
  } catch (e: any) {
    assert(e.message.includes('Insufficient cash balance'), `WITHDRAW-INSUFFICIENT-DB-1: Correct error. Got: ${e.message}`);
  }


  console.log('\n--- Running WalletService (DB Mocked): Generic Debit/Credit Tests ---');
  beforeEachTest();
  const walletForDebitCredit = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 100, 100);

  // Test: Generic Debit (e.g. Wager)
  // 1. SELECT ... FOR UPDATE
  setMockDbResponse(mockSelectWallet(walletForDebitCredit));
  // 2. UPDATE wallet
  setMockDbResponse(mockOkPacket(1,1));
  // 3. INSERT transaction
  setMockDbResponse(mockOkPacket(1, 'txn_debit_id'));
  const debitData: DebitRequestBody = { amount: 70, cash_amount_to_use: 50, bonus_amount_to_use: 20, type: 'wager' };
  try {
    const result = await walletService.genericDebit(USER_ID_WALLET_1, debitData);
    assert(result.wallet.cash_balance === 50, 'DEBIT-DB-1: Cash balance after debit.'); // 100 - 50
    assert(result.wallet.bonus_balance === 80, 'DEBIT-DB-2: Bonus balance after debit.'); // 100 - 20
    assert(result.transaction.type === 'wager', 'DEBIT-DB-3: Transaction type wager.');
  } catch (e: any) {
    assert(false, `DEBIT-DB-FAIL: Debit should succeed. Error: ${e.message}`);
  }

  // Test: Generic Credit (e.g. Payout)
  beforeEachTest(); // Reset service to get fresh walletForDebitCredit state for this test
  const walletForCredit = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 30, 70); // Different starting point for credit
  // 1. SELECT ... FOR UPDATE
  setMockDbResponse(mockSelectWallet(walletForCredit));
  // 2. UPDATE wallet
  setMockDbResponse(mockOkPacket(1,1));
  // 3. INSERT transaction
  setMockDbResponse(mockOkPacket(1, 'txn_credit_id'));
  const creditData: CreditRequestBody = { amount: 100, credit_to_cash: 60, credit_to_bonus: 40, type: 'payout' };
  try {
    const result = await walletService.genericCredit(USER_ID_WALLET_1, creditData);
    assert(result.wallet.cash_balance === 90, 'CREDIT-DB-1: Cash balance after credit.'); // 30 + 60
    assert(result.wallet.bonus_balance === 110, 'CREDIT-DB-2: Bonus balance after credit.'); // 70 + 40
    assert(result.transaction.type === 'payout', 'CREDIT-DB-3: Transaction type payout.');
  } catch (e: any) {
    assert(false, `CREDIT-DB-FAIL: Credit should succeed. Error: ${e.message}`);
  }

  console.log('\n--- Running WalletService (DB Mocked): GetTransactions Test ---');
  beforeEachTest();
  const userWalletForTxHistory = createMockWallet(USER_ID_WALLET_1, WALLET_ID_USER_1, 100, 0);
  const mockTxHistory: Transaction[] = [
      { transaction_id: 'tx1', wallet_id: WALLET_ID_USER_1, type: 'deposit', amount: 100, status: 'completed', created_at: new Date(Date.now()-1000)},
      { transaction_id: 'tx2', wallet_id: WALLET_ID_USER_1, type: 'wager', amount: 20, status: 'completed', created_at: new Date(Date.now()-500)},
  ];
  // 1. getOrCreateWallet -> SELECT wallet (finds it)
  setMockDbResponse(mockSelectWallet(userWalletForTxHistory));
  // 2. SELECT transactions
  setMockDbResponse({ rows: [...mockTxHistory].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }); // ensure sorted as service would
  const transactions = await walletService.getTransactions(USER_ID_WALLET_1, 5, 0);
  assert(transactions.length === 2, 'GET-TXNS-DB-1: Should retrieve 2 transactions.');
  // The service's getTransactions SQL is `ORDER BY created_at DESC`. So tx2 (newer) should be first.
  assert(transactions[0].transaction_id === 'tx2', 'GET-TXNS-DB-2: First transaction should be the newest (tx2).');


  console.log('\n--- Wallet Service (DB Mocked) Test Summary ---');
  console.log(`Successes: ${(globalThis as any).walletTestSuccesses || 0}`);
  console.log(`Failures: ${(globalThis as any).walletTestFailures || 0}`);
  if ((globalThis as any).walletTestFailures > 0) {
    console.error('SOME WALLET SERVICE (DB MOCK) TESTS FAILED!');
  } else {
    console.log('All wallet service (DB mock) tests passed!');
  }
};

// runWalletServiceDbTests(); // Don't auto-run

export { runWalletServiceDbTests };


// --- New Test Section for IAP and Ad Rewards (Conceptual Mocks) ---
const runMonetizationTests = async () => {
    console.log('\n--- Running Monetization (IAP, Ad Rewards) Tests (DB Mocked) ---');
    let walletService: WalletService;
    const USER_ID_MONETIZATION = 'user_monetization_test_001';
    const WALLET_ID_MONETIZATION = 'wallet_monetization_001';
    const IAP_PRODUCT_COINS_100 = 'com.stackgamez.coins_100';

    const mockIAPProduct: IAPProduct = {
        product_id: IAP_PRODUCT_COINS_100, name: '100 Coins', product_type: 'consumable',
        coins_awarded: 100, is_active: true
    };

    const beforeEachMonetizationTest = () => {
        walletService = new WalletService();
        clearMockDbResponses();
        // Conceptually seed IAP products if listIAPProducts relies on it
        // For these tests, listIAPProducts will be mocked directly if needed by validation.
    };

    // Test: List IAP Products
    beforeEachMonetizationTest();
    setMockDbResponse({ rows: [mockIAPProduct] }); // Mock SELECT from iap_products
    try {
        const products = await walletService.listIAPProducts();
        assert(products.length >= 1, 'IAP-LIST-1: Should list at least one product.');
        assert(products.find(p => p.product_id === IAP_PRODUCT_COINS_100) !== undefined, 'IAP-LIST-2: Specific product found.');
    } catch (e: any) {
        assert(false, `IAP-LIST-FAIL: ${e.message}`);
    }

    // Test: Validate Google Play Purchase - Mocked Success
    beforeEachMonetizationTest();
    const initialWallet = createMockWallet(USER_ID_MONETIZATION, WALLET_ID_MONETIZATION, 0, 0);
    // 1. getOrCreateWallet (in validateGooglePlayPurchase)
    setMockDbResponse(mockSelectWallet(initialWallet));
    // 2. listIAPProducts (to find the product details)
    setMockDbResponse({ rows: [mockIAPProduct] });
    // 3. INSERT into purchase_transactions
    setMockDbResponse(mockOkPacket(1, 'ptx_goog_test'));
    // 4. genericCredit -> SELECT wallet FOR UPDATE
    setMockDbResponse(mockSelectWallet(initialWallet)); // Wallet state before credit
    // 5. genericCredit -> UPDATE wallet (add coins)
    setMockDbResponse(mockOkPacket(1,1));
    // 6. genericCredit -> INSERT transaction (for the credit)
    setMockDbResponse(mockOkPacket(1, 'txn_iap_credit'));
    // 7. getOrCreateWallet (final fetch for response)
    const walletAfterCredit = { ...initialWallet, cash_balance: initialWallet.cash_balance + mockIAPProduct.coins_awarded };
    setMockDbResponse(mockSelectWallet(walletAfterCredit));
    try {
        const result = await walletService.validateGooglePlayPurchase(USER_ID_MONETIZATION, IAP_PRODUCT_COINS_100, 'test_purchase_token_google');
        assert(result.success === true, 'IAP-GOOGLE-VALIDATE-1: Validation should succeed (mocked).');
        assert(result.message.includes('items granted'), 'IAP-GOOGLE-VALIDATE-2: Correct success message.');
        assert(result.updated_wallet_balance?.cash === mockIAPProduct.coins_awarded, 'IAP-GOOGLE-VALIDATE-3: Wallet balance updated.');
        assert(result.granted_items?.coins === mockIAPProduct.coins_awarded, 'IAP-GOOGLE-VALIDATE-4: Coins granted matches product.');
    } catch (e: any) {
        assert(false, `IAP-GOOGLE-VALIDATE-FAIL: ${e.message}`);
    }

    // Test: Claim Ad Reward - Coins
    beforeEachMonetizationTest();
    const initialWalletForAdReward = createMockWallet(USER_ID_MONETIZATION, WALLET_ID_MONETIZATION, 10, 5);
    const adRewardCoins = 25;
    // Mocks for claimAdReward -> genericCredit
    // 1. genericCredit -> SELECT wallet FOR UPDATE
    setMockDbResponse(mockSelectWallet(initialWalletForAdReward));
    // 2. genericCredit -> UPDATE wallet (add bonus coins)
    setMockDbResponse(mockOkPacket(1,1));
    // 3. genericCredit -> INSERT transaction
    setMockDbResponse(mockOkPacket(1, 'txn_ad_reward_credit'));
    try {
        const result = await walletService.claimAdReward(USER_ID_MONETIZATION, 'admob', 'coins', adRewardCoins);
        assert(result.success === true, 'ADMOB-REWARD-COINS-1: Claim should succeed.');
        assert(result.granted_reward?.type === 'coins' && result.granted_reward?.amount === adRewardCoins, 'ADMOB-REWARD-COINS-2: Correct reward granted.');
        assert(result.updated_wallet_balance?.bonus === initialWalletForAdReward.bonus_balance + adRewardCoins, 'ADMOB-REWARD-COINS-3: Bonus balance updated.');
    } catch (e: any) {
        assert(false, `ADMOB-REWARD-COINS-FAIL: ${e.message}`);
    }

    // Test: Claim Ad Reward - Wheel Spin (Conceptual - no direct wallet update)
    beforeEachMonetizationTest();
    const adRewardSpins = 1;
    // No DB mocks needed for wallet as this type of reward doesn't directly update wallet in this service's mock
    try {
        const result = await walletService.claimAdReward(USER_ID_MONETIZATION, 'admob', 'wheel_spin', adRewardSpins);
        assert(result.success === true, 'ADMOB-REWARD-SPIN-1: Claim should succeed.');
        assert(result.granted_reward?.type === 'wheel_spin' && result.granted_reward?.amount === adRewardSpins, 'ADMOB-REWARD-SPIN-2: Correct reward granted.');
        assert(result.updated_available_spins === adRewardSpins, 'ADMOB-REWARD-SPIN-3: Spin count returned (conceptual).');
    } catch (e: any) {
        assert(false, `ADMOB-REWARD-SPIN-FAIL: ${e.message}`);
    }


    console.log('\n--- Monetization Test Summary ---');
    // This summary count will be off because it uses global counters.
};

const runAllWalletServiceTests = async () => {
    await runWalletServiceDbTests();
    await runMonetizationTests();

    console.log('\n--- OVERALL WalletService Test Summary ---');
    console.log(`Total Successes: ${(globalThis as any).walletTestSuccesses || 0}`);
    console.log(`Total Failures: ${(globalThis as any).walletTestFailures || 0}`);
    if (((globalThis as any).walletTestFailures || 0) > 0) {
        console.error('SOME WALLET SERVICE TESTS FAILED!');
    } else {
        console.log('All WalletService tests passed (conceptually)!');
    }
};

// If running this file directly:
if (typeof require !== 'undefined' && require.main === module) {
    runAllWalletServiceTests();
}

export { runAllWalletServiceTests };
