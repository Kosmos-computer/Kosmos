<template>
    <div class="screen"
        :class="{
            'opacity-0': !show,
            'opacity-100': show,
            'duration-300': !show,
            'duration-200': show,
            'z-10': show,
        }" />
</template>
<script setup lang="ts">
import { computed, withDefaults } from 'vue'
const props = withDefaults(defineProps<{
    active: boolean
}>(), {
    active: false
})
const show = computed(() => props.active)
</script>
<style lang="scss" scoped>
.screen {
    @apply inset-0 bg-gray-500 bg-opacity-25 transition-opacity; 
}
</style>