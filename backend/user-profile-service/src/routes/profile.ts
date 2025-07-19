import { Router } from 'express';
import { getUserProfile, updateUserProfile, updateUserKyc } from '../controllers/profileController';

const router = Router();

router.get('/users/:id', getUserProfile);
router.put('/users/:id', updateUserProfile);
router.post('/users/:id/kyc', updateUserKyc);

export default router;
