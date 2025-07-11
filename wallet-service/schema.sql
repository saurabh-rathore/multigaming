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

-- In-App Purchase Products table
-- Defines the virtual products available for purchase.
CREATE TABLE iap_products (
    product_id VARCHAR(255) PRIMARY KEY,       -- Matches product ID in Google Play Store / Apple App Store
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_type VARCHAR(50) NOT NULL DEFAULT 'consumable' CHECK (product_type IN ('consumable', 'non_consumable', 'subscription')),

    coins_awarded INT DEFAULT 0,                -- Number of virtual coins awarded upon purchase
    items_awarded JSON,                         -- e.g., {"power_ups": ["shield_x1", "skip_turn_x1"], "avatar_items": ["cool_hat_id"]}

    price_tier_reference VARCHAR(100),          -- Optional: Reference to a price tier (e.g., "tier_1", "tier_5_usd")
                                                -- Actual price is managed in platform stores.
    is_active BOOLEAN DEFAULT TRUE,             -- Whether this product is currently available for purchase

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_iap_products_active_type ON iap_products(is_active, product_type);


-- Purchase Transactions table
-- Records IAP transactions and their validation status.
CREATE TABLE purchase_transactions (
    purchase_transaction_id VARCHAR(255) PRIMARY KEY, -- Internal unique ID for this record
    user_id VARCHAR(255) NOT NULL,
    wallet_id VARCHAR(255) NOT NULL,           -- Wallet to credit upon successful validation
    product_id VARCHAR(255) NOT NULL,          -- FK to iap_products.product_id

    platform VARCHAR(10) NOT NULL CHECK (platform IN ('google', 'apple', 'unknown')), -- 'google' for Play Store, 'apple' for App Store
    platform_order_id VARCHAR(255) UNIQUE,     -- Original orderId from Google Play (GPA.xxxx-xxxx-xxxx-xxxxx) or originalTransactionIdentifier from Apple
    platform_purchase_token TEXT,              -- purchaseToken from Google Play, or transactionReceipt (deprecated) / JWS from Apple (for validation)

    status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (status IN (
        'initiated',        -- Purchase initiated by client, server record created before validation
        'pending_validation',-- Sent to platform for validation
        'validated',        -- Successfully validated by platform, items/currency granted
        'consumed',         -- For consumable items, acknowledged with platform after granting
        'failed_validation',
        'refunded',         -- If platform indicates a refund
        'expired'           -- If purchase token/receipt expires before validation
    )),

    receipt_data_hash VARCHAR(255),            -- Optional: Hash of the receipt_data to detect duplicates if full receipt is too large or sensitive for direct storage
    validation_response JSON,                  -- Store response from Google/Apple validation for audit

    items_granted BOOLEAN DEFAULT FALSE,       -- Flag to ensure items/currency are granted only once

    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When this record was created (client reports purchase)
    validated_at TIMESTAMP NULL,               -- When platform validation was successful
    consumed_at TIMESTAMP NULL,                -- When consumable was marked as consumed with platform
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (product_id) REFERENCES iap_products(product_id)
    -- Conceptual FK for user_id
);

CREATE INDEX idx_purchase_transactions_user_id ON purchase_transactions(user_id);
CREATE INDEX idx_purchase_transactions_status ON purchase_transactions(status);
CREATE INDEX idx_purchase_transactions_platform_order_id ON purchase_transactions(platform_order_id);
CREATE INDEX idx_purchase_transactions_product_id ON purchase_transactions(product_id);
