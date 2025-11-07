/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

console.log('[Flavor] Redirect script loaded');

WA.room.onEnterZone('redirectToOffice', () => {
    console.log('[Flavor] Entered redirect zone');
    
    const slackId = WA.player.slackId;
    console.log('[Flavor] Slack ID:', slackId);
    
    if (slackId) {
        const targetUrl = `/_/global/play.workadventure.localhost/slack/${slackId}`;
        console.log('[Flavor] Redirecting to personalized house:', targetUrl);
        WA.nav.goToRoom(targetUrl);
    } else {
        console.error('[Flavor] No Slack ID available');
    }
});
