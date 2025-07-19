import { Router } from 'express';
import { listUsers, listGames, banUserAccount, toggleGameStatus } from '../controllers/adminController';

const router = Router();

// Middleware to simulate admin authentication
router.use((req, res, next) => {
    // For testing, mock an admin user and IP
    // In a real application, you would have proper authentication middleware here
    // @ts-ignore
    req.adminUser = { id: 'super_admin_test_id' };
    // @ts-ignore
    req.ip = '127.0.0.1';
    console.log(`[Admin Service] Mock admin auth middleware processed. Admin: ${
    // @ts-ignore
    req.adminUser.id}, IP: ${req.ip}`);
    next();
});

router.get('/users', listUsers);
router.get('/games', listGames);
router.post('/users/:userId/ban', banUserAccount);
router.post('/games/:gameId/toggle-active', toggleGameStatus);

export default router;
