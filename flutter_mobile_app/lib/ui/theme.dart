import 'package:flutter/material.dart';

class AppTheme {
  // Private constructor
  AppTheme._();

  static final Color _lightPrimaryColor = Colors.blueGrey.shade800;
  static final Color _lightPrimaryVariantColor = Colors.blueGrey.shade900;
  static final Color _lightOnPrimaryColor = Colors.white;
  static final Color _lightSecondaryColor = Colors.teal.shade300;
  static final Color _lightOnErrorColor = Colors.white;
  static final Color _lightBackground = Colors.grey.shade100; // Lighter background

  static final Color _darkPrimaryColor = Colors.teal.shade700;
  static final Color _darkPrimaryVariantColor = Colors.teal.shade800;
  static final Color _darkOnPrimaryColor = Colors.white;
  static final Color _darkSecondaryColor = Colors.blueGrey.shade300;
  static final Color _darkOnErrorColor = Colors.black; // Or a dark grey
  static final Color _darkBackground = Colors.grey.shade900; // Darker background

  static final ThemeData lightTheme = ThemeData(
    scaffoldBackgroundColor: _lightBackground,
    brightness: Brightness.light,
    primaryColor: _lightPrimaryColor,
    colorScheme: ColorScheme.light(
      primary: _lightPrimaryColor,
      primaryContainer: _lightPrimaryVariantColor, // Adjusted from primaryVariant
      secondary: _lightSecondaryColor,
      onPrimary: _lightOnPrimaryColor,
      background: _lightBackground,
      surface: Colors.white, // Card backgrounds, dialogs etc.
      error: Colors.red.shade400,
      onError: _lightOnErrorColor,
      onSecondary: Colors.black, // Text on secondary color
      onBackground: Colors.black87, // Text on background color
      onSurface: Colors.black87, // Text on surface color (cards, dialogs)
    ),
    appBarTheme: AppBarTheme(
      color: _lightPrimaryColor,
      iconTheme: const IconThemeData(color: _lightOnPrimaryColor),
      titleTextStyle: const TextStyle(color: _lightOnPrimaryColor, fontSize: 20, fontWeight: FontWeight.w500),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _lightPrimaryColor,
        foregroundColor: _lightOnPrimaryColor,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: _lightPrimaryColor.withOpacity(0.7)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: _lightPrimaryColor, width: 2.0),
      ),
      labelStyle: TextStyle(color: _lightPrimaryColor),
    ),
    textTheme: _lightTextTheme,
    // Add other theme properties as needed
  );

  static final ThemeData darkTheme = ThemeData(
    scaffoldBackgroundColor: _darkBackground,
    brightness: Brightness.dark,
    primaryColor: _darkPrimaryColor,
    colorScheme: ColorScheme.dark(
      primary: _darkPrimaryColor,
      primaryContainer: _darkPrimaryVariantColor, // Adjusted from primaryVariant
      secondary: _darkSecondaryColor,
      onPrimary: _darkOnPrimaryColor,
      background: _darkBackground,
      surface: Colors.grey.shade800, // Darker cards, dialogs
      error: Colors.red.shade300,
      onError: _darkOnErrorColor,
      onSecondary: Colors.white,
      onBackground: Colors.white70,
      onSurface: Colors.white70,
    ),
    appBarTheme: AppBarTheme(
      color: _darkPrimaryColor,
      iconTheme: const IconThemeData(color: _darkOnPrimaryColor),
      titleTextStyle: const TextStyle(color: _darkOnPrimaryColor, fontSize: 20, fontWeight: FontWeight.w500),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _darkPrimaryColor,
        foregroundColor: _darkOnPrimaryColor,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: _darkPrimaryColor.withOpacity(0.7)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: _darkPrimaryColor, width: 2.0),
      ),
      labelStyle: TextStyle(color: _darkPrimaryColor),
      hintStyle: TextStyle(color: Colors.grey.shade400),
    ),
    textTheme: _darkTextTheme,
    // Add other theme properties as needed
  );

  static const TextTheme _lightTextTheme = TextTheme(
    displayLarge: TextStyle(fontSize: 32.0, fontWeight: FontWeight.bold, color: Colors.black87),
    displayMedium: TextStyle(fontSize: 28.0, fontWeight: FontWeight.bold, color: Colors.black87),
    displaySmall: TextStyle(fontSize: 24.0, fontWeight: FontWeight.bold, color: Colors.black87),
    headlineMedium: TextStyle(fontSize: 20.0, fontWeight: FontWeight.bold, color: Colors.black87),
    headlineSmall: TextStyle(fontSize: 18.0, fontWeight: FontWeight.bold, color: Colors.black87),
    titleLarge: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: Colors.black87),
    bodyLarge: TextStyle(fontSize: 16.0, color: Colors.black87),
    bodyMedium: TextStyle(fontSize: 14.0, color: Colors.black54),
    labelLarge: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: _lightOnPrimaryColor), // For button text
  );

  static final TextTheme _darkTextTheme = TextTheme(
    displayLarge: TextStyle(fontSize: 32.0, fontWeight: FontWeight.bold, color: Colors.white),
    displayMedium: TextStyle(fontSize: 28.0, fontWeight: FontWeight.bold, color: Colors.white),
    displaySmall: TextStyle(fontSize: 24.0, fontWeight: FontWeight.bold, color: Colors.white),
    headlineMedium: TextStyle(fontSize: 20.0, fontWeight: FontWeight.bold, color: Colors.white),
    headlineSmall: TextStyle(fontSize: 18.0, fontWeight: FontWeight.bold, color: Colors.white),
    titleLarge: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: Colors.white),
    bodyLarge: TextStyle(fontSize: 16.0, color: Colors.white70),
    bodyMedium: TextStyle(fontSize: 14.0, color: Colors.white54),
    labelLarge: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: _darkOnPrimaryColor), // For button text
  );
}
