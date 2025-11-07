/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

console.log('[Flavor] Exit to courtyard script loaded');

WA.room.onEnterZone('exitToSquare', () => {
    console.log('[Flavor] Exiting to courtyard');
    
    // extract host from url
    const currentRoom = WA.room.id;
    console.log('[Flavor] Current room:', currentRoom);
    
    // Format: /_/global/{host}/slack/{id} or /_/global/{host}/flavor/...
    const match = currentRoom.match(/_\/global\/([^\/]+)\//);
    
    if (match && match[1]) {
        let host = match[1];
        const mapsHost = host.replace(/^play\./, 'maps.');
        const courtyardUrl = `/_/global/${mapsHost}/flavor/courtyard.tmj`;
        console.log('[Flavor] Redirecting to courtyard:', courtyardUrl);
        WA.nav.goToRoom(courtyardUrl);
    } else {
        console.error('[Flavor] Could not extract host from current room URL');
    }
});
