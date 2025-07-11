import {
    TowerDefenseGameState,
    TowerDefensePlayerAction,
    Tower,
    Enemy,
    TowerDefensePlayerStats,
    EnemyWave
} from '../../types/tower_defense.types';
import { generateId } from '../../utils/helpers'; // Assuming generateId is in a shared utils

const DEFAULT_BASE_HEALTH = 100;
const INITIAL_RESOURCES = 200;

// --- Game Configuration Data (would typically be loaded from JSON files or DB) ---
const TOWER_DEFINITIONS = {
    'базовая_станция_5g': { base_cost: 100, base_damage: 10, base_range: 3, base_firerate_ms: 1000, upgrades: [/* ... */] },
    'репитер_сигнала': { base_cost: 75, effect: 'boost_range', boost_percentage: 0.2, range: 2, upgrades: [/* ... */] },
    'фаервол_защиты': { base_cost: 120, effect: 'slow_enemies', slow_factor: 0.5, range: 2.5, upgrades: [/* ... */] },
    'дата_центр_ускорения': { base_cost: 150, effect: 'resource_generation', generation_rate: 5, generation_interval_ms: 5000, upgrades: [/* ... */] },
};

const ENEMY_DEFINITIONS = {
    'вирус': { base_health: 50, speed: 1, bounty: 5, armor: 0 },
    'ddos_атака': { base_health: 30, speed: 2, bounty: 3, is_swarm: true }, // Special handling for swarm
    'троян': { base_health: 150, speed: 0.8, bounty: 15, armor: 5 },
    'шпионское_по': { base_health: 75, speed: 1.2, bounty: 10, abilities: ['stealth_briefly'] },
};

const MAP_DEFINITIONS = {
    "corporate_network": {
        path: [ {x:0, y:5}, {x:5, y:5}, {x:5, y:2}, {x:10, y:2}, {x:10, y:8}, {x:15, y:8} ], // Example path
        base_location: {x:15, y:9},
        tower_placement_zones: [ /* define areas where towers can be placed */ ],
        waves: [
            { wave_number: 1, enemies: [{type: 'вирус', count: 5, spawn_delay_ms: 1000}]},
            { wave_number: 2, enemies: [{type: 'вирус', count: 8, spawn_delay_ms: 800}, {type: 'ddos_атака', count: 3, spawn_delay_ms: 2000}]},
            // ... more waves
        ] as EnemyWave[]
    }
};
// --- End Game Configuration Data ---


export class FiveGTowerDefenseLogic {

    initializeGameState(
        roomId: string,
        gameId: "5g_tower_defense",
        playerIds: string[], // [player1Id] for PvE, [player1Id, player2Id] for PvP
        settings: { map_id: string, difficulty?: 'easy' | 'medium' | 'hard' }
    ): TowerDefenseGameState {

        const mapDef = MAP_DEFINITIONS[settings.map_id as keyof typeof MAP_DEFINITIONS];
        if (!mapDef) throw new Error(`Map ${settings.map_id} not found.`);

        const players_stats: TowerDefensePlayerStats[] = playerIds.map(pid => ({
            player_id: pid,
            resources: INITIAL_RESOURCES,
            base_health: DEFAULT_BASE_HEALTH,
            score: 0
        }));

        // If PvE and no AI player ID provided, add a conceptual one
        if (playerIds.length === 1 && !playerIds.includes("AI")) { // Assuming PvE if only one human
             // AI might not have stats in the same way, or could be playerIds[0] vs environment
        }


        return {
            room_id: roomId,
            game_id: gameId,
            map_id: settings.map_id,
            difficulty_level: settings.difficulty,
            players_stats: players_stats,
            towers: [],
            enemies: [],
            current_wave_number: 0,
            time_to_next_wave_ms: 5000, // Initial delay before first wave
            game_over_status: { is_over: false },
            created_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString(),
        };
    }

