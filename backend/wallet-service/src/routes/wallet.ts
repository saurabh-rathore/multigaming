import { Router } from 'express';
import { getWalletByUserId, depositFunds, withdrawFunds, debitAccount, creditAccount, getTransactionsForUser } from '../controllers/walletController';

const router = Router();

router.get('/user/:userId', getWalletByUserId);
router.post('/user/:userId/deposit', depositFunds);
router.post('/user/:userId/withdraw', withdrawFunds);
router.post('/user/:userId/debit', debitAccount);
router.post('/user/:userId/credit', creditAccount);
router.get('/user/:userId/transactions', getTransactionsForUser);

export default router;
