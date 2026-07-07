<template>
    <ModalsTemplate :open="open" >
      <h1 v-if="mainStore.clipProgress != 100" class="text-lg leading-6 font-medium text-gray-900 text-center">
        {{ t('Your file is processing...') }} 
      </h1>
      <h1 v-if="mainStore.clipProgress == 100" class="text-lg leading-6 font-medium text-gray-900 text-center">
        {{ t('Your file processing is complete...') }}
      </h1>
      <div>
        <div  class="my-4 w-full" aria-hidden="true">
          <div class="overflow-hidden rounded-full bg-gray-200">
            <div class="h-2.5 rounded-full bg-indigo-600" :style="{ width: mainStore.clipProgress + '%' }"> </div>
          </div>
        </div>
    
        <h2 class="text-xs leading-5 font-medium text-gray-400 text-center mb-4">
              {{ mainStore.clipProgress && mainStore.clipProgress != 'NaN' ? mainStore.clipProgress : '0'}}{{ t('% Complete') }}
        </h2>
        <button v-if="mainStore.clipProgress!=100" type="button" class="btn btn-cancel" @click="closeHandle">{{ t('Cancel') }}</button>
      </div>
    </ModalsTemplate>
  </template>
  
  <script setup>
  import { useMainStore } from "~/store/main";
  import emitter from '@/plugins/eventBus';
  import { computed } from 'vue'
  import languageStore from '@/store/LanguageStore';

  const t = computed(() => {
    return key => {
      const translation = languageStore.state.translations[key];
      return translation || key;  // Fallback to key if translation not found
    };
  });
  const mainStore = useMainStore()
  const props = defineProps(['open', 'videoRes'])
  const emit = defineEmits(['close'])

  const closeHandle = ()=>{
    mainStore.clipProgress = 0
    emitter.emit('stopApi', 'stop execution');
    emit('close')
  }

  function autoDownloadVideo(url) {
        // const newTab = window.open(url, '_blank');
        // newTab.focus();
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'video.mp4';  // Change the filename if necessary
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
  }
  onUnmounted(() => {
    emitter.off('videoUrl', handleVideoUrl);
  });

  onMounted(async () => {
    emitter.on('videoUrl', handleVideoUrl);
  });

  const handleVideoUrl = (data) => {
    emit('close')
    mainStore.clipProgress = 0
    autoDownloadVideo(data)
  };
  
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
          focus-visible:outline
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-indigo-700 sm:col-start-2;
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
  