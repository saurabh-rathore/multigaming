import 'package:flutter/foundation.dart';
import 'package:stack_gamez_flutter/models/user_model.dart';

@immutable
class AuthResponse {
  final String? token;
  final User? user;
  final String message;
  final bool otpRequired; // True if 2FA is needed after password login
  final int? otpRetryDelaySeconds; // For OTP request responses

  const AuthResponse({
    this.token,
    this.user,
    required this.message,
    this.otpRequired = false,
    this.otpRetryDelaySeconds,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String?,
      user: json['user'] != null
          ? User.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      message: json['message'] as String? ?? '',
      otpRequired: json['otp_required'] as bool? ?? false,
      otpRetryDelaySeconds: json['otp_retry_delay_seconds'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'user': user?.toJson(),
      'message': message,
      'otp_required': otpRequired,
      'otp_retry_delay_seconds': otpRetryDelaySeconds,
    };
  }
}

// Specific request body models (optional but good for clarity)

@immutable
class LoginPasswordRequest {
  final String email;
  final String password;

  const LoginPasswordRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}

@immutable
class RegisterRequest {
  final String email;
  final String password;
  final String? phone;

  const RegisterRequest({required this.email, required this.password, this.phone});

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
        if (phone != null) 'phone': phone,
      };
}

@immutable
class RequestOtpRequest {
  final String phone;
  final String? purpose; // e.g., "verification", "login_2fa"

  const RequestOtpRequest({required this.phone, this.purpose});

  Map<String, dynamic> toJson() => {
        'phone': phone,
        if (purpose != null) 'purpose': purpose,
      };
}

@immutable
class VerifyOtpRequest {
  final String phone;
  final String otp;
  final String? purpose;

  const VerifyOtpRequest({required this.phone, required this.otp, this.purpose});

  Map<String, dynamic> toJson() => {
        'phone': phone,
        'otp': otp,
        if (purpose != null) 'purpose': purpose,
      };
}

@immutable
class SetTwoFactorAuthRequest {
    final bool enable;

    const SetTwoFactorAuthRequest({required this.enable});

    Map<String, dynamic> toJson() => {'enable': enable};
}
