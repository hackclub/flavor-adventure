/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

console.log('[Flavor] Redirect script loaded');

WA.room.onEnterZone('redirectToOffice', () => {
    console.log('[Flavor] Entered redirect zone');
    
    const slackId = WA.player.slackId;
    console.log('[Flavor] Slack ID:', slackId);
    
    if (slackId) {
        const targetUrl = `http://play.workadventure.localhost/_/generate/l84sooo08ss44440g0c0wccs.cooked.selfhosted.hackclub.com/${slackId}`;
        console.log('[Flavor] Redirecting to:', targetUrl);
        WA.nav.goToRoom(targetUrl);
    } else {
        console.error('[Flavor] No Slack ID available');
    }
});
