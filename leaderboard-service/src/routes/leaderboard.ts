// Placeholder for Express Router.
// In a real app: import { Router } from 'express'; const router = Router();
// import { ensureAuthenticated, ensureServiceToken } // Conceptual middleware

import {
  getGlobalLeaderboardController,
  getFriendLeaderboardController,
  updateUserStatsController
} from '../controllers/leaderboardController';

// These would be Express routes.
// Auth middleware (ensureAuthenticated) would be used for routes requiring a logged-in user.
// Service-to-service auth (ensureServiceToken) for internal endpoints like stats updates.
export const leaderboardRoutes = {
  // GET /leaderboards/global/:gameId?metric=wins&limit=50&offset=0
  get_global_leaderboard: (req: any, res: any) => getGlobalLeaderboardController(req, res),

  // GET /leaderboards/friends/:gameId?metric=rating&limit=25
  // Requires user authentication to identify the current user and their friends.
  get_friend_leaderboard: (req: any, res: any) => getFriendLeaderboardController(req, res),

  // POST /leaderboards/stats/users/:userId
  // Internal endpoint for game-engine-service to update a user's stats after a game.
  // Requires service-to-service authentication.
  post_update_user_stats: (req: any, res: any) => updateUserStatsController(req, res),
};


// Example with Express router:
// const router = Router();
//
// router.get('/global/:gameId', getGlobalLeaderboardController);
// router.get('/friends/:gameId', ensureAuthenticated, getFriendLeaderboardController); // Requires user auth
//
// router.post('/stats/users/:userId', ensureServiceToken, updateUserStatsController); // Requires service auth
//
// export default router;
