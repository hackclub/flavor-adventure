import type { Application, Request, Response } from "express";
import { jwtTokenManager } from "../services/JWTTokenManager";
import { postgresClient } from "../services/PostgresClient";

export class PlayerInfoController {
    constructor(app: Application) {
        app.get("/player-slack-id", this.getPlayerSlackId.bind(this));
    }

    private async getPlayerSlackId(req: Request, res: Response) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "unauthorized" });
        }

        const token = authHeader.substring(7);

        try {
            const authData = jwtTokenManager.verifyJWTToken(token);
            const email = authData.identifier;

            // Query database to get Slack ID from email (probably really slow :())
            if (!postgresClient.isEnabled()) {
                return res.status(503).json({ error: "database_not_available" });
            }

            const result = (await postgresClient.query(`SELECT slack_id FROM users WHERE email = $1 LIMIT 1`, [
                email,
            ])) as { rows: Array<{ slack_id: string }> };

            const slackId = result.rows[0]?.slack_id;

            if (slackId) {
                return res.json({ slackId });
            } else {
                return res.status(404).json({ error: "user_not_found" });
            }
        } catch (e) {
            console.error("[PlayerInfoController] Error:", e);
            return res.status(500).json({ error: "server_error" });
        }
    }
}
