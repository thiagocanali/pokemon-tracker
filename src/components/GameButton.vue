<script setup lang="ts">
const props = defineProps<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
}>();
</script>

<template>
  <button :disabled="props.disabled" @click="props.onClick">
    {{ props.label }}
  </button>
</template>
