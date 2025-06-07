import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { UserProfileView, UserProfileService } from '../../services/user-profile.service';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  profile: UserProfileView | null = null;
  editableProfile: Partial<UserProfileView> = {}; // For form binding

  isLoading = true;
  error: string | null = null;
  updateStatus: { success?: boolean, message?: string, isLoading?: boolean } = {};

  // Conceptual: Get current user's ID from AuthService or a session service
  private currentUserId = 'currentUser_mock_id';

  private userProfileService = inject(UserProfileService);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.error = null;
    this.userProfileService.getProfile(this.currentUserId)
      .pipe(
        tap(data => {
          if (data) {
            this.profile = data;
            // Initialize editableProfile with a copy of relevant fields
            this.editableProfile = {
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              avatarUrl: data.avatarUrl
            };
          } else {
            this.error = "Could not load user profile.";
          }
        }),
        catchError(err => {
          this.error = err.message || "Failed to load profile.";
          return of(null); // Gracefully handle error
        })
      )
      .subscribe(() => this.isLoading = false);
  }

  onProfileUpdate(): void {
    if (!this.profile) return;

    this.updateStatus = { isLoading: true, message: '' };
    const updateData: Partial<UserProfileView> = { ...this.editableProfile };
    // Basic validation example (conceptual)
    if (updateData.username && updateData.username.length < 3) {
        this.updateStatus = { success: false, message: 'Username must be at least 3 characters.', isLoading: false };
        return;
    }

    this.userProfileService.updateProfile(this.currentUserId, updateData).subscribe({
      next: (response) => {
        this.updateStatus = { success: response.success, message: response.message, isLoading: false };
        if (response.success && response.updatedProfile) {
          this.profile = response.updatedProfile; // Update displayed profile
           this.editableProfile = { // Re-sync editable form fields
              username: response.updatedProfile.username,
              firstName: response.updatedProfile.firstName,
              lastName: response.updatedProfile.lastName,
              phone: response.updatedProfile.phone,
              avatarUrl: response.updatedProfile.avatarUrl
            };
        }
      },
      error: (err) => {
        this.updateStatus = { success: false, message: err.message || 'Profile update failed.', isLoading: false };
      }
    });
  }
}
