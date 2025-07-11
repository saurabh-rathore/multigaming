import {
  AdminUserView, AdminGameView, AdminAuditLogEntry,
  BanUserRequestBody, ToggleGameActiveRequestBody,
  DashboardData, ActiveUserSnapshot, MatchStatistics, GameActivityStat, SatisfactionFeedbackSummary,
  // Conceptual types for other services' data if we were actually fetching it
  // GameResult, ChatMessage
} from '../types/admin.types';
import { generateId, convertToCsv } from '../utils/helpers'; // Added convertToCsv
import pool from '../config/db.config';

// --- Mock Data Store ---
// Simulates data that would be fetched from other microservices
const mockAdminUsers: AdminUserView[] = [
  { userId: 'userA_auth_id', email: 'usera@example.com', phone: '1234567890', auth_status: 'active', firstName: 'Test', lastName: 'UserA', username: 'usera', kycStatus: 'verified', createdAt: new Date(Date.now() - 100000000), lastLoginAt: new Date() },
  { userId: 'userB_auth_id', email: 'userb@example.com', phone: '0987654321', auth_status: 'pending_verification', firstName: 'Another', lastName: 'UserB', username: 'userb', kycStatus: 'pending_verification', createdAt: new Date(Date.now() - 50000000) },
  { userId: 'userC_auth_id', email: 'userc@example.com', phone: '1122334455', auth_status: 'suspended', firstName: 'Suspended', lastName: 'UserC', username: 'userc', kycStatus: 'verified', createdAt: new Date(Date.now() - 200000000) },
];

const mockAdminGames: AdminGameView[] = [
  { gameId: 'ludo_masters_game_id', name: 'Ludo Masters', description: 'Classic Ludo', genre: 'Board', minPlayers: 2, maxPlayers: 4, isActive: true, createdAt: new Date(Date.now() - 10000000), stakeOptions: [{amount:10},{amount:50}] },
  { gameId: 'rummy_royale_game_id', name: 'Rummy Royale', description: 'Indian Rummy', genre: 'Card', minPlayers: 2, maxPlayers: 5, isActive: true, createdAt: new Date(Date.now() - 20000000), stakeOptions: [{amount:25},{amount:100}] },
  { gameId: 'inactive_puzzle_game_id', name: 'Puzzle Blocks', description: 'Inactive Puzzle', genre: 'Puzzle', minPlayers: 1, maxPlayers: 1, isActive: false, createdAt: new Date(Date.now() - 5000000) },
];

const mockAdminAuditLogs: AdminAuditLogEntry[] = [];

// --- AdminService Class ---
export class AdminService {

  async getUsers(limit: number = 20, offset: number = 0): Promise<AdminUserView[]> {
    console.log('[AdminService] Fetching users (mocked).');
    // Simulate pagination
    return mockAdminUsers.slice(offset, offset + limit);
  }

  async getGames(limit: number = 20, offset: number = 0): Promise<AdminGameView[]> {
    console.log('[AdminService] Fetching games (mocked).');
    // Simulate pagination
    return mockAdminGames.slice(offset, offset + limit);
  }

  private async _createAuditLog(
    adminUserId: string,
    action: string,
    targetEntityType?: string,
    targetEntityId?: string,
    details?: any,
    ipAddress?: string
  ): Promise<AdminAuditLogEntry> {
    const logEntry: AdminAuditLogEntry = {
      logId: generateId('audit'),
      adminUserId,
      action,
      targetEntityType,
      targetEntityId,
      details,
      ipAddress,
      timestamp: new Date(),
    };
    mockAdminAuditLogs.push(logEntry);
    console.log(`[AdminService] Audit log created: ${action} by ${adminUserId} on ${targetEntityType}:${targetEntityId}`);
    return logEntry;
  }

