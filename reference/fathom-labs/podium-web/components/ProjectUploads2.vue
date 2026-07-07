<template>
    <div class="min-h-full relative"> 
      <div class="flex flex-col">
        <div v-if="mainStore.projectMedia.length > 0" class="flex flex-wrap gap-4 py-4">
          <div v-for="media in mainStore.projectMedia" :key="media.id" >
            <UploadFileTile :media="media" />
          </div>
        </div>
        <div v-show="mainStoreState.projectMediaLoading.value == false && mainStore.projectMedia.length == 0" class="flex flex-col items-center pt-10 mt-6">
          <SvgProjects />
          <span class="text-primary font-medium opacity-80 mt-3">
            {{ t('Your files will') }} <br/> {{ t('appear here.') }}
          </span>
        </div>
      </div>
      <div v-show="mainStoreState.projectMediaLoading.value == true || mainStoreState.projectMediaLoading.value == null" class="absolute  min-h-[160px] inset-0 flex flex-col items-center pt-8 pb-8 bg-white bg-opacity-80"> 
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
    mainStore.initializeSelectedProject()
  })
  </script>
  