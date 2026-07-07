<template>
  <div v-if="!currentMediaLoading && currentSidenavItem" class="flex flex-grow flex-row bg-gray-50">
    <div v-if="!mainStore.isClipEdit"  class="pl-2 pt-4 sticky h-[calc(100vh-69px)] top-0 min-w-[293px]">
      <nav  class="space-y-1" aria-label="Sidebar">
        <a v-for="item in navigation" :key="item.name" :href="item.href" @click="setSideNav(item.name)" :class="[item.current ? 'bg-gray-100 text-gray-900' : 'text-gray-600', !item.enabled() ? 'opacity-40 cursor-default' : 'hover:bg-gray-100 hover:text-gray-900', 'flex items-center rounded-md px-3 py-2 text-sm font-medium mr-4 h-10']" :aria-current="item.current ? 'page' : undefined">
          <img :src="item.current ? `/images/icons/${item.icon}_indigo.svg` : `/images/icons/${item.icon}.svg`" class="inline min-w-[24px]" />
          <span class="ml-3 truncate" >{{t(item.name) }}</span>
          <span class="ml-3 truncate text-white bg-indigo-600 font-normal text-xs px-[7px] py-[2px] rounded-md min-w-[40px]" v-if="item.name=='Clips'">Beta</span>
          <span v-if="item.name == 'PodiumGPT' && !mainStore.user.has_used_podium_gpt">&nbsp;😎</span>
        </a>
      </nav>
    </div>

    <div class="w-full ml-6">

      <div v-if="currentSidenavItem.name == 'Status'" class="w-full flex">
        <div v-if="currentMedia.processing_error && currentMedia.ModalsErrorCreditInsufficient=='Insufficient credits to process package.'"> 
           <ModalsErrorCreditInsufficient :open="openErrorCreditInsufficientModal"  :fileName="currentMedia.name" :subsRenewOn="moment(mainStore.user?.current_subscription_renews_on).format('Do MMMM')" :currentSubscTitle="mainStore.user?.current_subscription_title" @close="closeErrorModal()" />
    </div>
        <div class="flex-grow flex flex-col pb-16 pt-12 px-10 xl:px-0 md:h-full gap-6 items-center text-center">
          <h1 class="text-4xl font-semibold tracking-tight text-gray-900">
            {{  headingText }}
          </h1>
          <h2 v-if="!currentMedia.processing_completed && !currentMedia.processing_error" class="leading-6 text-base text-gray-500 font-medium">
            {{ t('Check back soon, it’ll be done shortly.') }}
          </h2>
          <h2 v-if="currentMedia.processing_error" class="leading-6 text-base text-gray-500 font-medium">
            File was not proccessed because of {{currentMedia.processing_error_description}}
          </h2>

          <JobItems :credits="totalCredits" :processingError="currentMedia.processing_error" />

          
          <div style="max-width: 693px;" class="flex flex-col pt-0 px-10 xl:px-0 w-full gap-0 items-center text-center border border-gray-300 rounded-lg">
            <div class="pt-4">
              <span class="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-teal-500">{{ t('AWESOME!') }}</span>
            </div>

            <div class="font-bold text-gray-900 pt-4">
              {{ t('Try PodiumGPT') }}
            </div>

            <div class="font-regulat text-md text-gray-500">
              {{ t('Create any text you need using our AI tool.') }}
            </div>

            <button :disabled="!currentMedia.processing_completed" @click="setSideNav('PodiumGPT')" class="w-40 bg-indigo-700 text-sm text-white font-medium rounded-md py-2.5 px-6 mb-4 mt-4 hover:bg-indigo-600 disabled:bg-gray-300">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline mb-0.5 mr-1">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M3 0C3.55228 0 4 0.447715 4 1V2H5C5.55228 2 6 2.44772 6 3C6 3.55228 5.55228 4 5 4H4V5C4 5.55228 3.55228 6 3 6C2.44772 6 2 5.55228 2 5V4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H2V1C2 0.447715 2.44772 0 3 0ZM3 10C3.55228 10 4 10.4477 4 11V12H5C5.55228 12 6 12.4477 6 13C6 13.5523 5.55228 14 5 14H4V15C4 15.5523 3.55228 16 3 16C2.44772 16 2 15.5523 2 15V14H1C0.447715 14 0 13.5523 0 13C0 12.4477 0.447715 12 1 12H2V11C2 10.4477 2.44772 10 3 10Z" fill="white"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.99995 0C10.4537 0 10.8505 0.305483 10.9667 0.744107L12.1459 5.19893L15.4997 7.13381C15.8092 7.31241 15.9999 7.64262 15.9999 8C15.9999 8.35738 15.8092 8.6876 15.4997 8.86619L12.1459 10.8011L10.9667 15.2559C10.8505 15.6945 10.4537 16 9.99995 16C9.54622 16 9.14935 15.6945 9.03324 15.2559L7.85402 10.8011L4.50027 8.86618C4.19072 8.68759 4 8.35738 4 8C4 7.64262 4.19072 7.31241 4.50027 7.13382L7.85402 5.19893L9.03324 0.744107C9.14935 0.305483 9.54622 0 9.99995 0Z" fill="white"/>
              </svg>
              PodiumGPT  
            </button>
          </div>
          

          <Transition appear>
            <div v-if="modalVisible" style="z-index: 60">
              <ShareModal v-model:modal-visible="modalVisible"/>
            </div>
          </Transition>
        </div>
        <div class="w-72"></div>
      </div>
      <div v-if="currentSidenavItem.name == 'Transcript'" class="w-full h-full flex">
        <MediaTranscript />
      </div>
      <div v-if="currentSidenavItem.name == 'Titles'" class="w-full h-full flex">
        <MediaTitles />
      </div>
      <div v-if="currentSidenavItem.name == 'Summary'" class="w-full h-full flex">
        <MediaShownotes />
      </div>
      <div v-if="currentSidenavItem.name == 'Chapters'" class="w-full h-full flex">
        <MediaChapters />
      </div>
      <div v-if="currentSidenavItem.name == 'Keywords'" class="w-full h-full flex">
        <MediaKeywords />
      </div>
      <div v-if="currentSidenavItem.name == 'PodiumGPT'" class="w-full h-full flex">
        <PodiumGPT />
      </div>
      <div v-if="currentSidenavItem.name == 'Details'" class="w-full h-full flex">
        <MediaFileDetails />
      </div>
      <div v-if="currentSidenavItem.name == 'Clips'" class="w-full h-full flex">
        <MediaClips />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { params, query } = useRoute();
