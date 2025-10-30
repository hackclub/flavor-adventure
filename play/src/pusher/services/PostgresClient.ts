import { Pool, PoolClient } from "pg";

class PostgresClient {
    private pool: Pool | null = null;
    private enabled = false;

    async init(): Promise<void> {
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

        if (connectionString) {
            // Use connection string if provided
            try {
                this.pool = new Pool({
                    connectionString,
                    max: 10,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                });

                // Test the connection
                const client = await this.pool.connect();
                console.info("PostgreSQL connection established successfully (via connection string)");
                client.release();

                this.enabled = true;
                return;
            } catch (error) {
                console.error("Failed to initialize PostgreSQL connection:", error);
                this.pool = null;
                this.enabled = false;
                return;
            }
        }

        // Fall back to individual environment variables
        const host = process.env.POSTGRES_HOST;
        const port = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432;
        const database = process.env.POSTGRES_DATABASE;
        const user = process.env.POSTGRES_USER;
        const password = process.env.POSTGRES_PASSWORD;

        if (!host || !database || !user || !password) {
            console.info("PostgreSQL not configured (missing required env vars). Chat logging disabled.");
            return;
        }

        try {
            this.pool = new Pool({
                host,
                port,
                database,
                user,
                password,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });

            // Test the connection
            const client = await this.pool.connect();
            console.info("PostgreSQL connection established successfully");
            client.release();

            this.enabled = true;
        } catch (error) {
            console.error("Failed to initialize PostgreSQL connection:", error);
            this.pool = null;
            this.enabled = false;
        }
    }

    isEnabled(): boolean {
        return this.enabled && this.pool !== null;
    }

    async query(text: string, params?: unknown[]): Promise<unknown> {
        if (!this.pool) {
            throw new Error("PostgreSQL is not initialized");
        }

        const client: PoolClient = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    async upsertUser(
        slackId: string,
        givenName?: string,
        email?: string
    ): Promise<{ isAdmin: boolean; hasPets: boolean }> {
        if (!this.isEnabled()) {
            return { isAdmin: false, hasPets: false };
        }

        try {
            const result = (await this.query(
                `INSERT INTO users (slack_id, given_name, email, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (slack_id) 
                DO UPDATE SET 
                    given_name = COALESCE(EXCLUDED.given_name, users.given_name),
                    email = COALESCE(EXCLUDED.email, users.email),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING is_admin, is_banned, has_unlocked_pets`,
                [slackId, givenName, email]
            )) as { rows: Array<{ is_admin: boolean; is_banned: boolean; has_unlocked_pets: boolean }> };

            const user = result.rows[0];
            const isAdmin = user?.is_admin || false;
            const isBanned = user?.is_banned || false;
            const hasPets = user?.has_unlocked_pets || false;

            console.info("[PostgresClient] User upserted:", slackId, { isAdmin, isBanned, hasPets });
            return { isAdmin, hasPets };
        } catch (error) {
            console.error("[PostgresClient] Failed to upsert user:", error);
            return { isAdmin: false, hasPets: false };
        }
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.enabled = false;
        }
    }
}

export const postgresClient = new PostgresClient();
