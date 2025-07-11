import { LeaderboardService } from '../services/leaderboardService';
import {
    GetLeaderboardQuery,
    UpdateUserStatsBody,
    UpdateUserStatsResponse,
    LeaderboardEntry
} from '../types/leaderboard.types';

// Placeholder for Express request/response types
// import { Request, Response } from 'express';
type MockRequest = any; // e.g. { params: { gameId?: string, userId?: string }, query: any, body: any, user?: { id: string } }
type MockResponse = any;

const leaderboardService = new LeaderboardService();

export const getGlobalLeaderboardController = async (req: MockRequest, res: MockResponse) => {
  try {
    const gameId = req.params?.gameId;
    if (!gameId) {
      return { statusCode: 400, body: { message: 'Game ID parameter is required.' } };
    }

    const queryParams: GetLeaderboardQuery = {
        metric: req.query?.metric || 'rating', // Default to rating
        limit: req.query?.limit ? parseInt(String(req.query.limit), 10) : 25,
        offset: req.query?.offset ? parseInt(String(req.query.offset), 10) : 0,
    };

    if (isNaN(queryParams.limit!) || queryParams.limit! <= 0) {
        return { statusCode: 400, body: { message: 'Invalid limit parameter.'}};
    }
    if (isNaN(queryParams.offset!) || queryParams.offset! < 0) {
        return { statusCode: 400, body: { message: 'Invalid offset parameter.'}};
    }

    const leaderboard: LeaderboardEntry[] = await leaderboardService.getGlobalLeaderboard(gameId, queryParams);
    return { statusCode: 200, body: leaderboard };

  } catch (error: any) {
    console.error('[LeaderboardController] Error fetching global leaderboard:', error.message, error.stack);
    return { statusCode: 500, body: { message: 'Failed to retrieve global leaderboard.' } };
  }
};

export const getFriendLeaderboardController = async (req: MockRequest, res: MockResponse) => {
  try {
    const gameId = req.params?.gameId;
    // Assuming current user's ID is available from JWT auth middleware (e.g., req.user.id)
    const currentUserId = req.user?.id;

    if (!currentUserId) {
        return { statusCode: 401, body: { message: 'User not authenticated.' } };
    }
    if (!gameId) {
      return { statusCode: 400, body: { message: 'Game ID parameter is required.' } };
    }

    const queryParams: GetLeaderboardQuery = {
        metric: req.query?.metric || 'rating',
        limit: req.query?.limit ? parseInt(String(req.query.limit), 10) : 25,
        // Offset is not directly used in the service's friend leaderboard DB query logic for simplicity,
        // but could be applied to the final list if needed.
    };
     if (isNaN(queryParams.limit!) || queryParams.limit! <= 0) {
        return { statusCode: 400, body: { message: 'Invalid limit parameter.'}};
    }

    const leaderboard: LeaderboardEntry[] = await leaderboardService.getFriendLeaderboard(currentUserId, gameId, queryParams);
    return { statusCode: 200, body: leaderboard };

  } catch (error: any) {
    console.error('[LeaderboardController] Error fetching friend leaderboard:', error.message, error.stack);
    return { statusCode: 500, body: { message: 'Failed to retrieve friend leaderboard.' } };
  }
};

export const updateUserStatsController = async (req: MockRequest, res: MockResponse) => {
  // This endpoint should be protected and only callable by trusted services (e.g., game-engine-service)
  try {
    const userId = req.params?.userId; // Or from req.body if preferred for this internal API
    const statsData: UpdateUserStatsBody = req.body;

    if (!userId) {
        return { statusCode: 400, body: { message: 'User ID is required to update stats.' } };
    }
    if (!statsData.game_id || !statsData.outcome) {
        return { statusCode: 400, body: { message: 'Game ID and outcome are required in request body.' } };
    }

    const updatedStats = await leaderboardService.updateUserStats(userId, statsData);
    if (!updatedStats) {
        return { statusCode: 500, body: { message: 'Failed to update user stats or user not found.' } };
    }

    const response: UpdateUserStatsResponse = {
        message: 'User stats updated successfully.',
        updated_stats: updatedStats
    };
    return { statusCode: 200, body: response };

  } catch (error: any) {
    console.error('[LeaderboardController] Error updating user stats:', error.message, error.stack);
    return { statusCode: 500, body: { message: 'Failed to update user stats.' } };
  }
};
