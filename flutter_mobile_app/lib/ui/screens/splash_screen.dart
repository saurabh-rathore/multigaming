import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:stack_gamez_flutter/providers/auth_provider.dart';
// import 'package:stack_gamez_flutter/ui/screens/home_screen.dart'; // Placeholder for Home Screen
// import 'package:stack_gamez_flutter/ui/screens/login_screen.dart'; // Placeholder for Login Screen

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthStatusAndNavigate();
  }

  Future<void> _checkAuthStatusAndNavigate() async {
    // Ensure the AuthProvider has had a chance to initialize
    // Small delay to allow AuthProvider to potentially update its status from _checkCurrentUser
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    // This navigation logic is basic. In a real app, you might have more complex flows.
    // For example, if authProvider.status is still uninitialized, you might wait longer or show an error.

    // TODO: Replace with actual navigation to Login/Home screens
    if (authProvider.isAuthenticated) {
      // Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      print("User is authenticated, navigate to HomeScreen (Not implemented yet)");
       Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const PlaceholderScreen(title: "Home Screen (Placeholder)")));
    } else {
      // Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
      print("User is not authenticated, navigate to LoginScreen (Not implemented yet)");
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const PlaceholderScreen(title: "Login Screen (Placeholder)")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 20),
            Text(
              'StackGamez',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text('Loading...'),
          ],
        ),
      ),
    );
  }
}


// Temporary placeholder screen for navigation
class PlaceholderScreen extends StatelessWidget {
  final String title;
  const PlaceholderScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(child: Text('This is the $title')),
    );
  }
}
