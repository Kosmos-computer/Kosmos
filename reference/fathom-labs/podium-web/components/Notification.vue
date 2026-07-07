<template>
    <div class="p-4">
        <div class="flex items-start">
        <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <div class="ml-3 w-0 flex-1 pt-0.5">
            <p class="text-sm font-medium text-gray-900">{{ title }}</p>
            <p class="mt-1 text-sm text-gray-500">{{ message }}</p>
        </div>
        <div class="ml-4 flex flex-shrink-0">
        </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
    id: number,
    title: string,
    type: string,
    message: string,
}>()

const emit = defineEmits(['destroy']);

const title = computed(() => props.title)
const type = computed(() => props.type)
const message = computed(() => props.message)

onMounted(() => {
    setTimeout(() => {
        console.log('emitting destroy')
        emit('destroy', props.id)
    }, 5000)
})

</script>