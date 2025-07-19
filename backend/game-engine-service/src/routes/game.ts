import { Router } from 'express';
import * as ctrl from '../controllers/gameEngineController'; // Using ctrl alias

const router = Router();

// Generic Game Routes
router.get('/', ctrl.listGames);
router.get('/:gameId', ctrl.getGameDetails);
router.post('/:gameId/result', ctrl.submitGameResult);

// Ludo Specific Routes
router.post('/ludo/create', ctrl.createNewLudoGame);
router.get('/ludo/rooms/:roomId', ctrl.getLudoGameRoomState);
router.post('/ludo/rooms/:roomId/roll-dice', ctrl.ludoRollDice);
router.post('/ludo/rooms/:roomId/move-piece', ctrl.ludoMovePiece);

export default router;
