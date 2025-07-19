import { Router } from 'express';
import { getGameLeaderboard } from '../controllers/leaderboardController';

const router = Router();

router.get('/:gameId', getGameLeaderboard);

export default router;
