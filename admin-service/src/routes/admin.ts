import { listUsers, listGames, banUserAccount, toggleGameStatus } from '../controllers/adminController';

export const adminRoutes = {
  get_users_list: (req: any, res: any) => listUsers(req, res),        // GET /admin/users
  get_games_list: (req: any, res: any) => listGames(req, res),        // GET /admin/games
  post_ban_user: (req: any, res: any) => banUserAccount(req, res),    // POST /admin/users/:userId/ban
  post_toggle_game: (req: any, res: any) => toggleGameStatus(req, res),// POST /admin/games/:gameId/toggle-active
};
