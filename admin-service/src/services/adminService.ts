import {
  AdminUserView, AdminGameView, AdminAuditLogEntry,
  BanUserRequestBody, ToggleGameActiveRequestBody
} from '../types/admin.types';
import { generateId } from '../utils/helpers';

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
  getAuditLogs(): AdminAuditLogEntry[] {
      return [...mockAdminAuditLogs];
  }
}
