<script lang="ts">
    import type { PagefindSearchFragment } from '../../types/pagefindjs.d.ts'
    import SearchResultExcerpt from './SearchResultExcerpt.svelte'
    interface Props {
        result: PagefindSearchFragment
    }

    let { result }: Props = $props()
    let showing = $state(false)
</script>

<li class="result">
    <hr/>
    <div>
        <a href={result.url}>
            <svg viewBox="0 0 24 24" class="icon">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 17h6" /><path d="M9 13h6" />
            </svg>
            <span>{ result.meta.title }</span>
        </a>
    </div>
    {#each result.sub_results.slice(0, showing ? undefined : 3) as sub }
        {#if sub.anchor === undefined}
            <p>
                <SearchResultExcerpt excerpt={sub.excerpt}/>
            </p>
        {/if}
    {/each}
    <ul>
        {#each result.sub_results.slice(0, 3) as sub }
            {#if sub.anchor !== undefined}
                <li>
                    <a href={sub.url}>
                        <svg viewBox="0 0 24 24" class="icon">
                            <path d="M5 9l14 0" /><path d="M5 15l14 0" /><path d="M11 4l-4 16" /><path d="M17 4l-4 16" />
                        </svg>
                        {sub.title}
                    </a>
                    <p>
                        <SearchResultExcerpt excerpt={sub.excerpt}/>
                    </p>
                </li>
            {/if}
        {/each}
    </ul>
    {#if result.sub_results.length > 3}
        <ul>
            {#if showing}
                {#each result.sub_results.slice(3) as sub }
                    {#if sub.anchor !== undefined}
                        <li>
                            <a href={sub.url}>
                                <svg viewBox="0 0 24 24" class="icon">
                                    <path d="M5 9l14 0" /><path d="M5 15l14 0" /><path d="M11 4l-4 16" /><path d="M17 4l-4 16" />
                                </svg>
                                {sub.title}
                            </a>
                            <p>{@html sub.excerpt}</p>
                        </li>
                    {/if}
                {/each}
                <button class="less" onclick={() => showing = false}>Show less</button>
            {:else}
                <button onclick={() => showing = true}>
                    Show {result.sub_results.length - 3} more
                </button>
            {/if}
        </ul>
    {/if}
</li>

<style>
    .result {
        background-color: var(--bg-code);
        border-radius: 0.7rem;
        margin-top: 0.5rem;
        overflow: clip;
        box-shadow: 0 0.4rem 0.8rem #0001;
    }
    div {
        padding-top: 0.2rem;
        position: sticky;
        top: 0;
        background-color: inherit;
        height: 2.6rem;
    }
    .result > div > a {
        font-weight: 600;
        z-index: 5;
        white-space: nowrap;
        max-width: 100%;
    }
    span {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    hr {
        position: sticky;
        top: 2.6rem;
        margin: -1px 0;
        padding: 0;
        border: none;
        border-bottom: 1px solid var(--line);
        box-shadow: 0 0 6px 0 #0006;
    }
    :global(dark) hr {
        box-shadow: 0 0 6px 1px #000;
    }
    a:hover {
        text-decoration: underline;
    }
    a {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.2rem 0.5rem;
        margin: 0.3rem;
    }
    ul a {
        font-weight: 500;
        font-size: 0.95rem;
    }
    svg {
        flex-shrink: 0;
        width: 1.4rem;
        height: 1.4rem;
        color: var(--sub);
    }
    ul svg {
        width: 1.2rem;
        height: 1.2rem;
    }
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    ul > li {
        border-top: 1px solid var(--line);
    }
    ul > li {
        padding-top: 0.1rem;
        padding-inline: 1rem 0.8rem;
    }
    p {
        color: var(--sub);
        font-size: 0.9rem;
        margin-inline: 2.4rem 0.8rem;
        margin-block: -0.2rem 0;
        padding-bottom: 0.5rem;
        overflow-x: hidden;
        text-overflow: ellipsis;
        line-height: 1.5;
        background-color: inherit;
        z-index: 5;
    }
    ul p {
        margin-inline-start: 2.2rem;
    }
    p :global(mark) {
        color: rgb(var(--text));
        font-weight: 500;
        background: none;
    }
    button {
        display: block;
        width: 100%;
        border-top: 1px solid var(--line);
        padding: 0.5rem 1.5rem;
        text-align: start;
        color: var(--accent);
        background-color: var(--bg-code);
    }
    .less {
        position: sticky;
        bottom: 0;
    }
    button:hover {
        color: var(--accent-highlight);
        background-color: var(--bg-code-highlight);
    }
</style>