  async banUser(adminUserId: string, targetUserId: string, banDetails: BanUserRequestBody, ipAddress?: string): Promise<AdminUserView | null> {
    console.log(`[AdminService] Attempting to ban user ${targetUserId} by admin ${adminUserId}.`);
    const userIndex = mockAdminUsers.findIndex(u => u.userId === targetUserId);
    if (userIndex === -1) {
      throw new Error(`User with ID ${targetUserId} not found.`);
    }

    const user = mockAdminUsers[userIndex];
    const oldStatus = user.auth_status;
    user.auth_status = 'banned'; // Simulate status change
    user.lastLoginAt = new Date(); // Conceptual update timestamp

    await this._createAuditLog(
      adminUserId,
      'USER_BANNED',
      'USER',
      targetUserId,
      { reason: banDetails.reason, old_status: oldStatus, new_status: 'banned' },
      ipAddress
    );

    return { ...user };
  }

  async toggleGameActiveStatus(adminUserId: string, targetGameId: string, newStatus: boolean, ipAddress?: string): Promise<AdminGameView | null> {
    console.log(`[AdminService] Attempting to set game ${targetGameId} active status to ${newStatus} by admin ${adminUserId}.`);
    const gameIndex = mockAdminGames.findIndex(g => g.gameId === targetGameId);
    if (gameIndex === -1) {
      throw new Error(`Game with ID ${targetGameId} not found.`);
    }

    const game = mockAdminGames[gameIndex];
    const oldStatus = game.isActive;
    game.isActive = newStatus; // Simulate status change
    game.updatedAt = new Date();

    await this._createAuditLog(
      adminUserId,
      newStatus ? 'GAME_ACTIVATED' : 'GAME_DEACTIVATED',
      'GAME',
      targetGameId,
      { old_status: oldStatus, new_status: newStatus },
      ipAddress
    );

    return { ...game };
  }

  // For testing purposes to inspect audit logs
  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<AdminAuditLogEntry[]> {
      // In a real app, this would query the admin_audit_logs table from DB
      // SELECT * FROM admin_audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?
      console.log('[AdminService] Fetching audit logs (mocked).');
      return [...mockAdminAuditLogs].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(offset, offset + limit);
  }

  // --- Dashboard Data Methods (Mocked Inter-Service Calls) ---

  async getDashboardData(): Promise<DashboardData> {
    console.log('[AdminService] Fetching dashboard data (mocked inter-service calls).');

    // Mocked data - In a real system, these would be calls to other services or complex queries
    const activeUsersNow = Math.floor(Math.random() * 100) + 50; // e.g., from auth-service sessions or analytics
    const activeUsersDaily = Math.floor(Math.random() * 500) + 200; // e.g., from user-profile last_activity or analytics
    const newRegistrationsToday = Math.floor(Math.random() * 50) + 10; // e.g., from auth-service user creation logs
    const totalMatchesToday = Math.floor(Math.random() * 1000) + 300; // e.g., from game-engine-service game_rooms or game_results

    // Conceptual: Fetch top games (mocked)
    const topGames: GameActivityStat[] = [
        { game_id: 'ludo_masters_game_id', game_name: 'Ludo Masters', matches_played: Math.floor(Math.random() * 200), total_playtime_minutes: Math.floor(Math.random() * 5000), unique_players: Math.floor(Math.random() * 100)},
        { game_id: '5g_tower_defense', game_name: '5G Tower Defense', matches_played: Math.floor(Math.random() * 150), total_playtime_minutes: Math.floor(Math.random() * 4000), unique_players: Math.floor(Math.random() * 80)},
        { game_id: 'chess_router_wars', game_name: 'Chess Router Wars', matches_played: Math.floor(Math.random() * 100), total_playtime_minutes: Math.floor(Math.random() * 3000), unique_players: Math.floor(Math.random() * 60)},
    ].sort((a,b) => b.matches_played - a.matches_played).slice(0,3);

    return {
      active_users_now: activeUsersNow,
      active_users_daily: activeUsersDaily,
      new_registrations_today: newRegistrationsToday,
      total_matches_today: totalMatchesToday,
      satisfaction_score_avg_weekly: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // Mock score between 3.5-5.0
      total_revenue_today: Math.floor(Math.random() * 10000), // Mock revenue
      top_games_by_playtime_today: topGames,
    };
  }

