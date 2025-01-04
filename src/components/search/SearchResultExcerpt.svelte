<script lang="ts">
    import { cut } from './utils.js'
    let { excerpt }: { excerpt: string } = $props()
    let short = $derived(cut(excerpt))
    let showing = $state(false)
</script>

{#if short.length < excerpt.length}
    {#if showing}
        {@html excerpt}
        <br/>
        <button onclick={() => showing = false}>See less</button>
    {:else}
        {@html short}
        <button onclick={() => showing = true}>See more</button>
    {/if}
{:else}
    {@html excerpt}
{/if}

<style>
    button {
        color: var(--accent);
    }
    button:hover {
        color: var(--accent-highlight);
    }
</style>