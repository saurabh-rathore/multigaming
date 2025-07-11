// Data structures specific to the 5G Tower Defense game

export type TowerType = ' базоная_станция_5g' | 'репитер_сигнала' | 'фаервол_защиты' | 'дата_центр_ускорения'; // Names in Russian as per game list
export type EnemyType = 'вирус' | 'ddos_атака' | 'троян' | 'шпионское_по'; // Names in Russian

export interface TowerDefensePlayerStats {
  player_id: string; // user_id or "AI"
  resources: number; // e.g., "data packets" or "bandwidth credits"
  base_health: number;
  score: number;
  // Could also include number of enemies defeated, towers built etc.
}

export interface Tower {
  id: string; // Unique ID for this tower instance
  type: TowerType;
  x: number; // Grid position X
  y: number; // Grid position Y
  level: number; // Upgrade level
  // Optional: target_enemy_id, attack_cooldown_timer, range, damage, etc.
  // These could be part of the current_game_state derived by game logic based on type & level
}

export interface Enemy {
  id: string; // Unique ID for this enemy instance
  type: EnemyType;
  health: number;
  max_health: number;
  speed: number; // cells per tick/second
  path_progress: number; // e.g., distance along path, or current path segment index
  x: number; // Current exact position X (could be float for smooth animation)
  y: number; // Current exact position Y
  bounty: number; // Resources awarded upon defeat
  // Optional: special abilities, resistances
}

export interface EnemyWave {
    wave_number: number;
    enemies: { type: EnemyType, count: number, spawn_delay_ms: number }[];
    // Optional: announcement, boss flag
}

export interface TowerDefenseGameState {
  room_id: string;
  game_id: "5g_tower_defense"; // Static game ID

  map_id: string; // e.g., "corporate_network", "city_grid"
  difficulty_level?: 'easy' | 'medium' | 'hard'; // For PvE

  players_stats: TowerDefensePlayerStats[]; // For PvP, this array would have 2 entries. For PvE, 1 human + 1 AI (or just human).

  towers: Tower[];
  enemies: Enemy[];

  current_wave_number: number;
  time_to_next_wave_ms?: number; // Countdown for next wave

  game_over_status: {
    is_over: boolean;
    winner_player_id?: string | null; // null for draw/AI win if AI is not a "player"
    reason?: string; // e.g., "Base destroyed", "All waves survived"
  };

  // Timestamps
  created_at: Date | string;
  started_at?: Date | string;
  last_updated_at: Date | string; // For the overall game state
  ended_at?: Date | string;
}

// --- API Request/Response types for Tower Defense actions (conceptual) ---

// Action to place a new tower
export interface PlaceTowerAction {
  type: 'PLACE_TOWER';
  player_id: string;
  tower_type: TowerType;
  x: number; // grid X
  y: number; // grid Y
}

// Action to upgrade an existing tower
export interface UpgradeTowerAction {
  type: 'UPGRADE_TOWER';
  player_id: string;
  tower_id: string; // ID of the tower instance to upgrade
}

// Action to sell a tower
export interface SellTowerAction {
    type: 'SELL_TOWER';
    player_id: string;
    tower_id: string;
}

// Action to send next wave (PvE, if player-controlled)
export interface SendNextWaveAction {
    type: 'SEND_NEXT_WAVE';
    player_id: string; // Usually for single player allowing them to trigger next wave
}

export type TowerDefensePlayerAction = PlaceTowerAction | UpgradeTowerAction | SellTowerAction | SendNextWaveAction;

// Response after a player action
export interface TowerDefenseActionResponse {
  success: boolean;
  message?: string;
  new_game_state: TowerDefenseGameState; // The full updated game state
}
