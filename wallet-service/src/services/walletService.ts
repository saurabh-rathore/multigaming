import {
    Wallet, Transaction, TransactionType, TransactionStatus,
    DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody
} from '../types/wallet.types'; // Assuming WalletCreationParams is not used or merged
import { generateId, roundCurrency } from '../utils/helpers';
import pool from '../config/db.config'; // Import the conceptual MySQL pool for WalletService

// Define a type for what a wallet/transaction row from the DB might look like
type WalletRow = Wallet & { [key: string]: any };
type TransactionRow = Transaction & { [key: string]: any };

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  affectedRows: number;
  insertId?: number | string;
  changedRows?: number;
}
// Type for Connection object from pool.getConnection() - conceptual
interface ConceptualConnection {
    query: (sql: string, params?: any[]) => Promise<[any[], any] | [any, any]>;
    release: () => void;
    beginTransaction: () => Promise<void>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
}


export class WalletService {

  async getOrCreateWallet(userId: string, currency: string = 'INR'): Promise<Wallet> {
    const getSql = 'SELECT * FROM wallets WHERE user_id = ? LIMIT 1';
    const [rows]: [WalletRow[], any] = await pool.query(getSql, [userId]) as [WalletRow[], any];

    if (rows.length > 0) {
      return rows[0] as Wallet;
    }

    // Create new wallet if not found
    const newWalletId = generateId('wallet');
    const now = new Date();
    const newWallet: Wallet = {
      wallet_id: newWalletId,
      user_id: userId,
      cash_balance: 0, // Use number for balances as per type
      bonus_balance: 0,
      currency: currency,
      created_at: now,
      updated_at: now,
    };

    const insertSql = 'INSERT INTO wallets (wallet_id, user_id, cash_balance, bonus_balance, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [newWallet.wallet_id, newWallet.user_id, newWallet.cash_balance, newWallet.bonus_balance, newWallet.currency, newWallet.created_at, newWallet.updated_at];
    const [result]: [OkPacket, any] = await pool.query(insertSql, params) as [OkPacket, any];

    if (result.affectedRows !== 1) {
      throw new Error('Failed to create wallet in database.');
    }
    console.log(`[WalletService-DB] Created new wallet for user ${userId} with ID ${newWalletId}`);
    return newWallet;
  }