const { data, status, getCsrfToken, getProviders, signOut } = useSession()
definePageMeta({ layout: "app", auth: false })
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';
import emitter from "~/plugins/eventBus";

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});
const mainStore = useMainStore()
const { currentMediaLoading, currentMedia, currentMediaSideNavSelection, currentMediaClip } = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()
const processingCompleted = ref(false);
const originalFilename = ref('');
const signedUrl = ref('');
const userEmail = ref('');
const podiumPackageGuidCookie = useCookie<string>('podiumPackageGuid');
const openErrorCreditInsufficientModal=ref(true)
const keywordsReady = ref(false);
const closeErrorModal=()=>{
  openErrorCreditInsufficientModal.value = false
}
const route = useRoute()

onMounted(() => {
  mainStore.getTemplateForamt()

  if( localStorage.getItem('stayClipCards') =='true'){
    setSideNav('Clips')
  }
  if( localStorage.getItem('stayShowNotes') =='true'){
    setSideNav('Summary')
  }
  if(mainStore.backToClip){
    setSideNav('Clips')
  }
  podiumPackageGuidCookie.value = ''
  setTimeout(() => {
    keywordsReady.value = true
  }, 5000)
});

onBeforeUnmount(() => {
  mainStore.clearCurrentMedia()
})

watch(() => currentMediaSideNavSelection.value, (newVal, oldVal) => {
  if (newVal && newVal != oldVal) {
    sidenavSelect(newVal)
  }
})

watch(() => mainStore.currentMedia, (newVal) => {
  if (newVal) {
    if (!currentSidenavItem.value) {
      if (mainStore.currentMediaSideNavSelection != null) {
        // preset side navigation from external link
        sidenavSelect(mainStore.currentMediaSideNavSelection)
      } else {
        if (mainStore.currentMedia.processing_completed) {
          setSideNav('Transcript')
        } else {
          setSideNav('Status')
        }
      }
    }
  }
})


