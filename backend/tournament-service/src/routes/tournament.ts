import { Router } from 'express';
import {
    listAvailableTournaments, getTournamentDetails, registerUserForTournament,
    getTournamentParticipantList, startTournamentAdmin, finalizeTournamentAdmin
} from '../controllers/tournamentController';

const router = Router();

// Middleware to simulate user authentication
const userAuthMiddleware = (req: any, res: any, next: any) => {
    // For testing, let's mock a user if not present
    // In a real application, you would have proper authentication middleware here
    req.user = { id: 'simulated_user_from_mw' };
    console.log(`[Tournament Service] Mock user auth middleware processed, user: ${req.user.id}`);
    next();
};

// Middleware to simulate admin authentication
const adminAuthMiddleware = (req: any, res: any, next: any) => {
    // For testing, let's mock an admin user if not present
    // In a real application, you would have proper authentication middleware here
    req.adminUser = { id: 'sim_admin_ops' };
    console.log(`[Tournament Service] Mock admin auth middleware processed, admin: ${req.adminUser.id}`);
    next();
};

router.get('/', listAvailableTournaments);
router.get('/:tournamentId', getTournamentDetails);
router.post('/:tournamentId/register', userAuthMiddleware, registerUserForTournament);
router.get('/:tournamentId/participants', getTournamentParticipantList);

// Admin routes
router.post('/:tournamentId/start', adminAuthMiddleware, startTournamentAdmin);
router.post('/:tournamentId/finalize', adminAuthMiddleware, finalizeTournamentAdmin);

export default router;
