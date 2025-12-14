<script setup lang="ts">
defineProps<{
  onClick: () => void;
  label: string;
  disabled?: boolean;
}>();
</script>

<template>
  <button 
    :disabled="disabled" 
    @click="onClick"
    class="game-btn">
    {{ label }}
  </button>
</template>

<style scoped>
.game-btn {
  background: var(--button-bg);
  color: var(--button-text);
  font-weight: bold;
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  box-shadow: 0 2px 5px var(--card-shadow);
}

.game-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 8px var(--card-shadow);
}

.game-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