    handlePlayerAction(
        currentState: TowerDefenseGameState,
        playerId: string,
        action: TowerDefensePlayerAction
    ): TowerDefenseGameState {
        console.log(`[5GTDLogic] Handling action ${action.type} for player ${playerId}`);
        let newState = JSON.parse(JSON.stringify(currentState)) as TowerDefenseGameState; // Deep copy

        const playerStats = newState.players_stats.find(p => p.player_id === playerId);
        if (!playerStats) {
            console.error("Player not found in game state for action.");
            return currentState; // Or throw error
        }

        switch (action.type) {
            case 'PLACE_TOWER':
                // 1. Check if player has enough resources
                // 2. Check if placement is valid (on map, not on path, allowed zone)
                // 3. Deduct resources
                // 4. Add tower to newState.towers
                // Example:
                // const towerDef = TOWER_DEFINITIONS[action.tower_type];
                // if (playerStats.resources >= towerDef.base_cost) {
                //    playerStats.resources -= towerDef.base_cost;
                //    newState.towers.push({ id: generateId('twr'), type: action.tower_type, x: action.x, y: action.y, level: 1, owner_player_id: playerId });
                // } else { console.log("Not enough resources to place tower"); }
                break;
            case 'UPGRADE_TOWER':
                // 1. Find tower by action.tower_id
                // 2. Check if player owns tower (for PvP)
                // 3. Check if tower can be upgraded (max level, resources)
                // 4. Deduct resources
                // 5. Update tower level and stats
                break;
            case 'SELL_TOWER':
                // 1. Find tower
                // 2. Add resources back to player (e.g. 50% of cost)
                // 3. Remove tower from state
                break;
            case 'SEND_NEXT_WAVE':
                // If player-controlled wave start
                if (newState.time_to_next_wave_ms !== undefined && newState.time_to_next_wave_ms > 0) {
                    newState.time_to_next_wave_ms = 0; // Trigger wave spawn in next tick
                }
                break;
        }

        newState.last_updated_at = new Date().toISOString();
        return newState;
    }

    updateGameTick(currentState: TowerDefenseGameState): TowerDefenseGameState {
        let newState = JSON.parse(JSON.stringify(currentState)) as TowerDefenseGameState; // Deep copy
        const mapDef = MAP_DEFINITIONS[newState.map_id as keyof typeof MAP_DEFINITIONS];

        // --- Spawn new wave if timer is up ---
        if (newState.time_to_next_wave_ms !== undefined) {
            if (newState.time_to_next_wave_ms <= 0) {
                newState.current_wave_number++;
                const currentWaveDef = mapDef.waves.find(w => w.wave_number === newState.current_wave_number);
                if (currentWaveDef) {
                    // TODO: Spawn enemies from currentWaveDef into newState.enemies
                    // Stagger spawns based on spawn_delay_ms
                    console.log(`[5GTDLogic] Spawning wave ${newState.current_wave_number}`);
                    // Reset timer for next wave or end game if last wave
                    const nextWave = mapDef.waves.find(w => w.wave_number === newState.current_wave_number + 1);
                    newState.time_to_next_wave_ms = nextWave ? 15000 : undefined; // 15s to next wave or undefined if no more waves
                } else {
                    // All waves completed
                    newState.time_to_next_wave_ms = undefined;
                    if(newState.enemies.length === 0) { // And no enemies left
                        newState.game_over_status = { is_over: true, winner_player_id: newState.players_stats[0].player_id, reason: "All waves survived!" };
                    }
                }
            } else {
                // TODO: Decrement time_to_next_wave_ms (based on tick duration)
                // newState.time_to_next_wave_ms -= (game_tick_interval_ms);
            }
        }

        // --- Enemy Movement ---
        // For each enemy, update its position based on speed and path
        // Check if enemy reached the base: if so, damage base, remove enemy

        // --- Tower Attacks ---
        // For each tower, find enemies in range and deal damage
        // Handle enemy defeat: remove enemy, grant resources/score to player

        // --- Resource Generation (e.g., from Data Centers) ---

        // --- Check Win/Loss Conditions ---
        for (const playerStat of newState.players_stats) {
            if (playerStat.base_health <= 0 && !newState.game_over_status.is_over) {
                newState.game_over_status = {
                    is_over: true,
                    // Determine winner in PvP. In PvE, if player base health <=0, player loses.
                    winner_player_id: newState.players_stats.length > 1 ? newState.players_stats.find(p => p.player_id !== playerStat.player_id)?.player_id : null,
                    reason: `Player ${playerStat.player_id}'s base destroyed.`
                };
                newState.ended_at = new Date().toISOString();
                break;
            }
        }
        // (Already handled all waves survived case above)

        newState.last_updated_at = new Date().toISOString();
        return newState;
    }
}
