/// <reference types="@workadventure/iframe-api-typings" />

// ui scroll script

const SPLIT_RATIO = 0.5; // TODO: set dynamically to width of screen map does not use
// Will be set dynamically in WA.onInit
let PROXY_URL = '';
let LOGIN_POPUP_URL = '';

let website;
let lastPlayerY = 0;
let lastPlayerX = 0;
let iframeElement = null;

// Map dims 
const MAP_HEIGHT = 60 * 32; // this can be modified to slow the scroll effect, but it 1:1 for now

// Save position via postMessage to parent window (for anonymous users)
function savePreLoginPosition(x, y) {
    try {
        // Send message to parent window to save position
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'savePreLoginPosition',
                x: x,
                y: y
            }, '*');
        }
    } catch (e) {
        console.error('[ui-bundle] Failed to send position:', e);
    }
}


// Wait for the API to be ready
// TODO: not using api calls probably faster and more sensible
WA.onInit().then(async () => {
    console.log('WA API initialized');
    console.log('Script running on:', WA.room.id);
    
    // Construct PROXY_URL from WA.room.id to avoid window.location issues in sandbox
    try {
        // WA.room.id is typically the full URL (e.g. http://play.workadventure.localhost/.../UI.tmj)
        
        let protocol = 'https:';
        let host = 'flavor-adventure.hackclub.com';
        
        if (WA.room.id.startsWith('http:')) {
            protocol = 'http:';
        }
        
        // Extract host
        const match = WA.room.id.match(/\/\/([^\/]+)/);
        if (match && match[1]) {
            host = match[1];
        }
        
        // Dev fix
        if (host.includes('workadventure.localhost')) {
             host = host.replace('play.', 'maps.');
        }
        
        PROXY_URL = `${protocol}//${host}/flavor/scroll-proxy.html?v=${Date.now()}`;
        LOGIN_POPUP_URL = `${protocol}//${host}/flavor/login-popup.html?v=${Date.now()}`;
        console.log('Derived PROXY_URL:', PROXY_URL);
    } catch (e) {
        console.error('Failed to derive PROXY_URL from room ID:', e);
        PROXY_URL = 'https://flavor-adventure.hackclub.com/flavor/scroll-proxy.html?v=' + Date.now();
        LOGIN_POPUP_URL = 'https://flavor-adventure.hackclub.com/flavor/login-popup.html?v=' + Date.now();
    }
    
    // serve on /unique to avoid player overlap
    const currentRoom = WA.room.id;
    const isUniqueRoom = currentRoom.includes('/unique-ui/'); // Simplified check
    
    if (!isUniqueRoom) {
        const uniqueId = crypto.randomUUID();
        
        // Build the target room URL
        // Extract the base URL structure: /_/global/HOST/path/to/file
        let targetRoom = currentRoom.replace('/flavor/UI.tmj', `/unique-ui/${uniqueId}/UI.tmj`);
        
        // For production, ensure we're redirecting through the play service
        // The URL format should be: /_/global/PLAY_HOST/unique-ui/UUID/UI.tmj
        try {
            const url = new URL(currentRoom);
            const pathParts = url.pathname.split('/');
            // pathParts = ['', '_', 'global', 'HOST', ...rest]
            if (pathParts.length >= 4) {
                const host = pathParts[3];
                // Replace maps. with play. for the redirect
                const playHost = host.replace('maps.', 'play.');
                pathParts[3] = playHost;
                // Replace the map path
                pathParts[pathParts.length - 1] = `unique-ui/${uniqueId}/UI.tmj`;
                // Remove 'flavor' segment if present
                const flavorIndex = pathParts.indexOf('flavor');
                if (flavorIndex !== -1) {
                    pathParts.splice(flavorIndex, 1);
                }
                targetRoom = `${url.protocol}//${url.host}${pathParts.join('/')}`;
            }
        } catch (e) {
            console.error('Failed to construct target room URL:', e);
        }
        
        console.log('Original room:', currentRoom);
        console.log('Redirecting to unique room:', targetRoom);
        WA.nav.goToRoom(targetRoom);
        return; // Stop execution here
    }

    console.log('Creating iframe with URL:', PROXY_URL);


    /*website = await WA.ui.website.open({
        url: PROXY_URL,
        position: {
            vertical: 'top',
            horizontal: 'right',
        },
        size: {
            height: '100vh',
            width: `${SPLIT_RATIO * 100}vw`,
        },
        margin: {
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        },
        allowApi: true,
    });

    console.log('Iframe website created:', website);
    console.log('Website object keys:', Object.keys(website));*/
    
    // no interaction on tut
    WA.controls.disablePlayerProximityMeeting();
    
    setTimeout(() => {
        
        function findAllIframes() {
            const iframes = [];
            
            
            document.querySelectorAll('iframe').forEach(i => iframes.push(i));
            
            // Check in shadow DOMs
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll('iframe').forEach(i => iframes.push(i));
                }
            });
            
            return iframes;
        }
        
        const iframes = findAllIframes();
        console.log(`Found ${iframes.length} total iframes (including shadow DOM)`);
        
        for (const iframe of iframes) {
            console.log('Checking iframe:', iframe.src);
            if (iframe.src && iframe.src.includes('scroll-proxy.html')) {
                iframeElement = iframe;
                console.log('Found scroll-proxy iframe');
                break;
            }
        }
        
        // fallback to broadcast if not found
        if (!iframeElement) {
            console.log('Using broadcast method - will send to all iframes');
            iframeElement = {
                contentWindow: {
                    postMessage: (data, origin) => {
                        const allIframes = findAllIframes();
                        if (allIframes.length > 0) {
                             // console.log(`Broadcasting to ${allIframes.length} iframes`);
                             for (const iframe of allIframes) {
                                 if (iframe.contentWindow) {
                                     try {
                                         iframe.contentWindow.postMessage(data, origin);
                                     } catch (e) {
                                         // fail, log
                                         // console.log(e);
                                     }
                                 }
                             }
                        } else {
                            console.log('No iframes found to broadcast to (yet)');
                        }
                    }
                }
            };
        }
    }, 5000); // Increased timeout to 5s to allow iframe to load

    
    WA.player.onPlayerMove((event) => {
        const currentY = event.y;
        const currentX = event.x;
        
        lastPlayerY = currentY;
        lastPlayerX = currentX;
        updateIframeScroll(currentY);
        
        // Continuously save position for anonymous users so it persists through login
        if (!WA.player.isLogged) {
            savePreLoginPosition(currentX, currentY);
        }
    });

    console.log('Player move tracking initialized');

    
    WA.player.getPosition().then(pos => {
        lastPlayerY = pos.y;
        lastPlayerX = pos.x;
        // Save initial position for anonymous users
        if (!WA.player.isLogged) {
            savePreLoginPosition(pos.x, pos.y);
        }
    });
});



