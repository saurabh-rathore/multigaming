import { ProfileService } from '../services/profileService';
import { UpdateProfileRequestBody, KycUpdateRequestBody } from '../types/profile.types';

// Placeholder for Express request/response types.
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
