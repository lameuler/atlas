<script lang="ts">
    import { untrack } from 'svelte'
    import type { PagefindSearchFragment, PagefindSearchResults } from '../../types/pagefindjs.d.ts'
    import SearchResult from './SearchResult.svelte'
    import SearchResultPlaceholder from './SearchResultPlaceholder.svelte'
    interface Props {
        results: PagefindSearchResults
    }

    let { results }: Props = $props()
    let i = $state(0)

    let loaded: PagefindSearchFragment[] = $state([])
    let loading = $state(0)

    $effect(() => {
        // reset the loaded and loading fragments when `results` is changed
        results
        untrack(() => {
            i++
            loaded = []
            loading = 0
            load()
        })
    })

    async function load() {
        const curr = i
        const start = loaded.length, end = Math.min(start + 5, results.results.length)
        const count = end - start
        if (count > 0) {
            loading += count
            const added = await Promise.all(results.results.slice(start, end).map((result) => result.data()))
            // await new Promise((resolve) => setTimeout(resolve, 3000))
            if (curr === i) {
                if (end > loaded.length) {
                    loaded.length = end
                }
                for (let j = 0; j < count; j++) {
                    loaded[start + j] = added[j]
                }
                loading -= count
            }
        }
    }
</script>

<span>{ results.results.length } { results.results.length === 1 ? 'result' : 'results' }</span>
<ol role="listbox">
    {#each loaded as result}
        <SearchResult {result}/>
    {/each}
    {#each Array(loading).fill(undefined)}
        <SearchResultPlaceholder/>
    {/each}
</ol>
{#if loaded.length + loading < results.results.length}
    <button onclick={load}>Load more results</button>
{/if}

<style>
    span {
        color: var(--sub);
        font-size: 0.9rem;
        display: block;
        margin: 0.8rem 1rem 0.5rem 1rem;
    }
    ol {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    button {
        display: block;
        background-color: var(--bg-code);
        border-radius: 0.7rem;
        margin-top: 1em;
        padding: 0.5rem 3rem;
        margin-inline: auto;
        color: var(--accent);
        max-width: 100%;
        box-shadow: 0 0.2rem 0.5rem #0001;
    }
    button:hover {
        color: var(--accent-highlight);
        background-color: var(--bg-code-highlight);
        box-shadow: 0 0.4rem 0.8rem #0001;
    }
</style>