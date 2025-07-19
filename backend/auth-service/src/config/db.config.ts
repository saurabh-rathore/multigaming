// import mysql from 'mysql2/promise'; // Actual import

// --- Mock Control Interface (for tests to interact with the mock pool) ---
interface MockQueryResponse {
  rows: any[];
  fields?: any; // Optional fields object
  okPacket?: any; // For INSERT/UPDATE/DELETE results
}

interface MockQueryConfig {
  sqlPattern: string | RegExp; // Substring or RegExp to match the SQL query
  response: MockQueryResponse | (() => MockQueryResponse); // Static response or function to generate one
  once?: boolean; // If true, this mock is used only once then removed
}

let mockQueryConfigs: MockQueryConfig[] = [];
let oneTimeMockResponses: MockQueryResponse[] = [];

export const __टेस्ट_setMockQueryConfigs = (configs: MockQueryConfig[]) => {
  mockQueryConfigs = configs;
};
export const __टेस्ट_clearMockQueryConfigs = () => {
  mockQueryConfigs = [];
};
export const __टेस्ट_setOneTimeMockResponse = (response: MockQueryResponse) => {
  oneTimeMockResponses.push(response);
};
export const __टेस्ट_clearOneTimeMockResponses = () => {
  oneTimeMockResponses = [];
};
// --- End Mock Control Interface ---


const mysql_conceptual = {
  createPool: (options: any) => {
    console.log(`[Conceptual DB] MySQL Pool created with options:`, {
        host: options.host, user: options.user, database: options.database,
    });
    return {
      query: async (sql: string, params?: any[]): Promise<[any[], any] | [any, any]> => {
        console.log(`[Conceptual DB] Query: ${sql.substring(0,100).replace(/\n/g, '')}... Params:`, params);

        // Check for one-time responses first
        if (oneTimeMockResponses.length > 0) {
          const mock = oneTimeMockResponses.shift()!; // Use and remove
          console.log('[Conceptual DB] Using one-time mock response:', mock);
          return [mock.okPacket || mock.rows, mock.fields || {}];
        }

        // Check configured pattern-based responses
        for (let i = 0; i < mockQueryConfigs.length; i++) {
          const config = mockQueryConfigs[i];
          let match = false;
          if (typeof config.sqlPattern === 'string') {
            match = sql.includes(config.sqlPattern);
          } else { // RegExp
            match = config.sqlPattern.test(sql);
          }

          if (match) {
            const responseData = typeof config.response === 'function' ? config.response() : config.response;
            console.log('[Conceptual DB] Using configured mock response for pattern:', config.sqlPattern, responseData);
            if (config.once) {
              mockQueryConfigs.splice(i, 1); // Remove if 'once'
            }
            return [responseData.okPacket || responseData.rows, responseData.fields || {}];
          }
        }

        // Default behavior if no mocks match (from previous setup)
        console.log('[Conceptual DB] Using default mock response.');
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return [[] as any[], {} as any];
        }
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
          return [{ insertId: Math.floor(Math.random() * 1000) + 1, affectedRows: 1, warningCount: 0 } as any, {} as any];
        }
        return [{} as any, {} as any];
      },
      getConnection: async () => { /* ... as before, not heavily used by service directly ... */
        return {
            query: async (sql: string, params?: any[]) => { /* ... same logic as pool.query ... */ return (mysql_conceptual.createPool({}) as any).query(sql, params); },
            release: () => {},
            beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}
        };
      },
      end: async () => { console.log('[Conceptual DB] Pool ended'); }
    };
  }
};

const dbConfig = {
  host: process.env.AUTH_DB_HOST || 'localhost',
  user: process.env.AUTH_DB_USER || 'auth_user',
  password: process.env.AUTH_DB_PASSWORD || 'auth_secret_password',
  database: process.env.AUTH_DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: process.env.AUTH_DB_CONNECTION_LIMIT ? parseInt(process.env.AUTH_DB_CONNECTION_LIMIT, 10) : 10,
  queueLimit: 0,
};

const pool = mysql_conceptual.createPool(dbConfig);
export default pool;
