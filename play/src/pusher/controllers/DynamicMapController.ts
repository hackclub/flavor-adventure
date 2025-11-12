import fs from "fs";
import type { Application, Request, Response } from "express";

export class DynamicMapController {
    constructor(app: Application) {
        // houses under /slack/:slackId
        app.get("/slack/:slackId", this.serveHouse.bind(this));
        // meetings at /meet/:meetId
        app.get("/meet/:meetId", this.serveMeeting.bind(this));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private fixExitUrls(layers: any[], mapsHost: string): void {
        for (const layer of layers) {
            // Handle layer groups recursively
            if (layer.layers) {
                this.fixExitUrls(layer.layers, mapsHost);
            }
            // Handle layer properties
            if (layer.properties) {
                for (const prop of layer.properties) {
                    if (
                        prop.name === "exitUrl" &&
                        prop.value &&
                        !prop.value.startsWith("http://") &&
                        !prop.value.startsWith("https://") &&
                        !prop.value.startsWith("#")
                    ) {
                        prop.value = `/_/global/${mapsHost}/flavor/courtyard.tmj`;
                    }
                }
            }
            // Handle objects within object layers
            if (layer.objects) {
                for (const obj of layer.objects) {
                    if (obj.properties) {
                        for (const prop of obj.properties) {
                            if (
                                prop.name === "exitUrl" &&
                                prop.value &&
                                !prop.value.startsWith("http://") &&
                                !prop.value.startsWith("https://") &&
                                !prop.value.startsWith("#")
                            ) {
                                prop.value = `/_/global/${mapsHost}/flavor/courtyard.tmj`;
                            }
                        }
                    }
                }
            }
        }
    }

    private serveHouse(req: Request, res: Response) {
        const slackId = req.params.slackId;
        console.log(`[DynamicMapController] Serving house for Slack ID: ${slackId}`);

        try {
            const housePath = "/usr/src/app/maps/flavor/house.tmj";
            const houseContent = fs.readFileSync(housePath, "utf-8");

            // ensure using absolute URLs
            const mapData = JSON.parse(houseContent);

            // string handling to rewrite paths to absolute URLs
            // Use X-Forwarded-Proto if available (for reverse proxies), otherwise use req.protocol
            const protocol = req.get("X-Forwarded-Proto") || req.protocol;
            const requestHost = req.get("host") || "";
            // In dev: use maps.workadventure.localhost
            // In prod: use same host (flavor-adventure.hackclub.com serves maps via /flavor)
            const mapsHost = requestHost.includes("workadventure.localhost")
                ? requestHost.replace(/^play\./, "maps.")
                : requestHost;
            const mapsBaseUrl = `${protocol}://${mapsHost}/flavor`;

            console.log(`[DynamicMapController] Maps base URL: ${mapsBaseUrl}`);

            // Use full absolute URLs always
            if (mapData.tilesets) {
                for (const tileset of mapData.tilesets) {
                    if (
                        tileset.image &&
                        !tileset.image.startsWith("http://") &&
                        !tileset.image.startsWith("https://")
                    ) {
                        // Convert relative path to absolute URL, removing ../ and ./
                        const imgPath = tileset.image.replace(/^\.\.\//, "").replace(/^\.\//, "");
                        tileset.image = `${mapsBaseUrl}/${imgPath}`;
                    }
                }
            }

            if (mapData.properties) {
                for (const prop of mapData.properties) {
                    if (
                        prop.name === "mapImage" &&
                        prop.value &&
                        !prop.value.startsWith("http://") &&
                        !prop.value.startsWith("https://")
                    ) {
                        const imgPath = prop.value.replace(/^\.\.\//, "").replace(/^\.\//, "");
                        prop.value = `${mapsBaseUrl}/${imgPath}`;
                    }

                    if (
                        prop.name === "script" &&
                        prop.value &&
                        !prop.value.startsWith("http://") &&
                        !prop.value.startsWith("https://")
                    ) {
                        const scriptPath = prop.value.replace(/^\.\.\//, "").replace(/^\.\//, "");
                        prop.value = `${mapsBaseUrl}/${scriptPath}`;
                    }
                }
            }

            if (mapData.layers) {
                this.fixExitUrls(mapData.layers, mapsHost);
            }

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(mapData));
        } catch (error) {
            console.error("[DynamicMapController] Error serving house:", error);
            res.status(500).json({ error: "Failed to load house map" });
        }
    }

    private serveMeeting(req: Request, res: Response) {
        const meetId = req.params.meetId;
        console.log(`[DynamicMapController] Serving meeting for ID: ${meetId}`);

        try {
            const conferencePath = "/usr/src/app/maps/flavor/conference.tmj";
            const conferenceContent = fs.readFileSync(conferencePath, "utf-8");

            // Parse and rewrite tileset/image paths to absolute URLs
            const mapData = JSON.parse(conferenceContent);

            // Build the maps server URL from the request
            // Use X-Forwarded-Proto if available (for reverse proxies), otherwise use req.protocol
            const protocol = req.get("X-Forwarded-Proto") || req.protocol;
            const requestHost = req.get("host") || "";
            // In dev: use maps.workadventure.localhost
            // In prod: use same host (flavor-adventure.hackclub.com serves maps via /flavor)
            const mapsHost = requestHost.includes("workadventure.localhost")
                ? requestHost.replace(/^play\./, "maps.")
                : requestHost;
            const mapsBaseUrl = `${protocol}://${mapsHost}/flavor`;

            console.log(`[DynamicMapController] Maps base URL: ${mapsBaseUrl}`);

            if (mapData.tilesets) {
                for (const tileset of mapData.tilesets) {
                    if (
                        tileset.image &&
                        !tileset.image.startsWith("http://") &&
                        !tileset.image.startsWith("https://")
                    ) {
                        // Convert relative path like "tilesets/WA_Special_Zones.png"
                        // to absolute URL based on the request origin
                        tileset.image = `${mapsBaseUrl}/${tileset.image}`;
                    }
                }
            }

            if (mapData.properties) {
                for (const prop of mapData.properties) {
                    if (
                        prop.name === "mapImage" &&
                        prop.value &&
                        !prop.value.startsWith("http://") &&
                        !prop.value.startsWith("https://")
                    ) {
                        prop.value = `${mapsBaseUrl}/${prop.value}`;
                    }
                    // Also fix script paths
                    if (
                        prop.name === "script" &&
                        prop.value &&
                        !prop.value.startsWith("http://") &&
                        !prop.value.startsWith("https://")
                    ) {
                        prop.value = `${mapsBaseUrl}/${prop.value}`;
                    }
                }
            }

            if (mapData.layers) {
                this.fixExitUrls(mapData.layers, mapsHost);
            }

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(mapData));
        } catch (error) {
            console.error("[DynamicMapController] Error serving meeting:", error);
            res.status(500).json({ error: "Failed to load meeting map" });
        }
    }
}
