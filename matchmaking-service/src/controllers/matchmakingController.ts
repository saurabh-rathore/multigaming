import { MatchmakingService } from '../services/matchmakingService';
import { JoinQueueRequestBody, LeaveQueueRequestBody } from '../types/matchmaking.types';

type Request = any; // { params: { roomId: string }, body: any, user?: { id: string } } // user.id from JWT
type Response = any;

const matchmakingService = new MatchmakingService();

export const joinMatchQueue = async (req: Request, res: Response) => {
  try {
    // Assuming userId comes from authenticated request (e.g., JWT payload)
    const userId = req.user?.id;
    if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

    const data: JoinQueueRequestBody = req.body;
    if (!data.gameId || data.stake === undefined) {
      return { statusCode: 400, body: { message: 'Game ID and stake are required.' } };
    }

    const result = await matchmakingService.joinQueue(userId, data);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('already in the queue') ? 409 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

export const getRoomInfo = async (req: Request, res: Response) => {
  try {
    const roomId = req.params?.roomId;
    if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.' } };

    const room = await matchmakingService.getRoomDetails(roomId);
    if (!room) return { statusCode: 404, body: { message: 'Room not found.' } };

    return { statusCode: 200, body: room };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const leaveMatchQueue = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

        const data: LeaveQueueRequestBody = req.body; // Or entryId could be a path param
        if (!data.entryId) {
            return { statusCode: 400, body: { message: 'Entry ID is required to leave queue.'}};
        }
        const result = await matchmakingService.leaveQueue(userId, data.entryId);
        return { statusCode: 200, body: result };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};
