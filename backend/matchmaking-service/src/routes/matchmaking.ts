import { Router } from 'express';
import { joinMatchQueue, getRoomInfo, leaveMatchQueue } from '../controllers/matchmakingController';

const router = Router();

// Middleware to simulate user authentication
router.use((req, res, next) => {
    // For testing, let's mock a user if not present
    // In a real application, you would have proper authentication middleware here
    // @ts-ignore
    req.user = { id: 'simulated_user_from_mw' };
    console.log(`[Matchmaking Service] Mock auth middleware processed, user: ${
    // @ts-ignore
    req.user.id}`);
    next();
});

router.post('/join', joinMatchQueue);
router.get('/room/:roomId', getRoomInfo);
router.post('/leave', leaveMatchQueue);

export default router;
