import { AgentConfig } from './types';
export declare class AgentConfigDB {
    static getAll(): Promise<AgentConfig[]>;
    static getById(id: number): Promise<AgentConfig | null>;
    static getActive(): Promise<AgentConfig | null>;
    static create(config: Omit<AgentConfig, 'id' | 'created_at' | 'updated_at'>): Promise<AgentConfig>;
    static update(id: number, config: Partial<AgentConfig>): Promise<AgentConfig | null>;
    static delete(id: number): Promise<boolean>;
    private static mapDbRowToConfig;
}
//# sourceMappingURL=agent-config-db.d.ts.map