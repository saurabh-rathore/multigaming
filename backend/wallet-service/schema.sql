-- Database schema for Wallet-Service

-- Wallets table
-- Stores user wallet balances (cash and bonus).
CREATE TABLE wallets (
    wallet_id VARCHAR(255) PRIMARY KEY,         -- Unique identifier for the wallet
    user_id VARCHAR(255) NOT NULL UNIQUE,       -- Foreign key referencing the users.id from Auth-Service (logical link)
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Real money balance
    bonus_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Bonus money balance
    currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- ISO 4217 currency code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT check_cash_balance_non_negative CHECK (cash_balance >= 0),
    CONSTRAINT check_bonus_balance_non_negative CHECK (bonus_balance >= 0)
);

-- Transactions table
-- Records all movements of funds into, out of, or within wallets.
CREATE TABLE transactions (
    transaction_id VARCHAR(255) PRIMARY KEY,   -- Unique identifier for the transaction
    wallet_id VARCHAR(255) NOT NULL,           -- Foreign key referencing the wallets table

    type VARCHAR(50) NOT NULL CHECK (type IN (
        'deposit',      -- Money added from an external source
        'withdrawal',   -- Money removed to an external source
        'wager',        -- Bet placed in a game (can be cash or bonus)
        'payout',       -- Winnings from a game
        'bonus_credit', -- Bonus money awarded
        'bonus_debit',  -- Bonus money utilized or expired
        'refund',       -- Money returned to the user (e.g., cancelled game)
        'internal_transfer' -- e.g. cash to bonus, or game specific wallet if any
    )),

    amount DECIMAL(15, 2) NOT NULL,            -- The amount of the transaction. Positive for credits to wallet, could be negative for debits or always positive with logic handling debit/credit.
                                               -- For simplicity, let's assume amount is always positive and 'type' dictates flow.

    cash_amount_used DECIMAL(15,2) DEFAULT 0.00, -- Portion of 'amount' from cash_balance (for wager, withdrawal)
    bonus_amount_used DECIMAL(15,2) DEFAULT 0.00, -- Portion of 'amount' from bonus_balance (for wager)

    external_payment_id VARCHAR(255),          -- ID from an external payment gateway for deposits/withdrawals
    internal_reference_id VARCHAR(255),        -- ID for internal references (e.g., game_id, tournament_id, promo_id)

    description TEXT,                          -- User-friendly description of the transaction

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Transaction initiated, awaiting processing/confirmation
        'processing',   -- Transaction is actively being processed
        'completed',    -- Transaction successfully finished
        'failed',       -- Transaction did not complete successfully
        'cancelled',    -- Transaction was cancelled by user or system
        'reverted'      -- Transaction was completed but then undone (e.g. chargeback)
    )),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- CONSTRAINT fk_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) -- Conceptual, if in same DB
    CONSTRAINT check_transaction_amount_positive CHECK (amount > 0) -- Amount should always be positive
);

-- Indexes for performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_external_payment_id ON transactions(external_payment_id);
CREATE INDEX idx_transactions_internal_reference_id ON transactions(internal_reference_id);
