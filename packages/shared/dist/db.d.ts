import { PoolClient } from 'pg';
export declare function getDbClient(): Promise<PoolClient>;
export declare function query(text: string, params?: any[]): Promise<any>;
export declare function testConnection(): Promise<boolean>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=db.d.ts.map