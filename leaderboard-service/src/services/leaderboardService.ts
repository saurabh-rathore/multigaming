import {
  UserLeaderboardStat,
  LeaderboardEntry,
  UpdateUserStatsBody,
  GetLeaderboardQuery,
  ExternalUserProfile, // For fetching user details
  // MockGameResult // No longer using mock game results directly here
} from '../types/leaderboard.types';
import { generateId } from '../utils/helpers';
import pool from '../config/db.config'; // Assuming db.config.ts is set up for this service

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  affectedRows: number;
  insertId?: number | string;
  changedRows?: number;
}

// Placeholder for User Profile Service client/SDK
// In a real microservice architecture, this would be an HTTP client or gRPC client.
const userProfileServiceClient = {
  async getUserProfiles(userIds: string[]): Promise<ExternalUserProfile[]> {
    if (userIds.length === 0) return [];
    console.log(`[LeaderboardService-MockUserProfileClient] Fetching profiles for user IDs: ${userIds.join(', ')}`);
    // This is a MOCK implementation.
    // It should call the user-profile-service API e.g. GET /profiles?userIds=id1,id2,id3
    // For now, return mock data:
    return userIds.map(id => ({
      user_id: id,
      username: `User_${id.substring(0, 5)}`,
      avatar_url: `/assets/avatars/${id.substring(0,5)}.png` // Placeholder avatar
    }));
  },
  async getFriendIds(userId: string): Promise<string[]> {
    console.log(`[LeaderboardService-MockUserProfileClient] Fetching friend IDs for user: ${userId}`);
    // This is a MOCK implementation.
    // It should call user-profile-service API e.g. GET /profiles/:userId/friends
    // For now, return mock friend IDs:
    if (userId === 'userA') return ['userB', 'userC'];
    if (userId === 'userB') return ['userA'];
    return [];
  }
};


export class LeaderboardService {

  async updateUserStats(userId: string, data: UpdateUserStatsBody): Promise<UserLeaderboardStat | null> {
    console.log(`[LeaderboardService-DB] Updating stats for user: ${userId}, game: ${data.game_id}`);

    const { game_id, outcome, score } = data;
    const now = new Date();

    // Atomically update stats using INSERT ... ON DUPLICATE KEY UPDATE
    const sql = `
      INSERT INTO leaderboard_stats (user_id, game_id, total_wins, total_losses, total_draws, total_games_played, total_score, high_score, average_score, current_win_streak, longest_win_streak, rating, last_played_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1000, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        total_wins = total_wins + IF(VALUES(total_wins) > 0, 1, 0), -- Only increment if outcome was a win
        total_losses = total_losses + IF(VALUES(total_losses) > 0, 1, 0), -- Only increment if outcome was a loss
        total_draws = total_draws + IF(VALUES(total_draws) > 0, 1, 0), -- Only increment if outcome was a draw
        total_games_played = total_games_played + 1,
        total_score = total_score + VALUES(total_score),
        high_score = GREATEST(high_score, VALUES(high_score)),
        current_win_streak = IF(VALUES(total_wins) > 0, current_win_streak + 1, 0), -- If win, increment streak, else reset
        longest_win_streak = GREATEST(longest_win_streak, current_win_streak), -- current_win_streak here is the one *before* this game's update due to IF order
        average_score = (total_score + VALUES(total_score)) / (total_games_played + 1), -- Recalculate average
        rating = rating + CASE -- Simplified ELO-like adjustment
                      WHEN VALUES(total_wins) > 0 THEN 10  -- Win
                      WHEN VALUES(total_losses) > 0 THEN -10 -- Loss
                      ELSE 0 -- Draw or other
                   END,
        last_played_at = VALUES(last_played_at),
        updated_at = NOW();
    `;

    let initialWins = 0, initialLosses = 0, initialDraws = 0;
    if (outcome === 'win') initialWins = 1;
    else if (outcome === 'loss') initialLosses = 1;
    else if (outcome === 'draw') initialDraws = 1;

    const params = [
        userId, game_id,
        initialWins, initialLosses, initialDraws, // For VALUES() in wins/losses/draws on insert
        score || 0, // total_score (for insert and update)
        score || 0, // high_score (for insert and update)
        score || 0, // average_score (for insert, will be re-calculated on update)
        initialWins, // current_win_streak (for insert)
        initialWins, // longest_win_streak (for insert)
        now // last_played_at (for insert and update)
    ];

    try {
        const [result]: [OkPacket, any] = await pool.query(sql, params) as [OkPacket, any];
        if (result.affectedRows > 0 || result.changedRows > 0) {
            console.log(`[LeaderboardService-DB] Stats updated successfully for ${userId} in ${game_id}.`);
            // Fetch and return the updated stats
            const getStatsSql = 'SELECT * FROM leaderboard_stats WHERE user_id = ? AND game_id = ?';
            const [rows]: [UserLeaderboardStat[], any] = await pool.query(getStatsSql, [userId, game_id]) as [UserLeaderboardStat[], any];
            return rows.length > 0 ? rows[0] : null;
        }
        console.warn(`[LeaderboardService-DB] No rows affected while updating stats for ${userId} in ${game_id}. This might be an issue.`);
        return null;
    } catch (error: any) {
        console.error(`[LeaderboardService-DB] Error updating stats for ${userId}, ${game_id}: ${error.message}`);
        throw error;
    }
  }


