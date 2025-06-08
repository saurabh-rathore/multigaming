import { GameEngineService } from '../services/gameEngineService';
import { GameResultRequestBody, CreateLudoGameRequest, LudoRollDiceRequest, LudoMovePieceRequest } from '../types/game.types'; // Assuming Ludo types are re-exported or merged in game.types or imported directly
// If Ludo types are separate:
import { LudoGameState } from '../types/ludo.types';
import { generateId } from '../utils/helpers'; // For roomId generation if not provided


type Request = any; // { params: any, body: any, user?: { id: string } }
type Response = any;

const gameEngineService = new GameEngineService();

// === Generic Game Endpoints ===
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
        return { statusCode: 400, body: { message: 'Room ID, User ID, and Score are required.'}};
    }
    const result = await gameEngineService.recordGameResult(gameId, data);
    return { statusCode: 201, body: result };
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not active') ? 403 :
                       error.message.includes('Duplicate') ? 409 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

// === Ludo Specific Endpoints ===
export const createNewLudoGame = async (req: Request, res: Response) => {
    try {
        // const { roomId, userIds, gameId } = req.body as CreateLudoGameRequest; // Conceptual
        const roomId = req.body?.roomId || generateId('ludoRoom'); // If roomId not provided by client (e.g. matchmaking)
        const userIds = req.body?.userIds;
        const gameId = req.body?.gameId; // Should be static Ludo ID

        if (!userIds || !Array.isArray(userIds) || userIds.length < 2 || userIds.length > 4) {
            return { statusCode: 400, body: { message: 'Valid userIds array (2-4 players) is required.'}};
        }
        // Assuming gameId for Ludo is known or passed
        const ludoGameState = await gameEngineService.startLudoGame(roomId, userIds, gameId);
        return { statusCode: 201, body: ludoGameState };
    } catch (error: any) {
        const statusCode = error.message.includes('already active') ? 409 :
                           error.message.includes('requires 2 to 4 players') ? 400 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const ludoRollDice = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        const userId = req.user?.id; // Assume userId from authenticated request
        if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.' }};
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated or ID missing.' }};

        const updatedGameState = await gameEngineService.rollDiceForLudo(roomId, userId);
        return { statusCode: 200, body: updatedGameState };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('Not player') || error.message.includes('Not the time') ? 403 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const ludoMovePiece = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        const userId = req.user?.id; // Assume userId from authenticated request
        const pieceId = req.body?.pieceId;
        // const stepsToMove = req.body?.stepsToMove; // Optional if server uses stored dice roll

        if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.' }};
        if (!userId) return { statusCode: 401, body: { message: 'User not authenticated or ID missing.' }};
        if (!pieceId) return { statusCode: 400, body: { message: 'pieceId is required in request body.' }};

        const updatedGameState = await gameEngineService.moveLudoPiece(roomId, userId, pieceId /*, stepsToMove */);
        return { statusCode: 200, body: updatedGameState };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('Not player') || error.message.includes('Not the time') || error.message.includes('No dice roll') || error.message.includes('needs a 6') ? 403 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const getLudoGameRoomState = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.' }};
        const gameState = await gameEngineService.getLudoGameState(roomId);
        if (!gameState) return { statusCode: 404, body: { message: 'Ludo game state not found for this room.'}};
        return { statusCode: 200, body: gameState };
    } catch (error: any) {
        return { statusCode: 500, body: { message: error.message }};
    }
};
