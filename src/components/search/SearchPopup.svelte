<script lang="ts">
    import Search from './Search.svelte'

    let dialog: HTMLDialogElement | undefined = $state(undefined)

    let isMac: boolean | undefined = $state()
    $effect(() => {
        isMac = navigator.platform.startsWith('Mac') || navigator.platform === 'iPhone'
    })
    $effect(() => {
        const listener = (event: MouseEvent) => {
            if (event.target === dialog) {
                dialog.close()
            }
        }
        dialog?.addEventListener('click', listener)
        return () => dialog?.removeEventListener('click', listener)
    })
    $effect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === 'k') {
                if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
                    if (dialog?.open) {
                        dialog.close()
                    } else {
                        dialog?.showModal()
                    }
                }
            }
        }
        window.addEventListener('keydown', listener)
        return () => window.removeEventListener('keydown', listener)
    })
</script>

<button onclick={() => dialog?.showModal()}>
    <svg viewBox="0 0 24 24" class="icon"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
    <span>Search</span>
        {#if isMac === true}
            <kbd>⌘K</kbd>
        {:else if isMac === false}
            <kbd>Ctrl K</kbd>
        {/if}
</button>

<dialog bind:this={dialog} class="popup">
    <div>
        {#if import.meta.env.PROD}
            <Search {dialog}/>
        {:else}
            <div class="error">
                Search is only available in production builds
            </div>
        {/if}
    </div>
</dialog>

<style>
    dialog {
        margin: 0 auto;
        padding: 0;
        top: 0;
        left: 0;
        right: 0;
        width: auto;
        max-width: none;
        min-height: 14rem;
        max-height: 100%;
        z-index: 50;
        overflow-y: auto;

        background-color: #ecf0fbcc;
        backdrop-filter: blur(0.5rem);
        box-shadow: 0 0.5rem 1rem #0002;

        border: none;
    }
    :global(.dark) dialog {
        background-color: #131c35cc;
        border: 1px solid #2a384c;
        box-shadow: 0 0.5rem 1rem #0005;
    }
    @media (min-width: 768px) {
        dialog {
            top: 2rem;
            left: 3rem;
            right: 3rem;
            width: auto;
            max-width: 45rem;
            min-height: 14rem;
            max-height: calc(100% - 6rem);
            border: 1px solid #bdcbe0;
            border-radius: 1rem;
        }
    }
    div {
        padding: 1rem;
        width: 100%;
        min-height: 100%;
        border-radius: inherit;
    }
    div.error {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sub);
    }

    dialog::backdrop {
        background-color: rgba(0,0,0,0.5);
        backdrop-filter: blur(0.3rem);
    }

    button {
        padding: 0.25rem;
    }
    button > * {
        display: none;
    }
    button > svg {
        display: block;
        opacity: 0.6;
    }
    button:hover > svg {
        opacity: 0.8;
    }
    button:active > svg {
        opacity: 0.9;
    }
    svg {
        display: block;
        width: 1.5rem;
        height: 1.5rem;
    }
    @media (min-width: 640px) {
        button {
            display: flex;
            align-items: center;
            text-align: start;
            background-color: var(--bg-code);
            opacity: 0.8;
            border: 1px solid var(--line);
            height: 2rem;
            width: 15rem;
            margin-inline-end: 0.5rem;
            border-radius: 0.5rem;
            gap: 0.15rem;
        }
        button > * {
            display: initial;
        }
        button:hover {
            opacity: 1;
        }
        button > svg {
            width: 1.2rem;
            height: 1.2rem;
            margin: 0 0.25rem;
        }
    }
    span {
        flex-grow: 1;
    }
    kbd {
        font-size: 0.8rem;
        border: 1.5px solid var(--line);
        border-radius: 0.3rem;
        line-height: 1;
        padding: 0.25rem 0.25rem;
    }
</style>