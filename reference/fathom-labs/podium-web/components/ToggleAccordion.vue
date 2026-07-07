<template>
    <div class="toggle">
        <div class="toggle__header">
            <div class="toggle__header-data">
                <slot name="header" />
            </div>
            <SvgCarrot @click="open = !open" 
                class="toggle__carrot" :class="classes" />
        </div>
        <div class="toggle__body" :class="classes">
            <slot />
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)

const classes = computed(() => {
    return {
        'toggle-open': open.value,
        'toggle-shut': !open.value,
    }
})
</script>
<style lang="scss" scoped>
.toggle {
    @apply flex flex-col w-full;
    &__header {
        @apply relative bg-white flex items-center justify-between px-4 py-4 border-b-2 border-gray-200;
        z-index: 3;

        &-data {
            @apply flex-1;
        }
    }
    &__carrot {
        @apply cursor-pointer transform transition-all ease-in-out;
        &.toggle-open {
            @apply -rotate-180;
        }
        &.toggle-shut {
            @apply rotate-0;
        }
    }
    &__body {
        @apply relative overflow-hidden duration-300 transform transition-all ease-in-out;
        transition: transition 0.2s ease-in-out, height 0.3s ease-in-out 0.2s, opacity 0.2s ease-in-out 0s;
        z-index: 2;
        &.toggle-open {
            @apply h-auto opacity-100 visible translate-y-0;
        }
        &.toggle-shut {
            @apply h-0 invisible opacity-0 -translate-y-full;
        }
    }

}
</style>