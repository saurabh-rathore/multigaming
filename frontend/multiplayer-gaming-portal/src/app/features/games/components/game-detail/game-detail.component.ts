import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Game, GameService } from '../../services/game.service'; // Adjusted path
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.scss']
})
export class GameDetailComponent implements OnInit {
  // Using @Input with route parameter binding (needs withComponentInputBinding in provideRouter)
  @Input() id?: string; // Receives 'id' from route '/games/:id'

  game$: Observable<Game | undefined> | undefined;
  isLoading = true;
  error: string | null = null;

  // private route = inject(ActivatedRoute); // Alternative way to get route params
  private gameService = inject(GameService);

  ngOnInit(): void {
    if (this.id) {
        this.isLoading = true;
        this.game$ = this.gameService.getGameById(this.id);
        this.game$.subscribe({
            next: (game) => {
                this.isLoading = false;
                if (!game) {
                    this.error = 'Game not found.';
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.error = 'Failed to load game details.';
                console.error(err);
            }
        });
    } else {
        this.error = 'No game ID provided.';
        this.isLoading = false;
    }

    // Alternative if not using @Input route binding:
    // this.game$ = this.route.paramMap.pipe(
    //   switchMap(params => {
    //     const gameId = params.get('id');
    //     if (gameId) {
    //       return this.gameService.getGameById(gameId);
    //     }
    //     return of(undefined);
    //   })
    // );
  }
}
