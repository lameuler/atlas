<script lang="ts">
    
</script>

<li>
    <div class="title">
        <svg viewBox="0 0 24 24" class="icon">
            <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 17h6" /><path d="M9 13h6" />
        </svg>
        <div></div>
    </div>
    <div class="p">
        <div class="m"></div>
        <div></div>
        <div class="s"></div>
    </div>
</li>

<style>
    li {
        margin-top: 0.5rem;
        background-color: var(--bg-code);
        border-radius: 0.7rem;
        opacity: 0.4;
        padding: 0.3rem 0;
    }
    .title {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.5rem 0.8rem;
    }
    .title div {
        height: 1rem;
        border-radius: 1rem;
        background-color: rgb(var(--text));
        opacity: 0.4;
        width: 40%;
    }
    svg {
        display: block;
        width: 1.4rem;
        height: 1.4rem;
        color: var(--sub);
        opacity: 0.7;
    }
    .p {
        position: relative;
        margin-inline: 2.5rem 1.5rem;
    }
    .p div {
        height: 0.8rem;
        margin-bottom: 0.4rem;
        border-radius: 1rem;
        width: 100%;
        background-color: rgb(var(--text));
        opacity: 0.3;
    }
    .p div.m {
        width: 90%;
    }
    .p div.s {
        width: 35%;
    }
</style>