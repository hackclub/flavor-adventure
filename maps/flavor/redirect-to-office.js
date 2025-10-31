/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

console.log('[Flavor] Redirect script loaded');

WA.room.onEnterZone('redirectToOffice', () => {
    console.log('[Flavor] Entered redirect zone');
    
    // Get the Slack ID
    const playerUuid = WA.player.uuid;
    
    console.log('[Flavor] Player UUID:', playerUuid);

    if (playerUuid) {
        const targetUrl = `http://play.workadventure.localhost/_/generate/l84sooo08ss44440g0c0wccs.cooked.selfhosted.hackclub.com/${playerUuid}`;
        console.log('[Flavor] Redirecting to:', targetUrl);
        
        // Redirect the player
        WA.nav.goToRoom(targetUrl);
    } else {
        console.error('[Flavor] No player UUID found, cannot redirect');
    }
});
