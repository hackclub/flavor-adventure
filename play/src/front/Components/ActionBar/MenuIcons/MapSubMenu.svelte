<script lang="ts">
    import { getContext } from "svelte";
    import { mapMenuVisibleStore } from "../../../Stores/MenuStore";
    import { showNavigationModalStore } from "../../../Stores/ModalStore";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    const inProfileMenu = getContext("profileMenu");

    // Useless properties. They are here only to avoid a warning because we set the "first" or "classList" prop on all the right menu items
    // svelte-ignore unused-export-let
    export let first: boolean | undefined = undefined;
    // svelte-ignore unused-export-let
    export let classList: string | undefined = undefined;

    function openNavigationMenu() {
        showNavigationModalStore.set(true);
    }
</script>

{#if $mapMenuVisibleStore}
    {#if !inProfileMenu}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            data-testid="navigate-button"
            class="items-center relative cursor-pointer pointer-events-auto"
            on:click|preventDefault={openNavigationMenu}
        >
            <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2mr">
                <div class="flex items-center h-full group-hover:bg-white/10mr group-hover:rounded gap-2 pl-4 pr-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M3 6h14M3 10h14M3 14h14"
                            stroke="white"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    <div class="pr-2">
                        <div
                            class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                        >
                            Navigate
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <HeaderMenuItem label="Navigate" />
        <div on:click={openNavigationMenu} class="cursor-pointer">Navigate</div>
    {/if}
{/if}
