<template>
    <div class="min-h-[400px] relative"> 
      <div class="flex flex-col">
        <div v-if="mainStore.media.length > 0" class="flex flex-wrap gap-4 py-4">
          <div v-for="media in mainStore.media" :key="media.id">
            <UploadFileTile :media="media" />
          </div>
        </div>
        <div v-show="mainStoreState.mediaLoading.value == false && mainStore.media.length == 0" class="flex flex-col items-center pt-10 mt-6">
          <SvgProjects />
          <span class="text-primary font-medium opacity-80 mt-3">
            {{ t('Your files will') }} <br/> {{ t('appear here.') }}
          </span>
        </div>
      </div>
      <div v-show="mainStoreState.mediaLoading.value == true || mainStoreState.mediaLoading.value == null" class="absolute inset-0 flex flex-col items-center pt-24 pb-24 bg-white bg-opacity-80">
        <SvgLoadingMd />
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { useMainStore } from "~/store/main";
  import { storeToRefs } from 'pinia'
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

  const mainStore = useMainStore();
  const mainStoreState = storeToRefs(mainStore)
  
  onMounted(async () => {
  localStorage.setItem('stayClipCards', 'false')
  localStorage.setItem('stayShowNotes', 'false')
    if (mainStore.media.length == 0) {
      await mainStore.setMediaPage(1);
    }
  })
  </script>
  