import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/components/home/home.component';
import { LoginComponent } from './auth/components/login/login.component';
import { RegistrationComponent } from './auth/components/register/register.component';
import { GameLobbyComponent } from './features/games/components/game-lobby/game-lobby.component';
import { GameDetailComponent } from './features/games/components/game-detail/game-detail.component';
import { TournamentListComponent } from './features/tournaments/components/tournament-list/tournament-list.component';
import { TournamentDetailComponent } from './features/tournaments/components/tournament-detail/tournament-detail.component';
import { LeaderboardComponent } from './features/leaderboards/components/leaderboard/leaderboard.component';

export const appRoutes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegistrationComponent },

  { path: 'games', component: GameLobbyComponent },
  { path: 'games/:id', component: GameDetailComponent },

  { path: 'tournaments', component: TournamentListComponent },
  { path: 'tournaments/:id', component: TournamentDetailComponent },

  { path: 'leaderboards', component: LeaderboardComponent },

  { path: '', redirectTo: '/home', pathMatch: 'full' },
  // { path: '**', component: PageNotFoundComponent } // Placeholder
];
