import * as ctrl from '../controllers/gameEngineController'; // Using ctrl alias

// Placeholder for Express Router and middleware
// import { Router } from 'express';
// import { ensureAuthenticated } from './middleware/authMiddleware'; // Conceptual
// const router = Router();

export const gameEngineRoutes = {
  // --- Generic Game Metadata & Results ---
  get_games_list: ctrl.listGames,                   // GET /games
  get_game_details: ctrl.getGameDetails,             // GET /games/:gameId
  post_game_result: ctrl.submitGameResult,           // POST /games/:gameId/results (ensureAuthenticated, or service-to-service)

  // --- Generic Game Room Management ---
  // These routes would typically require authentication (ensureAuthenticated)
  post_create_room: ctrl.createRoomController,       // POST /rooms (Body: { game_id, game_type, game_settings })
  post_join_room: ctrl.joinRoomController,           // POST /rooms/:roomId/join
  get_room_state: ctrl.getRoomStateController,       // GET  /rooms/:roomId
  post_submit_action: ctrl.submitActionController,   // POST /rooms/:roomId/actions (Body: { action_data })

  // --- Ludo Specific Endpoints (Legacy or if custom logic needed beyond generic) ---
  // These might be deprecated if Ludo moves to use the generic room/action endpoints with a LudoLogic handler
  post_ludo_create_game: ctrl.createNewLudoGame,     // POST /ludo/rooms (example of more specific route)
  get_ludo_game_state: ctrl.getLudoGameRoomState,    // GET  /ludo/rooms/:roomId
  post_ludo_roll_dice: ctrl.ludoRollDice,            // POST /ludo/rooms/:roomId/roll-dice
  post_ludo_move_piece: ctrl.ludoMovePiece,          // POST /ludo/rooms/:roomId/move-piece
};

// Example Express Router mapping:
// router.get('/games', ctrl.listGames);
// router.get('/games/:gameId', ctrl.getGameDetails);
// router.post('/games/:gameId/results', ensureAuthenticated, ctrl.submitGameResult);

// router.post('/rooms', ensureAuthenticated, ctrl.createRoomController);
// router.post('/rooms/:roomId/join', ensureAuthenticated, ctrl.joinRoomController);
// router.get('/rooms/:roomId', ensureAuthenticated, ctrl.getRoomStateController);
// router.post('/rooms/:roomId/actions', ensureAuthenticated, ctrl.submitActionController);

// Ludo (if keeping specific routes)
// router.post('/ludo/rooms', ensureAuthenticated, ctrl.createNewLudoGame);
// router.get('/ludo/rooms/:roomId', ensureAuthenticated, ctrl.getLudoGameRoomState);
// router.post('/ludo/rooms/:roomId/roll-dice', ensureAuthenticated, ctrl.ludoRollDice);
// router.post('/ludo/rooms/:roomId/move-piece', ensureAuthenticated, ctrl.ludoMovePiece);

// export default router;
