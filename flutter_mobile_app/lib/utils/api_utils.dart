// A utility class for API related constants and helper functions

class ApiUtils {
  // TODO: Update with your actual backend base URL
  // For local development with Node.js Express typically on port 3000 or similar:
  // If using Android Emulator, '10.0.2.2' maps to your host machine's localhost.
  // If using iOS Simulator or physical device, use your machine's network IP.
  static const String _localBaseUrl = 'http://10.0.2.2:3001/v1/auth'; // Example for Android Emulator
  // static const String _prodBaseUrl = 'https://api.yourdomain.com/v1/auth'; // Example for production

  // Determine base URL based on environment (conceptual)
  static String get baseUrl {
    // In a real app, you might use flutter_dotenv or compile-time variables
    // For simplicity, defaulting to local for now.
    bool isProduction = const bool.fromEnvironment('dart.vm.product');
    // return isProduction ? _prodBaseUrl : _localBaseUrl;
    return _localBaseUrl; // Defaulting to local for this example
  }
}

// Custom error class for API errors
class ApiError implements Exception {
  final String message;
  final int? statusCode; // HTTP status code
  final dynamic errorBody; // Original error body from response, if any

  ApiError({required this.message, this.statusCode, this.errorBody});

  @override
  String toString() {
    return 'ApiError: $message (Status Code: ${statusCode ?? 'N/A'})';
  }
}

// You can add other API related utility functions here, e.g.,
// - A function to handle common response parsing and error checking.
// - Interceptors if using a more advanced HTTP client like Dio.
