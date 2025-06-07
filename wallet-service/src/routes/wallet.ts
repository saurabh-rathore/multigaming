import { getWalletByUserId, depositFunds, withdrawFunds, debitAccount, creditAccount, getTransactionsForUser } from '../controllers/walletController';

export const walletRoutes = {
  get_wallet: (req: any, res: any) => getWalletByUserId(req, res),    // GET /wallets/user/:userId
  post_deposit: (req: any, res: any) => depositFunds(req, res),      // POST /wallets/user/:userId/deposit
  post_withdraw: (req: any, res: any) => withdrawFunds(req, res),    // POST /wallets/user/:userId/withdraw
  post_debit: (req: any, res: any) => debitAccount(req, res),        // POST /wallets/user/:userId/debit
  post_credit: (req: any, res: any) => creditAccount(req, res),       // POST /wallets/user/:userId/credit
  get_transactions: (req: any, res: any) => getTransactionsForUser(req, res) // GET /wallets/user/:userId/transactions
};
