import 'package:flutter/foundation.dart';
import 'package:stack_gamez_flutter/models/user_model.dart';
import 'package:stack_gamez_flutter/models/auth_response_model.dart';
import 'package:stack_gamez_flutter/services/auth_api_service.dart';
import 'package:stack_gamez_flutter/utils/api_utils.dart'; // For ApiError

enum AuthStatus {
  uninitialized,
  authenticated,
  authenticating,
  unauthenticated,
  otpRequired, // When 2FA OTP is needed after password login
  phoneVerificationRequired, // After registration with phone, OTP needed for phone verification
}

class AuthProvider with ChangeNotifier {
  final AuthApiService _authApiService;

  AuthStatus _status = AuthStatus.uninitialized;
  User? _user;
  String? _errorMessage;
  String? _tempPhoneForOtp; // Store phone when OTP is requested for 2FA or verification

  AuthProvider(this._authApiService) {
    _checkCurrentUser();
  }

  // Getters
  AuthStatus get status => _status;
  User? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  String? get tempPhoneForOtp => _tempPhoneForOtp;

  void _setStatus(AuthStatus newStatus) {
    _status = newStatus;
    notifyListeners();
  }

  Future<void> _checkCurrentUser() async {
    _setStatus(AuthStatus.authenticating);
    // In a real app, you'd try to load token and fetch user details if token exists.
    // For this example, AuthApiService.getCurrentUser() is a placeholder.
    // We'll assume if a token was stored, user is "authenticated" until a protected API call fails.
    // A robust solution would involve validating the token with the backend.
    final token = await _authApiService.getCurrentUser(); // Conceptual: checks token presence
    if (token != null) { // Replace with actual token check & user fetch
        // Potentially fetch user details from a /me endpoint
        // For now, if token exists, assume authenticated. User details should be loaded.
        // This part needs to be more robust in a real app.
        // _user = await _authApiService.fetchUserDetails(); // Example
      _setStatus(AuthStatus.unauthenticated); // Default to unauth, login will set it
    } else {
      _setStatus(AuthStatus.unauthenticated);
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    String? phone,
  }) async {
    _setStatus(AuthStatus.authenticating);
    _errorMessage = null;
    try {
      final request = RegisterRequest(email: email, password: password, phone: phone);
      final response = await _authApiService.registerWithPassword(request);
      _user = response.user; // User created but might need phone verification

      if (phone != null && phone.isNotEmpty) {
        _tempPhoneForOtp = phone;
        _setStatus(AuthStatus.phoneVerificationRequired);
        // Message from response.message could be useful here
      } else {
        // If no phone, or phone verification is not a blocking step post-registration
        // for immediate login, then user is just "unauthenticated" but registered.
        // Typically after registration, user still needs to login.
         _setStatus(AuthStatus.unauthenticated); // User registered, can now login
      }
      _errorMessage = response.message; // "Registration successful..."
      notifyListeners();
      return true;
    } on ApiError catch (e) {
      _errorMessage = e.message;
      _setStatus(AuthStatus.unauthenticated);
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
      _setStatus(AuthStatus.unauthenticated);
      return false;
    }
  }

  Future<bool> loginWithPassword({
    required String email,
    required String password,
  }) async {
    _setStatus(AuthStatus.authenticating);
    _errorMessage = null;
    try {
      final request = LoginPasswordRequest(email: email, password: password);
      final response = await _authApiService.loginWithPassword(request);

      if (response.otpRequired) {
        _user = response.user; // Store partial user info (ID, email, phone)
        _tempPhoneForOtp = response.user?.phone;
        _setStatus(AuthStatus.otpRequired);
        _errorMessage = response.message; // "OTP required for 2FA"
        notifyListeners();
        return true; // Indicate success in reaching OTP step
      } else if (response.token != null && response.user != null) {
        _user = response.user;
        _setStatus(AuthStatus.authenticated);
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.message ?? 'Login failed: No token or user returned.';
        _setStatus(AuthStatus.unauthenticated);
        return false;
      }
    } on ApiError catch (e) {
      _errorMessage = e.message;
      _setStatus(AuthStatus.unauthenticated);
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred during login.';
      _setStatus(AuthStatus.unauthenticated);
      return false;
    }
  }