  async getDetailedActiveUsers(limit: number = 10): Promise<ActiveUserSnapshot[]> {
    console.log('[AdminService] Fetching detailed active users (mocked).');
    // Mock: take some users from mockAdminUsers and pretend they are active
    const users = mockAdminUsers.filter(u => u.auth_status === 'active').slice(0, limit);
    return users.map(u => ({
        user_id: u.userId,
        username: u.username,
        email: u.email,
        current_game_id: Math.random() > 0.5 ? mockAdminGames[Math.floor(Math.random()*mockAdminGames.length)].gameId : null,
        last_activity_at: new Date(Date.now() - Math.floor(Math.random() * 600000)), // Active in last 10 mins
        session_duration_minutes: Math.floor(Math.random() * 120) + 5
    }));
  }

  async getDetailedMatchStatistics(timePeriod: 'today' | 'last7days' = 'today'): Promise<MatchStatistics[]> {
    console.log(`[AdminService] Fetching detailed match statistics for ${timePeriod} (mocked).`);
    // Mock data based on mockAdminGames
    return mockAdminGames.filter(g => g.isActive).map(g => ({
        game_id: g.gameId,
        game_name: g.name,
        total_matches_period: Math.floor(Math.random() * (timePeriod === 'today' ? 300 : 2000)),
        average_duration_seconds: Math.floor(Math.random() * 600) + 300, // 5-15 mins
        total_players_participated: Math.floor(Math.random() * (timePeriod === 'today' ? 500 : 3000)),
        peak_concurrent_matches: Math.floor(Math.random() * 50) + 5,
    }));
  }

  async getSatisfactionFeedbackSummary(): Promise<SatisfactionFeedbackSummary | null> {
    console.log('[AdminService] Fetching satisfaction feedback summary (mocked).');
    // This would query a feedback table/service
    if (Math.random() > 0.2) { // Simulate data available
        return {
            average_rating_overall: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
            total_feedback_count: Math.floor(Math.random() * 500) + 50
        };
    }
    return null; // Simulate no feedback data yet
  }

  // --- Export Methods ---
  async exportUsersToCsv(): Promise<string> {
    console.log('[AdminService] Exporting users to CSV (mocked).');
    // In a real app, fetch all users or based on filters
    const users = await this.getUsers(1000, 0); // Get up to 1000 users for export
    const headers: (keyof AdminUserView)[] = ['userId', 'username', 'email', 'phone', 'auth_status', 'kycStatus', 'firstName', 'lastName', 'createdAt', 'lastLoginAt'];
    return convertToCsv(users, headers);
  }

  async exportGameResultsToCsv(gameId?: string, dateRange?: { from: string, to: string }): Promise<string> {
    console.log(`[AdminService] Exporting game results to CSV (mocked). GameID: ${gameId}, Range: ${dateRange?.from}-${dateRange?.to}`);
    // TODO: Conceptual - Fetch data from game-engine-service.
    // This would involve an HTTP client call to game-engine-service's /results endpoint with filters.
    const mockGameResults: any[] = [ // Assuming GameResult type from game-engine
        { result_id: 'res1', game_id: 'ludo_masters_game_id', room_id: 'roomA', user_id: 'userA_auth_id', score: 100, rank: 1, winnings: 10, recorded_at: new Date() },
        { result_id: 'res2', game_id: 'ludo_masters_game_id', room_id: 'roomA', user_id: 'userB_auth_id', score: 80, rank: 2, winnings: 0, recorded_at: new Date() },
        { result_id: 'res3', game_id: '5g_tower_defense', room_id: 'roomB', user_id: 'userA_auth_id', score: 5000, rank: 1, recorded_at: new Date() },
    ];
    // Filter mockGameResults based on gameId and dateRange if provided
    let filteredResults = mockGameResults;
    if (gameId) {
        filteredResults = filteredResults.filter(r => r.game_id === gameId);
    }
    // Add dateRange filtering if implemented...

    const headers = ['result_id', 'game_id', 'room_id', 'user_id', 'score', 'rank', 'winnings', 'recorded_at'];
    return convertToCsv(filteredResults, headers);
  }

