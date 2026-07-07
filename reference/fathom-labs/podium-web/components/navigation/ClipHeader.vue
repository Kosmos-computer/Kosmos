<template>
    <div class="flex-grow flex place-content-center px-16">
            <span class="inline-flex bg-gray-100 rounded-md py-1.5 px-3 items-center">
                <span class="text-gray-400 text-sm leading-5 mr-1.5 whitespace-nowrap"> {{ t('Clips') }} </span>
                <span class="text-gray-900 text-sm leading-5 whitespace-nowrap">{{clipTitle}}</span>
                <div class="user-dropdown cursor-pointer" :class="{
                'user-dropdown__simple': simpleLayout,
                'user-dropdown__full': !simpleLayout
                }"  @click="isDropdownOpen = !isDropdownOpen">
                <SvgCarrot class="user-dropdown__carrot" :class="[classes, simpleLayout ? 'ml-2' : 'ml-auto']" />
                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                <div class="user-dropdown__dropdown" :class="classes">
                   <a href="#" @click="openRenameModal = true" class="user-dropdown__dropdown-item">
                      {{ t('Rename') }} 
                    </a>
                    <a href="#" @click="openDuplicateModal = true" class="user-dropdown__dropdown-item">
                      {{ t('Duplicate') }}  
                    </a>
                    <a href="#" @click="openDeleteModal = true" class="user-dropdown__dropdown-item">
                      {{ t('Delete') }}  
                    </a>
                </div>
                </transition>
                <div v-if="isDropdownOpen" class="fixed inset-0 bg-transparent transition-opacity z-10" />
            </div>
            </span>
    </div>

    <div class="flex basis-36 grow-0 items-right align-right">
        <div class="w-fit px-2 flex ml-auto gap-2 items-right"> 
                <transition name="fade">
                  <span :class="[mainStore.clipSavingSavedState == 'Saved' ? 'text-gray-400 ' : 'text-indigo-600', 'flex gap-2 items-center text-sm']">
                    <SvgLoading v-if="mainStore.clipSavingSavedState == 'Saving'"/>
                    <SvgTranscriptSaved v-if="mainStore.clipSavingSavedState == 'Saved'"/>
                    {{ t(mainStore.clipSavingSavedState) }}
                  </span>
                </transition>
            </div>
    </div>
<ModalsClipDownload :open="downloadModal"  @close="downloadModal = false" />
<ModalsRenameFile
            :name="clipTitle"
            :media-id="route.params.id"
            :open="openRenameModal"
            @close="closeRenameMOdalUpdateClipHeader"
            src="clipTitle"
        />
<ModalsDuplicateClip :open="openDuplicateModal"  @close="closeDuplicateModal" :clipId="route.params.id"  @latestClipId="getLatestClipId" @updatedClipTitle="getTitle"
 @submit="cancelDuplicateModal" />
<ModalsDelete  :open="openDeleteModal" @close="closeDeletModal" @submit="cancelDeleteModal" :isDeleteClip="route.params.id"  />

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
const runtimeConfig = useRuntimeConfig()
const statusClipFiles = ref(true)
const intervalId = ref('')
const downloadModal = ref(false)
const route = useRoute()
const isContinueApi =ref('')
const clipTitle = ref('')
const openRenameModal = ref(false);
const openDuplicateModal = ref(false);
const openDeleteModal = ref(false);
const isDropdownOpen = ref(false);
const simpleLayout = ref(true);
const updatedClipId = ref(0)
const showSaveStatus = ref(false)
const saveTimeout = ref(null)
const classes = computed(() => {
  return {
      'dropdown-open': isDropdownOpen.value,
      'dropdown-shut': !isDropdownOpen.value,
      'simple': simpleLayout.value,
      'full': !simpleLayout.value,
  }
})

const saveStatusClass = computed(() => {
  return mainStore.clipSavingSavedState === 'Saved' ? 'text-gray-400' : 'text-indigo-600'
})

watch(() => mainStore.clipSavingSavedState, (newVal, oldVal) => {
  // Clear any existing timeout
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
    saveTimeout.value = null
  }

  // If there's a new status to show
  if (newVal) {
    showSaveStatus.value = true
    
    // If the status is 'Saved', set a timeout to hide it
    if (newVal === 'Saved') {
      saveTimeout.value = setTimeout(() => {
        showSaveStatus.value = false
        mainStore.clipSavingSavedState = ''
      }, 1000)
    }
  } else {
    showSaveStatus.value = false
  }
})


