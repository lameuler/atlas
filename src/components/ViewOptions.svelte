<script lang="ts">
    import SizeControl from './SizeControl.svelte'
    import FontSelect from './FontSelect.svelte'

    let showing = $state(false)
    let toggle: HTMLButtonElement
    let menu: HTMLElement

    $effect(() => {
        document.body.addEventListener('click', (event) => {
            if (showing && event.target instanceof Node && !toggle.contains(event.target) && !menu.contains(event.target)) {
                showing = false
            }
        })
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                showing = false
            }
        })
        window.addEventListener('storage', (event) => {
            if(event.key === window.location.pathname.split('/')[1] + 'appearance:options') {
                load()
            }
        })
    })

    let font = $state<string>('sans-serif')
    let size = $state(1)
    let line = $state(1)

    let article: HTMLElement | null = $state(null)

    $effect(load)

    $effect(() => {
        article = document.querySelector('body > main > article')
    })

    $effect(() => {
        if (article) {
            article.dataset.font = font
            article.style.fontSize = size + 'rem'
            article.style.setProperty('--height', line+'')
        }
    })
    $effect(() => {
        localStorage.setItem(window.location.pathname.split('/')[1] + 'appearance:options', JSON.stringify({ font, size, line }))
    })

    function reset() {
        font = 'sans-serif'
        size = 1
        line = 1
    }
    function load() {
        const stored = localStorage.getItem(window.location.pathname.split('/')[1] + 'appearance:options')
        if (stored) {
            const options = JSON.parse(stored)
            font = options.font ?? 'sans-serif'
            size = options.size ?? 1
            line = options.line ?? 1
        }
    }

    let script: HTMLScriptElement
    $effect(() => script.remove())
</script>

<div data-font="sans-serif" data-pagefind-ignore="all">
    <script bind:this={script}>
        (function () {
            const stored = localStorage.getItem(window.location.pathname.split('/')[1] + 'appearance:options')
            if (stored) {
                const { font = 'sans-serif', size = 1, line = 1 } = JSON.parse(stored)
                const article = document.querySelector('body > main > article')
                article.dataset.font = font
                article.style.fontSize = size + 'rem'
                article.style.setProperty('--height', line+'')
            }
        })()
    </script>
    <button bind:this={toggle} class="toggle" onclick={() => showing = !showing}>
        <svg viewBox="0 0 24 24" class="icon"><path d="M3 7v-2h13v2" /><path d="M10 5v14" /><path d="M12 19h-4" /><path d="M15 13v-1h6v1" /><path d="M18 12v7" /><path d="M17 19h2" /></svg>
        View options
    </button>
    {#if font !== 'sans-serif' || size !== 1 || line !== 1}
        <button onclick={reset} class="reset">
            Reset
        </button>
    {/if}
    <menu bind:this={menu} class:showing>
        <li class="size">
            <span>Font size</span>
            <SizeControl bind:value={size}/>
        </li>
        <li class="line">
            <span>Line height</span>
            <SizeControl bind:value={line}/>
        </li>
        <li class="font">
            <span>Font</span>
            <FontSelect bind:selected={font} options={{ 'sans-serif': 'Sans serif', 'serif': 'Serif', 'mono': 'Monospace', 'system': 'System'}}/>
        </li>
    </menu>
</div>

<style>
    div {
        margin-top: 1rem;
        /* margin-bottom: 2rem; */
        display: flex;
        align-items: center;
        gap: 0.8rem;
        position: relative;
        font-size: 0.9rem;
    }
    svg {
        width: 1.2rem;
        height: 1.2rem;
    }
    .toggle {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        color: var(--sub);
    }
    .reset {
        color: var(--accent);
    }
    .toggle:hover, .reset:hover {
        color: var(--accent-highlight);
    }
    menu {
        list-style: none;
        margin: 0 -0.25rem;
        top: 2rem;
        position: absolute;
        z-index: 5;
        padding: 0.5rem 0.8rem;
        font-size: 1rem;
        line-height: 1.5;

        background-color: #ecf0fbcc;
        backdrop-filter: blur(0.5rem);
        box-shadow: 0 0.5rem 1rem #0002;
        border: 1px solid #bdcbe0;
        border-radius: 0.6rem;

        user-select: none;
        -webkit-user-select: none;
        translate: 0 -1rem;
        opacity: 0;
        transition-property: translate, opacity, visibility;
        transition-duration: 200ms;
        transition-timing-function: ease-in-out;
        visibility: hidden;
    }
    menu.showing {
        opacity: 1;
        visibility: visible;
        translate: 0 0;
    }
    :global(.dark) menu {
        background-color: #131c35cc;
        border: 1px solid #2a384c;
        box-shadow: 0 0.5rem 1rem #0005;
    }
    span {
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--sub);
    }
    .font {
        border-top: 1px solid var(--line);
        margin-top: 0.5rem;
        padding-top: 0.5rem;
    }
    .size, .line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.2rem;
    }
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media print {
        menu {
            display: none;
        }
    }
</style>