import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component';
import { GameComponent } from './game/game.component';
import { ProfileComponent } from './profile/profile.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { ChatComponent } from './chat/chat.component';
import { FriendsListComponent } from './friends-list/friends-list.component';
import { PrivateChatComponent } from './private-chat/private-chat.component';
import { GuildsComponent } from './guilds/guilds.component';
import { TournamentsComponent } from './tournaments/tournaments.component';
import { QuestsComponent } from './quests/quests.component';
import { MatchmakingComponent } from './matchmaking/matchmaking.component';
import { LobbyComponent } from './lobby/lobby.component';
import { ReplaysComponent } from './replays/replays.component';
import { ChessComponent } from './chess/chess.component';
import { LudoComponent } from './ludo/ludo.component';
import { SnakeComponent } from './snake/snake.component';
import { PongComponent } from './pong/pong.component';
import { CheckersComponent } from './checkers/checkers.component';
import { BattleshipComponent } from './battleship/battleship.component';
import { ShopComponent } from './shop/shop.component';
import { VoiceChatComponent } from './voice-chat/voice-chat.component';

const config: SocketIoConfig = { url: 'http://localhost:3000', options: {} };

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    GameComponent,
    ProfileComponent,
    LeaderboardComponent,
    ChatComponent,
    FriendsListComponent,
    PrivateChatComponent,
    GuildsComponent,
    TournamentsComponent,
    QuestsComponent,
    MatchmakingComponent,
    LobbyComponent,
    ReplaysComponent,
    ChessComponent,
    LudoComponent,
    SnakeComponent,
    PongComponent,
    CheckersComponent,
    BattleshipComponent,
    ShopComponent,
    VoiceChatComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    SocketIoModule.forRoot(config)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
