import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:stack_gamez_flutter/ui/screens/splash_screen.dart'; // Placeholder for splash screen
import 'package:stack_gamez_flutter/providers/auth_provider.dart'; // Placeholder for AuthProvider
import 'package:stack_gamez_flutter/services/auth_api_service.dart'; // Placeholder for AuthService
import 'package:stack_gamez_flutter/ui/theme.dart'; // Placeholder for AppTheme

void main() {
  // Initialize services if needed, e.g. Http client setup
  final authApiService = AuthApiService(); // Initialize your API service

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AuthProvider(authApiService),
        ),
        // Add other providers here if needed (e.g., ThemeProvider, UserProvider)
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StackGamez',
      theme: AppTheme.lightTheme, // Define your app theme
      darkTheme: AppTheme.darkTheme, // Optional: define a dark theme
      themeMode: ThemeMode.system, // Or ThemeMode.light, ThemeMode.dark
      home: const SplashScreen(), // Start with a splash screen
      // Define routes if you are using named routes
      // routes: {
      //   '/login': (context) => LoginScreen(),
      //   '/register': (context) => RegisterScreen(),
      //   '/home': (context) => HomeScreen(),
      // },
    );
  }
}
