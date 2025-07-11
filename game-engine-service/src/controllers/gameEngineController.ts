import { GameEngineService } from '../services/gameEngineService';
import {
    GameResultRequestBody,
    CreateGameRoomRequest,
    JoinGameRoomRequest,
    SubmitPlayerActionRequest
} from '../types/game.types';
// Ludo specific types might still be used for Ludo endpoints if they have very custom request bodies
import { CreateLudoGameRequest, LudoRollDiceRequest, LudoMovePieceRequest, LudoGameState } from '../types/ludo.types';
import { TowerDefensePlayerAction } from '../types/tower_defense.types'; // For specific game action typing
import { generateId } from '../utils/helpers';


type Request = any; // { params: { gameId?: string, roomId?: string }, body: any, user?: { id: string } }
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

// === Generic Game Room Endpoints ===

export const createRoomController = async (req: Request, res: Response) => {
    try {
        const { game_id, game_type, game_settings } = req.body as CreateGameRoomRequest;
        const player1_id = req.user?.id; // Assume player1 is the authenticated user making the request

        if (!player1_id) {
            return { statusCode: 401, body: { message: 'User not authenticated.' }};
        }
        if (!game_id || !game_type) {
            return { statusCode: 400, body: { message: 'game_id and game_type are required.' }};
        }
        if (game_type !== 'PvP' && game_type !== 'PvE') {
            return { statusCode: 400, body: { message: 'Invalid game_type. Must be PvP or PvE.' }};
        }

        const room = await gameEngineService.createGameRoom(game_id, game_type, player1_id, game_settings);
        return { statusCode: 201, body: room };
    } catch (error: any) {
        console.error('[GameController] CreateRoom error:', error.message, error.stack);
        const statusCode = error.message.includes('No game logic handler') ? 400 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const joinRoomController = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        const player2_id = req.user?.id; // Assume player2 is the authenticated user making the request

        if (!roomId) {
            return { statusCode: 400, body: { message: 'Room ID is required.' }};
        }
        if (!player2_id) {
            return { statusCode: 401, body: { message: 'User not authenticated for joining.' }};
        }

        const room = await gameEngineService.joinGameRoom(roomId, player2_id);
        if (!room) { // Should throw error before this if room not found or cannot be joined
            return { statusCode: 404, body: { message: 'Room not found or could not be joined.' }};
        }
        return { statusCode: 200, body: room };
    } catch (error: any) {
        console.error('[GameController] JoinRoom error:', error.message, error.stack);
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('not a PvP room') ? 400 :
                           error.message.includes('not pending') ? 409 : // Conflict - room not available
                           error.message.includes('already has a second player') ? 409 :
                           error.message.includes('cannot join their own room') ? 400 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const getRoomStateController = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        if (!roomId) {
            return { statusCode: 400, body: { message: 'Room ID is required.' }};
        }
        const room = await gameEngineService.getGameRoomState(roomId);
        if (!room) {
            return { statusCode: 404, body: { message: `Game room ${roomId} not found.` }};
        }
        return { statusCode: 200, body: room };
    } catch (error: any) {
        console.error('[GameController] GetRoomState error:', error.message, error.stack);
        return { statusCode: 500, body: { message: error.message }};
    }
};

export const submitActionController = async (req: Request, res: Response) => {
    try {
        const roomId = req.params?.roomId;
        const player_id = req.user?.id; // Authenticated user making the action
        const actionData = req.body.action_data; // The actual game-specific action payload

        if (!roomId) return { statusCode: 400, body: { message: 'Room ID is required.' }};
        if (!player_id) return { statusCode: 401, body: { message: 'User not authenticated.' }};
        if (!actionData) return { statusCode: 400, body: { message: 'action_data is required in request body.' }};

        // Type assertion for actionData would ideally be based on game_id from room state,
        // but for now, we pass it as `any` to the service which will use the game-specific logic handler.
        // Example for Tower Defense: const specificAction = actionData as TowerDefensePlayerAction;

        const updatedRoom = await gameEngineService.submitPlayerAction(roomId, player_id, actionData);
         if (!updatedRoom) { // Should throw error before this in service if action fails critically
            return { statusCode: 500, body: { message: 'Failed to process action or room not found.' }};
        }
        return { statusCode: 200, body: updatedRoom };

    } catch (error: any) {
        console.error('[GameController] SubmitAction error:', error.message, error.stack);
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('not active') ? 403 : // Forbidden/bad state
                           error.message.includes('No action handler') ? 501 : // Not Implemented
                           500;
        return { statusCode, body: { message: error.message }};
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
