<script lang="ts">
    import {
        backOfficeMenuVisibleStore,
        globalMessageVisibleStore,
        mapEditorMenuVisibleStore,
    } from "../../../Stores/MenuStore";
    import {
        showNavigationModalStore,
        modalIframeStore,
        modalVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../../Stores/ModalStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import AdjustmentsIcon from "../../Icons/AdjustmentsIcon.svelte";
    import MessageGlobalIcon from "../../Icons/MessageGlobalIcon.svelte";
    import { mapEditorModeStore } from "../../../Stores/MapEditorStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { ADMIN_BO_URL } from "../../../Enum/EnvironmentVariable";
    import ActionBarButton from "../ActionBarButton.svelte";

    function toggleGlobalMessage() {
        if ($showNavigationModalStore) {
            showNavigationModalStore.set(false);
            return;
        }

        chatVisibilityStore.set(false);
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
        mapEditorModeStore.switchMode(false);
        showNavigationModalStore.set(true);
    }

    function openBo() {
        if (!ADMIN_BO_URL) {
            throw new Error("ADMIN_BO_URL not set");
        }
        const url = new URL(ADMIN_BO_URL, window.location.href);
        url.searchParams.set("playUri", window.location.href);
        window.open(url, "_blank");
    }
</script>

{#if $mapEditorMenuVisibleStore}
    <ActionBarButton on:click={toggleGlobalMessage} label="Menu">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    </ActionBarButton>
{/if}
{#if $backOfficeMenuVisibleStore}
    <ActionBarButton on:click={openBo} label={$LL.actionbar.bo()}>
        <AdjustmentsIcon />
    </ActionBarButton>
{/if}
{#if $globalMessageVisibleStore}
    <ActionBarButton on:click={toggleGlobalMessage} label="Menu">
        <MessageGlobalIcon />
    </ActionBarButton>
{/if}
