import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { LoginComponent } from './auth/components/login/login.component';
import { RegistrationComponent } from './auth/components/register/register.component';
import { OtpVerificationComponent } from './auth/components/otp-verification/otp-verification.component'; // Import OTP component
import { GameLobbyComponent } from './features/games/components/game-lobby/game-lobby.component';
import { GameDetailComponent } from './features/games/components/game-detail/game-detail.component';
import { TournamentListComponent } from './features/tournaments/components/tournament-list/tournament-list.component';
import { TournamentDetailComponent } from './features/tournaments/components/tournament-detail/tournament-detail.component';
import { LeaderboardComponent } from './features/leaderboards/components/leaderboard/leaderboard.component';
import { FriendListComponent } from './features/social/components/friend-list/friend-list.component';
import { UserProfileComponent } from './features/user/components/user-profile/user-profile.component';
import { WalletComponent } from './features/wallet/components/wallet/wallet.component';
import { LudoGameComponent } from './features/games/components/ludo-game/ludo-game.component'; // Import LudoGameComponent
import { AuthGuard, NonAuthGuard } from './auth/guards/auth.guard'; // Import guards

export const appRoutes: Routes = [
  { path: 'home', component: HomeComponent }, // Public
  { path: 'login', component: LoginComponent, canActivate: [NonAuthGuard] },
  { path: 'register', component: RegistrationComponent, canActivate: [NonAuthGuard] },
  { path: 'verify-otp', component: OtpVerificationComponent, canActivate: [NonAuthGuard] }, // Should only be accessible during auth flow

  { path: 'games', component: GameLobbyComponent }, // Public or AuthGuard depending on requirements
  { path: 'games/ludo/:roomId', component: LudoGameComponent }, // Route for Ludo game room
  { path: 'games/:id', component: GameDetailComponent }, // Generic game detail (Ludo might use its own or this)


  { path: 'tournaments', component: TournamentListComponent },
  { path: 'tournaments/:id', component: TournamentDetailComponent },

  { path: 'leaderboards', component: LeaderboardComponent },
  { path: 'social/friends', component: FriendListComponent }, // Example: AuthGuard if it shows user-specific friend list

  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'wallet', component: WalletComponent, canActivate: [AuthGuard] },
  // Example: Game playing routes should likely be protected by AuthGuard
  // { path: 'games/play/:gameId', component: GamePlayComponent, canActivate: [AuthGuard] },


  { path: '', redirectTo: '/home', pathMatch: 'full' },
  // { path: '**', component: PageNotFoundComponent } // Placeholder for Page Not Found
];
