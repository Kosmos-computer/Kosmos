<template>
    <div class="search__prompt">
        <SvgLifesaver />
        <p class="search__prompt-title">
            {{ title }}
        </p>
        <p class="search__prompt-description">
            {{ description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Search for podcasts')
const description = ref('Use this tool to quickly search for podcasts and projects across our entire platform. Use your navigation keys to select your result and hit enter to go.')
</script>

<style lang="scss" scoped>
.search {
    &__prompt {
        @apply px-6 py-14 text-center text-sm sm:px-14;

        svg {
            @apply mx-auto h-6 w-6 text-gray-400;
        }

        &-title {
            @apply mt-4 font-semibold text-gray-900;
        }

        &-description {
            @apply mt-2 text-gray-500;
        }
    }
}
</style>