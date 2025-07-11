import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:stack_gamez_flutter/models/user_model.dart';
import 'package:stack_gamez_flutter/models/auth_response_model.dart';
import 'package:stack_gamez_flutter/utils/api_utils.dart'; // For APIError and base URL

const String _jwtKey = 'jwt_token';

class AuthApiService {
  final http.Client _client;
  final FlutterSecureStorage _secureStorage;
  final String _baseUrl = ApiUtils.baseUrl; // e.g., 'http://localhost:3001/v1/auth'

  AuthApiService({http.Client? client, FlutterSecureStorage? secureStorage})
      : _client = client ?? http.Client(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  Future<String?> _getToken() async {
    return await _secureStorage.read(key: _jwtKey);
  }

  Future<void> _setToken(String? token) async {
    if (token == null) {
      await _secureStorage.delete(key: _jwtKey);
    } else {
      await _secureStorage.write(key: _jwtKey, value: token);
    }
  }

  Future<Map<String, String>> _getHeaders({bool includeAuth = false}) async {
    final headers = {'Content-Type': 'application/json; charset=UTF-8'};
    if (includeAuth) {
      final token = await _getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<AuthResponse> registerWithPassword(RegisterRequest data) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/register'),
        headers: await _getHeaders(),
        body: jsonEncode(data.toJson()),
      );

      final responseBody = jsonDecode(response.body);
      if (response.statusCode == 201) {
        // Registration doesn't typically return a token directly, but user details.
        // The API returns UserResponse directly for register.
        return AuthResponse(user: User.fromJson(responseBody), message: "Registration successful. Please verify your phone if provided.");
      } else {
        throw ApiError(
          message: responseBody['message'] ?? 'Registration failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      // Log e for debugging
      print('Register error: $e');
      if (e is ApiError) rethrow;
      throw ApiError(message: 'An unexpected error occurred during registration.');
    }
  }

  Future<AuthResponse> loginWithPassword(LoginPasswordRequest data) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/login'),
        headers: await _getHeaders(),
        body: jsonEncode(data.toJson()),
      );

      final responseBody = jsonDecode(response.body);
      if (response.statusCode == 200) {
        final authResponse = AuthResponse.fromJson(responseBody);
        if (authResponse.token != null && authResponse.token!.isNotEmpty && !(authResponse.otpRequired)) {
          await _setToken(authResponse.token);
        }
        return authResponse;
      } else {
        throw ApiError(
          message: responseBody['message'] ?? 'Login failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('Login error: $e');
      if (e is ApiError) rethrow;
      throw ApiError(message: 'An unexpected error occurred during login.');
    }
  }

  Future<AuthResponse> requestOtp(RequestOtpRequest data) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/otp/request'),
        headers: await _getHeaders(),
        body: jsonEncode(data.toJson()),
      );
      final responseBody = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return AuthResponse.fromJson(responseBody); // Contains message and retry delay
      } else {
         throw ApiError(
          message: responseBody['message'] ?? 'Requesting OTP failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('Request OTP error: $e');
      if (e is ApiError) rethrow;
      throw ApiError(message: 'An unexpected error occurred while requesting OTP.');
    }
  }

  Future<AuthResponse> verifyOtp(VerifyOtpRequest data) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/otp/verify'),
        headers: await _getHeaders(),
        body: jsonEncode(data.toJson()),
      );
      final responseBody = jsonDecode(response.body);
       if (response.statusCode == 200) {
        final authResponse = AuthResponse.fromJson(responseBody);
         // If OTP verification was for 2FA login and token is returned
        if (data.purpose == 'login_2fa' && authResponse.token != null && authResponse.token!.isNotEmpty) {
          await _setToken(authResponse.token);
        }
        return authResponse;
      } else {
         throw ApiError(
          message: responseBody['message'] ?? 'OTP verification failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('Verify OTP error: $e');
      if (e is ApiError) rethrow;
      throw ApiError(message: 'An unexpected error occurred during OTP verification.');
    }
  }

  Future<AuthResponse> setTwoFactorAuth(SetTwoFactorAuthRequest data) async {
    try {
      final response = await _client.put(
        Uri.parse('$_baseUrl/2fa/settings'),
        headers: await _getHeaders(includeAuth: true), // This endpoint requires auth
        body: jsonEncode(data.toJson()),
      );

      final responseBody = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return AuthResponse.fromJson(responseBody); // User and message
      } else {
        throw ApiError(
          message: responseBody['message'] ?? 'Failed to update 2FA settings.',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      print('Set 2FA error: $e');
      if (e is ApiError) rethrow;
      throw ApiError(message: 'An unexpected error occurred while updating 2FA settings.');
    }
  }


  Future<void> logout() async {
    await _setToken(null);
    // Optionally, call a backend logout endpoint to invalidate session/token server-side
    // Example:
    // try {
    //   await _client.post(Uri.parse('$_baseUrl/logout'), headers: await _getHeaders(includeAuth: true));
    // } catch (e) {
    //   print('Logout error on server: $e');
    //   // Still proceed with client-side logout
    // }
  }

  Future<User?> getCurrentUser() async {
    final token = await _getToken();
    if (token == null) return null;

    // This is a conceptual endpoint. You might need to create a '/me' endpoint
    // in your auth-service that returns the current user based on the JWT.
    // Or, the user object could be stored alongside the token upon login.
    // For this example, let's assume user details are fetched/available after login.
    // If you store user object in secure storage (JSON string), retrieve and parse it here.
    // For simplicity, this example doesn't implement a /me endpoint call.
    // The AuthProvider will typically hold the user state after login.
    print("Current user retrieval is conceptual. AuthProvider typically holds user state.");
    return null; // Placeholder
  }
}