const checkProgress = () => {
    if(isContinueApi.value !='stop execution'){
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${route.params.id}/progress/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            }
        })
        .then(response => response.json())
        .then(val => {
            if (val) {
                mainStore.clipProgress = Math.round(val.progress);
                statusClipFiles.value = val.status
                if (statusClipFiles.value === val.status && val.progress === 100 ) {
                    mainStore.clipVideoUrl = val.url
                    emitter.emit('videoUrl', val.url);
                    emitter.emit('closeExportModal', 'Close Export');
                    clearInterval(intervalId.value);
                } else {
                    setTimeout(() => checkProgress(), 5000);
                }
                return val;
            } 
            mainStore.clipProgress = 0;
            downloadModal.value = false;
        })
        .catch(error => {
            console.error('Error checking progress:', error);
        });
    }
  };

  const handleExecutionApi = (data) => {
    isContinueApi.value = data;
  };
  
  const closeRenameMOdalUpdateClipHeader  = ()=>{
    openRenameModal.value = false
  }
 
  const getClipTitleBYClipId = async ()=>{
     await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${route.params.id}/details/`, {
         method: 'GET',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
         },
      })
      .then((response) => response.json())
      .then((data) => { 
        clipTitle.value = data.clipTitle
      })
  }

  const handleUpdatedClipTitle=(data)=>{
    if(data){
        clipTitle.value = data
    }
  }

  const getLatestClipId = (data)=>{
    updatedClipId.value = data
    navigateTo(`/job/${route.params.jobId}/clip/${updatedClipId.value}`)
  }

  const getTitle = (data)=>{
    clipTitle.value = data
  }

  const closeDuplicateModal =()=>{
    openDuplicateModal.value = false
  }

  const cancelDuplicateModal =()=>{
    openDuplicateModal.value = false
  }

  const closeDeletModal =()=>{
    openDeleteModal.value = false
  }

 const cancelDeleteModal = ()=>{
    if(route.params.jobId){
        route.params.id=route.params.jobId
    }
    openDeleteModal.value = false
    navigateTo(`/job/${route.params.jobId}`);
 }

  onMounted(async () => {
    getClipTitleBYClipId()
    emitter.on('stopApi', handleExecutionApi);
    emitter.on('updatedClipTitle', handleUpdatedClipTitle)
    mainStore.clipSavingSavedState  = ''
  });

  onUnmounted(() => {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    emitter.off('stopApi', handleExecutionApi);
    emitter.off('updatedClipTitle', handleUpdatedClipTitle)
  });
</script>
<style lang="scss" scoped>
.nav {
  @apply bg-white py-4 border-b border-gray-200 fixed inset-0 bottom-auto z-20;
  &__container {
    @apply px-5 mx-auto flex items-center justify-between;
    height: 36px;
  }
  &__wrapper {
    min-height: 69px;
  }
}
.user-dropdown {
    @apply flex relative z-20;
    &__simple {
        @apply items-center;
    }
    &__full {
        @apply items-start;
    }
    &__image-wrapper {
        @apply relative;
        img, svg {
            @apply rounded-full max-w-none w-9 h-9;
            &.full {

            }
        }
    }
    &__carrot {
        @apply self-center mr-2 cursor-pointer w-6 h-6;
        &.dropdown-open {
            transform: rotate(-180deg);
        }
        &.dropdown-shut {
            transform: rotate(0deg);
        }
    }

    &__user {
        @apply mr-auto ml-3 mr-3 overflow-hidden;
        &-name {
            @apply font-medium leading-5 text-sm text-left text-gray-700 mb-2 whitespace-nowrap overflow-hidden truncate;
        }
        &-credits-badge {
            @apply text-center p-1 rounded-2xl w-auto px-2 w-fit text-xs font-medium leading-4;
            &.success {
                @apply text-teal-500 bg-teal-100;
            }
            &.warning {
                @apply text-yellow-500 bg-yellow-100;
            }
            &.danger {
                @apply text-red-500 bg-red-100;
            }
        }
    }
    &__dropdown {
        @apply absolute top-8 bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 py-2 z-20;
        &.simple {
            @apply right-0;
        }        
        &.full {
            @apply z-30;
            right: -180px;
        }
        &-item {
            @apply relative cursor-auto flex items-center px-4 py-3 font-inter text-sm text-gray-900;
            
            &:not(.no-hover) {
                @apply hover:bg-gray-100 cursor-pointer;
            }
            &-icon {
                @apply mr-3;
            }
            &-text {
                @apply text-sm;
            }
        }
        &.dropdown-open {
            @apply opacity-100 visible h-auto;
        }
        &.dropdown-shut {
            @apply opacity-0 invisible h-0;
        }
    }
}
</style>