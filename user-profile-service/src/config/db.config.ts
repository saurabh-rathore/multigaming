// import mysql from 'mysql2/promise'; // Actual import

// --- Mock Control Interface (for tests to interact with the mock pool) ---
interface MockQueryResponse {
  rows: any[];
  fields?: any;
  okPacket?: any;
}
interface MockQueryConfig {
  sqlPattern: string | RegExp;
  response: MockQueryResponse | (() => MockQueryResponse);
  once?: boolean;
}
let mockQueryConfigs_UserProfile: MockQueryConfig[] = [];
let oneTimeMockResponses_UserProfile: MockQueryResponse[] = [];

export const __UserProfile_टेस्ट_setMockQueryConfigs = (configs: MockQueryConfig[]) => {
  mockQueryConfigs_UserProfile = configs;
};
export const __UserProfile_टेस्ट_clearMockQueryConfigs = () => {
  mockQueryConfigs_UserProfile = [];
};
export const __UserProfile_टेस्ट_setOneTimeMockResponse = (response: MockQueryResponse) => {
  oneTimeMockResponses_UserProfile.push(response);
};
export const __UserProfile_टेस्ट_clearOneTimeMockResponses = () => {
  oneTimeMockResponses_UserProfile = [];
};
// --- End Mock Control Interface ---

const mysql_conceptual_userprofile = {
  createPool: (options: any) => {
    console.log(`[Conceptual DB - UserProfile] MySQL Pool created with options:`, {
        host: options.host, user: options.user, database: options.database,
    });
    return {
      query: async (sql: string, params?: any[]): Promise<[any[], any] | [any, any]> => {
        console.log(`[Conceptual DB - UserProfile] Query: ${sql.substring(0,100).replace(/\n/g, '')}... Params:`, params);

        if (oneTimeMockResponses_UserProfile.length > 0) {
          const mock = oneTimeMockResponses_UserProfile.shift()!;
          console.log('[Conceptual DB - UserProfile] Using one-time mock response:', mock);
          return [mock.okPacket || mock.rows, mock.fields || {}];
        }

        for (let i = 0; i < mockQueryConfigs_UserProfile.length; i++) {
          const config = mockQueryConfigs_UserProfile[i];
          let match = false;
          if (typeof config.sqlPattern === 'string') {
            match = sql.includes(config.sqlPattern);
          } else { match = config.sqlPattern.test(sql); }

          if (match) {
            const responseData = typeof config.response === 'function' ? config.response() : config.response;
            console.log('[Conceptual DB - UserProfile] Using configured mock for pattern:', config.sqlPattern, responseData);
            if (config.once) mockQueryConfigs_UserProfile.splice(i, 1);
            return [responseData.okPacket || responseData.rows, responseData.fields || {}];
          }
        }

        console.log('[Conceptual DB - UserProfile] Using default mock response.');
        if (sql.trim().toUpperCase().startsWith('SELECT')) return [[] as any[], {} as any];
        if (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE')) {
          return [{ affectedRows: 1, insertId: Math.floor(Math.random()*1000)+1 } as any, {} as any];
        }
        return [{} as any, {} as any];
      },
      getConnection: async () => {
        return {
            query: async (sql: string, params?: any[]) => (mysql_conceptual_userprofile.createPool({}) as any).query(sql, params),
            release: () => {},
            beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}
        };
      },
      end: async () => { console.log('[Conceptual DB - UserProfile] Pool ended'); }
    };
  }
};

const dbConfig_UserProfile = {
  host: process.env.PROFILE_DB_HOST || 'localhost',
  user: process.env.PROFILE_DB_USER || 'profile_user',
  password: process.env.PROFILE_DB_PASSWORD || 'profile_secret_password',
  database: process.env.PROFILE_DB_NAME || 'user_profile_db',
  waitForConnections: true,
  connectionLimit: process.env.PROFILE_DB_CONNECTION_LIMIT ? parseInt(process.env.PROFILE_DB_CONNECTION_LIMIT, 10) : 10,
  queueLimit: 0,
};

const pool = mysql_conceptual_userprofile.createPool(dbConfig_UserProfile);
export default pool;
