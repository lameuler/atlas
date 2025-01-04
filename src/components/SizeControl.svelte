<script lang="ts">
    interface Props {
        value?: number,
        sizes?: number[],
        initial?: number
    }
    let {
        sizes = [0.65, 0.75, 0.85, 0.9, 0.95, 1, 1.1, 1.2, 1.35, 1.5, 1.75],
        initial = 1,
        value = $bindable(initial)
    }: Props = $props()

    function increment() {
        value = Math.min(...sizes.filter(s => s > value), Math.max(...sizes))
    }
    function decrement() {
        value = Math.max(...sizes.filter(s => s < value), Math.min(...sizes))
    }
</script>

<div>
    <button onclick={decrement} disabled={value <= Math.min(...sizes)} aria-label="Decrease text size">
        <svg viewBox="0 0 24 24" class="icon">
            <path d="M5 12l14 0" />
        </svg>
    </button>
    <button onclick={() => value = initial} disabled={value === initial} class="percent">
        {(value * 100).toFixed()}%
    </button>
    <button onclick={increment} disabled={value >= Math.max(...sizes)} aria-label="Increase text size">
        <svg viewBox="0 0 24 24" class="icon">
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
        </svg>
    </button>
</div>

<style>
    div {
        display: flex;
        align-items: stretch;
    }
    .percent {
        width: 3rem;
    }
    button {
        padding: 0.2rem;
        border-radius: 0.5rem;
        opacity: 1;
    }
    button:not(:disabled):hover {
        opacity: 0.6;
    }
    button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    svg {
        display: block;
        width: 1.2rem;
        height: 1.2rem;
    }
</style>