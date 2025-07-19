import { getGameLeaderboard } from '../controllers/leaderboardController';

export const leaderboardRoutes = {
  get_leaderboard_by_game: (req: any, res: any) => getGameLeaderboard(req, res), // GET /leaderboards/:gameId
};
