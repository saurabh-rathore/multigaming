import { listGames, getGameDetails, submitGameResult } from '../controllers/gameEngineController';

export const gameEngineRoutes = {
  get_games_list: (req: any, res: any) => listGames(req, res),          // GET /games
  get_game_details: (req: any, res: any) => getGameDetails(req, res),    // GET /games/:gameId
  post_game_result: (req: any, res: any) => submitGameResult(req, res),  // POST /games/:gameId/result
};
