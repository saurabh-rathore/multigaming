import { Profile, UpdateProfileRequestBody, KycUpdateRequestBody } from '../types/profile.types';
import { generateId, ensureDate } from '../utils/helpers';

// Placeholder for database interactions.
// In a real app, this would use an ORM or a DB driver.
// We'll simulate some initial data as if it's linked to auth-service users.
const db = {
  // Key: user_id
  profiles: new Map<string, Profile>(),
};

// Simulate some users from auth-service having profiles
// In a real scenario, profile creation might be triggered upon user registration completion.
const mockUserIdsFromAuthService = ['id_1700000000000_abc123xyz', 'id_1700000000001_def456uvw'];

mockUserIdsFromAuthService.forEach((userId, index) => {
  db.profiles.set(userId, {
    user_id: userId,
    username: `user${index + 1}`,
    first_name: `Test`,
    last_name: `User${index + 1}`,
    email_from_auth_service: `${userId}@example.com`, // Conceptual, not in Profile type
    kyc_status: 'not_started',
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Profile); // Cast needed due to email_from_auth_service
});


export class ProfileService {
  async getProfile(userId: string): Promise<Profile | undefined> {
    console.log(`[ProfileService] Getting profile for user: ${userId}`);
    const profile = db.profiles.get(userId);
    if (!profile) {
      // Optionally, create a basic profile if one doesn't exist for a valid user ID
      // For now, just return undefined if not found.
      return undefined;
    }
    return { ...profile }; // Return a copy
  }

  async updateProfile(userId: string, data: UpdateProfileRequestBody): Promise<Profile | undefined> {
    console.log(`[ProfileService] Updating profile for user: ${userId}`);
    const profile = db.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found for this user.');
    }

    // Update only allowed fields
    const updatedProfile: Profile = { ...profile };
    if (data.username !== undefined) updatedProfile.username = data.username;
    if (data.first_name !== undefined) updatedProfile.first_name = data.first_name;
    if (data.last_name !== undefined) updatedProfile.last_name = data.last_name;
    if (data.avatar_url !== undefined) updatedProfile.avatar_url = data.avatar_url;
    if (data.date_of_birth !== undefined) updatedProfile.date_of_birth = ensureDate(data.date_of_birth);
    if (data.address_line1 !== undefined) updatedProfile.address_line1 = data.address_line1;
    if (data.address_line2 !== undefined) updatedProfile.address_line2 = data.address_line2;
    if (data.city !== undefined) updatedProfile.city = data.city;
    if (data.state_province !== undefined) updatedProfile.state_province = data.state_province;
    if (data.postal_code !== undefined) updatedProfile.postal_code = data.postal_code;
    if (data.country !== undefined) updatedProfile.country = data.country;
    if (data.bio !== undefined) updatedProfile.bio = data.bio;

    updatedProfile.updated_at = new Date();

    db.profiles.set(userId, updatedProfile);
    console.log('[ProfileService] Profile updated (simulated).');
    return { ...updatedProfile }; // Return a copy
  }

  async updateUserKycStatus(userId: string, kycData: KycUpdateRequestBody): Promise<Profile | undefined> {
    console.log(`[ProfileService] Updating KYC status for user: ${userId}`);
    const profile = db.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found for this user.');
    }

    // Simplified KYC update: sets status and document ID if provided
    if (kycData.status_to_set) {
        profile.kyc_status = kycData.status_to_set;
    }
    if (kycData.document_id) {
        profile.kyc_document_id = kycData.document_id;
        // If a document is submitted, typically status becomes 'pending_verification'
        if(!kycData.status_to_set) profile.kyc_status = 'pending_verification';
    }

    profile.updated_at = new Date();
    db.profiles.set(userId, profile);
    console.log(`[ProfileService] KYC status updated to ${profile.kyc_status} (simulated).`);
    return { ...profile };
  }

  // Basic method to create a profile if one doesn't exist (e.g., upon first login if not created at registration)
  async createProfileIfNotExists(userId: string, initialData?: Partial<Profile>): Promise<Profile> {
    let profile = db.profiles.get(userId);
    if (profile) {
        return profile;
    }
    const newProfile: Profile = {
        user_id: userId,
        kyc_status: 'not_started',
        created_at: new Date(),
        updated_at: new Date(),
        ...initialData, // Apply any initial data
    };
    db.profiles.set(userId, newProfile);
    console.log(`[ProfileService] Profile created for user ${userId} (simulated).`);
    return newProfile;
  }
}
