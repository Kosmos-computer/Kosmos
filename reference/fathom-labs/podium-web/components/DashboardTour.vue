<template>
    <div class="flex flex-col">
        <div class="mb-4">
            <h2 class="text-lg leading-6 font-medium mb-1 text-gray-900">{{ t('Dashboard Tour') }}</h2>
        </div>
        <div class="mt-2 mb-4">
            <iframe width="845" height="473.5" src="https://www.youtube-nocookie.com/embed/bqzkDnmNyaA?rel=0&controls=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <div class="mt-4 pt-2 sm:mt-0 sm:flex sm:gap-x-3s">
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Close') }}</button>
        </div>
    </div>
</template>

<script lang="ts" setup>

import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


    const emit = defineEmits(['close'])

    const handleClose = () => {
        emit('close')
    }
    
    
</script>
<style lang="scss" scoped>

.btn {
    @apply
    mt-3
    inline-flex
    w-full
    justify-center
    rounded-md
    px-3 py-2.5
    text-sm
    font-medium
    shadow-sm
    ring-1
    ring-inset
    sm:col-start-1
    sm:mt-0;
    
    &-submit {
        @apply
        bg-indigo-700
        ring-indigo-700
        text-white
        hover:bg-indigo-600
        hover:ring-indigo-600
    }
    &-cancel {
        @apply
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
    &-change {
        @apply
        w-auto
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
}
</style>