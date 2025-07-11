import { WalletService } from '../services/walletService';
import {
    DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody,
    ValidateGooglePurchaseRequest, ValidateApplePurchaseRequest, ClaimAdRewardRequest
} from '../types/wallet.types';

// Assume req.user.id is populated by auth middleware for endpoints needing the current user's ID
type Request = any; // { params: { userId?: string }, body: any, query: any, user?: { id: string } }
type Response = any;

const walletService = new WalletService();

export const getWalletByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
    const wallet = await walletService.getOrCreateWallet(userId);
    return { statusCode: 200, body: wallet };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const depositFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    const data: DepositRequestBody = req.body;
    if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
    if (!data.amount || data.amount <= 0) return { statusCode: 400, body: { message: 'Invalid deposit amount.'}};

    const result = await walletService.deposit(userId, data);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    return { statusCode: error.message.includes('Insufficient') ? 400 : 500, body: { message: error.message } };
  }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    const data: WithdrawalRequestBody = req.body;
     if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
    if (!data.amount || data.amount <= 0) return { statusCode: 400, body: { message: 'Invalid withdrawal amount.'}};

    const result = await walletService.withdraw(userId, data);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    return { statusCode: error.message.includes('Insufficient') ? 400 : 500, body: { message: error.message } };
  }
};

export const debitAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    const data: DebitRequestBody = req.body;
    if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
    if (!data.amount || data.amount <= 0) return { statusCode: 400, body: { message: 'Invalid debit amount.'}};
    if (data.cash_amount_to_use < 0 || data.bonus_amount_to_use < 0) return { statusCode: 400, body: { message: 'Cash/Bonus amounts to use cannot be negative.'}};
    if (data.cash_amount_to_use + data.bonus_amount_to_use !== data.amount) return { statusCode: 400, body: { message: 'Sum of cash and bonus amounts must equal total debit amount.'}};


    const result = await walletService.genericDebit(userId, data);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    return { statusCode: error.message.includes('Insufficient') || error.message.includes('Sum of cash') ? 400 : 500, body: { message: error.message } };
  }
};

export const creditAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    const data: CreditRequestBody = req.body;
    if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
    if (!data.amount || data.amount <= 0) return { statusCode: 400, body: { message: 'Invalid credit amount.'}};
    const creditToCash = data.credit_to_cash || 0;
    const creditToBonus = data.credit_to_bonus || 0;
    if (creditToCash < 0 || creditToBonus < 0) return { statusCode: 400, body: { message: 'Credit amounts cannot be negative.'}};
    if (creditToCash + creditToBonus !== data.amount) return { statusCode: 400, body: { message: 'Sum of cash and bonus credit amounts must equal total credit amount.'}};

    const result = await walletService.genericCredit(userId, data);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    return { statusCode: error.message.includes('Sum of cash') ? 400 : 500, body: { message: error.message } };
  }
};

export const getTransactionsForUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId;
        if (!userId) return { statusCode: 400, body: { message: 'User ID is required.' } };
        // const limit = parseInt(req.query?.limit || '20', 10); // Conceptual: query params
        // const offset = parseInt(req.query?.offset || '0', 10);
        const transactions = await walletService.getTransactions(userId); // Add limit/offset later if needed
        return { statusCode: 200, body: transactions };
    } catch (error: any) {
        return { statusCode: 500, body: { message: error.message } };
    }
};

// --- IAP and Ad Reward Controllers ---

export const listIAPProductsController = async (req: Request, res: Response) => {
    try {
        const products = await walletService.listIAPProducts();
        return { statusCode: 200, body: products };
    } catch (error: any) {
        console.error('[WalletController] ListIAPProducts error:', error.message);
        return { statusCode: 500, body: { message: 'Failed to retrieve IAP products.' } };
    }
};

export const validateGooglePurchaseController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id; // Authenticated user making the purchase
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

        const { product_id, purchase_token, order_id } = req.body as ValidateGooglePurchaseRequest;
        if (!product_id || !purchase_token) {
            return { statusCode: 400, body: { message: 'product_id and purchase_token are required.' }};
        }
        const result = await walletService.validateGooglePlayPurchase(userId, product_id, purchase_token, order_id);
        return { statusCode: result.success ? 200 : 400, body: result };
    } catch (error: any) {
        console.error('[WalletController] ValidateGooglePurchase error:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message } };
    }
};

export const validateApplePurchaseController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

        const { product_id, transaction_receipt, original_transaction_id } = req.body as ValidateApplePurchaseRequest;
         if (!product_id || !transaction_receipt) {
            return { statusCode: 400, body: { message: 'product_id and transaction_receipt are required.' }};
        }
        const result = await walletService.validateAppleAppStorePurchase(userId, product_id, transaction_receipt, original_transaction_id);
        return { statusCode: result.success ? 200 : 400, body: result };
    } catch (error: any) {
        console.error('[WalletController] ValidateApplePurchase error:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message } };
    }
};

export const claimAdRewardController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

        const { ad_network, reward_type, reward_amount, verification_payload } = req.body as ClaimAdRewardRequest;
        if (!ad_network || !reward_type || reward_amount === undefined || reward_amount <=0) {
            return { statusCode: 400, body: { message: 'ad_network, reward_type, and a positive reward_amount are required.' }};
        }
        if (ad_network !== 'admob') { // Example if only admob supported for now
            return { statusCode: 400, body: { message: 'Unsupported ad network.' }};
        }

        const result = await walletService.claimAdReward(userId, ad_network, reward_type, reward_amount, verification_payload);
        return { statusCode: result.success ? 200 : 400, body: result };
    } catch (error: any) {
        console.error('[WalletController] ClaimAdReward error:', error.message);
        return { statusCode: 500, body: { message: error.message } };
    }
};

// Conceptual endpoint for seeding IAP products (dev/admin only)
export const seedIAPProductsController = async (req: Request, res: Response) => {
    try {
        // TODO: Add admin role check here via middleware if this were a real endpoint
        await walletService.__seedIAPProducts();
        return { statusCode: 200, body: { message: "IAP products seeded conceptually."}};
    } catch (error: any) {
        console.error('[WalletController] SeedIAPProducts error:', error.message);
        return { statusCode: 500, body: { message: error.message }};
    }
};