  Future<bool> requestOtp({required String phone, String? purpose = "verification"}) async {
    _setStatus(AuthStatus.authenticating); // Or a more specific status like AuthStatus.otpRequesting
    _errorMessage = null;
    try {
      _tempPhoneForOtp = phone; // Store phone for verification step
      final request = RequestOtpRequest(phone: phone, purpose: purpose);
      final response = await _authApiService.requestOtp(request);
      _errorMessage = response.message; // "OTP Sent"
      // Status remains authenticating or moves to a specific OTP_SENT status
      // For phone verification flow, it might go from phoneVerificationRequired -> otp_sent_for_phone_verification
      // For 2FA, it might go from otpRequired -> otp_sent_for_2fa
      notifyListeners(); // Update message
      return true;
    } on ApiError catch (e) {
      _errorMessage = e.message;
      // Revert to previous relevant status, e.g. if it was otpRequired, stay there
      if (_status == AuthStatus.authenticating && _tempPhoneForOtp != null) {
        // This means it was likely for 2FA or phone verification
         // Keep _tempPhoneForOtp so UI can retry with same number
      } else {
        _setStatus(AuthStatus.unauthenticated);
      }
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred while requesting OTP.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp({required String otp, required String phone, String? purpose = "verification"}) async {
    // _setStatus(AuthStatus.authenticating); // Or a more specific status like AuthStatus.otpVerifying
    _errorMessage = null;
    try {
      final request = VerifyOtpRequest(phone: phone, otp: otp, purpose: purpose);
      final response = await _authApiService.verifyOtp(request);

      if (response.user != null) {
         _user = response.user; // Update user (e.g., phone_verified status)
      }

      if (purpose == 'login_2fa' && response.token != null) {
        _setStatus(AuthStatus.authenticated);
      } else if (purpose == 'verification' && _user?.phoneVerified == true) {
        // Phone verified, user might still need to log in or was already logged in and just verified phone
        // If coming from registration flow:
        if(_status == AuthStatus.phoneVerificationRequired || _status == AuthStatus.authenticating) {
            _setStatus(AuthStatus.unauthenticated); // Phone verified, now they can log in.
            _errorMessage = "Phone verified successfully. Please login.";
        } else {
            // If user was already authenticated (e.g. verifying phone from profile)
            // _status remains AuthStatus.authenticated
             _errorMessage = response.message;
        }
      } else {
        // Default case or if OTP was for another purpose
        _errorMessage = response.message;
      }

      _tempPhoneForOtp = null; // Clear temporary phone after successful verification
      notifyListeners();
      return true;

    } on ApiError catch (e) {
      _errorMessage = e.message;
      // Status should remain as it was (e.g. otpRequired or phoneVerificationRequired)
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred during OTP verification.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> setTwoFactorAuth(bool enable) async {
    if (_user == null) {
      _errorMessage = "User not logged in.";
      notifyListeners();
      return false;
    }
    _setStatus(AuthStatus.authenticating); // Or a more specific status
    _errorMessage = null;
    try {
      final request = SetTwoFactorAuthRequest(enable: enable);
      final response = await _authApiService.setTwoFactorAuth(request);
      if (response.user != null) {
        _user = response.user; // Update user with new 2FA status
        _setStatus(AuthStatus.authenticated); // Remain authenticated
        _errorMessage = response.message;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.message ?? "Failed to update 2FA status.";
        _setStatus(AuthStatus.authenticated); // Remain authenticated but show error
        notifyListeners();
        return false;
      }
    } on ApiError catch (e) {
      _errorMessage = e.message;
      _setStatus(AuthStatus.authenticated); // Remain authenticated
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
      _setStatus(AuthStatus.authenticated); // Remain authenticated
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authApiService.logout();
    _user = null;
    _tempPhoneForOtp = null;
    _setStatus(AuthStatus.unauthenticated);
    notifyListeners();
  }

  // Helper to clear error messages from UI
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
