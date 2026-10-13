<script setup lang="ts">
import { ref } from 'vue';
const completed = ref(0);
</script>

<template>
  <main>
    <p class="eyebrow">Vue + Vite · {{projectName}}</p>
    <h1>Make room for your next idea.</h1>
    <p>A tiny focus tracker: finish a task, log it, and keep moving. Replace this card with your own work.</p>
    <p role="status" aria-live="polite" v-text="`Tasks completed: ${completed}`"></p>
    <div class="actions">
      <button type="button" @click="completed += 1">Complete a task</button>
      <button type="button" @click="completed = 0">Reset</button>
    </div>
  </main>
</template>
