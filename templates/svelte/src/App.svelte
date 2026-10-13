<script lang="ts">
  let completed = $state(0);
</script>

<main>
  <p class="eyebrow">Svelte + Vite · {{projectName}}</p>
  <h1>Make room for your next idea.</h1>
  <p>A tiny focus tracker: finish a task, log it, and keep moving. Replace this card with your own work.</p>
  <p role="status" aria-live="polite">Tasks completed: {completed}</p>
  <div class="actions">
    <button type="button" onclick={() => completed += 1}>Complete a task</button>
    <button type="button" onclick={() => completed = 0}>Reset</button>
  </div>
</main>
