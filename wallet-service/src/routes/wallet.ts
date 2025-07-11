import * as ctrl from '../controllers/walletController'; // Using ctrl alias

// Placeholder for Express Router and middleware
// import { Router } from 'express';
// import { ensureAuthenticated } from './middleware/authMiddleware'; // Conceptual
// const router = Router();

// All routes requiring a specific user context (like :userId in path or req.user.id from JWT)
// should ideally be protected by `ensureAuthenticated` middleware.
export const walletRoutes = {
  // Core Wallet Operations
  get_wallet: ctrl.getWalletByUserId,         // GET /wallets/user/:userId
  post_deposit: ctrl.depositFunds,           // POST /wallets/user/:userId/deposit (might be internal if deposits are via IAP/gateways)
  post_withdraw: ctrl.withdrawFunds,         // POST /wallets/user/:userId/withdraw
  post_debit: ctrl.debitAccount,             // POST /wallets/user/:userId/debit (e.g., for game entry fees)
  post_credit: ctrl.creditAccount,           // POST /wallets/user/:userId/credit (e.g., for game winnings)
  get_transactions: ctrl.getTransactionsForUser, // GET /wallets/user/:userId/transactions

  // --- IAP and Ad Reward Routes ---
  // These endpoints would be called by the client after interacting with the respective platform SDKs (Google/Apple IAP, AdMob).
  // They require the user to be authenticated (req.user.id would be used).

  // GET /wallets/iap/products - List available IAP products
  get_iap_products: ctrl.listIAPProductsController,

  // POST /wallets/iap/google/validate - Validate a Google Play purchase
  post_validate_google_purchase: ctrl.validateGooglePurchaseController,

  // POST /wallets/iap/apple/validate - Validate an Apple App Store purchase
  post_validate_apple_purchase: ctrl.validateApplePurchaseController,

  // POST /wallets/rewards/claim-ad - User claims a reward after watching a rewarded ad
  post_claim_ad_reward: ctrl.claimAdRewardController,

  // Conceptual Admin/Dev endpoint for seeding
  post_seed_iap_products: ctrl.seedIAPProductsController  // POST /dev/seed-iap-products (ensureAdmin)
};

// Example Express Router mapping:
// router.get('/user/:userId', ensureAuthenticated, ctrl.getWalletByUserId);
// router.post('/user/:userId/deposit', ensureAuthenticated, ctrl.depositFunds); // Or ensureAdmin/ensureService for system deposits
// router.post('/user/:userId/withdraw', ensureAuthenticated, ctrl.withdrawFunds);
// router.post('/user/:userId/debit', ensureAuthenticated, ctrl.debitAccount);
// router.post('/user/:userId/credit', ensureAuthenticated, ctrl.creditAccount);
// router.get('/user/:userId/transactions', ensureAuthenticated, ctrl.getTransactionsForUser);

// router.get('/iap/products', ensureAuthenticated, ctrl.listIAPProductsController);
// router.post('/iap/google/validate', ensureAuthenticated, ctrl.validateGooglePurchaseController);
// router.post('/iap/apple/validate', ensureAuthenticated, ctrl.validateApplePurchaseController);
// router.post('/rewards/claim-ad', ensureAuthenticated, ctrl.claimAdRewardController);

// router.post('/dev/seed-iap-products', ensureAdmin, ctrl.seedIAPProductsController); // Admin only
//
// export default router;