  async exportAuditLogsToCsv(dateRange?: { from: string, to: string }): Promise<string> {
    console.log(`[AdminService] Exporting audit logs to CSV. Range: ${dateRange?.from}-${dateRange?.to}`);
    // Fetch all logs for simplicity, or implement date range filtering on the DB query
    // For mock, using the in-memory mockAdminAuditLogs
    let logs = await this.getAuditLogs(10000, 0); // Get a large number of logs

    // TODO: Implement actual date range filtering if dateRange is provided
    // if (dateRange?.from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(dateRange.from));
    // if (dateRange?.to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(dateRange.to));

    const headers: (keyof AdminAuditLogEntry)[] = ['logId', 'adminUserId', 'action', 'targetEntityType', 'targetEntityId', 'timestamp', 'details', 'ipAddress'];
    return convertToCsv(logs.map(log => ({...log, details: JSON.stringify(log.details) })), headers); // Stringify details JSON
  }

  // --- Moderation Methods (Placeholders/Mocks) ---
  async mutePlayer(adminUserId: string, targetUserId: string, durationHours: number, reason: string, ipAddress?: string): Promise<{ success: boolean, message: string }> {
    console.log(`[AdminService] Admin ${adminUserId} attempting to mute user ${targetUserId} for ${durationHours}h. Reason: ${reason}`);
    // TODO:
    // 1. Call user-profile-service to set is_muted = true and mute_expires_at.
    //    This requires user-profile-service to have an endpoint for this.
    // 2. Record in audit log.

    // Mock response:
    const user = mockAdminUsers.find(u => u.userId === targetUserId);
    if (!user) throw new Error(`User ${targetUserId} not found for muting.`);

    // Simulate updating a (non-existent in this mock) mute status
    console.log(`[AdminService-Mock] User ${targetUserId} would be muted.`);

    await this._createAuditLog(adminUserId, 'USER_MUTED', 'USER', targetUserId, { durationHours, reason }, ipAddress);
    return { success: true, message: `User ${targetUserId} has been muted for ${durationHours} hours.` };
  }

  async unmutePlayer(adminUserId: string, targetUserId: string, ipAddress?: string): Promise<{ success: boolean, message: string }> {
    console.log(`[AdminService] Admin ${adminUserId} attempting to unmute user ${targetUserId}.`);
    // TODO:
    // 1. Call user-profile-service to set is_muted = false and clear mute_expires_at.
    // 2. Record in audit log.

    const user = mockAdminUsers.find(u => u.userId === targetUserId);
    if (!user) throw new Error(`User ${targetUserId} not found for unmuting.`);

    console.log(`[AdminService-Mock] User ${targetUserId} would be unmuted.`);
    await this._createAuditLog(adminUserId, 'USER_UNMUTED', 'USER', targetUserId, {}, ipAddress);
    return { success: true, message: `User ${targetUserId} has been unmuted.` };
  }

  async getChatTranscriptForRoom(roomId: string): Promise<any[]> { // Replace 'any[]' with ChatMessage[]
    console.log(`[AdminService] Fetching chat transcript for room ${roomId} (mocked).`);
    // TODO: Call chat-service API: GET /chat/transcripts/room/:roomId
    return [
        { timestamp: new Date(Date.now() - 50000), user_id: 'userA_auth_id', username: 'UserA', message_content: 'Hello room!' },
        { timestamp: new Date(Date.now() - 40000), user_id: 'userB_auth_id', username: 'UserB', message_content: 'Hi UserA!' },
        { timestamp: new Date(Date.now() - 30000), user_id: 'userA_auth_id', username: 'UserA', message_content: 'Good game?' },
    ];
  }

  async getChatTranscriptForUser(targetUserId: string, limit: number = 50): Promise<any[]> { // Replace 'any[]' with ChatMessage[]
    console.log(`[AdminService] Fetching chat transcript for user ${targetUserId}, limit ${limit} (mocked).`);
    // TODO: Call chat-service API: GET /chat/transcripts/user/:userId?limit=X
     return [
        { timestamp: new Date(Date.now() - 150000), room_id: 'roomX', user_id: targetUserId, username: mockAdminUsers.find(u=>u.userId === targetUserId)?.username || targetUserId, message_content: 'My message in room X' },
        { timestamp: new Date(Date.now() - 140000), room_id: 'roomY', user_id: targetUserId, username: mockAdminUsers.find(u=>u.userId === targetUserId)?.username || targetUserId, message_content: 'Another message in room Y' },
    ];
  }

}
