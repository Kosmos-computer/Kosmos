<template>
  <div class="w-full flex flex-col items-center">
    <div class="job-item__container flex flex-col gap-2.5 w-full font-medium">
      <div v-for="item in processingChunks" :key="item.title" @click.stop="!item.isProcessing && props.showDownloadFiles != false && viewPackage(item.sideNav)" :class="[{'cursor-pointer': !item.isProcessing && props.showDownloadFiles != false},'flex items-center px-5 py-2 bg-gray-100 w-full rounded-md']">
        <span class="opacity-80 mr-auto">
          {{ t(item.title) }}
        </span>
        <span class="text-primary opacity-80 mr-4" v-if="item.isProcessing && !props.processingError && credits !== null ">
          {{ t('Processing') }} 
        </span>
        <span @click.stop="viewPackage(item.sideNav)" class="action mr-4" v-if="!item.isProcessing  && props.showDownloadFiles != false">
          {{ t('View') }} 
        </span>
        <!-- <div v-if="item.isProcessing && credits !== null  && !props.processingError " class="loader-purps inline-block"> -->
        <div v-if="item.isProcessing && credits !== null  && !props.processingError " class="inline-block">
          <SvgLoadingSm />
        </div>
        <div v-else-if="credits !== null && item.isProcessing  && props.processingError" >
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path fill-rule="evenodd" clip-rule="evenodd" d="M20 38.5C30.2173 38.5 38.5 30.2173 38.5 20C38.5 9.78273 30.2173 1.5 20 1.5C9.78273 1.5 1.5 9.78273 1.5 20C1.5 30.2173 9.78273 38.5 20 38.5ZM20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#EF4444"/>
                   <path d="M21 11H19V21H21V11Z" fill="#EF4444"/>
                   <path d="M21 27H19V28.5H21V27Z" fill="#EF4444"/>
                </svg>
        </div>
        <svg v-else width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 10C0.5 15.51 4.97 20 10.53 20H10.54C16.04 20 20.51 15.51 20.51 10C20.51 4.49 16.04 0 10.54 0H10.47C4.97 0 0.5 4.49 0.5 10ZM9.26491 14.6547L9.26996 14.6599H9.25996L9.26491 14.6547ZM9.26491 14.6547L15.29 8.24995C15.67 7.84995 15.65 7.21995 15.25 6.83995C14.85 6.45995 14.22 6.47995 13.84 6.87995L9.24996 11.7599L6.53996 8.93995C6.15996 8.53995 5.52996 8.52995 5.12996 8.90995C4.72996 9.28995 4.71996 9.91995 5.09996 10.3199L9.26491 14.6547Z" fill="#4f46e5"/>
        </svg>
      </div>
    </div>

    <button v-if="$props.showDownloadFiles != false" :disabled="!currentMedia.processing_completed" @click="downloadPackage()" class=" bg-indigo-700 text-sm text-white font-medium rounded-md py-2.5 px-6 mb-4 mt-6 hover:bg-indigo-600 disabled:bg-gray-300">
      {{ t('Download Assets') }}
    </button>
    <!--
    <Transition appear>
      <div v-if="modalVisible" style="z-index: 60">
        <ShareModal v-model:modal-visible="modalVisible"/>
      </div>
    </Transition>
    -->
    <ModalsDownloadFiles v-if="!currentMediaLoading && currentMedia != null" :media="mainStore.currentMedia" :open="openDownloadFilesModal" @close="openDownloadFilesModal = false" />
  </div>
</template>

<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


onMounted(() => {
});

const { params, query } = useRoute()
const mainStore = useMainStore();
const { currentMediaLoading, currentMedia } = storeToRefs(mainStore)
const emits = defineEmits(['update:processingCompleted', 'update:originalFilename', 'update:signedUrl', 'update:userEmail']);
const modalVisible = ref(false);

const props = defineProps({
  showDownloadFiles:  {
    default: true,
    type: Boolean
  },
  processingError:{
    type:Boolean,
    required:false
  },
  credits:  {
    type: Number,
    required: false
  }
})

const openDownloadFilesModal = ref(false);

const processingChunks = computed(() => [
  {
    title: 'Transcript',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_transcript', currentMedia.value) == false,
    sideNav: 'Transcript'
  },
  {
    title: 'Titles',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_titles', currentMedia.value) == false,
    sideNav: 'Titles'
  },
  {
    title: 'Summary',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_show_notes_summary', currentMedia.value) == false,
    sideNav: 'Summary'
  },
  {
    title: 'Chapters',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_show_notes_summary', currentMedia.value) == false,
    sideNav: 'Chapters'
  },
  {
    title: 'Keywords',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_keywords', currentMedia.value) == false,
    sideNav: 'Keywords'
  },
  // {
  //   title: 'Highlights',
  //   isProcessing: mainStore.mediaProcessingTaskCompleted('generate_highlights', currentMedia.value) == false,
  //   sideNav: 'Highlights'
  // },
  {
    title: 'Clips',
    isProcessing: mainStore.mediaProcessingTaskCompleted('generate_transcript', currentMedia.value) == false,
    sideNav: 'Clips'
  },
  {
    title: 'PodiumGPT',
    isProcessing: currentMedia.value.processing_completed == false,
    sideNav: 'PodiumGPT'
  },
]);

const viewPackage = (sideNav = null) => {
  if(sideNav == 'Clips'){
    localStorage.setItem('stayClipCards', 'true')
  }else{
    localStorage.setItem('stayClipCards', 'false')
  }
  if(sideNav == 'Summary'){
    localStorage.setItem('stayShowNotes', 'true')
  }else{
    localStorage.setItem('stayShowNotes', 'false')
  }
  if (sideNav) {
    mainStore.currentMediaSideNavSelection = sideNav
    navigateTo(`/job/${currentMedia.value.id}`)
  } else {
    navigateTo(`/job/${currentMedia.value.id}`)
  }
}

const downloadPackage = () => {
  openDownloadFilesModal.value = true;
}

const openShareModal = () => {
  modalVisible.value = true;
}

</script>

<style lang="scss" scoped>
.job-item__container {
  max-width: 693px;
}

</style>
