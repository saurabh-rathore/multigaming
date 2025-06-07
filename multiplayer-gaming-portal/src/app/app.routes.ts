import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { LoginComponent } from './auth/components/login/login.component';
import { RegistrationComponent } from './auth/components/register/register.component';

export const appRoutes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegistrationComponent },
  // { path: 'games', component: GameLobbyComponent }, // Placeholder for future components
  // { path: 'tournaments', component: TournamentListComponent },
  // { path: 'leaderboards', component: LeaderboardComponent },
  // { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] }, // Conceptual guard
  // { path: 'wallet', component: WalletComponent, canActivate: [AuthGuard] },

  { path: '', redirectTo: '/home', pathMatch: 'full' }, // Default route
  // { path: '**', component: PageNotFoundComponent } // Wildcard route for 404
];
