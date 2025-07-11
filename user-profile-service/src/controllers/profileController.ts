import { ProfileService } from '../services/profileService';
import {
  UpdateProfileRequestBody,
  KycUpdateRequestBody,
  CreateGameHistoryEntryBody,
  Badge,
  ClaimDailyRewardBody
} from '../types/profile.types';

// Placeholder for Express request/response types.
// In a real app, import { Request, Response } from 'express';
type Request = any; // Typically { params: { id: string }, body: any, query: any }
type Response = any; // Typically { status: (code: number) => ({ json: (data: any) => void }) }

const profileService = new ProfileService();

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.id;
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required in path.' } };
    }
    // Ensure profile exists or create a basic one (optional behavior)
    await profileService.createProfileIfNotExists(userId, { username: `default_${userId.substring(0,5)}`});

    const profile = await profileService.getProfile(userId);
    if (!profile) {
      // This case might be rare if createProfileIfNotExists is called
      return { statusCode: 404, body: { message: 'Profile not found.' } };
    }
    console.log(`[ProfileController] Profile retrieved for ${userId} (simulated response).`);
    return { statusCode: 200, body: profile };
  } catch (error: any) {
    console.error('[ProfileController] GetProfile error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.id;
    const updateData: UpdateProfileRequestBody = req.body;

    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required in path.' } };
    }
    if (Object.keys(updateData).length === 0) {
        return { statusCode: 400, body: { message: 'Request body cannot be empty for update.'}};
    }
    // Add more specific validations for fields in updateData if necessary (e.g., username format, DOB format)

    const updatedProfile = await profileService.updateProfile(userId, updateData);
    if (!updatedProfile) {
        return { statusCode: 404, body: { message: 'Profile not found for update.' } };
    }
    console.log(`[ProfileController] Profile updated for ${userId} (simulated response).`);
    return { statusCode: 200, body: updatedProfile };
  } catch (error: any) {
    console.error('[ProfileController] UpdateProfile error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return { statusCode: statusCode, body: { message: error.message } };
  }
};

// --- Daily Reward & Wheel Spin Controllers ---

