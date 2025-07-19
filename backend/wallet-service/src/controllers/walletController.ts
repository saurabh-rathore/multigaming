import { WalletService } from '../services/walletService';
import { DepositRequestBody, WithdrawalRequestBody, DebitRequestBody, CreditRequestBody } from '../types/wallet.types';

type Request = any; // { params: { userId: string }, body: any, query: any }
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
