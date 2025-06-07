import { Wallet, Transaction, TransactionType, TransactionStatus, WalletCreationParams, DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody } from '../types/wallet.types';
import { generateId, roundCurrency } from '../utils/helpers';

// Placeholder for database interactions
const db = {
  wallets: new Map<string, Wallet>(), // Key: user_id (for easy lookup), Value: Wallet
  transactions: new Map<string, Transaction>(), // Key: transaction_id, Value: Transaction
};

export class WalletService {

  async getOrCreateWallet(userId: string, currency: string = 'INR'): Promise<Wallet> {
    let wallet = Array.from(db.wallets.values()).find(w => w.user_id === userId);
    if (wallet) {
      return { ...wallet };
    }
    const newWalletId = generateId('wallet');
    const newWallet: Wallet = {
      wallet_id: newWalletId,
      user_id: userId,
      cash_balance: 0,
      bonus_balance: 0,
      currency: currency,
      created_at: new Date(),
      updated_at: new Date(),
    };
    db.wallets.set(newWalletId, newWallet); // Storing by wallet_id
    console.log(`[WalletService] Created new wallet for user ${userId} with ID ${newWalletId}`);
    return { ...newWallet };
  }

  private async _createTransaction(wallet_id: string, type: TransactionType, amount: number, status: TransactionStatus, details: Partial<Omit<Transaction, 'transaction_id'|'wallet_id'|'type'|'amount'|'status'|'created_at'|'updated_at'>>): Promise<Transaction> {
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
    db.transactions.set(txId, transaction);
    return transaction;
  }

  async deposit(userId: string, data: DepositRequestBody): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const wallet = await this.getOrCreateWallet(userId);

    wallet.cash_balance = roundCurrency(wallet.cash_balance + data.amount);
    wallet.updated_at = new Date();
    db.wallets.set(wallet.wallet_id, wallet);

    const transaction = await this._createTransaction(wallet.wallet_id, 'deposit', data.amount, 'completed', {
        external_payment_id: data.external_payment_id,
        description: data.description || 'User deposit'
    });

    console.log(`[WalletService] Deposited ${data.amount} for user ${userId}. New cash balance: ${wallet.cash_balance}`);
    return { wallet: { ...wallet }, transaction };
  }

  async withdraw(userId: string, data: WithdrawalRequestBody): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.cash_balance < data.amount) {
      throw new Error('Insufficient cash balance for withdrawal.');
    }

    wallet.cash_balance = roundCurrency(wallet.cash_balance - data.amount);
    wallet.updated_at = new Date();
    db.wallets.set(wallet.wallet_id, wallet);

    const transaction = await this._createTransaction(wallet.wallet_id, 'withdrawal', data.amount, 'pending', { // Withdrawals often start as pending
        cash_amount_used: data.amount,
        description: data.description || 'User withdrawal'
    });

    console.log(`[WalletService] Withdrew ${data.amount} for user ${userId}. New cash balance: ${wallet.cash_balance}`);
    return { wallet: { ...wallet }, transaction };
  }

  async genericDebit(userId: string, data: DebitRequestBody): Promise<{wallet: Wallet; transaction: Transaction}> {
    const wallet = await this.getOrCreateWallet(userId);
    const { amount, cash_amount_to_use, bonus_amount_to_use, type = 'wager', description, internal_reference_id } = data;

    if (roundCurrency(cash_amount_to_use + bonus_amount_to_use) !== roundCurrency(amount)) {
        throw new Error('Sum of cash and bonus amounts to use must equal total debit amount.');
    }
    if (wallet.cash_balance < cash_amount_to_use) {
        throw new Error('Insufficient cash balance for this debit.');
    }
    if (wallet.bonus_balance < bonus_amount_to_use) {
        throw new Error('Insufficient bonus balance for this debit.');
    }

    wallet.cash_balance = roundCurrency(wallet.cash_balance - cash_amount_to_use);
    wallet.bonus_balance = roundCurrency(wallet.bonus_balance - bonus_amount_to_use);
    wallet.updated_at = new Date();
    db.wallets.set(wallet.wallet_id, wallet);

    const transaction = await this._createTransaction(wallet.wallet_id, type, amount, 'completed', {
        cash_amount_used: cash_amount_to_use,
        bonus_amount_used: bonus_amount_to_use,
        description: description || 'Generic debit',
        internal_reference_id
    });
    console.log(`[WalletService] Debited ${amount} (Cash: ${cash_amount_to_use}, Bonus: ${bonus_amount_to_use}) for user ${userId}. Balances: Cash ${wallet.cash_balance}, Bonus ${wallet.bonus_balance}`);
    return { wallet: {...wallet}, transaction };
  }

  async genericCredit(userId: string, data: CreditRequestBody): Promise<{wallet: Wallet; transaction: Transaction}> {
    const wallet = await this.getOrCreateWallet(userId);
    const { amount, credit_to_cash = 0, credit_to_bonus = 0, type = 'payout', description, internal_reference_id } = data;

    if (roundCurrency(credit_to_cash + credit_to_bonus) !== roundCurrency(amount)) {
        throw new Error('Sum of amounts to credit to cash and bonus must equal total credit amount.');
    }

    wallet.cash_balance = roundCurrency(wallet.cash_balance + credit_to_cash);
    wallet.bonus_balance = roundCurrency(wallet.bonus_balance + credit_to_bonus);
    wallet.updated_at = new Date();
    db.wallets.set(wallet.wallet_id, wallet);

    const transaction = await this._createTransaction(wallet.wallet_id, type, amount, 'completed', {
        description: description || 'Generic credit',
        internal_reference_id
        // Note: cash_amount_used/bonus_amount_used are typically for debits, not directly applicable here
    });
    console.log(`[WalletService] Credited ${amount} (Cash: ${credit_to_cash}, Bonus: ${credit_to_bonus}) for user ${userId}. Balances: Cash ${wallet.cash_balance}, Bonus ${wallet.bonus_balance}`);
    return { wallet: {...wallet}, transaction };
  }

  async getTransactions(userId: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
      const wallet = await this.getOrCreateWallet(userId);
      const userTransactions = Array.from(db.transactions.values())
          .filter(tx => tx.wallet_id === wallet.wallet_id)
          .sort((a,b) => b.created_at.getTime() - a.created_at.getTime()); // Newest first
      return userTransactions.slice(offset, offset + limit);
  }
}