  private async fetchAndEnrichLeaderboardEntries(rows: UserLeaderboardStat[], query: GetLeaderboardQuery): Promise<LeaderboardEntry[]> {
    if (rows.length === 0) return [];

    const userIds = rows.map(row => row.user_id);
    const userProfiles = await userProfileServiceClient.getUserProfiles(userIds);
    const profilesMap = new Map(userProfiles.map(p => [p.user_id, p]));

    return rows.map((row, index) => {
      const profile = profilesMap.get(row.user_id);
      let scoreValue = 0;
      switch (query.metric) {
          case 'rating': scoreValue = row.rating; break;
          case 'high_score': scoreValue = row.high_score; break;
          case 'total_score': scoreValue = row.total_score; break;
          case 'wins': default: scoreValue = row.total_wins; break;
      }
      return {
        rank: (query.offset || 0) + index + 1,
        user_id: row.user_id,
        username: profile?.username || 'Unknown User',
        avatar_url: profile?.avatar_url || '/assets/avatars/default.png',
        score: scoreValue, // The metric used for ranking
        games_played: row.total_games_played,
        wins: row.total_wins,
        rating: row.rating,
      };
    });
  }

  async getGlobalLeaderboard(gameId: string, query: GetLeaderboardQuery): Promise<LeaderboardEntry[]> {
    console.log(`[LeaderboardService-DB] Getting global leaderboard for game: ${gameId}, metric: ${query.metric}`);
    const limit = query.limit || 25;
    const offset = query.offset || 0;
    let orderByField = 'total_wins'; // Default metric

    switch (query.metric) {
      case 'rating': orderByField = 'rating'; break;
      case 'high_score': orderByField = 'high_score'; break;
      case 'total_score': orderByField = 'total_score'; break;
      case 'wins': default: orderByField = 'total_wins'; break;
    }

    const sql = `
      SELECT * FROM leaderboard_stats
      WHERE game_id = ?
      ORDER BY ${orderByField} DESC, last_played_at ASC -- last_played_at for tie-breaking (earlier play is better for same score)
      LIMIT ? OFFSET ?
    `;
    const [rows]: [UserLeaderboardStat[], any] = await pool.query(sql, [gameId, limit, offset]) as [UserLeaderboardStat[], any];

    return this.fetchAndEnrichLeaderboardEntries(rows, query);
  }

  async getFriendLeaderboard(currentUserId: string, gameId: string, query: GetLeaderboardQuery): Promise<LeaderboardEntry[]> {
    console.log(`[LeaderboardService-DB] Getting friend leaderboard for user: ${currentUserId}, game: ${gameId}, metric: ${query.metric}`);

    const friendIds = await userProfileServiceClient.getFriendIds(currentUserId);
    const allUserIdsForQuery = [currentUserId, ...friendIds];

    if (allUserIdsForQuery.length === 0) return []; // Should not happen if currentUserId is valid

    const limit = query.limit || 25; // Limit still applies to the final list
    // Offset is tricky for friend leaderboards if not all friends are returned.
    // For simplicity, we fetch all relevant friends and then slice.
    // A more optimized version might do pagination on the DB query with allUserIdsForQuery.

    let orderByField = 'total_wins';
    switch (query.metric) {
      case 'rating': orderByField = 'rating'; break;
      case 'high_score': orderByField = 'high_score'; break;
      case 'total_score': orderByField = 'total_score'; break;
      case 'wins': default: orderByField = 'total_wins'; break;
    }

    // Create a placeholder string for IN clause: (?, ?, ?, ...)
    const placeholders = allUserIdsForQuery.map(() => '?').join(',');

    const sql = `
      SELECT * FROM leaderboard_stats
      WHERE game_id = ? AND user_id IN (${placeholders})
      ORDER BY ${orderByField} DESC, last_played_at ASC
      LIMIT ?
      -- OFFSET ? Note: Offset is not used here because we rank after fetching all friends' stats
    `;
    // Parameters for the query. The user IDs must be at the end.
    const params = [gameId, ...allUserIdsForQuery, limit];

    const [rows]: [UserLeaderboardStat[], any] = await pool.query(sql, params) as [UserLeaderboardStat[], any];

    // Enrich and then re-rank based on the fetched subset.
    // Note: The ranking is relative to the friends fetched, not global.
    const enrichedEntries = await this.fetchAndEnrichLeaderboardEntries(rows, query);

    // Re-sort based on the primary metric because fetchAndEnrichLeaderboardEntries re-maps 'score'
    // and doesn't preserve the original DB sort perfectly if primary metric isn't just 'score'
     enrichedEntries.sort((a, b) => {
        let valA = 0, valB = 0;
        switch(query.metric) {
            case 'rating': valA = a.rating || 0; valB = b.rating || 0; break;
            case 'high_score':
            case 'total_score': // Assuming score field in LeaderboardEntry holds this value if it was the metric
            case 'wins':
            default: valA = a.score || 0; valB = b.score || 0; break; // score field is already mapped to the metric
        }
        if (valB !== valA) return valB - valA;
        // Add tie-breakers if necessary, e.g. games_played or original last_played_at from row
        return 0;
    });

    // Assign rank after sorting the enriched list
    return enrichedEntries.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
  }
}
