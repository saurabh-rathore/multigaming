// import mysql from 'mysql2/promise'; // Actual import

// --- Mock Control Interface (for tests to interact with the mock pool for WalletService) ---
interface MockQueryResponse_Wallet {
  rows: any[];
  fields?: any;
  okPacket?: any;
}
interface MockQueryConfig_Wallet {
  sqlPattern: string | RegExp;
  response: MockQueryResponse_Wallet | (() => MockQueryResponse_Wallet);
  once?: boolean;
}
let mockQueryConfigs_Wallet: MockQueryConfig_Wallet[] = [];
let oneTimeMockResponses_Wallet: MockQueryResponse_Wallet[] = [];

export const __Wallet_टेस्ट_setMockQueryConfigs = (configs: MockQueryConfig_Wallet[]) => {
  mockQueryConfigs_Wallet = configs;
};
export const __Wallet_टेस्ट_clearMockQueryConfigs = () => {
  mockQueryConfigs_Wallet = [];
};
export const __Wallet_टेस्ट_setOneTimeMockResponse = (response: MockQueryResponse_Wallet) => {
  oneTimeMockResponses_Wallet.push(response);
};
export const __Wallet_टेस्ट_clearOneTimeMockResponses = () => {
  oneTimeMockResponses_Wallet = [];
};
// --- End Mock Control Interface ---

const mysql_conceptual_wallet = {
  createPool: (options: any) => {
    console.log(`[Conceptual DB - Wallet] MySQL Pool created with options:`, {
        host: options.host, user: options.user, database: options.database,
    });
    return {
      query: async (sql: string, params?: any[]): Promise<[any[], any] | [any, any]> => {
        console.log(`[Conceptual DB - Wallet] Query: ${sql.substring(0,100).replace(/\n/g, '')}... Params:`, params);

        if (oneTimeMockResponses_Wallet.length > 0) {
          const mock = oneTimeMockResponses_Wallet.shift()!;
          console.log('[Conceptual DB - Wallet] Using one-time mock response:', mock);
          return [mock.okPacket || mock.rows, mock.fields || {}];
        }

        for (let i = 0; i < mockQueryConfigs_Wallet.length; i++) {
          const config = mockQueryConfigs_Wallet[i];
          let match = false;
          if (typeof config.sqlPattern === 'string') {
            match = sql.includes(config.sqlPattern);
          } else { match = config.sqlPattern.test(sql); }

          if (match) {
            const responseData = typeof config.response === 'function' ? config.response() : config.response;
            console.log('[Conceptual DB - Wallet] Using configured mock for pattern:', config.sqlPattern, responseData);
            if (config.once) mockQueryConfigs_Wallet.splice(i, 1);
            return [responseData.okPacket || responseData.rows, responseData.fields || {}];
          }
        }

        console.log('[Conceptual DB - Wallet] Using default mock response.');
        if (sql.trim().toUpperCase().startsWith('SELECT')) return [[] as any[], {} as any];
        if (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
          return [{ affectedRows: 1, insertId: Math.floor(Math.random()*1000)+1, changedRows: 1 } as any, {} as any]; // Ensure changedRows for UPDATE
        }
        return [{} as any, {} as any];
      },
      getConnection: async () => {
        return {
            query: async (sql: string, params?: any[]) => (mysql_conceptual_wallet.createPool({}) as any).query(sql, params),
            release: () => {},
            beginTransaction: async () => { console.log('[Conceptual DB - Wallet] BEGIN TRANSACTION'); return Promise.resolve(); }, // Return Promise for async
            commit: async () => { console.log('[Conceptual DB - Wallet] COMMIT'); return Promise.resolve(); },
            rollback: async () => { console.log('[Conceptual DB - Wallet] ROLLBACK'); return Promise.resolve(); },
        };
      },
      end: async () => { console.log('[Conceptual DB - Wallet] Pool ended'); }
    };
  }
};

const dbConfig_Wallet = {
  host: process.env.WALLET_DB_HOST || 'localhost',
  user: process.env.WALLET_DB_USER || 'wallet_user',
  password: process.env.WALLET_DB_PASSWORD || 'wallet_secret_password',
  database: process.env.WALLET_DB_NAME || 'wallet_db',
  waitForConnections: true,
  connectionLimit: process.env.WALLET_DB_CONNECTION_LIMIT ? parseInt(process.env.WALLET_DB_CONNECTION_LIMIT, 10) : 10,
  queueLimit: 0,
};

const pool = mysql_conceptual_wallet.createPool(dbConfig_Wallet);
export default pool;
