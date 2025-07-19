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
