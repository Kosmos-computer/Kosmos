<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 pr-8 mx-auto max-w-6xl">
    <h1 class="text-2xl text-gray-900 font-semibold leading-8 mb-6">{{ t('Highlight Timestamps') }}</h1>

    <div v-if="currentMediaAssetsLoading" class="m-auto pb-[30vh]" style="">
      <SvgLoadingMd />

    </div>
    <div v-if="!currentMediaAssetsLoading" v-cloak class="mb-8">
      <div v-for="asset in assets" class="text-base font-base text-gray-700 mb-2" style="white-space: pre-line;">
        ({{ mainStore.formatTime(asset.start_seconds) }} - {{ mainStore.formatTime(asset.end_seconds) }}) {{ asset.title }} ({{ (asset.end_seconds - asset.start_seconds).toFixed(0) }} Seconds)
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
const copiedTimestamps = ref(null)
const copiedPrimary = ref(null)

// watch currentMediaAssets for changes
watch(currentMediaAssets.value, (newVal, oldVal) => {
  initAssets()
})

onMounted(() => {
  initAssets()
})

const numVariations = computed(() => {
  return assets.value[0].variations.length
})

const initAssets = () => {
  if (mainStore.currentMediaAssets) {
    let filteredAssets = mainStore.currentMediaAssets.filter(asset => asset.type === 'highlight')
    filteredAssets.sort((a, b) => a.start_seconds - b.start_seconds)
    assets.value = filteredAssets
  }
}

const copyTimestamps = () => {
  var content = ''
  assets.value.forEach(asset => {
    content += `(${mainStore.formatTime(asset.start_seconds)} - ${mainStore.formatTime(asset.end_seconds)}) ${asset.title}\n`
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

</script>

<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
</style>