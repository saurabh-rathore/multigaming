import { AdminService } from '../services/adminService';
import { BanUserRequestBody, ToggleGameActiveRequestBody } from '../types/admin.types';

// Assuming req.adminUser.id is populated by an auth middleware for admin users
type Request = any; // { params: { userId/gameId: string }, body: any, query: any, adminUser?: { id: string }, ip?: string }
type Response = any;

const adminService = new AdminService();

export const listUsers = async (req: Request, res: Response) => {
  try {
    // const limit = parseInt(req.query?.limit || '20'); // Conceptual pagination
    // const offset = parseInt(req.query?.offset || '0');
    const users = await adminService.getUsers(/*limit, offset*/);
    return { statusCode: 200, body: users };
  } catch (error: any) {
    return { statusCode: 500, body: { message: 'Failed to retrieve users.' } };
  }
};

export const listGames = async (req: Request, res: Response) => {
  try {
    // const limit = parseInt(req.query?.limit || '20');
    // const offset = parseInt(req.query?.offset || '0');
    const games = await adminService.getGames(/*limit, offset*/);
    return { statusCode: 200, body: games };
  } catch (error: any) {
    return { statusCode: 500, body: { message: 'Failed to retrieve games.' } };
  }
};

export const banUserAccount = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.adminUser?.id;
    if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};

    const targetUserId = req.params?.userId;
    if (!targetUserId) return { statusCode: 400, body: { message: 'Target User ID is required.'}};

    const body: BanUserRequestBody = req.body;
    if (!body.reason) return { statusCode: 400, body: { message: 'Reason for banning is required.'}};

    const updatedUser = await adminService.banUser(adminUserId, targetUserId, body, req.ip);
    return { statusCode: 200, body: updatedUser };
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return { statusCode, body: { message: error.message }};
  }
};

// --- Export Controllers ---
export const exportUsersCsvController = async (req: Request, res: Response) => {
    try {
        const csvData = await adminService.exportUsersToCsv();
        // In a real Express app:
        // res.setHeader('Content-Type', 'text/csv');
        // res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
        // res.status(200).send(csvData);
        return { statusCode: 200, body: csvData, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="users_export.csv"' }};
    } catch (error: any) {
        console.error('[AdminController] ExportUsersCsv error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to export users to CSV.' } };
    }
};

export const exportGameResultsCsvController = async (req: Request, res: Response) => {
    try {
        const gameId = req.query?.gameId as string | undefined;
        const fromDate = req.query?.fromDate as string | undefined; // Expect YYYY-MM-DD
        const toDate = req.query?.toDate as string | undefined;   // Expect YYYY-MM-DD

        // Basic validation for date format if provided (more robust needed in real app)
        const dateRange = (fromDate && toDate) ? { from: new Date(fromDate), to: new Date(toDate) } : undefined;

        const csvData = await adminService.exportGameResultsToCsv(gameId, dateRange);
        return { statusCode: 200, body: csvData, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="game_results_export.csv"' }};
    } catch (error: any) {
        console.error('[AdminController] ExportGameResultsCsv error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to export game results to CSV.' } };
    }
};

export const exportAuditLogsCsvController = async (req: Request, res: Response) => {
    try {
        const fromDate = req.query?.fromDate as string | undefined;
        const toDate = req.query?.toDate as string | undefined;
        const dateRange = (fromDate && toDate) ? { from: new Date(fromDate), to: new Date(toDate) } : undefined;

        const csvData = await adminService.exportAuditLogsToCsv(dateRange);
        return { statusCode: 200, body: csvData, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit_logs_export.csv"' }};
    } catch (error: any) {
        console.error('[AdminController] ExportAuditLogsCsv error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to export audit logs to CSV.' } };
    }
};

