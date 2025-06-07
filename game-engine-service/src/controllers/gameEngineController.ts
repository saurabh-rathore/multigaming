import { GameEngineService } from '../services/gameEngineService';
import { GameResultRequestBody } from '../types/game.types';

type Request = any; // { params: { gameId: string }, body: any }
type Response = any;

const gameEngineService = new GameEngineService();

export const listGames = async (req: Request, res: Response) => {
  try {
    const games = await gameEngineService.listActiveGames();
    return { statusCode: 200, body: games };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const getGameDetails = async (req: Request, res: Response) => {
  try {
    const gameId = req.params?.gameId;
    if (!gameId) return { statusCode: 400, body: { message: 'Game ID is required.' } };

    const game = await gameEngineService.getGameById(gameId);
    if (!game) return { statusCode: 404, body: { message: 'Game not found.' } };

    return { statusCode: 200, body: game };
  } catch (error: any) {
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const submitGameResult = async (req: Request, res: Response) => {
  try {
    const gameId = req.params?.gameId;
    const data: GameResultRequestBody = req.body;

    if (!gameId) return { statusCode: 400, body: { message: 'Game ID is required.' } };
    if (!data.room_id || !data.user_id || data.score === undefined) {
        return { statusCode: 400, body: { message: 'Room ID, User ID, and Score are required in request body.'}};
    }

    const result = await gameEngineService.recordGameResult(gameId, data);
    return { statusCode: 201, body: result }; // 201 Created
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not active') ? 403 :
                       error.message.includes('Duplicate game result') ? 409 : 500;
    return { statusCode, body: { message: error.message } };
  }
};
