// Placeholder for Express Router.
// In a real app: import { Router } from 'express'; const router = Router();
import {
  getUserProfile,
  updateUserProfile,
  updateUserKyc,
  getFullUserProfile,
  listUserBadgesController,
  listAllBadgesController,
  grantBadgeToUserController,
  addGameHistoryEntryController,
  listGameHistoryController,
  recordLoginController,
  getDailyRewardStatusController,
  claimDailyRewardController,
  getWheelSpinStatusController,
  performWheelSpinController,
  seedRewardsDataController
} from '../controllers/profileController';

// These would be Express routes. The :userId param corresponds to req.params.userId in controllers.
// `ensureAuthenticated` would be JWT middleware checking for a valid user token.
// `ensureServiceOrAdmin` for internal/admin routes.
// Some routes might need authentication middleware (e.g., ensureAuthenticated).
export const profileRoutes = {
  // Basic Profile
  get_profile_by_id: (req: any, res: any) => getUserProfile(req, res),        // GET /profiles/:userId
  put_profile_by_id: (req: any, res: any) => updateUserProfile(req, res),    // PUT /profiles/:userId
  // Enriched Profile
  get_full_profile_by_id: (req: any, res: any) => getFullUserProfile(req, res), // GET /profiles/:userId/full

  // KYC (Example, might be admin controlled or specific flow)
  put_user_kyc: (req: any, res: any) => updateUserKyc(req, res),              // PUT /profiles/:userId/kyc (assuming PUT for update)

  // Badges
  get_all_badges: (req: any, res: any) => listAllBadgesController(req, res),      // GET /badges (list all defined badges)
  get_user_badges: (req: any, res: any) => listUserBadgesController(req, res),   // GET /profiles/:userId/badges
  post_grant_user_badge: (req: any, res: any) => grantBadgeToUserController(req, res), // POST /profiles/:userId/badges (grant a badge)

  // Game History
  get_user_game_history: (req: any, res: any) => listGameHistoryController(req, res),     // GET /profiles/:userId/history (ensureAuthenticated)
  post_user_game_history: (req: any, res: any) => addGameHistoryEntryController(req, res), // POST /profiles/:userId/history (ensureServiceOrAdmin)

  // Daily Rewards & Engagement
  post_record_login: (req: any, res: any) => recordLoginController(req, res),             // POST /profiles/:userId/record-login (ensureService: called by auth-service)
  get_daily_reward_status: (req: any, res: any) => getDailyRewardStatusController(req, res), // GET /profiles/:userId/daily-reward (ensureAuthenticated)
  post_claim_daily_reward: (req: any, res: any) => claimDailyRewardController(req, res),   // POST /profiles/:userId/daily-reward/claim (ensureAuthenticated)
  get_wheel_spin_status: (req: any, res: any) => getWheelSpinStatusController(req, res),   // GET /profiles/:userId/wheel-spin (ensureAuthenticated)
  post_perform_wheel_spin: (req: any, res: any) => performWheelSpinController(req, res), // POST /profiles/:userId/wheel-spin/perform (ensureAuthenticated)

  // Conceptual Admin/Dev endpoint for seeding
  post_seed_rewards: (req: any, res: any) => seedRewardsDataController(req, res)          // POST /dev/seed-rewards (ensureAdmin)
};

// Example with Express router:
// const router = Router();
// router.get('/profiles/:userId', getUserProfile); // Assuming controller adapted for Express req/res
// router.put('/profiles/:userId', ensureAuthenticated, updateUserProfile); // ensureAuthenticated is conceptual auth middleware
// router.get('/profiles/:userId/full', ensureAuthenticated, getFullUserProfile);
//
// router.get('/badges', listAllBadgesController);
// router.get('/profiles/:userId/badges', ensureAuthenticated, listUserBadgesController);
// router.post('/profiles/:userId/badges', ensureAdmin, grantBadgeToUserController); // ensureAdmin for restricted
//
// router.get('/profiles/:userId/history', ensureAuthenticated, listGameHistoryController);
// router.post('/profiles/:userId/history', ensureServiceOrAdmin, addGameHistoryEntryController); // ensureServiceOrAdmin for restricted
//
// export default router;