function updateIframeScroll(playerY) {
    // Normalize Y position to 0-1 range + invert for scrolling
    // Higher Y (bottom of map) = 100% scroll (bottom of page)
    // Lower Y (top of map) = 0% scroll (top of page)
    const normalizedY = Math.max(0, Math.min(1, 1 - ((playerY*0.5) / MAP_HEIGHT)));
    
    if (iframeElement && iframeElement.contentWindow) {
        iframeElement.contentWindow.postMessage({
            scrollPercent: normalizedY
        }, '*');
    }
}

// UI Exit Debug Script 

console.log('UI Exit Debug script started');

// Will be set dynamically
let EXIT_TARGET = '/_/global/flavor-adventure.hackclub.com/flavor/courtyard.tmj';
const EXIT_AREA_Y = 192; // Top of exit area
const EXIT_AREA_HEIGHT = 100; // Height of exit area (192-288 to catch player at Y 256)

WA.onInit().then(async () => {
    
    try {
        const roomUrl = new URL(WA.room.id);
        let host = roomUrl.host;
        
        
        if (host.includes('workadventure.localhost')) {
             host = host.replace('play.', 'maps.');
        }
        
        EXIT_TARGET = `/_/global/${host}/flavor/courtyard.tmj`;
        console.log('EXIT_TARGET set to:', EXIT_TARGET);
    } catch (e) {
        console.error('Failed to set EXIT_TARGET:', e);
    }

    console.log('Exit debug initialized');
    
    const currentPos = await WA.player.getPosition();
    console.log('Current player position:', currentPos);
    
    // detect on event and check current pos
    let isInExitZone = false;
    let exitMessage = undefined;
    let exitMessageDismissed = false;
    
    let isInExitZone2 = false;
    let exitMessage2 = undefined;
    let exitMessage2Dismissed = false;
    
    const DEATH_ZONE_Y = 128;
    let isInDeathZone = false;
    let deathMessage = undefined;
    let deathMessageDismissed = false;

    WA.player.onPlayerMove((event) => {
        const playerY = event.y;
        
        // Exit logic - zone 1 (closest to exit)
        const inExitZone = (playerY <= (EXIT_AREA_Y + EXIT_AREA_HEIGHT));
        
        if (inExitZone) {
            if (!isInExitZone) {
                isInExitZone = true;
                exitMessageDismissed = false; // Reset when re-entering zone
                if (!WA.player.isLogged) {
                    if (exitMessage === undefined && !exitMessageDismissed) {
                        exitMessage = WA.ui.displayActionMessage({
                            message: "Lets get you a fresh start, click log in to choose who you will become",
                            callback: () => {
                                exitMessage = undefined;
                                exitMessageDismissed = true;
                            }
                        });
                    }
                } else {
                    console.log(`redir`);
                    WA.nav.goToRoom(EXIT_TARGET);
                }
            }
        } else {
            if (isInExitZone) {
                isInExitZone = false;
                if (exitMessage) {
                    exitMessage.remove();
                    exitMessage = undefined;
                }
            }
        }
        
        // Exit logic - zone 2 (further from exit)
        const inExitZone2 = (playerY <= (EXIT_AREA_Y + EXIT_AREA_HEIGHT*4)) && !inExitZone;
        
        if (inExitZone2) {
            if (!isInExitZone2) {
                isInExitZone2 = true;
                exitMessage2Dismissed = false; // Reset when re-entering zone
                if (!WA.player.isLogged) {
                    if (exitMessage2 === undefined && !exitMessage2Dismissed) {
                        exitMessage2 = WA.ui.displayActionMessage({
                            message: "If you promise to use your life with passion and build cool stuff, I'll let you come back to the world of flavortown.",
                            callback: () => {
                                exitMessage2 = undefined;
                                exitMessage2Dismissed = true;
                            }
                        });
                    }
                } else {
                    console.log(`redir`);
                    WA.nav.goToRoom(EXIT_TARGET);
                }
            }
        } else {
            if (isInExitZone2) {
                isInExitZone2 = false;
                if (exitMessage2) {
                    exitMessage2.remove();
                    exitMessage2 = undefined;
                }
            }
        }
        
        // Death zone logic
        const inDeathZone = playerY >= DEATH_ZONE_Y;

        if (inDeathZone) {
            if (!isInDeathZone) {
                isInDeathZone = true;
                deathMessageDismissed = false;
                if (deathMessage === undefined && !deathMessageDismissed) {
                    deathMessage = WA.ui.displayActionMessage({
                        message: "Uh Oh! You're dead :/ Right now you can't speak to others or explore beyond your graveyard, maybe someone inside could help...",
                        callback: () => {
                            deathMessage = undefined;
                            deathMessageDismissed = true;
                        }
                    });
                }
            }
        } else {
            if (isInDeathZone) {
                isInDeathZone = false;
                if (deathMessage) {
                    deathMessage.remove();
                    deathMessage = undefined;
                }
            }
        }
    });
    
    console.log('Exit zone monitoring active - watching for Y position <', EXIT_AREA_Y + EXIT_AREA_HEIGHT);
    
    
    if (currentPos.y <= (EXIT_AREA_Y + EXIT_AREA_HEIGHT)) {
        if (!WA.player.isLogged) {
            isInExitZone = true;
            if (exitMessage === undefined) {
                exitMessage = WA.ui.displayActionMessage({
                    message: "Lets get you a fresh start, click log in to choose who you will become",
                    callback: () => {
                        exitMessage = undefined;
                        exitMessageDismissed = true;
                    }
                });
            }
        } else {
            console.log('player in zone');
            WA.nav.goToRoom(EXIT_TARGET);
        }
    }
});
