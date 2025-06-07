import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface UserProfileView {
  userId: string;
  email: string; // Usually non-editable or verified separately
  phone?: string; // May require verification
  firstName?: string;
  lastName?: string;
  username?: string; // Display name, often editable
  kycStatus: 'not_started' | 'pending_verification' | 'verified' | 'rejected';
  avatarUrl?: string;
  registrationDate?: Date | string;
  // Potentially other fields like address, preferences etc.
}

// Mock data for a user profile
let MOCK_USER_PROFILE: UserProfileView = {
  userId: 'currentUser_mock_id', // Assume this is the logged-in user
  email: 'user@example.com',
  phone: '123-456-7890',
  firstName: 'John',
  lastName: 'Doe',
  username: 'JohnnyD',
  kycStatus: 'verified',
  avatarUrl: 'assets/images/avatars/avatar_user_profile.png', // Placeholder
  registrationDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // Registered 100 days ago
};

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  constructor() {}

  getProfile(userId: string): Observable<UserProfileView | undefined> {
    console.log(`[UserProfileService] Fetching profile for user ${userId} (mocked)...`);
    // In a real app, you'd fetch for the given userId. Here, always return the mock logged-in user.
    if (userId === MOCK_USER_PROFILE.userId) {
      return of({ ...MOCK_USER_PROFILE }).pipe(delay(300)); // Return a copy
    }
    return of(undefined).pipe(delay(100)); // Or handle not found if userId doesn't match
  }

  updateProfile(userId: string, data: Partial<UserProfileView>): Observable<{ success: boolean, message: string, updatedProfile?: UserProfileView }> {
    console.log(`[UserProfileService] Updating profile for user ${userId} with data:`, data, '(mocked)...');
    if (userId === MOCK_USER_PROFILE.userId) {
      // Update the MOCK_USER_PROFILE object
      MOCK_USER_PROFILE = { ...MOCK_USER_PROFILE, ...data, userId: MOCK_USER_PROFILE.userId }; // Ensure userId isn't overwritten by partial data
      return of({
        success: true,
        message: 'Profile updated successfully! (mocked)',
        updatedProfile: { ...MOCK_USER_PROFILE }
      }).pipe(delay(500));
    }
    return of({ success: false, message: 'User not found or update failed (mocked).' }).pipe(delay(200));
  }
}
