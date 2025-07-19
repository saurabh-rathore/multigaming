import * as ctrl from '../controllers/gameEngineController'; // Using ctrl alias

export const gameEngineRoutes = {
  // Generic
  get_games_list: ctrl.listGames,          // GET /games
  get_game_details: ctrl.getGameDetails,    // GET /games/:gameId
  post_game_result: ctrl.submitGameResult,  // POST /games/:gameId/result

  // Ludo Specific
  post_ludo_create_game: ctrl.createNewLudoGame,       // POST /games/ludo/create (or /games/ludo/rooms)
  get_ludo_game_state: ctrl.getLudoGameRoomState,      // GET  /games/ludo/rooms/:roomId
  post_ludo_roll_dice: ctrl.ludoRollDice,            // POST /games/ludo/rooms/:roomId/roll-dice
  post_ludo_move_piece: ctrl.ludoMovePiece,           // POST /games/ludo/rooms/:roomId/move-piece
};
