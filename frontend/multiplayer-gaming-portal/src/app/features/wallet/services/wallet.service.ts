import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// Mirroring types from backend WalletService
export interface WalletView {
  walletId: string;
  userId: string;
  cashBalance: number;
  bonusBalance: number;
  currency: string;
  updatedAt?: Date | string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'bonus_credit' | 'bonus_debit' | 'refund' | 'manual_credit_cash' | 'manual_debit_cash';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reverted';

export interface TransactionView {
  transactionId: string;
  // walletId: string; // Not always needed in user-facing view if context is user's wallet
  type: TransactionType;
  amount: number;
  cashAmountUsed?: number;
  bonusAmountUsed?: number;
  description?: string;
  status: TransactionStatus;
  createdAt: Date | string;
  // relatedEntityId?: string; // e.g. gameId, tournamentId
}

// Mock data for a user's wallet and transactions
const MOCK_WALLET: WalletView = {
  walletId: 'wallet_currentUser_mock_id',
  userId: 'currentUser_mock_id', // Assume this is the logged-in user
  cashBalance: 1250.75,
  bonusBalance: 300.50,
  currency: 'INR',
  updatedAt: new Date().toISOString()
};

const MOCK_TRANSACTIONS: TransactionView[] = [
  { transactionId: 'txn_001', type: 'deposit', amount: 1000, status: 'completed', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Initial deposit' },
  { transactionId: 'txn_002', type: 'wager', amount: 50, cashAmountUsed: 50, status: 'completed', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), description: 'Ludo Masters entry' },
  { transactionId: 'txn_003', type: 'payout', amount: 150, status: 'completed', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30*60000).toISOString(), description: 'Ludo Masters win' },
  { transactionId: 'txn_004', type: 'bonus_credit', amount: 500, status: 'completed', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'Welcome Bonus' },
  { transactionId: 'txn_005', type: 'wager', amount: 100, bonusAmountUsed: 100, status: 'completed', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), description: 'Rummy Royale entry (bonus)' },
  { transactionId: 'txn_006', type: 'withdrawal', amount: 200, cashAmountUsed: 200, status: 'pending', createdAt: new Date().toISOString(), description: 'Withdrawal request' },
  { transactionId: 'txn_007', type: 'deposit', amount: 350.75, status: 'completed', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), description: 'Top-up deposit' },
  { transactionId: 'txn_008', type: 'wager', amount: 100, cashAmountUsed: 50, bonusAmountUsed: 50, status: 'completed', createdAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), description: 'Tournament Entry (Ludo Weekly)' },
];


@Injectable({
  providedIn: 'root'
})
export class WalletService { // Angular WalletService

  constructor() {}

  getWallet(userId: string): Observable<WalletView | undefined> {
    console.log(`[Angular WalletService] Fetching wallet for user ${userId} (mocked)...`);
    // In a real app, use userId. For simulation, always return MOCK_WALLET if userId matches.
    if (userId === MOCK_WALLET.userId) {
      return of({ ...MOCK_WALLET }).pipe(delay(200));
    }
    return of(undefined).pipe(delay(100));
  }

  getTransactions(userId: string, limit: number = 10, offset: number = 0): Observable<TransactionView[]> {
    console.log(`[Angular WalletService] Fetching transactions for user ${userId} (mocked)...`);
    if (userId === MOCK_WALLET.userId) {
      // Sort by date descending, then apply offset and limit
      const sortedTransactions = [...MOCK_TRANSACTIONS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return of(sortedTransactions.slice(offset, offset + limit)).pipe(delay(350));
    }
    return of([]).pipe(delay(100));
  }

  // Conceptual methods for deposit/withdrawal initiation - not fully implemented UI for these yet
  // requestDeposit(userId: string, amount: number): Observable<any> { ... }
  // requestWithdrawal(userId: string, amount: number): Observable<any> { ... }
}
