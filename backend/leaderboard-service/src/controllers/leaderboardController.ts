import { LeaderboardService } from '../services/leaderboardService';
import { Timeframe, GetLeaderboardRequestQuery } from '../types/leaderboard.types';

type Request = any; // { params: { gameId: string }, query: GetLeaderboardRequestQuery }
type Response = any;

const leaderboardService = new LeaderboardService();

export const getGameLeaderboard = async (req: Request, res: Response) => {
  try {
    const gameId = req.params?.gameId;
    if (!gameId) {
      return { statusCode: 400, body: { message: 'Game ID parameter is required.' } };
    }

    const queryParams = req.query as GetLeaderboardRequestQuery;
    const timeframe = queryParams.timeframe || 'allTime';
    const limit = queryParams.limit ? parseInt(String(queryParams.limit), 10) : 100;

    if (isNaN(limit) || limit <= 0) {
        return { statusCode: 400, body: { message: 'Invalid limit parameter.'}};
    }
    // Validate timeframe if necessary (e.g. against Timeframe type values)

    const leaderboard = await leaderboardService.getLeaderboard(gameId, timeframe, limit);

    if (!leaderboard) { // Should return empty leaderboard, but defensive check
        return { statusCode: 404, body: { message: `No leaderboard data found for game ${gameId}.`}};
    }

    return { statusCode: 200, body: leaderboard };
  } catch (error: any) {
    console.error('[LeaderboardController] Error fetching leaderboard:', error.message, error.stack);
    return { statusCode: 500, body: { message: 'Failed to retrieve leaderboard.' } };
  }
};
