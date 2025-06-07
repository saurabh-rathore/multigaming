import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http'; // Conceptual import
import { Observable, of, throwError } from 'rxjs'; // Using 'of' for mock success, 'throwError' for mock failure
import { delay, tap } from 'rxjs/operators';

// Conceptual User and Token types (mirroring backend or defining frontend view)
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    // other relevant user fields
  };
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends UserCredentials {
  phone?: string;
  // add other fields like firstName, lastName if handled at registration
}

@Injectable({
  providedIn: 'root' // Provided in root for singleton instance
})
export class AuthService {
  // private apiUrl = '/api/v1/auth'; // Conceptual backend API base path

  // constructor(private http: HttpClient) {} // Conceptual constructor

  constructor() {} // Constructor without actual HttpClient for simulation

  login(credentials: UserCredentials): Observable<AuthResponse> {
    console.log('[AuthService] Attempting login for:', credentials.email);
    // Conceptual HTTP POST call:
    // return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);

    // Simulated response:
    if (credentials.email === 'test@example.com' && credentials.password === 'password') {
      const mockUser = { id: 'user_mock_id_123', email: credentials.email };
      const mockResponse: AuthResponse = {
        token: 'mock_jwt_token_xyz123abc',
        user: mockUser
      };
      return of(mockResponse).pipe(
        delay(500), // Simulate network delay
        tap(() => console.log('[AuthService] Login successful (mocked) for:', credentials.email))
      );
    } else {
      return throwError(() => new Error('Invalid credentials (mocked)')).pipe(delay(500));
    }
  }

  register(data: RegistrationData): Observable<{ message: string; userId?: string }> {
    console.log('[AuthService] Attempting registration for:', data.email);
    // Conceptual HTTP POST call:
    // return this.http.post<{ message: string, userId?: string }>(`${this.apiUrl}/register`, data);

    // Simulated response:
    if (data.email === 'existing@example.com') {
      return throwError(() => new Error('Email already exists (mocked)')).pipe(delay(500));
    }

    const mockResponse = {
        message: 'Registration successful (mocked)! Please check your email to verify.',
        userId: `user_mock_id_${Date.now()}`
    };
    return of(mockResponse).pipe(
      delay(500),
      tap(() => console.log('[AuthService] Registration successful (mocked) for:', data.email))
    );
  }

  // Placeholder for logout
  logout(): void {
    console.log('[AuthService] Logging out (mocked).');
    // Clear stored token, update auth status, etc.
  }

  // Placeholder for checking auth status
  isAuthenticated(): boolean {
    // Check for stored token (e.g., in localStorage)
    return false; // Placeholder
  }
}
