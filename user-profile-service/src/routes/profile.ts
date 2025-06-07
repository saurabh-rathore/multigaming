// Placeholder for Express Router.
import { getUserProfile, updateUserProfile, updateUserKyc } from '../controllers/profileController';

export const profileRoutes = {
  get_user_by_id: (req: any, res: any) => getUserProfile(req, res),    // Simulates app.get('/users/:id', getUserProfile)
  put_user_by_id: (req: any, res: any) => updateUserProfile(req, res), // Simulates app.put('/users/:id', updateUserProfile)
  post_user_kyc: (req: any, res: any) => updateUserKyc(req, res),      // Simulates app.post('/users/:id/kyc', updateUserKyc)
};
