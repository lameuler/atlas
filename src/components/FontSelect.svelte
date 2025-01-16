<script lang="ts">
    interface Props {
        options: Record<string, string>
        selected?: string
    }
    let { options, selected = $bindable(Object.keys(options)[0]) }: Props = $props()
</script>

{#each Object.keys(options) as key}
    <label data-font={key} class:selected={ selected === key }>
        <input type="radio" bind:group={selected} name="font-select" value={key}/>
        <svg viewBox="0 0 24 24" class="icon">
            <path d="M5 12l5 5l10 -10" />
        </svg>
        { options[key] }
    </label>
{/each}

<style>
    label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0;
        cursor: pointer;
    }
    label:not(.selected):hover {
        opacity: 0.6;
    }
    input {
        display: none;
    }
    svg {
        opacity: 0;
        width: 1rem;
        height: 1rem;
        stroke-width: 2.5px;
    }
    .selected svg {
        opacity: 1;
    }
    label:not(.selected):hover svg {
        opacity: 0.6;
    }
</style>