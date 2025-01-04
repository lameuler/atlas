<script lang="ts">
    import type { PagefindJS, PagefindSearchResults } from '../../types/pagefindjs.d.ts'
    import SearchResultsList from './SearchResultsList.svelte'

    let { dialog }: { dialog?: HTMLDialogElement } = $props() 

    let pagefind: PagefindJS | null = $state(null)
    let message: string = $state('')
    $effect(() => {
        import(/* @vite-ignore */`${import.meta.env.BASE_URL}/_pagefind/pagefind.js`).then(async (module: PagefindJS) => {
            pagefind = module
            search()
        }).catch(() => {
            message = 'Failed to load pagefind module'
        })
    })

    let value = $state('')
    $effect(() => {
        search()
    })

    let currentResults: PagefindSearchResults | null = $state(null)

    async function search() {
        if (value.length === 0) {
            currentResults = null
            return
        }
        if (pagefind) {
            const results = await pagefind.debouncedSearch(value)
            if (results && value.length !== 0) {
                currentResults = results
            }
        }
    }
    function onsubmit(event: Event) {
        event.preventDefault()
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    }
</script>

<div>
    <form {onsubmit}>
        <svg viewBox="0 0 24 24" class="icon magnifier">
            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />
        </svg>
        <input type="text" placeholder="Search" bind:value/>
        <button type="reset" aria-label="Clear search" hidden={!value}>
            <svg viewBox="0 0 24 24" class="icon">
                <path d="M18 6l-12 12"></path><path d="M6 6l12 12"></path>
            </svg>
        </button>
    </form>
    <button class="cancel" onclick={() => dialog?.close()}>
        Cancel
    </button>
</div>

{#if message}
    <span>
        {message}
    </span>
{:else if currentResults}
    <SearchResultsList results={currentResults}/>
{/if}

<style>
    form {
        display: flex;
        align-items: center;
        height: 2.5rem;
        position: relative;
        flex-grow: 1;
        overflow: visible;
    }
    input {
        display: block;
        height: 100%;
        flex-grow: 1;
        padding-inline: 2.3rem;
        font-family: inherit;
        font-size: inherit;
        appearance: none;
        border-radius: 0.75rem;
        border: 1px solid var(--line);
        background-color: var(--bg-code);
    }
    input:focus {
        outline: none;
        border: 1px solid var(--accent);
        box-shadow: 0 0 5px 1px var(--accent);
    }
    input::placeholder {
        color: inherit;
        opacity: 0.5;
    }
    svg {
        width: 1.3rem;
        height: 1.3rem;
        display: block;
        margin: auto;
    }
    .magnifier {
        position: absolute;
        pointer-events: none;
        left: 0.6rem;
        opacity: 0.5;
    }
    button[type=reset] {
        position: absolute;
        right: 0;
        width: 2.5rem;
        height: 2.5rem;
        opacity: 0.5;
    }
    button:hover[type=reset] {
        opacity: 1;
    }
    div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .cancel {
        color: var(--accent);
        padding: 0.5rem;
        margin-inline-end: -0.5rem;
    }
    .cancel:hover {
        color: var(--accent-highlight);
    }
    @media (min-width: 768px) {
        .cancel {
            display: none;
        }
    }
    span {
        display: block;
        text-align: center;
        color: #d72424;
        padding: 2rem;
    }
</style>