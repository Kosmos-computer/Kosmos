<template>
    <div v-if="focused" class="flex flex-wrap items-center bg-gray-50 px-4 py-2.5 text-xs text-gray-700">
        Hit 
        <kbd class="mx-1 flex h-5 w-5 items-center justify-center rounded border border-gray-400 bg-white font-semibold text-gray-900 sm:mx-2">&darr;</kbd>
            or
            <kbd 
            class="mx-1 flex h-5 w-5 items-center justify-center rounded border border-gray-400 bg-white font-semibold text-gray-900 sm:mx-2">&uarr;</kbd>
            <span class="sm:hidden">to select,</span><span class="hidden sm:inline">to select,</span> 
            &nbsp;hit <kbd class="mx-1 flex h-5 w-auto px-2 items-center justify-center rounded border border-gray-400 bg-white font-semibold text-gray-900 sm:mx-2">&rarrhk; Enter</kbd> to go to the podcast, 
            &nbsp;or hit <kbd  class="mx-1 flex h-5 w-auto px-2 items-center justify-center rounded border border-gray-400 bg-white font-semibold text-gray-900 sm:mx-2">ESC</kbd> to exit.
    </div>
</template>