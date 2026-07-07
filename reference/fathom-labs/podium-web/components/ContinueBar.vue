<template>
  <div :class="['fixed bottom-0 left-0 right-0 flex justify-center bg-black py-6 transition-all duration-150 z-60', { 'translate-y-full': !fileSelected, 'translate-y-0': fileSelected }]">
    <BaseButton v-if="fileSelected" color="onBlack">Continue</BaseButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{ fileSelected: boolean }>();
</script>
