<template>
  <div class="upload__grid relative flex-grow pt-16 pb-28 px-10 px-0 h-full items-start justify-items-stretch bg-gray-50">
    <div class="upload__text flex flex-col mr-28 mb-5 mt-6 items-start text-start justify-self-end text-left">
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-left">{{ t("Let's upload your first file.") }}</h1>
      <h2 class="mt-6 text-base leading-6 text-gray-500">
        {{ t("Drag and drop a file or click the upload button. After uploading you’ll get access to everything you need to promote your show and more!") }}
      </h2>
      <Transition appear>
        <BaseSnackbar v-if="creditLimit <= 0" class="text-white px-5 mt-0 xl:mt-5 mb-5 xl:mb-0">
          <b>{{ t("You've reached your limit.") }}</b>
          {{ t("Payment options will appear on the next screen after uploading your file and clicking continue. View Pricing") }}
        </BaseSnackbar>
      </Transition>
      <div class="upload-feature-list-element pt-4">
        <img :src="shownotesSvgSource" alt="Shownotes Icon" class="pr-2"/>
        {{ t("Shownotes") }}
      </div>
      <div class="upload-feature-list-element">
        <img :src="transcriptsSvgSource" alt="Shownotes Icon" class="pr-2"/>
        {{ t("Transcripts") }}
      </div>
      <div class="upload-feature-list-element">
        <img :src="chaptersSvgSource" alt="Shownotes Icon" class="pr-2"/>
        {{ t("Chapters") }}
      </div>
      <div class="upload-feature-list-element">
        <img :src="clipsSvgSource" alt="Shownotes Icon" class="pr-2"/>
        {{ t("Clips") }}
      </div>
      <div class="upload-feature-list-element">
        <img :src="auxiliarySvgSource" alt="Shownotes Icon" class="pr-2"/>
        {{ t("Articles, Social Posts, Keywords, and more!") }}
      </div>
      <span class="order-5 order-none text-gray-500 font-base text-left w-full pt-16">
        {{ t("Don't have a file to upload?") }}
        <a class="cursor-pointer leading-6 text-indigo-600" @click="navigateTo('/new-user-info')">
          {{ t("Skip this step.") }}
        </a>
      </span>
    </div>
    <div class="pt-6">
      <DropZone class="w-full overflow-hidden"  :upload-finished="uploadFinished" @update:uploadFinished="newVal => uploadFinished = newVal" />
      <div class="hidden flex-col mt-5 mb-15 md:mb-0 text-center">
        <span class="text-[#007AFF] font-medium opacity-80 mb-2.5 cursor-pointer">
          {{ t("Contact Support") }}
        </span>
        <span class="text-primary font-medium opacity-80 cursor-pointer" @click="cancelUpload">
          {{ t("Not ready? Click here to cancel") }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "app"
});
import createPodiumPackage from '@/apollo/mutations/createPodiumPackage.gql';
import { useMainStore } from "~/store/main";

import shownotesSvgSource from '@/assets/icons/shownotes.svg';
import transcriptsSvgSource from '@/assets/icons/transcripts.svg';
import chaptersSvgSource from '@/assets/icons/chapters.svg';
import clipsSvgSource from '@/assets/icons/clips.svg';
import auxiliarySvgSource from '@/assets/icons/auxiliary.svg';
import { ref, computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore();
const gtag = useGtag()
const { status } = useSession()
const uploadFinished = ref(false);


if (mainStore.user) {
  if (mainStore.user.additionalCreditsBalance <= 0) {
    navigateTo('https://hello.podium.page/pricing?message=credits_exhausted', {external: true})
  }
}

const creditLimit = useCookie<number>('creditLimit') || 3;

const processFileUpload = async () => {
  return navigateTo('/confirm-email');

  //if (creditLimit.value > 0) {
  //  return navigateTo('/confirm-email');
  //} else {
  //  window.location.href = 'https://hello.podium.page/#pricing';
  //}
}

watch(() => uploadFinished.value, (newVal) => {
  if (newVal) {
    try {
      heap.track('first-upload-completed', {})

      // Google Conversion Event
      const uploadEvent = {
        'description': 'New User First Upload',
        'value': 1.00,
        'currency': 'USD'
      }
      gtag("event", "first_upload", uploadEvent);
    } catch {}
    navigateTo('/new-user-info')
  }
});

const fileSelected = computed(() => {
  return mainStore.files.length > 0;
});

onMounted(() => {
  languageStore.methods.initializeLanguage();
  try{heap.track('upload-file-page-viewed', {});}catch{}
  if (mainStore.files.length > 0) {
    mainStore.files = [];
  }
});

const cancelUpload = () => {
  try{heap.track('cancel-upload-clicked', {})}catch{}
}

watch(() => creditLimit.value, (newVal) => {
  if (newVal === 0) {
    try{heap.track('trial-over-encountered', {})}catch{}
  }
});
</script>
<style lang="scss" scoped>
.upload {
  &__grid {
    min-width:1250px;
    display: grid;
    grid-template-columns: 1fr minmax(400px, 1fr);
  }
}
.upload__text {
  width: 100%;
  max-width: 480px;
}

.upload-feature-list-element {
  @apply bg-gray-50  my-3 w-full font-semibold text-base flex items-center rounded-lg;
}
</style>
