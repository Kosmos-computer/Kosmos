<template>
    <div @click="openLanguageSelector = true" class="flex flex-row items-center text-base font-regular text-gray-600 cursor-pointer">
        <SvgTranslateIcon />
        <!--<span class="px-1">{{ t('En') }}</span>-->
    </div>
    <ModalsInterfaceLanguage :open="openLanguageSelector" @close="openLanguageSelector = false" />
</template>

<script setup>
import { ref, computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const openLanguageSelector = ref(false)

</script>