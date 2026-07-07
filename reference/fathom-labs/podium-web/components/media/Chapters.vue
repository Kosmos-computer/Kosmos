<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 pr-8 mx-auto max-w-6xl">
    <h1 class="text-2xl text-gray-900 font-semibold leading-8 mb-6">{{ t('Chapters') }}</h1>

    <div v-if="currentMediaAssetsLoading" class="m-auto pb-[30vh]" style="">
      <SvgLoadingMd />

    </div>
    <div v-if="!currentMediaAssetsLoading" v-cloak class="mb-8">
      <h1 class="text-xl text-gray-900 font-semibold leading-8 mb-6">{{ t('Chapter Timestamps') }}</h1>
      <div v-for="asset in assets" class="text-base font-base text-gray-700" style="white-space: pre-line;">
        ({{ mainStore.formatTime(asset.start_seconds) }}) - {{ asset.title }} 
      </div>

      <div @click="copyTimestamps()" class="mt-3 flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
        <div class="pr-2 pl-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
            <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
          </svg>
        </div>          
        <div class="text-sm font-medium leading-5 text-gray-700">
          <span v-if="!copiedTimestamps">{{ t('Copy') }}</span>
          <span v-if="copiedTimestamps">{{ t('Copied!') }}</span>
        </div>
      </div>

      <div class="flex flex-row mb-6 mt-14 items-center">
        <h1 class="text-xl text-gray-900 font-semibold leading-8">{{ t('Chapters With Long Summaries') }}</h1>
        <div class="flex-grow">
          <div @click="copyPrimary()" class="float-right flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
            <div class="pr-2 pl-1">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
                <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
              </svg>
            </div>          
            <div class="text-sm font-medium leading-5 text-gray-700">
              <span v-if="!copiedPrimary">{{ t('Copy') }}</span>
              <span v-if="copiedPrimary">{{ t('Copied!') }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-for="(asset, index) in assets" class="text-lg font-base text-gray-700 mb-8" style="white-space: pre-line;">
        <div class="text-sm leading-5 text-gray-500 mb-2">
          {{ t('Chapter') }} {{ index + 1 }}
        </div>
        <div class="flex flex-row mb-1">
          <div class="text-lg font-semibold leading-8 text-gray-900 mb-1">{{ asset.title }}</div>
          <div class="text-base leading-5 text-gray-400 flex-grow self-center text-end mb-1">{{ mainStore.formatTime(asset.start_seconds) }}</div>
        </div>
        <div class="text-base font-base text-gray-700" style="white-space: pre-line;"> {{  asset.content }} </div>
      </div>
    
      <div class="flex flex-row mb-6 mt-14 items-center">
        <h1 class="text-xl text-gray-900 font-semibold leading-8">{{ t('Chapters With Short Summaries') }}</h1>
        <div class="flex-grow">
          <div @click="copyVariation()" class="float-right flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
            <div class="pr-2 pl-1">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
                <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
              </svg>
            </div>          
            <div class="text-sm font-medium leading-5 text-gray-700">
              <span v-if="!copiedVariation">{{ t('Copy') }}</span>
              <span v-if="copiedVariation">{{ t('Copied!') }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-for="(asset, index) in assets" class="text-lg font-base text-gray-700 mb-8" style="white-space: pre-line;">
        <div class="text-sm leading-5 text-gray-500 mb-2">
          {{ t('Chapter') }} {{ index + 1 }}
        </div>
        <div class="flex flex-row mb-1">
          <div class="text-lg font-semibold leading-8 text-gray-900 mb-1">{{ asset.variations[0].title }}</div>
          <div class="text-base mb-1 leading-5 text-gray-400 flex-grow self-center text-end">{{ mainStore.formatTime(asset.variations[0].start_seconds) }}</div>
        </div>
        <div class="text-base font-base text-gray-700" style="white-space: pre-line;"> {{  asset.variations[0].content }} </div>
      </div>
    </div>
    </div>
  </div>
  <div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0">
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const { currentMediaAssets, currentMediaAssetsLoading } = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()

const assets = ref([])
const copiedTimestamps = ref(null)
const copiedPrimary = ref(null)
const copiedVariation = ref(null)

// watch currentMediaAssets for changes
watch(currentMediaAssets.value, (newVal, oldVal) => {
  console.log('chapters currentMediaAssets changed')
  initAssets()
})

onMounted(() => {
  initAssets()
})

const numVariations = computed(() => {
  return assets.value[0].variations.length
})

const initAssets = () => {
  console.log('chapters init assets called')
  if (mainStore.currentMediaAssets) {
    let filteredAssets = mainStore.currentMediaAssets.filter(asset => asset.type === 'chapter')
    filteredAssets.sort((a, b) => a.start_seconds - b.start_seconds)
    assets.value = filteredAssets
    console.log('chapter assets set')
    console.log(assets.value)
  }
}

const copyTimestamps = () => {
  var content = ''
  assets.value.forEach(asset => {
    content += `(${mainStore.formatTime(asset.start_seconds)}) ${asset.title}\n`
  })

  navigator.clipboard.writeText(content);

  copiedTimestamps.value = true;
  setTimeout(() => {
    copiedTimestamps.value = false;
  }, 2500);
}

const copyPrimary = () => {
  var content = ''
  assets.value.forEach(asset => {
    content += `(${mainStore.formatTime(asset.start_seconds)}) ${asset.title}\n\n`
    content += `${asset.content}\n\n`
  })

  navigator.clipboard.writeText(content);

  copiedPrimary.value = true;
  setTimeout(() => {
    copiedPrimary.value = false;
  }, 2500);
}

const copyVariation = () => {
  var content = ''
  assets.value.forEach(asset => {
    content += `(${mainStore.formatTime(asset.variations[0].start_seconds)}) ${asset.variations[0].title}\n\n`
    content += `${asset.variations[0].content}\n\n`
  })

  navigator.clipboard.writeText(content);

  copiedVariation.value = true;
  setTimeout(() => {
    copiedVariation.value = false;
  }, 2500);
}

</script>

<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
</style>