const navigation = ref([
  { name: 'Transcript', href: '#', icon:'transcript', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_transcript', currentMedia.value) } },
  { name: 'Titles', href: '#', icon:'titles', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_titles', currentMedia.value)  }  },
  { name: 'Summary', href: '#', icon:'show_notes', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_show_notes_summary', currentMedia.value)  }  },
  { name: 'Chapters', href: '#', icon:'chapters', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_show_notes_summary', currentMedia.value)  }  },
  { name: 'Clips', href: '#', icon:'highlights', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_transcript', currentMedia.value) }  },
  { name: 'Keywords', href: '#', icon:'keywords', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_keywords', currentMedia.value)  } },
  { name: 'PodiumGPT', href: '#', icon:'podium_gpt', current: false, enabled: () => { return currentMedia.value?.processing_completed }  },
  { name: 'Details', href: '#', icon:'details', current: false, enabled: () => { return mainStore.mediaProcessingTaskCompleted('generate_transcript', currentMedia.value) }  },
  { name: 'Status', href: '#', icon:'status', current: false, enabled: () => { return true }  },
])

const setSideNav = (name) => {
  currentMediaSideNavSelection.value = name
  if(currentMediaSideNavSelection.value !='Transcript'){
    mainStore.transcriptSavingSavedState = null
  }
  if(currentMediaSideNavSelection.value == 'Details'){
    emitter.emit('projectName', 'The Business Pod')
  }else{
    emitter.emit('projectName', '')
  }
  if(currentMediaSideNavSelection.value == 'Clips'){
    localStorage.setItem('stayClipCards', 'true')
  }else{
    localStorage.setItem('stayClipCards', 'false')
  }
  if(currentMediaSideNavSelection.value == 'Summary'){
    localStorage.setItem('stayShowNotes', 'true')
  }else{
    localStorage.setItem('stayShowNotes', 'false')
  }
}

watch(()=>mainStore.currentMediaClip , (a,b)=>{
  if(mainStore.currentMediaClip?.backToClip){
    setSideNav('Clips')
  }
})

watch(()=> localStorage.getItem('stayClipCards'), (a,b)=>{
  if( localStorage.getItem('stayClipCards') =='true'){
    setSideNav('Clips')
  } else if (localStorage.getItem('stayShowNotes') =='true') {
    setSideNav('Summary')
  } else{
    setSideNav('Transcript')
  }
})

watch(()=> localStorage.getItem('stayShowNotes'), (a,b)=>{
  if( localStorage.getItem('stayShowNotes') =='true'){
    setSideNav('Summary')
  } else if( localStorage.getItem('stayClipCards') =='true'){
    setSideNav('Clips')
  } else {
    setSideNav('Transcript')
  }
})

const sidenavSelect = (name) => {
  const sidenavItem = navigation.value.find((navItem) => navItem.name == name)
  if (sidenavItem?.enabled()) {
    if (currentSidenavItem && currentSidenavItem.name == 'PodiumGPT') {
      mainStore.refreshCurrentMediaAssets()
    }
    
    navigation.value.forEach((navItem) => {
      navItem.current = navItem.name == name;
    })

    if (name != 'PodiumGPT') {
      const scrollBody = document.getElementById('scrollingBody')
      scrollBody?.scrollTo(0, 0);
    }
  }
}

const currentSidenavItem = computed(() => {
  return navigation.value.find((navItem) => navItem.current);
})

const totalCredits = computed(() => {
  var credits = Math.round(mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance)
  if (credits < 0) {
    credits = 0
  }

  return credits
})

const headingText = computed(() => {
   if(currentMedia.value.processing_error){
    return currentMedia.value.processing_error_description
  }
  else {
    return currentMedia.value.processing_completed
        ? t.value('Your upload has been processed!')
        : t.value('Your upload is processing.');
  }
});

const modalVisible = ref(false);

const openShareModal = () => {
  modalVisible.value = true;
}

const contactSupport = () => {
  Intercom('showNewMessage');
  //const { params } = useRoute();
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=job&route_path=' + params.id + '&user_email=' + podiumProgress.value.userEmail + '&platform=web', '_blank');
}

</script>