export const recordLoginController = async (req: Request, res: Response) => {
  // This should ideally be an internal endpoint called by auth-service upon successful login
  try {
    const userId = req.params?.userId; // Or from authenticated user context if auth-service calls with user token
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    const result = await profileService.recordUserLogin(userId);
    return { statusCode: 200, body: result };
  } catch (error: any) {
    console.error('[ProfileController] RecordLogin error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const getDailyRewardStatusController = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId; // Assuming userId from path, or from authenticated req.user.id
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    const rewardInfo = await profileService.getDailyRewardStatus(userId);
    return { statusCode: 200, body: rewardInfo };
  } catch (error: any) {
    console.error('[ProfileController] GetDailyRewardStatus error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

export const claimDailyRewardController = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId; // Or from authenticated req.user.id
    // const body: ClaimDailyRewardBody = req.body; // Body might be empty

    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    const claimResult = await profileService.claimDailyReward(userId);
    if (!claimResult.success) {
        // Specific non-500 errors (like "already claimed", "not eligible")
        // might return 400 or 409 (Conflict) depending on preference.
        // For now, service returns a success:false flag.
        return { statusCode: 200, body: claimResult }; // Or 400 if preferred for !success
    }
    return { statusCode: 200, body: claimResult };
  } catch (error: any) {
    console.error('[ProfileController] ClaimDailyReward error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

export const getWheelSpinStatusController = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId; // Or from authenticated req.user.id
         if (!userId) {
            return { statusCode: 400, body: { message: 'User ID is required.' } };
        }
        const status = await profileService.getWheelSpinStatus(userId);
        return { statusCode: 200, body: status };
    } catch (error: any) {
        console.error('[ProfileController] GetWheelSpinStatus error:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message } };
    }
};

export const performWheelSpinController = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.userId; // Or from authenticated req.user.id
        if (!userId) {
            return { statusCode: 400, body: { message: 'User ID is required.' } };
        }
        const result = await profileService.performWheelSpin(userId);
         if (!result.success && result.message.includes("Not enough wheel spins")) {
            return { statusCode: 400, body: result }; // Bad request if not enough spins
        }
        return { statusCode: 200, body: result };
    } catch (error: any) {
        console.error('[ProfileController] PerformWheelSpin error:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message } };
    }
};

// Conceptual: Seed database with reward definitions and wheel prizes (admin/dev only)
export const seedRewardsDataController = async (req: Request, res: Response) => {
    try {
        await profileService.__seedRewardDefinitions();
        await profileService.__seedWheelPrizes();
        await profileService.__seedBadges(); // Also ensure badges needed by wheel are seeded
        return { statusCode: 200, body: { message: "Rewards, wheel prizes, and badges seeded conceptually."}};
    } catch (error: any) {
        console.error('[ProfileController] SeedRewards error:', error.message);
        return { statusCode: 500, body: { message: error.message }};
    }
};

// --- Enriched Profile Endpoint ---
export const getFullUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId; // Assuming route is /profiles/:userId/full or similar
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    // Ensure profile exists or create if not, to prevent errors on subsequent calls
    await profileService.createProfileIfNotExists(userId);

    const enrichedProfile = await profileService.getEnrichedUserProfile(userId);
    if (!enrichedProfile) {
      return { statusCode: 404, body: { message: 'Profile not found.' } };
    }
    console.log(`[ProfileController] Enriched profile retrieved for ${userId}.`);
    return { statusCode: 200, body: enrichedProfile };
  } catch (error: any) {
    console.error('[ProfileController] GetFullProfile error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};


// --- Badge Endpoints ---
export const listUserBadgesController = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId; // Assuming route is /profiles/:userId/badges
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    const badges = await profileService.listUserBadges(userId);
    console.log(`[ProfileController] Badges listed for user ${userId}.`);
    return { statusCode: 200, body: badges };
  } catch (error: any) {
    console.error('[ProfileController] ListUserBadges error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const listAllBadgesController = async (req: Request, res: Response) => {
  try {
    const allBadges = await profileService.listAllBadges();
    console.log(`[ProfileController] All available badges listed.`);
    return { statusCode: 200, body: allBadges };
  } catch (error: any) {
    console.error('[ProfileController] ListAllBadges error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const grantBadgeToUserController = async (req: Request, res: Response) => {
  // This endpoint might be admin-only or service-to-service
  try {
    const userId = req.params?.userId;
    const { badgeId } = req.body; // Expecting { "badgeId": "some_badge_id" }
    if (!userId || !badgeId) {
      return { statusCode: 400, body: { message: 'User ID and Badge ID are required.' } };
    }
    const userBadge = await profileService.grantBadgeToUser(userId, badgeId);
    if (!userBadge) {
        // This might mean user already had the badge, or some other logic handled in service
        // For now, assume if service returns null and no error, it's not a 201.
        // The service logs if user already has it.
        return { statusCode: 200, body: { message: `User ${userId} may already have badge ${badgeId} or badge could not be granted.`} };
    }
    console.log(`[ProfileController] Badge ${badgeId} granted to user ${userId}.`);
    return { statusCode: 201, body: userBadge }; // 201 Created for new resource link
  } catch (error: any) {
    console.error('[ProfileController] GrantBadge error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : (error.message.includes('already have') ? 409 : 500) ;
    return { statusCode, body: { message: error.message } };
  }
};

// --- Game History Endpoints ---
export const addGameHistoryEntryController = async (req: Request, res: Response) => {
  // This endpoint might be restricted, e.g. called by game-engine-service
  try {
    const userId = req.params?.userId;
    const historyData: CreateGameHistoryEntryBody = req.body;
    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    if (!historyData.game_id || !historyData.win_loss_draw) {
        return { statusCode: 400, body: { message: 'Game ID and outcome (win_loss_draw) are required.'}};
    }

    const newEntry = await profileService.addGameHistoryEntry(userId, historyData);
    console.log(`[ProfileController] Game history entry added for user ${userId}.`);
    return { statusCode: 201, body: newEntry };
  } catch (error: any) {
    console.error('[ProfileController] AddGameHistory error:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return { statusCode, body: { message: error.message } };
  }
};

export const listGameHistoryController = async (req: Request, res: Response) => {
  try {
    const userId = req.params?.userId;
    // Basic pagination from query params (conceptual)
    const limit = parseInt(req.query?.limit as string || '10', 10);
    const offset = parseInt(req.query?.offset as string || '0', 10);

    if (!userId) {
      return { statusCode: 400, body: { message: 'User ID is required.' } };
    }
    const historyEntries = await profileService.listGameHistoryForUser(userId, limit, offset);
    console.log(`[ProfileController] Game history listed for user ${userId}.`);
    return { statusCode: 200, body: historyEntries };
  } catch (error: any) {
    console.error('[ProfileController] ListGameHistory error:', error.message);
    return { statusCode: 500, body: { message: error.message } };
  }
};

export const updateUserKyc = async (req: Request, res: Response) => {
    try {
        const userId = req.params?.id; // Assuming userId is part of the path e.g., /users/{id}/kyc
        const kycData: KycUpdateRequestBody = req.body;

        if (!userId) {
            return { statusCode: 400, body: { message: 'User ID is required in path.' } };
        }
        // Basic validation for KYC data
        if (!kycData.document_id && !kycData.status_to_set) {
             return { statusCode: 400, body: { message: 'Either document_id or status_to_set must be provided for KYC update.' } };
        }

        const profile = await profileService.updateUserKycStatus(userId, kycData);
        if (!profile) {
            return { statusCode: 404, body: { message: 'Profile not found for KYC update.' } };
        }
        console.log(`[ProfileController] KYC updated for ${userId} (simulated response).`);
        return { statusCode: 200, body: profile };
    } catch (error: any) {
        console.error('[ProfileController] UpdateKYC error:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode: statusCode, body: { message: error.message } };
    }
};
