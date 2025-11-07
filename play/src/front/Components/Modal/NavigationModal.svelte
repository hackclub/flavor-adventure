<script lang="ts">
    import { fly } from "svelte/transition";
    import { showNavigationModalStore } from "../../Stores/ModalStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";

    let meetingIdInput = "";
    let showJoinMeetingInput = false;

    function close() {
        showNavigationModalStore.set(false);
        showJoinMeetingInput = false;
        meetingIdInput = "";
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    function getSlackId(): string | undefined {
        const token = localUserStore.getAuthToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                return payload.slackId;
            } catch (e) {
                console.warn("Could not decode JWT for slackId", e);
            }
        }
        return undefined;
    }

    function goToCourtyard() {
        const roomId = gameManager.getCurrentGameScene().room.id;

        // Extract maps host from current room URL
        const match = roomId.match(/_\/global\/([^/]+)\//);
        let mapsHost = match && match[1] ? match[1] : "maps.workadventure.localhost";
        // Ensure we use the maps host, not play host
        mapsHost = mapsHost.replace(/^play\./, "maps.");

        console.log("[Navigation] Going to courtyard");

        window.location.href = `/_/global/${mapsHost}/flavor/courtyard.tmj`;
        close();
    }

    function goHome() {
        const slackId = getSlackId();

        if (!slackId) {
            console.error("[Navigation] No Slack ID available");
            return;
        }

        const roomId = gameManager.getCurrentGameScene().room.id;
        // Extract play host from current room URL
        const match = roomId.match(/_\/global\/([^/]+)\//);
        const playHost = match && match[1] ? match[1].replace(/^maps\./, "play.") : "play.workadventure.localhost";

        console.log("[Navigation] Going home");

        window.location.href = `/_/global/${playHost}/slack/${slackId}`;
        close();
    }

    function startMeeting() {
        // Generate random meeting ID
        const meetingId = Math.random().toString(36).substring(2, 12);

        const roomId = gameManager.getCurrentGameScene().room.id;
        // Extract play host from current room URL
        const match = roomId.match(/_\/global\/([^/]+)\//);
        const playHost = match && match[1] ? match[1].replace(/^maps\./, "play.") : "play.workadventure.localhost";

        console.log("[Navigation] Starting meeting with ID:", meetingId);

        alert(`Meeting ID: ${meetingId}`);

        window.location.href = `/_/global/${playHost}/meet/${meetingId}`;
        close();
    }

    function showJoinMeeting() {
        showJoinMeetingInput = true;
    }

    function joinMeeting() {
        if (!meetingIdInput.trim()) {
            return;
        }

        const roomId = gameManager.getCurrentGameScene().room.id;
        // Extract play host from current room URL
        const match = roomId.match(/_\/global\/([^/]+)\//);
        const playHost = match && match[1] ? match[1].replace(/^maps\./, "play.") : "play.workadventure.localhost";

        console.log("[Navigation] Joining meeting");

        window.location.href = `/_/global/${playHost}/meet/${meetingIdInput.trim()}`;
        close();
    }
</script>

<svelte:window on:keydown={onKeyDown} />

{#if $showNavigationModalStore}
    <div
        class="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
        on:click={close}
        transition:fly={{ y: -200, duration: 300 }}
    >
        <div class="relative w-full max-w-md rounded-lg bg-dark-purple p-6 shadow-xl" on:click|stopPropagation>
            <div class="absolute right-4 top-4">
                <ButtonClose on:click={close} />
            </div>

            <h2 class="mb-6 text-center text-2xl font-bold text-white">Navigation Menu</h2>

            {#if !showJoinMeetingInput}
                <div class="flex flex-col gap-3">
                    <button
                        class="rounded-lg bg-light-purple px-6 py-3 text-white hover:bg-light-purple/80 transition-colors"
                        on:click={goToCourtyard}
                    >
                        Go to Courtyard
                    </button>

                    <button
                        class="rounded-lg bg-light-purple px-6 py-3 text-white hover:bg-light-purple/80 transition-colors"
                        on:click={goHome}
                    >
                        Go Home
                    </button>

                    <button
                        class="rounded-lg bg-light-purple px-6 py-3 text-white hover:bg-light-purple/80 transition-colors"
                        on:click={startMeeting}
                    >
                        Start a Meeting
                    </button>

                    <button
                        class="rounded-lg bg-light-purple px-6 py-3 text-white hover:bg-light-purple/80 transition-colors"
                        on:click={showJoinMeeting}
                    >
                        Join a Meeting
                    </button>
                </div>
            {:else}
                <div class="flex flex-col gap-3">
                    <label class="text-white">
                        <span class="mb-2 block">Enter Meeting ID:</span>
                        <input
                            type="text"
                            bind:value={meetingIdInput}
                            class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white"
                            placeholder="Meeting ID"
                            on:keydown={(e) => e.key === "Enter" && joinMeeting()}
                        />
                    </label>

                    <button
                        class="rounded-lg bg-light-purple px-6 py-3 text-white hover:bg-light-purple/80 transition-colors disabled:opacity-50"
                        on:click={joinMeeting}
                        disabled={!meetingIdInput.trim()}
                    >
                        Join Meeting
                    </button>

                    <button
                        class="rounded-lg bg-gray-700 px-6 py-3 text-white hover:bg-gray-600 transition-colors"
                        on:click={() => {
                            showJoinMeetingInput = false;
                            meetingIdInput = "";
                        }}
                    >
                        Back
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}
