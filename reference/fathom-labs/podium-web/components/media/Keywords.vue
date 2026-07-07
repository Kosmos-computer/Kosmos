<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 pr-8 mx-auto max-w-6xl">
    <h1 class="text-2xl text-gray-900 font-semibold leading-8 mb-6">{{ t('Keywords') }}</h1>

    <div v-if="currentMediaAssetsLoading" class="m-auto pb-[30vh]" style="">
      <SvgLoadingMd />

    </div>
    <div v-if="!currentMediaAssetsLoading" class="flex flex-wrap">
      <div v-for="(keyword, index) in displayedKeywords" :key="index" v-cloak
           class="mb-2 mr-1 px-3 py-1 text-sm font-regular bg-indigo-50 text-indigo-600 border-2 border-transparent rounded-full cursor-pointer hover:bg-indigo-300 transition-colors duration-500 ease-in-out"
           @click="copyToClipboard(keyword, index, $event)">
        {{ keyword }}
      </div>
    

      <CopiedToClipboard v-if="showCopied" :position="copiedPosition" />
    </div>
    
    <div class="flex justify-start items-center mt-4 space-x-4">
      <!-- Copy All Keywords Button -->
      <button @click="copyAllKeywords"
        class="flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 text-sm font-medium leading-5 text-gray-700 border border-gray-300 h-10 rounded-md cursor-pointer hover:bg-gray-100 whitespace-nowrap">
        <div class="pr-2 pl-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
            <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
          </svg>
        </div>
        <span v-if="!copied">{{ t('Copy All Keywords') }}</span>
        <span v-if="copied">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ t('Copied!') }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </button>
      <div class="flex items-center space-x-2">
      <!-- Toggle Switch Container -->
        <div
          class="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full shadow-sm border-2 border-transparent transition-colors duration-400 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          :class="useHashtags ? 'bg-indigo-600' : 'bg-gray-200'"
          @click="toggleHashtags"
          role="switch"
          aria-checked="useHashtags"
        >
          <!-- Toggle Switch Circle -->
          <div
            class="pointer-events-none inline-block h-5 w-5 bg-white rounded-full shadow-md transform transition duration-400 ease-in-out"
            :style="{ transform: useHashtags ? 'translateX(20px)' : 'translateX(0px)' }"
          ></div>
        </div>
        <!-- Label -->
        <span class="text-sm font-regular text-gray-600">{{ t('#Hashtags') }}</span>
      </div>
    </div>
    </div>
  </div>
  

  <div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0">
  </div>
</template>

<script setup>
import { ref } from 'vue';
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

import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue'

const mainStore = useMainStore()
const { currentMediaAssets, currentMediaAssetsLoading } = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()

const showCopied = ref(false);
const copiedPosition = ref({ top: 0, left: 0 });

const assets = ref([])
const copied = ref(null)

// watch currentMediaAssets for changes
watch(currentMediaAssets.value, (newVal, oldVal) => {
  initAssets()
})

onMounted(() => {
  initAssets()
})

const displayedKeywords = computed(() => {
  return assets.value.map(keyword => {
    const cleanedKeyword = keyword.replace(/\s+/g, ''); // Remove spaces
    return useHashtags.value ? `#${cleanedKeyword}` : keyword;
  });
});

const initAssets = () => {
  console.log("currentMediaAssets:", mainStore.currentMediaAssets); // Check what's in currentMediaAssets
  let asset = mainStore.currentMediaAssets.find(asset => asset.type === 'keywords');
  if (asset && asset.content) {
    let keywords = asset.content.split(',').map(keyword => keyword.trim());
    assets.value = keywords;
  }
};


const copiedIndex = ref(null);
const useHashtags = ref(false);

function toggleHashtags() {
  useHashtags.value = !useHashtags.value;
}

/*const emit = defineEmits(['update:useHashtags']);
const toggleHashtags = (newValue) => {
  useHashtags.value = newValue;
  emit('update:useHashtags', newValue);
};*/

const copyToClipboard = (content, index, event) => {
  navigator.clipboard.writeText(content).then(() => {
    copiedIndex.value = index;
    const rect = event.target.getBoundingClientRect();
    // Calculate the center position
    const elementWidth = rect.width;
    const centerLeftPosition = rect.left + elementWidth / 2 - window.scrollX;
    const popUpWidth = 192; 
    const adjustedLeftPosition = centerLeftPosition - popUpWidth / 2;

    copiedPosition.value = {
      top: rect.top - 45,
      left: adjustedLeftPosition
    };
    showCopied.value = true;
    setTimeout(() => {
      showCopied.value = false;
      copiedIndex.value = null;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy content: ', err);
  });
};

const copyAllKeywords = () => {
  const allKeywords = assets.value.map(keyword => {
    return useHashtags.value ? `#${keyword.replace(/\s+/g, '')}` : keyword;
  }).join(', ');

  navigator.clipboard.writeText(allKeywords).then(() => {
    copied.value = true; // Set copied to true on successful copy
    setTimeout(() => {
      copied.value = null; // Reset after 2 seconds
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy all keywords: ', err);
  });
};
</script>


<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
</style>