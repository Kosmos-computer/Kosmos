<template>
    <div class="search__empty">
        <SvgWarning />
        <p class="mt-4 font-semibold text-gray-900">No results found</p>
        <p class="mt-2 text-gray-500">We couldn’t find anything with that term. Please try again.</p>
    </div>
</template>
<style lang="scss" scoped>
.search {
    &__empty {
        @apply px-6 py-14 text-center text-sm sm:px-14;
        svg {
            @apply mx-auto h-6 w-6 text-gray-400;
        }
    }
}
</style>