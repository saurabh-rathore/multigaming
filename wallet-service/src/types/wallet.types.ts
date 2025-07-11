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

// --- In-App Purchase (IAP) Types ---

export type IAPProductType = 'consumable' | 'non_consumable' | 'subscription';

export interface IAPProduct {
  product_id: string; // Matches store's product ID
  name: string;
  description?: string;
  product_type: IAPProductType;
  coins_awarded: number;
  items_awarded?: Record<string, any>; // e.g., { "power_ups": ["shield", "skip"], "cosmetics": ["hat1"] }
  price_tier_reference?: string; // Internal reference, actual price from store
  is_active: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type PurchasePlatform = 'google' | 'apple' | 'unknown';
export type PurchaseStatus =
  | 'initiated'
  | 'pending_validation'
  | 'validated'
  | 'consumed'
  | 'failed_validation'
  | 'refunded'
  | 'expired';

export interface PurchaseTransaction {
  purchase_transaction_id: string; // Internal unique ID
  user_id: string;
  wallet_id: string;
  product_id: string;
  platform: PurchasePlatform;
  platform_order_id?: string | null; // GPA.xxxx (Google), originalTransactionIdentifier (Apple)
  platform_purchase_token?: string | null; // For Google Play validation/ack, or Apple JWS
  status: PurchaseStatus;
  receipt_data_hash?: string | null;
  validation_response?: any; // Store platform validation response
  items_granted: boolean;
  initiated_at: Date | string;
  validated_at?: Date | string | null;
  consumed_at?: Date | string | null;
  updated_at: Date | string;
}

export interface ValidateGooglePurchaseRequest {
  product_id: string; // The product ID being purchased
  purchase_token: string; // The purchase token from Google Play Billing
  order_id?: string; // Optional: Google Play Order ID (GPA.xxxx)
  // userId will come from authenticated request context
}

export interface ValidateApplePurchaseRequest {
  product_id: string;
  transaction_receipt: string; // The deprecated base64 encoded receipt (use JWS for modern iOS)
  original_transaction_id?: string; // For subscriptions/restoring non-consumables
  // userId from context
}

export interface PurchaseValidationResponse {
  success: boolean;
  message: string;
  transaction_id?: string; // Internal purchase_transaction_id
  updated_wallet_balance?: { cash: number, bonus: number }; // Optional: new balance
  granted_items?: any; // Optional: details of items granted
}

// --- AdMob Rewarded Ad Claim ---
export interface ClaimAdRewardRequest {
    ad_network: 'admob'; // Could be enum if supporting more
    reward_type: 'coins' | 'wheel_spin' | string; // e.g. 'specific_power_up_id'
    reward_amount: number;
    // Optional: server-side verification token from AdMob if available/used
    verification_payload?: string;
    // userId from context
}

export interface ClaimAdRewardResponse {
    success: boolean;
    message: string;
    granted_reward?: { type: string, amount: number };
    updated_wallet_balance?: { cash: number, bonus: number };
    updated_available_spins?: number;
}

export interface CreditRequestBody {
  amount: number; // Total amount to credit
  credit_to_cash?: number; // Amount to credit to cash_balance
  credit_to_bonus?: number; // Amount to credit to bonus_balance
  type?: Extract<TransactionType, 'payout' | 'bonus_credit' | 'refund' | 'deposit'>; // Specific type of credit
  internal_reference_id?: string;
  description?: string;
}
