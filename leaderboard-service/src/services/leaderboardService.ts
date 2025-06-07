import {
  Leaderboard, LeaderboardEntry, Timeframe, MockGameResult
} from '../types/leaderboard.types';
import { getStartDateForTimeframe, generateId } from '../utils/helpers';

// Mock Game Results Data - Simulating data from GameEngineService
// Ensure 'recorded_at' covers different timeframes for testing
const now = new Date();
const yesterday = new Date(new Date().setDate(now.getDate() - 1));
const threeDaysAgo = new Date(new Date().setDate(now.getDate() - 3));
const lastWeek = new Date(new Date().setDate(now.getDate() - 7));
const lastMonth = new Date(new Date().setDate(now.getDate() - 30));

const mockGameResults: MockGameResult[] = [
  // Game 1: Ludo
  { result_id: 'res_ludo1', game_id: 'ludo_masters_game_id', room_id: 'room1', user_id: 'userA', score: 100, rank: 1, winnings: 50, recorded_at: now },
  { result_id: 'res_ludo2', game_id: 'ludo_masters_game_id', room_id: 'room2', user_id: 'userB', score: 120, rank: 1, winnings: 60, recorded_at: now },
  { result_id: 'res_ludo3', game_id: 'ludo_masters_game_id', room_id: 'room3', user_id: 'userA', score: 80, rank: 2, winnings: 0, recorded_at: yesterday },
  { result_id: 'res_ludo4', game_id: 'ludo_masters_game_id', room_id: 'room4', user_id: 'userC', score: 150, rank: 1, winnings: 75, recorded_at: threeDaysAgo },
  { result_id: 'res_ludo5', game_id: 'ludo_masters_game_id', room_id: 'room5', user_id: 'userB', score: 90, rank: 2, winnings: 0, recorded_at: lastWeek },
  { result_id: 'res_ludo6', game_id: 'ludo_masters_game_id', room_id: 'room6', user_id: 'userA', score: 110, rank: 1, winnings: 55, recorded_at: lastMonth },

  // Game 2: Rummy
  { result_id: 'res_rummy1', game_id: 'rummy_royale_game_id', room_id: 'room7', user_id: 'userB', score: 200, rank: 1, winnings: 100, recorded_at: now },
  { result_id: 'res_rummy2', game_id: 'rummy_royale_game_id', room_id: 'room8', user_id: 'userC', score: 180, rank: 2, winnings: 0, recorded_at: yesterday },
  { result_id: 'res_rummy3', game_id: 'rummy_royale_game_id', room_id: 'room9', user_id: 'userB', score: 220, rank: 1, winnings: 110, recorded_at: lastWeek },
];

// Mock Game Names (denormalized)
const mockGameNames: { [gameId: string]: string } = {
  'ludo_masters_game_id': 'Ludo Masters',
  'rummy_royale_game_id': 'Rummy Royale',
};


export class LeaderboardService {
  async getLeaderboard(
    gameId: string,
    timeframe: Timeframe = 'allTime',
    limit: number = 100
  ): Promise<Leaderboard | null> {
    console.log(`[LeaderboardService] Generating leaderboard for game ${gameId}, timeframe ${timeframe}, limit ${limit}`);

    const gameName = mockGameNames[gameId] || 'Unknown Game';
    const timeframeStartDate = getStartDateForTimeframe(timeframe);

    // 1. Filter results by gameId and timeframe
    const relevantResults = mockGameResults.filter(result =>
      result.game_id === gameId && result.recorded_at >= timeframeStartDate
    );

    if (relevantResults.length === 0) {
      // Return an empty leaderboard if no relevant results
      return {
        leaderboardId: generateId(`lb_${gameId}_${timeframe}`),
        gameId,
        gameName,
        timeframe,
        entries: [],
        generatedAt: new Date(),
      };
    }

    // 2. Aggregate data per user
    const userAggregates: { [userId: string]: { totalScore: number, gamesPlayed: number, totalWinnings: number, lastPlayedAt: Date, wins: number } } = {};

    for (const result of relevantResults) {
      if (!userAggregates[result.user_id]) {
        userAggregates[result.user_id] = { totalScore: 0, gamesPlayed: 0, totalWinnings: 0, lastPlayedAt: new Date(0), wins: 0 };
      }
      const userStat = userAggregates[result.user_id];
      userStat.totalScore += result.score;
      userStat.gamesPlayed += 1;
      userStat.totalWinnings += (result.winnings || 0);
      if (result.recorded_at > userStat.lastPlayedAt) {
        userStat.lastPlayedAt = result.recorded_at;
      }
      if (result.rank === 1) { // Assuming rank 1 means a win
          userStat.wins +=1;
      }
    }

    // 3. Create LeaderboardEntry objects
    let leaderboardEntries: Omit<LeaderboardEntry, 'rank'>[] = Object.entries(userAggregates).map(([userId, stats]) => ({
      userId,
      score: stats.totalScore, // Using total score for ranking by default
      gamesPlayed: stats.gamesPlayed,
      totalWinnings: stats.totalWinnings,
      wins: stats.wins,
      lastPlayedAt: stats.lastPlayedAt,
      // displayName would be fetched from a UserProfile service in a real system
      displayName: userId, // Placeholder
    }));

    // 4. Rank users (e.g., by totalScore descending, then by lastPlayedAt ascending for tie-breaking)
    leaderboardEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Primary: Higher score first
      }
      // Secondary: more games played is better (optional tie-breaker)
      if (b.gamesPlayed !== a.gamesPlayed) {
          return b.gamesPlayed - a.gamesPlayed;
      }
      // Tertiary: earlier lastPlayedAt for same score and games played (less common, or could be latest)
      return (a.lastPlayedAt?.getTime() || 0) - (b.lastPlayedAt?.getTime() || 0);
    });

    // Assign ranks and apply limit
    const finalEntries: LeaderboardEntry[] = leaderboardEntries
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1, // 1-based ranking
      }));

    const leaderboardId = generateId(`lb_${gameId}_${timeframe}`);
    return {
      leaderboardId,
      gameId,
      gameName,
      timeframe,
      entries: finalEntries,
      generatedAt: new Date(),
    };
  }
}
