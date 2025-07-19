export interface Wallet {
  wallet_id: string;
  user_id: string;
  cash_balance: number; // Using number for simplicity; consider libraries like decimal.js for precision
  bonus_balance: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'bonus_credit' | 'bonus_debit' | 'refund' | 'internal_transfer';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reverted';

export interface Transaction {
  transaction_id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number; // Always positive
  cash_amount_used?: number; // For wagers/withdrawals from cash
  bonus_amount_used?: number; // For wagers from bonus
  external_payment_id?: string;
  internal_reference_id?: string; // e.g., game_id, tournament_id
  description?: string;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface WalletCreationParams {
  userId: string;
  currency?: string;
}

export interface DepositRequestBody {
  amount: number;
  external_payment_id?: string;
  description?: string;
}

export interface WithdrawalRequestBody {
  amount: number; // Amount to withdraw from cash balance
  description?: string;
}

export interface DebitRequestBody {
  amount: number; // Total amount to debit
  cash_amount_to_use: number; // How much of 'amount' to take from cash
  bonus_amount_to_use: number; // How much of 'amount' to take from bonus
  type?: Extract<TransactionType, 'wager' | 'bonus_debit'>; // Specific type of debit
  internal_reference_id?: string;
  description?: string;
}

export interface CreditRequestBody {
  amount: number; // Total amount to credit
  credit_to_cash?: number; // Amount to credit to cash_balance
  credit_to_bonus?: number; // Amount to credit to bonus_balance
  type?: Extract<TransactionType, 'payout' | 'bonus_credit' | 'refund' | 'deposit'>; // Specific type of credit
  internal_reference_id?: string;
  description?: string;
}
