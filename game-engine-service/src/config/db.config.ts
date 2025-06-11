// import mysql from 'mysql2/promise'; // Actual import

// --- Mock Control Interface (for tests to interact with the mock pool for GameEngineService) ---
interface MockQueryResponse_GameEngine {
  rows: any[];
  fields?: any;
  okPacket?: any;
}
interface MockQueryConfig_GameEngine {
  sqlPattern: string | RegExp;
  response: MockQueryResponse_GameEngine | (() => MockQueryResponse_GameEngine);
  once?: boolean;
}
let mockQueryConfigs_GameEngine: MockQueryConfig_GameEngine[] = [];
let oneTimeMockResponses_GameEngine: MockQueryResponse_GameEngine[] = [];

export const __GameEngine_टेस्ट_setMockQueryConfigs = (configs: MockQueryConfig_GameEngine[]) => {
  mockQueryConfigs_GameEngine = configs;
};
export const __GameEngine_टेस्ट_clearMockQueryConfigs = () => {
  mockQueryConfigs_GameEngine = [];
};
export const __GameEngine_टेस्ट_setOneTimeMockResponse = (response: MockQueryResponse_GameEngine) => {
  oneTimeMockResponses_GameEngine.push(response);
};
export const __GameEngine_टेस्ट_clearOneTimeMockResponses = () => {
  oneTimeMockResponses_GameEngine = [];
};
// --- End Mock Control Interface ---

const mysql_conceptual_game_engine = {
  createPool: (options: any) => {
    console.log(`[Conceptual DB - GameEngine] MySQL Pool created with options:`, {
        host: options.host, user: options.user, database: options.database,
    });
    return {
      query: async (sql: string, params?: any[]): Promise<[any[], any] | [any, any]> => {
        console.log(`[Conceptual DB - GameEngine] Query: ${sql.substring(0,100).replace(/\n/g, '')}... Params:`, params);

        if (oneTimeMockResponses_GameEngine.length > 0) {
          const mock = oneTimeMockResponses_GameEngine.shift()!;
          console.log('[Conceptual DB - GameEngine] Using one-time mock response:', mock);
          return [mock.okPacket || mock.rows, mock.fields || {}];
        }

        for (let i = 0; i < mockQueryConfigs_GameEngine.length; i++) {
          const config = mockQueryConfigs_GameEngine[i];
          let match = false;
          if (typeof config.sqlPattern === 'string') {
            match = sql.includes(config.sqlPattern);
          } else { match = config.sqlPattern.test(sql); }

          if (match) {
            const responseData = typeof config.response === 'function' ? config.response() : config.response;
            console.log('[Conceptual DB - GameEngine] Using configured mock for pattern:', config.sqlPattern, responseData);
            if (config.once) mockQueryConfigs_GameEngine.splice(i, 1);
            return [responseData.okPacket || responseData.rows, responseData.fields || {}];
          }
        }

        console.log('[Conceptual DB - GameEngine] Using default mock response.');
        if (sql.trim().toUpperCase().startsWith('SELECT')) return [[] as any[], {} as any];
        if (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
          return [{ affectedRows: 1, insertId: Math.floor(Math.random()*1000)+1, changedRows: 1 } as any, {} as any];
        }
        return [{} as any, {} as any];
      },
      getConnection: async () => {
        return {
            query: async (sql: string, params?: any[]) => (mysql_conceptual_game_engine.createPool({}) as any).query(sql, params),
            release: () => {},
            beginTransaction: async () => { console.log('[Conceptual DB - GameEngine] BEGIN TRANSACTION'); return Promise.resolve(); },
            commit: async () => { console.log('[Conceptual DB - GameEngine] COMMIT'); return Promise.resolve(); },
            rollback: async () => { console.log('[Conceptual DB - GameEngine] ROLLBACK'); return Promise.resolve(); },
        };
      },
      end: async () => { console.log('[Conceptual DB - GameEngine] Pool ended'); }
    };
  }
};

const dbConfig_GameEngine = {
  host: process.env.GAME_ENGINE_DB_HOST || 'localhost',
  user: process.env.GAME_ENGINE_DB_USER || 'game_engine_user',
  password: process.env.GAME_ENGINE_DB_PASSWORD || 'game_engine_secret_password',
  database: process.env.GAME_ENGINE_DB_NAME || 'game_engine_db',
  waitForConnections: true,
  connectionLimit: process.env.GAME_ENGINE_DB_CONNECTION_LIMIT ? parseInt(process.env.GAME_ENGINE_DB_CONNECTION_LIMIT, 10) : 10,
  queueLimit: 0,
};

const pool = mysql_conceptual_game_engine.createPool(dbConfig_GameEngine);
export default pool;
