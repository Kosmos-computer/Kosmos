<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 pr-8 mx-auto max-w-6xl">
    <h1 class="text-2xl text-gray-900 font-semibold leading-8 mb-6">{{ t('Title Suggestions') }}</h1>

    <div v-if="currentMediaAssetsLoading" class="m-auto pb-[30vh]" style="">
      <SvgLoadingMd />

    </div>
    <div v-if="!currentMediaAssetsLoading" v-for="(asset, index) in assets" v-cloak class="my-6">
      <div class="mb-8 flex items-center">
        <div class="text-sm font-medium text-indigo-600 mr-6 flex items-center justify-center w-6 h-6 bg-indigo-50 rounded-full border-2 border-indigo-600">{{ index + 1 }}</div>
        <div class="text-lg font-semibold text-gray-700 flex-1">{{ asset.content }}</div>
      </div>


      <div @click="copy(asset.id, asset.content)" class="mt-2 ml-12 flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
        <div class="pr-2 pl-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
            <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
          </svg>
        </div>          
        <div class="text-sm font-medium leading-5 text-gray-700">
          <span v-if="copied != asset.id">{{ t('Copy') }}</span>
          <span v-if="copied == asset.id">{{ t('Copied!') }}</span>
        </div>
      </div>
    </div>
    </div>
  </div>
  <div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0">

  </div>
</template>

<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
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
const copied = ref(null)

// watch currentMediaAssets for changes
watch(currentMediaAssets.value, (newVal, oldVal) => {
  initAssets()
})

onMounted(() => {
  initAssets()
})

const initAssets = () => {
  if (mainStore.currentMediaAssets) {
    let asset = mainStore.currentMediaAssets.find(asset => asset.type === 'titles')
    assets.value.push(asset)
    asset.variations.forEach(variation => {
      assets.value.push(variation)
    })
  }
}

const copy = (id, content) => {
  navigator.clipboard.writeText(content);
  
  copied.value = id;
  setTimeout(() => {
    copied.value = null;
  }, 2500);
}
</script>

<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
</style>