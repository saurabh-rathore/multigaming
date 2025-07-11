import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { User } from '../models/user.model';
import {
  AuthSuccessResponse,
  UserLoginRequest,
  UserRegistrationRequest,
  OtpRequest,
  OtpResponse,
  OtpVerificationRequest,
  OtpVerificationSuccessResponse,
  SetTwoFactorAuthRequest,
  SetTwoFactorAuthResponse,
  AuthStatus,
  ApiErrorResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // TODO: Use environment variable for API URL
  private apiUrl = 'http://localhost:3001/v1/auth'; // Base URL for the auth-service
  private readonly jwtTokenKey = 'stackgamez_jwt_token';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private authStatusSubject = new BehaviorSubject<AuthStatus>(AuthStatus.Uninitialized);
  public authStatus$ = this.authStatusSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Temporary storage for phone number when OTP is required (e.g. for 2FA or phone verification)
  private tempPhoneForOtp: string | null = null;


  constructor(private http: HttpClient, private router: Router) {
    this.loadInitialUser();
  }

  private get httpOptions(): { headers: HttpHeaders } {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return { headers };
  }

  private get authenticatedHttpOptions(): { headers: HttpHeaders } {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const token = this.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers };
  }

  private updateState(status: AuthStatus, user: User | null = null, error: string | null = null, loading: boolean = false): void {
    this.authStatusSubject.next(status);
    this.currentUserSubject.next(user);
    this.errorSubject.next(error);
    this.loadingSubject.next(loading);
  }

  private async loadInitialUser() {
    this.updateState(AuthStatus.Authenticating, null, null, true);
    const token = this.getToken();
    if (token) {
      // TODO: Add a /me endpoint to validate token and fetch user
      // For now, if token exists, we assume it might be valid but don't have user details.
      // A robust app would verify the token with the backend here.
      // If /me endpoint existed:
      // try {
      //   const user = await this.http.get<User>(`${this.apiUrl}/me`, this.authenticatedHttpOptions).toPromise();
      //   this.updateState(AuthStatus.Authenticated, user, null, false);
      // } catch (error) {
      //   this.logout(); // Token invalid or expired
      // }
      // Simplified: if token exists, try to parse it (if it contains user data - not ideal) or just wait for guarded routes.
      // For now, we'll just set to unauthenticated and let login re-authenticate.
      // This avoids showing authenticated state with an invalid/expired token without backend validation.
      console.warn("AuthService: Token found, but /me endpoint not implemented for validation. User needs to login.");
      this.updateState(AuthStatus.Unauthenticated, null, null, false);
    } else {
      this.updateState(AuthStatus.Unauthenticated, null, null, false);
    }
  }

  public getToken(): string | null {
    return localStorage.getItem(this.jwtTokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.jwtTokenKey, token);
  }

  private clearToken(): void {
    localStorage.removeItem(this.jwtTokenKey);
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get currentAuthStatus(): AuthStatus {
    return this.authStatusSubject.value;
  }

  public getTemporaryPhoneForOtp(): string | null {
    return this.tempPhoneForOtp;
  }

  register(data: UserRegistrationRequest): Observable<User> {
    this.updateState(AuthStatus.Authenticating, null, null, true);
    return this.http.post<User>(`${this.apiUrl}/register`, data, this.httpOptions).pipe(
      tap((user) => {
        // User is registered. If phone was provided, backend sends OTP.
        // Frontend should guide user to OTP verification for phone.
        this.tempPhoneForOtp = user.phone || null;
        this.updateState(
            user.phone ? AuthStatus.PhoneVerificationRequired : AuthStatus.Unauthenticated,
            null, // User is not logged in yet, just registered
            user.phone ? 'Registration successful. Please verify your phone.' : 'Registration successful. Please login.'
        );
      }),
      catchError(this.handleError.bind(this))
    );
  }

  login(credentials: UserLoginRequest): Observable<AuthSuccessResponse> {
    this.updateState(AuthStatus.Authenticating, null, null, true);
    return this.http.post<AuthSuccessResponse>(`${this.apiUrl}/login`, credentials, this.httpOptions).pipe(
      tap((response) => {
        if (response.otp_required && response.user.phone) {
          this.tempPhoneForOtp = response.user.phone;
          // Store partial user info if needed for OTP screen, but don't set as fully authenticated yet
          this.updateState(AuthStatus.OtpRequired, response.user, 'OTP required for 2FA.');
        } else if (response.token && response.user) {
          this.setToken(response.token);
          this.updateState(AuthStatus.Authenticated, response.user, null, false);
          this.tempPhoneForOtp = null;
        } else {
           // Should not happen if backend response is correct
          throw new Error('Invalid login response from server.');
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  requestOtp(data: OtpRequest): Observable<OtpResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    // Retain current auth status (e.g. OtpRequired or PhoneVerificationRequired)
    // but indicate loading for the OTP request itself.
    return this.http.post<OtpResponse>(`${this.apiUrl}/otp/request`, data, this.httpOptions).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        this.tempPhoneForOtp = data.phone; // Ensure temp phone is set for verify step
      }),
      catchError((err) => {
        this.loadingSubject.next(false);
        const apiError = this.parseApiError(err);
        this.errorSubject.next(apiError.message);
        return throwError(() => apiError);
      })
    );
  }

  verifyOtp(data: OtpVerificationRequest): Observable<OtpVerificationSuccessResponse> {
    this.loadingSubject.next(true); // Loading specifically for OTP verification
    this.errorSubject.next(null);

    return this.http.post<OtpVerificationSuccessResponse>(`${this.apiUrl}/otp/verify`, data, this.httpOptions).pipe(
      tap((response) => {
        let newStatus = this.authStatusSubject.value; // Keep current status unless changed by logic below
        let userToUpdate = this.currentUserSubject.value;

        if (response.user) {
            userToUpdate = response.user; // Update user details (e.g. phone_verified)
        }

        if (data.purpose === 'login_2fa' && response.token && response.user) {
          this.setToken(response.token);
          newStatus = AuthStatus.Authenticated;
          userToUpdate = response.user;
          this.tempPhoneForOtp = null;
        } else if (data.purpose === 'verification' && response.user?.phone_verified) {
           if (this.authStatusSubject.value === AuthStatus.PhoneVerificationRequired) {
             // Coming from registration, phone is now verified. User still needs to login.
             newStatus = AuthStatus.Unauthenticated;
             this.errorSubject.next('Phone verified successfully. Please login.');
           } else if (this.authStatusSubject.value === AuthStatus.Authenticated && userToUpdate) {
             // User was already logged in, just verified/re-verified phone from profile
             newStatus = AuthStatus.Authenticated; // Stays authenticated
           }
           this.tempPhoneForOtp = null;
        }
        // Update state based on the outcome
        this.updateState(newStatus, userToUpdate, response.message, false);
      }),
      catchError(this.handleError.bind(this)) // Uses the generalized handleError
    );
  }

  setTwoFactorAuth(enable: boolean): Observable<SetTwoFactorAuthResponse> {
    this.updateState(this.authStatusSubject.value, this.currentUserSubject.value, null, true);
    const requestData: SetTwoFactorAuthRequest = { enable };
    return this.http.put<SetTwoFactorAuthResponse>(`${this.apiUrl}/2fa/settings`, requestData, this.authenticatedHttpOptions).pipe(
        tap((response) => {
            this.updateState(AuthStatus.Authenticated, response.user, response.message, false);
        }),
        catchError(this.handleError.bind(this))
    );
  }

  logout(): void {
    // Optionally call a backend logout endpoint
    // this.http.post(`${this.apiUrl}/logout`, {}, this.authenticatedHttpOptions).subscribe();
    this.clearToken();
    this.tempPhoneForOtp = null;
    this.updateState(AuthStatus.Unauthenticated, null, null, false);
    this.router.navigate(['/login']); // Or your designated logout route
  }

  private parseApiError(error: HttpErrorResponse): ApiErrorResponse {
    let errorMessage = 'An unknown error occurred.';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      // Backend returned a JSON error response
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { message: errorMessage, statusCode: error.status, error: error.statusText };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const apiError = this.parseApiError(error);
    this.updateState(AuthStatus.Error, this.currentUserSubject.value, apiError.message, false);
    // Depending on the error type, you might want to set a more specific AuthStatus than generic Error
    // For example, if it's a 401 on an authenticated request, you might logout the user.
    if (error.status === 401 && this.getToken()) { // If it was an authenticated request that failed
        console.warn("Unauthorized (401) response on authenticated request. Logging out.");
        this.logout(); // Token might be invalid/expired
    } else {
        // For other errors (e.g. validation 400, server 500), keep current user if any, but show error.
        // The AuthStatus.Error helps UI to know there's a general problem.
        // Components can subscribe to error$ to display messages.
    }
    return throwError(() => apiError);
  }

  // Call this from components to clear UI errors after they've been displayed
  public clearError(): void {
    this.errorSubject.next(null);
    // If current status is Error, revert to a more sensible previous status
    if (this.authStatusSubject.value === AuthStatus.Error) {
        this.authStatusSubject.next(this.currentUserSubject.value ? AuthStatus.Authenticated : AuthStatus.Unauthenticated);
    }
  }
}
