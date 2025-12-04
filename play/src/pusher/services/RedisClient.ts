import { createClient, RedisClientType, createClient as createSubClient } from "redis";

export type SessionKillCallback = (userUuid: string) => void;

interface SessionInfo {
    socketId: string;
    callback: SessionKillCallback;
}

class RedisClient {
    private client: RedisClientType | null = null;
    private subClient: RedisClientType | null = null;
    private enabled = false;
    private instanceId: string;
    private sessionKillCallbacks: Map<string, SessionInfo> = new Map();

    constructor() {
        this.instanceId = `pusher_${process.pid}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    generateSocketId(): string {
        return `${this.instanceId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private handleError(this: void, err: unknown) {
        console.error("Redis Client Error", err);
    }

    async init(): Promise<void> {
        const host = process.env.REDIS_HOST;
        const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
        const password = process.env.REDIS_PASSWORD;

        if (!host) {
            console.info("Redis not configured (missing REDIS_HOST env var). User uniqueness check disabled.");
            return;
        }

        const url = `redis://${password ? `:${password}@` : ""}${host}:${port}`;

        try {
            this.client = createClient({
                url,
            });

            // eslint-disable-next-line listeners/no-missing-remove-event-listener
            this.client.on("error", this.handleError);

            await this.client.connect();
            console.info("Redis connection established successfully");

            // Create subscriber client for session kill messages
            this.subClient = createSubClient({ url });
            // eslint-disable-next-line listeners/no-missing-remove-event-listener
            this.subClient.on("error", this.handleError);
            await this.subClient.connect();

            // Subscribe to session kill channel
            await this.subClient.subscribe("session_kill", (message) => {
                try {
                    const { userUuid, killerSocketId } = JSON.parse(message);
                    const sessionInfo = this.sessionKillCallbacks.get(userUuid);
                    // Only kill if we have this user's session AND it's not the one that initiated the kill
                    if (sessionInfo && sessionInfo.socketId !== killerSocketId) {
                        console.info(
                            `Killing session for user ${userUuid} (socket ${sessionInfo.socketId} killed by ${killerSocketId})`
                        );
                        sessionInfo.callback(userUuid);
                    }
                } catch (e) {
                    console.error("Error processing session kill message", e);
                }
            });

            this.enabled = true;
        } catch (error) {
            console.error("Failed to initialize Redis connection:", error);
            this.client = null;
            this.subClient = null;
            this.enabled = false;
        }
    }

    isEnabled(): boolean {
        return this.enabled && this.client !== null;
    }

    async isUserOnline(userUuid: string): Promise<boolean> {
        if (!this.isEnabled() || !this.client) {
            return false;
        }
        const value = await this.client.get(`user_online:${userUuid}`);
        return value === "true";
    }

    async setUserOnline(userUuid: string): Promise<void> {
        if (!this.isEnabled() || !this.client) {
            return;
        }
        // Set user as online with TTL of 24 hours to avoid stale entries
        await this.client.set(`user_online:${userUuid}`, "true", { EX: 86400 });
    }

    async setUserOffline(userUuid: string): Promise<void> {
        if (!this.isEnabled() || !this.client) {
            return;
        }
        await this.client.del(`user_online:${userUuid}`);
    }

    /**
     * Register a session and kill any existing sessions for this user.
     * Returns the socketId for this session.
     */
    async registerSession(userUuid: string, socketId: string, killCallback: SessionKillCallback): Promise<string> {
        if (!this.isEnabled() || !this.client) {
            return socketId; // fallback if redis is down
        }

        console.info(`Registering session for user ${userUuid} with socketId ${socketId}`);

        // Check if there's an existing session BEFORE we overwrite the callback
        const existingSocketId = await this.client.get(`user_session:${userUuid}`);
        const existingSessionInfo = this.sessionKillCallbacks.get(userUuid);

        if (
            existingSocketId &&
            existingSocketId !== socketId &&
            existingSessionInfo &&
            existingSessionInfo.socketId === existingSocketId
        ) {
            console.info(`User ${userUuid} has existing session ${existingSocketId}, killing it locally`);
            // Kill the old session directly since we have the callback
            try {
                existingSessionInfo.callback(userUuid);
            } catch (e) {
                console.warn(`Failed to kill old session for ${userUuid}, socket may already be closed:`, e);
            }
            // Remove the old callback after killing
            this.sessionKillCallbacks.delete(userUuid);
        } else if (existingSocketId && existingSocketId !== socketId) {
            // Session exists in Redis but callback is on another instance or stale - use pub/sub
            console.info(
                `User ${userUuid} has existing session ${existingSocketId} on another instance, publishing kill`
            );
            await this.client.publish(
                "session_kill",
                JSON.stringify({
                    userUuid,
                    killerSocketId: socketId,
                })
            );
            // Clean up any stale local callback
            if (existingSessionInfo) {
                this.sessionKillCallbacks.delete(userUuid);
            }
        }

        // NOW store the new callback (after killing old session)
        this.sessionKillCallbacks.set(userUuid, { socketId, callback: killCallback });

        // Register our session in Redis
        await this.client.set(`user_session:${userUuid}`, socketId, { EX: 86400 });

        return socketId;
    }

    /**
     * Unregister a session when user disconnects
     */
    async unregisterSession(userUuid: string, socketId: string): Promise<void> {
        if (!this.isEnabled() || !this.client) {
            return;
        }

        const sessionInfo = this.sessionKillCallbacks.get(userUuid);
        // Only clean up if this is our socket
        if (sessionInfo?.socketId === socketId) {
            this.sessionKillCallbacks.delete(userUuid);

            // Only delete from Redis if we own the session
            const currentSocketId = await this.client.get(`user_session:${userUuid}`);
            if (currentSocketId === socketId) {
                await this.client.del(`user_session:${userUuid}`);
            }
        }
    }

    getInstanceId(): string {
        return this.instanceId;
    }

    /**
     * Force kill a user's session from any instance (used for banning)
     */
    async forceKillSession(userUuid: string): Promise<void> {
        if (!this.isEnabled() || !this.client) {
            return;
        }

        console.info(`Force killing session for user ${userUuid}`);

        await this.client.publish(
            "session_kill",
            JSON.stringify({
                userUuid,
                killerSocketId: "admin_ban", // Special identifier that won't match any real socket
            })
        );

        await this.client.del(`user_session:${userUuid}`);
        await this.client.del(`user_online:${userUuid}`);
    }
}

export const redisClient = new RedisClient();