// --- Moderation Controllers ---
export const muteUserController = async (req: Request, res: Response) => {
    try {
        const adminUserId = req.adminUser?.id;
        if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};

        const targetUserId = req.params?.userId;
        if (!targetUserId) return { statusCode: 400, body: { message: 'Target User ID is required.'}};

        const { durationHours, reason } = req.body;
        if (typeof durationHours !== 'number' || durationHours <= 0) {
            return { statusCode: 400, body: { message: 'Valid durationHours (number > 0) is required.'}};
        }
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            return { statusCode: 400, body: { message: 'Reason for muting is required.'}};
        }

        const result = await adminService.mutePlayer(adminUserId, targetUserId, durationHours, reason, req.ip);
        return { statusCode: result.success ? 200 : 400, body: result };
    } catch (error: any) {
        console.error('[AdminController] MuteUser error:', error.message, error.stack);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const unmuteUserController = async (req: Request, res: Response) => {
    try {
        const adminUserId = req.adminUser?.id;
        if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};

        const targetUserId = req.params?.userId;
        if (!targetUserId) return { statusCode: 400, body: { message: 'Target User ID is required.'}};

        const result = await adminService.unmutePlayer(adminUserId, targetUserId, req.ip);
        return { statusCode: result.success ? 200 : 400, body: result };
    } catch (error: any) {
        console.error('[AdminController] UnmuteUser error:', error.message, error.stack);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const viewChatTranscriptRoomController = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.'}};

        const transcripts = await adminService.getChatTranscriptForRoom(roomId);
        return { statusCode: 200, body: transcripts };
    } catch (error: any) {
        console.error('[AdminController] ViewChatTranscriptRoom error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve chat transcripts for room.' }};
    }
};

export const viewChatTranscriptUserController = async (req: Request, res: Response) => {
    try {
        const targetUserId = req.params?.userId;
        if (!targetUserId) return { statusCode: 400, body: { message: 'Target User ID is required.'}};
        const limit = parseInt(req.query?.limit as string || '100', 10);

        const transcripts = await adminService.getChatTranscriptForUser(targetUserId, limit);
        return { statusCode: 200, body: transcripts };
    } catch (error: any) {
        console.error('[AdminController] ViewChatTranscriptUser error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve chat transcripts for user.' }};
    }
};

// --- Dashboard Controllers ---
export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        // Auth check would be done by middleware before this controller is hit
        // const adminUserId = req.adminUser?.id;
        // if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};

        const dashboardData = await adminService.getDashboardData();
        return { statusCode: 200, body: dashboardData };
    } catch (error: any) {
        console.error('[AdminController] GetDashboardSummary error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve dashboard summary.' } };
    }
};

export const getActiveUsersReport = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query?.limit as string || '20', 10);
        const activeUsers = await adminService.getDetailedActiveUsers(limit);
        return { statusCode: 200, body: activeUsers };
    } catch (error: any) {
        console.error('[AdminController] GetActiveUsersReport error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve active users report.' } };
    }
};

export const getMatchStatisticsReport = async (req: Request, res: Response) => {
    try {
        const timePeriod = req.query?.timePeriod as ('today' | 'last7days') || 'today';
        const matchStats = await adminService.getDetailedMatchStatistics(timePeriod);
        return { statusCode: 200, body: matchStats };
    } catch (error: any) {
        console.error('[AdminController] GetMatchStatisticsReport error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve match statistics report.' } };
    }
};

export const getSatisfactionFeedbackReport = async (req: Request, res: Response) => {
    try {
        const feedbackSummary = await adminService.getSatisfactionFeedbackSummary();
        if (!feedbackSummary) {
            return { statusCode: 200, body: { message: "No satisfaction feedback data available yet.", summary: null }};
        }
        return { statusCode: 200, body: feedbackSummary };
    } catch (error: any) {
        console.error('[AdminController] GetSatisfactionFeedbackReport error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve satisfaction feedback report.' } };
    }
};

export const listAuditLogs = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query?.limit as string || '50', 10);
        const offset = parseInt(req.query?.offset as string || '0', 10);
        const logs = await adminService.getAuditLogs(limit, offset);
        return { statusCode: 200, body: logs };
    } catch (error: any) {
        console.error('[AdminController] ListAuditLogs error:', error.message, error.stack);
        return { statusCode: 500, body: { message: 'Failed to retrieve audit logs.'}};
    }
};

export const toggleGameStatus = async (req: Request, res: Response) => {
    try {
        const adminUserId = req.adminUser?.id;
        if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};

        const targetGameId = req.params?.gameId;
        if (!targetGameId) return { statusCode: 400, body: { message: 'Target Game ID is required.'}};

        const body: ToggleGameActiveRequestBody = req.body;
        if (typeof body.newStatus !== 'boolean') {
            return { statusCode: 400, body: { message: "'newStatus' (boolean) is required in request body."}};
        }

        const updatedGame = await adminService.toggleGameActiveStatus(adminUserId, targetGameId, body.newStatus, req.ip);
        return { statusCode: 200, body: updatedGame };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};