  private async _createTransactionEntry(
    connection: ConceptualConnection | typeof pool, // Can be a connection or the pool itself for non-transactional logging
    wallet_id: string,
    type: TransactionType,
    amount: number,
    status: TransactionStatus,
    details: Partial<Omit<Transaction, 'transaction_id'|'wallet_id'|'type'|'amount'|'status'|'created_at'|'updated_at'>>
  ): Promise<Transaction> {
    const txId = generateId('txn');
    const now = new Date();
    const transaction: Transaction = {
      transaction_id: txId,
      wallet_id,
      type,
      amount: roundCurrency(amount),
      status,
      cash_amount_used: details.cash_amount_used ? roundCurrency(details.cash_amount_used) : undefined,
      bonus_amount_used: details.bonus_amount_used ? roundCurrency(details.bonus_amount_used) : undefined,
      external_payment_id: details.external_payment_id,
      internal_reference_id: details.internal_reference_id,
      description: details.description,
      created_at: now,
      updated_at: now,
    };

    const insertTxSql = `
      INSERT INTO transactions (transaction_id, wallet_id, type, amount, cash_amount_used, bonus_amount_used, external_payment_id, internal_reference_id, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const txParams = [
        transaction.transaction_id, transaction.wallet_id, transaction.type, transaction.amount,
        transaction.cash_amount_used || null, transaction.bonus_amount_used || null,
        transaction.external_payment_id || null, transaction.internal_reference_id || null,
        transaction.description || null, transaction.status, transaction.created_at, transaction.updated_at
    ];

    const [txResult]: [OkPacket, any] = await connection.query(insertTxSql, txParams) as [OkPacket, any];
    if (txResult.affectedRows !== 1) {
        throw new Error('Failed to create transaction entry in database.');
    }
    return transaction;
  }

  async deposit(userId: string, data: DepositRequestBody): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const connection: ConceptualConnection = await pool.getConnection() as ConceptualConnection;
    try {
      await connection.beginTransaction();

      // Get wallet, lock row for update (conceptual: SELECT ... FOR UPDATE)
      // In MySQL, simple SELECT then UPDATE in a transaction provides protection if isolation level is appropriate.
      // For explicit locking: 'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE'
      const getWalletSql = 'SELECT * FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE';
      let [walletRows]: [WalletRow[], any] = await connection.query(getWalletSql, [userId]) as [WalletRow[], any];

      let wallet: Wallet;
      if (walletRows.length === 0) {
        // Create wallet if it doesn't exist (this part should also be part of the transaction)
        const newWalletId = generateId('wallet');
        const now = new Date();
        wallet = {
          wallet_id: newWalletId, user_id: userId, cash_balance: 0, bonus_balance: 0, currency: 'INR', // Default currency
          created_at: now, updatedAt: now,
        };
        const insertWalletSql = 'INSERT INTO wallets (wallet_id, user_id, cash_balance, bonus_balance, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await connection.query(insertWalletSql, [wallet.wallet_id, wallet.user_id, wallet.cash_balance, wallet.bonus_balance, wallet.currency, wallet.created_at, wallet.updated_at]);
        console.log(`[WalletService-DB] Created wallet ${wallet.wallet_id} for user ${userId} during deposit.`);
      } else {
        wallet = walletRows[0] as Wallet;
      }

      const newCashBalance = roundCurrency(Number(wallet.cash_balance) + data.amount);
      const updateWalletSql = 'UPDATE wallets SET cash_balance = ?, updated_at = NOW() WHERE wallet_id = ?';
      await connection.query(updateWalletSql, [newCashBalance, wallet.wallet_id]);

      const transaction = await this._createTransactionEntry(connection, wallet.wallet_id, 'deposit', data.amount, 'completed', {
          external_payment_id: data.external_payment_id,
          description: data.description || 'User deposit'
      });

      await connection.commit();
      wallet.cash_balance = newCashBalance; // Update in-memory object to return
      wallet.updated_at = new Date();       // Simulate NOW()
      console.log(`[WalletService-DB] Deposited ${data.amount} for user ${userId}. New cash: ${wallet.cash_balance}`);
      return { wallet, transaction };
    } catch (error) {
      await connection.rollback();
      console.error('[WalletService-DB] Deposit failed, rolled back:', error);
      throw error; // Re-throw error to be handled by controller
    } finally {
      connection.release();
    }
  }

  async withdraw(userId: string, data: WithdrawalRequestBody): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const connection: ConceptualConnection = await pool.getConnection() as ConceptualConnection;
    try {
      await connection.beginTransaction();
      const getWalletSql = 'SELECT * FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE';
      const [walletRows]: [WalletRow[], any] = await connection.query(getWalletSql, [userId]) as [WalletRow[], any];

      if (walletRows.length === 0) throw new Error('Wallet not found for withdrawal.');
      let wallet = walletRows[0] as Wallet;

      if (Number(wallet.cash_balance) < data.amount) {
        throw new Error('Insufficient cash balance for withdrawal.');
      }

      const newCashBalance = roundCurrency(Number(wallet.cash_balance) - data.amount);
      const updateWalletSql = 'UPDATE wallets SET cash_balance = ?, updated_at = NOW() WHERE wallet_id = ?';
      await connection.query(updateWalletSql, [newCashBalance, wallet.wallet_id]);

      const transaction = await this._createTransactionEntry(connection, wallet.wallet_id, 'withdrawal', data.amount, 'pending', {
          cash_amount_used: data.amount,
          description: data.description || 'User withdrawal'
      });

      await connection.commit();
      wallet.cash_balance = newCashBalance;
      wallet.updated_at = new Date();
      console.log(`[WalletService-DB] Withdrew ${data.amount} for user ${userId}. New cash: ${wallet.cash_balance}`);
      return { wallet, transaction };
    } catch (error) {
      await connection.rollback();
      console.error('[WalletService-DB] Withdrawal failed, rolled back:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async genericDebitOrCredit(
    userId: string,
    totalAmount: number,
    details: { // Combined details for debit/credit
        cash_part: number;
        bonus_part: number;
        type: TransactionType;
        description?: string;
        internal_reference_id?: string;
        isDebit: boolean; // True for debit, false for credit
    }
  ): Promise<{wallet: Wallet; transaction: Transaction}> {
    const connection: ConceptualConnection = await pool.getConnection() as ConceptualConnection;
    try {
        await connection.beginTransaction();
        const getWalletSql = 'SELECT * FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE';
        const [walletRows]: [WalletRow[], any] = await connection.query(getWalletSql, [userId]) as [WalletRow[], any];

        if (walletRows.length === 0) throw new Error(`Wallet not found for user ${userId}.`);
        let wallet = walletRows[0] as Wallet;

        let newCashBalance = Number(wallet.cash_balance);
        let newBonusBalance = Number(wallet.bonus_balance);

        if (details.isDebit) {
            if (roundCurrency(details.cash_part + details.bonus_part) !== roundCurrency(totalAmount)) {
                throw new Error('Sum of cash and bonus parts must equal total debit amount.');
            }
            if (newCashBalance < details.cash_part) throw new Error('Insufficient cash balance.');
            if (newBonusBalance < details.bonus_part) throw new Error('Insufficient bonus balance.');
            newCashBalance = roundCurrency(newCashBalance - details.cash_part);
            newBonusBalance = roundCurrency(newBonusBalance - details.bonus_part);
        } else { // Credit
            if (roundCurrency(details.cash_part + details.bonus_part) !== roundCurrency(totalAmount)) {
                throw new Error('Sum of cash and bonus parts must equal total credit amount.');
            }
            newCashBalance = roundCurrency(newCashBalance + details.cash_part);
            newBonusBalance = roundCurrency(newBonusBalance + details.bonus_part);
        }

        const updateWalletSql = 'UPDATE wallets SET cash_balance = ?, bonus_balance = ?, updated_at = NOW() WHERE wallet_id = ?';
        await connection.query(updateWalletSql, [newCashBalance, newBonusBalance, wallet.wallet_id]);

        const transaction = await this._createTransactionEntry(connection, wallet.wallet_id, details.type, totalAmount, 'completed', {
            cash_amount_used: details.isDebit ? details.cash_part : undefined, // Only log used amounts for debits
            bonus_amount_used: details.isDebit ? details.bonus_part : undefined,
            description: details.description || `Generic ${details.isDebit ? 'debit' : 'credit'}`,
            internal_reference_id: details.internal_reference_id
        });

        await connection.commit();
        wallet.cash_balance = newCashBalance;
        wallet.bonus_balance = newBonusBalance;
        wallet.updated_at = new Date();
        console.log(`[WalletService-DB] Processed ${details.type} of ${totalAmount} for ${userId}. Balances: C ${newCashBalance}, B ${newBonusBalance}`);
        return { wallet, transaction };

    } catch (error) {
        await connection.rollback();
        console.error(`[WalletService-DB] Generic ${details.isDebit ? 'debit' : 'credit'} failed, rolled back:`, error);
        throw error;
    } finally {
        connection.release();
    }
  }


  async genericDebit(userId: string, data: DebitRequestBody): Promise<{wallet: Wallet; transaction: Transaction}> {
    return this.genericDebitOrCredit(userId, data.amount, {
        cash_part: data.cash_amount_to_use,
        bonus_part: data.bonus_amount_to_use,
        type: data.type || 'wager', // Default to wager for debit
        description: data.description,
        internal_reference_id: data.internal_reference_id,
        isDebit: true
    });
  }

  async genericCredit(userId: string, data: CreditRequestBody): Promise<{wallet: Wallet; transaction: Transaction}> {
     return this.genericDebitOrCredit(userId, data.amount, {
        cash_part: data.credit_to_cash || 0,
        bonus_part: data.credit_to_bonus || 0,
        type: data.type || 'payout', // Default to payout for credit
        description: data.description,
        internal_reference_id: data.internal_reference_id,
        isDebit: false
    });
  }

  async getTransactions(userId: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
      const wallet = await this.getOrCreateWallet(userId); // Ensures wallet exists to get wallet_id
      const sql = 'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const [rows]: [TransactionRow[], any] = await pool.query(sql, [wallet.wallet_id, limit, offset]) as [TransactionRow[], any];
      return rows as Transaction[];
  }

  // --- IAP and Ad Reward Methods (Placeholders/Mocks) ---

  async listIAPProducts(): Promise<IAPProduct[]> {
    console.log('[WalletService-DB] Listing IAP products.');
    // In a real app, fetch from iap_products table
    // For now, return mock data or empty array
    const sql = 'SELECT product_id, name, description, product_type, coins_awarded, items_awarded, price_tier_reference, is_active, created_at, updated_at FROM iap_products WHERE is_active = TRUE';
    const [rows]: [any[], any] = await pool.query(sql) as [any[], any];
    return rows.map(row => ({
        ...row,
        items_awarded: typeof row.items_awarded === 'string' ? JSON.parse(row.items_awarded) : row.items_awarded
    })) as IAPProduct[];
  }

  async validateGooglePlayPurchase(userId: string, productId: string, purchaseToken: string, orderId?: string): Promise<PurchaseValidationResponse> {
    console.log(`[WalletService] Validating Google Play Purchase for user ${userId}, product ${productId}, token ${purchaseToken}`);
    // 1. Create/Update PurchaseTransaction record with status 'pending_validation'
    // 2. Call Google Play Developer API to validate purchaseToken.
    //    - This requires setting up Google API client, service accounts, etc.
    //    - const {data: validationResult} = await androidpublisher.purchases.products.get({packageName, productId, token});
    // 3. If valid:
    //    a. Grant items/currency to user (e.g., call this.genericCredit or specific item granting logic)
    //    b. Update PurchaseTransaction to 'validated' (or 'consumed' if consumable and acknowledged)
    //    c. Acknowledge/Consume purchase with Google Play API if necessary.
    // 4. If invalid, update PurchaseTransaction to 'failed_validation'.

    // Mocked success:
    const wallet = await this.getOrCreateWallet(userId);
    const iapProduct = (await this.listIAPProducts()).find(p => p.product_id === productId); // Get product details (coins_awarded)

    if (!iapProduct) {
        return { success: false, message: `IAP Product ${productId} not found.` };
    }

    // Simulate creating transaction record
    const purchaseTxId = generateId('ptx_goog');
    const insertPurchaseSql = `
        INSERT INTO purchase_transactions (purchase_transaction_id, user_id, wallet_id, product_id, platform, platform_order_id, platform_purchase_token, status, items_granted, initiated_at, validated_at, updated_at)
        VALUES (?, ?, ?, ?, 'google', ?, ?, 'validated', TRUE, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE status='validated', items_granted=TRUE, validated_at=NOW(), updated_at=NOW()`; // Handle re-validation if needed

    await pool.query(insertPurchaseSql, [purchaseTxId, userId, wallet.wallet_id, productId, orderId || null, purchaseToken]);

    // Simulate granting coins
    if (iapProduct.coins_awarded > 0) {
        await this.genericCredit(userId, {
            amount: iapProduct.coins_awarded,
            credit_to_cash: iapProduct.coins_awarded, // Or map to specific currency type based on IAP
            type: 'deposit',
            description: `IAP: ${iapProduct.name}`,
            internal_reference_id: purchaseTxId
        });
    }
    // TODO: Grant other items from iapProduct.items_awarded (e.g. call user-profile-service)

    const updatedWallet = await this.getOrCreateWallet(userId);
    return {
        success: true,
        message: 'Google Play purchase validated and items granted (mocked).',
        transaction_id: purchaseTxId,
        updated_wallet_balance: { cash: updatedWallet.cash_balance, bonus: updatedWallet.bonus_balance },
        granted_items: { coins: iapProduct.coins_awarded, items: iapProduct.items_awarded }
    };
  }

  async validateAppleAppStorePurchase(userId: string, productId: string, transactionReceipt: string, originalTransactionId?: string): Promise<PurchaseValidationResponse> {
    console.log(`[WalletService] Validating Apple App Store Purchase for user ${userId}, product ${productId}`);
    // 1. Create/Update PurchaseTransaction record.
    // 2. Call Apple App Store Server API (/verifyReceipt) to validate.
    //    - Handle different statuses (sandbox, production).
    // 3. If valid:
    //    a. Grant items/currency.
    //    b. Update PurchaseTransaction.
    //    c. For non-consumables/subscriptions, ensure transactionId is tracked to prevent re-granting.

    // Mocked success (similar to Google Play mock):
    const wallet = await this.getOrCreateWallet(userId);
    const iapProduct = (await this.listIAPProducts()).find(p => p.product_id === productId);
     if (!iapProduct) {
        return { success: false, message: `IAP Product ${productId} not found.` };
    }
    const purchaseTxId = generateId('ptx_appl');
     const insertPurchaseSql = `
        INSERT INTO purchase_transactions (purchase_transaction_id, user_id, wallet_id, product_id, platform, platform_order_id, platform_purchase_token, status, items_granted, initiated_at, validated_at, updated_at)
        VALUES (?, ?, ?, ?, 'apple', ?, ?, 'validated', TRUE, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE status='validated', items_granted=TRUE, validated_at=NOW(), updated_at=NOW()`;

    await pool.query(insertPurchaseSql, [purchaseTxId, userId, wallet.wallet_id, productId, originalTransactionId || null, transactionReceipt]);

    if (iapProduct.coins_awarded > 0) {
        await this.genericCredit(userId, { amount: iapProduct.coins_awarded, credit_to_cash: iapProduct.coins_awarded, type: 'deposit', description: `IAP: ${iapProduct.name}`, internal_reference_id: purchaseTxId });
    }
    // TODO: Grant items

    const updatedWallet = await this.getOrCreateWallet(userId);
    return {
        success: true,
        message: 'Apple App Store purchase validated and items granted (mocked).',
        transaction_id: purchaseTxId,
        updated_wallet_balance: { cash: updatedWallet.cash_balance, bonus: updatedWallet.bonus_balance },
        granted_items: { coins: iapProduct.coins_awarded, items: iapProduct.items_awarded }
    };
  }

  async claimAdReward(userId: string, adNetwork: 'admob', rewardType: string, rewardAmount: number, verificationPayload?: string): Promise<ClaimAdRewardResponse> {
    console.log(`[WalletService] Claiming AdMob reward for user ${userId}. Type: ${rewardType}, Amount: ${rewardAmount}`);
    // 1. Optional: Server-side verification of AdMob reward callback if implemented.
    //    (Requires AdMob setup for SSV callbacks to an endpoint on this service).
    // 2. If verified (or trusted client for now):
    //    a. Grant the reward.

    let updatedWallet;
    let updatedSpins;

    if (rewardType === 'coins') {
      const creditResult = await this.genericCredit(userId, {
        amount: rewardAmount,
        credit_to_bonus: rewardAmount, // Example: Ad rewards go to bonus balance
        type: 'bonus_credit',
        description: 'Rewarded Ad Bonus',
        internal_reference_id: `admob_${generateId()}`
      });
      updatedWallet = creditResult.wallet;
    } else if (rewardType === 'wheel_spin') {
      // This would ideally call user-profile-service to update available_wheel_spins
      // For now, simulate:
      console.log(`[WalletService-Mock] User ${userId} granted ${rewardAmount} wheel spins from Ad reward.`);
      // This part is conceptual as it would involve another service call:
      // updatedSpins = await userProfileService.incrementWheelSpins(userId, rewardAmount);
      updatedSpins = rewardAmount; // Placeholder
    } else {
        return { success: false, message: `Unsupported ad reward type: ${rewardType}`};
    }

    // Log this ad reward claim if necessary (e.g., in transactions or a dedicated ad_rewards log)

    return {
        success: true,
        message: 'Ad reward claimed successfully (mocked).',
        granted_reward: { type: rewardType, amount: rewardAmount },
        updated_wallet_balance: updatedWallet ? { cash: updatedWallet.cash_balance, bonus: updatedWallet.bonus_balance } : undefined,
        updated_available_spins: updatedSpins
    };
  }

  async __seedIAPProducts(): Promise<void> { // Conceptual seeding
    console.log('[WalletService-DB] Seeding IAP products...');
    const products: Partial<IAPProduct>[] = [
        { product_id: 'com.stackgamez.coins_100', name: '100 Coins Pack', product_type: 'consumable', coins_awarded: 100, price_tier_reference: 'tier_1', is_active: true },
        { product_id: 'com.stackgamez.coins_550', name: '550 Coins Pack (10% Bonus)', product_type: 'consumable', coins_awarded: 550, price_tier_reference: 'tier_2', is_active: true },
        { product_id: 'com.stackgamez.coins_1200', name: '1200 Coins Pack (20% Bonus)', product_type: 'consumable', coins_awarded: 1200, price_tier_reference: 'tier_3', is_active: true },
        { product_id: 'com.stackgamez.powerup_bundle_small', name: 'Small Power-Up Bundle', product_type: 'consumable', coins_awarded: 0, items_awarded: {'power_ups': ['shield_x1', 'reroll_x2']}, price_tier_reference: 'tier_1', is_active: true },
        // { product_id: 'com.stackgamez.vip_monthly', name: 'VIP Monthly Subscription', product_type: 'subscription', coins_awarded: 500, items_awarded: {'perks': ['vip_chat_badge', 'daily_bonus_multiplier_2x']}, is_active: true },
    ];
    for (const p of products) {
        try {
            const checkSql = 'SELECT product_id FROM iap_products WHERE product_id = ?';
            const [existing]: [any[], any] = await pool.query(checkSql, [p.product_id]) as [any[], any];
            if (existing.length === 0) {
                const insertSql = 'INSERT INTO iap_products (product_id, name, description, product_type, coins_awarded, items_awarded, price_tier_reference, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
                await pool.query(insertSql, [p.product_id, p.name, p.description, p.product_type, p.coins_awarded, p.items_awarded ? JSON.stringify(p.items_awarded) : null, p.price_tier_reference, p.is_active]);
            }
        } catch (error: any) { console.error(`Error seeding IAP product ${p.product_id}: ${error.message}`); }
    }
  }

}
