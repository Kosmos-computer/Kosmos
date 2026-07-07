<template>
  <div class="nav__wrapper">
    <nav class="nav">
      <div class="nav__container">
        <NavigationLogo class="cursor-pointer min-w-[112px]" @click="navigateToHome()" />
        <NavigationBackToDashboard class="mr-12 min-w-[170px]"/>
        <div class="flex-grow flex place-content-center px-16" v-if="!currentMediaLoading">
          <span v-if="projectName != null && !projectNameDetail" class="text-gray-400 text-sm leading-5 mr-1.5 whitespace-nowrap">{{ projectName }}</span>
          <span v-if="!projectNameDetail" class="text-gray-900 text-sm leading-5 whitespace-nowrap">{{ fileName }}</span>
          <span v-if="projectNameDetail" class="text-gray-500 text-sm leading-5 whitespace-nowrap">{{ projectNameDetail + ' / ' }}</span>
          <span v-if="projectNameDetail" class="text-gray-900 text-sm leading-5 whitespace-nowrap"> &nbsp;{{ fileName }}</span>
          <div v-if="!projectNameDetail" class="user-dropdown cursor-pointer" :class="{
            'user-dropdown__simple': simpleLayout,
            'user-dropdown__full': !simpleLayout
            }"  @click="isDropdownOpen = !isDropdownOpen">
            <SvgCarrot class="user-dropdown__carrot" :class="[classes, simpleLayout ? 'ml-2' : 'ml-auto']" />
            <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
            <div class="user-dropdown__dropdown" :class="classes">
              <a href="#" @click="openRenameModal = true" class="user-dropdown__dropdown-item">
                {{ t('Rename File') }} 
                </a>
            </div>
            </transition>
            <div v-if="isDropdownOpen" class="fixed inset-0 bg-transparent transition-opacity z-10" />
          </div>
        </div>
        <div class="w-fit flex place-content-end" v-if="!currentMediaLoading">
          <div class="w-fit px-2 flex mr-4 gap-2 items-center"> 
          <transition name="fade">
          <span :class="[mainStore.transcriptSavingSavedState == 'Saved' ? 'text-gray-400 ' : 'text-indigo-600', 'flex gap-2 items-center text-sm']">
          <SvgLoading v-if="mainStore.transcriptSavingSavedState == 'Saving...'"/>
          <SvgTranscriptSaved v-if="mainStore.transcriptSavingSavedState == 'Saved'"/>
          {{ t(mainStore.transcriptSavingSavedState) }}
        </span></transition>
      </div>
          <button :disabled="!mainStore?.currentMedia?.processing_completed" @click="downloadPackage()" class="w-40 bg-indigo-700 text-sm text-white font-medium rounded-md py-2.5 px-4 my-4 hover:bg-indigo-600 disabled:bg-gray-300">
            {{ t('Download Assets') }}
          </button>
        </div>
      </div>
    </nav>
  </div>
  <ModalsDownloadFiles v-if="currentMedia" :media="mainStore.currentMedia" :open="openDownloadFilesModal" @close="closeOpenDownloadFilesModal" />
  <ModalsAssetsDownloadFiles   :open="openAssetsDownloadFilesModal" @close="openAssetsDownloadFilesModal = false" />
  <ModalsExport 
    :open="openModal" 
    @close="openModal = false"/>

  <ModalsRenameFile
            :name="fileName"
            :media-id="params.id"
            :open="openRenameModal"
            @close="openRenameModal = false"
        />
</template>
<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '~/store/LanguageStore';
import emitter from "~/plugins/eventBus";

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const mainStore = useMainStore()
const { currentMediaLoading, currentMedia } = storeToRefs(mainStore)
const { params } = useRoute();
const openDownloadFilesModal = ref(false);
const openAssetsDownloadFilesModal = ref(false)
const { status } = useSession()
const openModal = ref(false);
const openRenameModal = ref(false);
const isDropdownOpen = ref(false);
const simpleLayout = ref(true);
const projectNameDetail = ref('')

// Important that we retrieveCurrentMedia as soon as early as possible
if(params.jobId){
  mainStore.retrieveCurrentMedia(params.jobId)
}else{
  mainStore.retrieveCurrentMedia(params.id)
}
watch(()=>mainStore.currentMediaLoading, (a,b)=>{
  mainStore.currentMediaLoading
})
const projectName = computed(() => {
  var projectName = ''

  if (mainStore.currentMedia?.project_id) {
    const project = mainStore.projects.find(project => project.id == mainStore.currentMedia.project_id)
    if (project) {
      if (project.name.length > 35) {
        projectName = project.name.substring(0, 35) + '...' + ' /'
      } else {
        projectName = project.name + ' /'
      }
    }
  }
  
  return projectName
})
const closeOpenDownloadFilesModal = ()=>{
  openDownloadFilesModal.value = false
  const doNotShowNoti = localStorage.getItem('doNotShowNoti')
    if (doNotShowNoti === 'true') {
} else {
  openAssetsDownloadFilesModal.value = true
} 
}
const fileName = computed(() => {
  let fileName = mainStore.currentMedia?.name || 'Untitled'

  if (fileName.length > 45) {
    fileName = fileName.substring(0, 45) + '...'
  }

  return fileName
})

const navigateToHome = async () => {
  if (status.value == 'authenticated' ) {
    await navigateTo('/dashboard')
  } else {
    await navigateTo('https://hello.podium.page', {external: true})
  }
};

const downloadPackage = () => {
  openDownloadFilesModal.value = true;
}

const classes = computed(() => {
  return {
      'dropdown-open': isDropdownOpen.value,
      'dropdown-shut': !isDropdownOpen.value,
      'simple': simpleLayout.value,
      'full': !simpleLayout.value,
  }
})
watch(
    () => openRenameModal.value,
    (newVal) => {
      if(newVal === false) {
        mainStore.retrieveCurrentMedia(params.id)
      }
    }
)
  const handleProjectName =(data)=>{
      projectNameDetail.value = data
  }

  onMounted(() => {
    emitter.on('projectName', handleProjectName)
    mainStore.transcriptSavingSavedState  = ''
  });

  onUnmounted(() => {
    emitter.off('projectName', handleProjectName)
  });

  const items = [
  { name: 'Export', href: '#', action: () => props.openModal = true },
  { name: 'Download Package', href: '#', action: downloadPackage },
]

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
        @apply absolute top-12 bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 py-2 z-20;
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

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}
</style>
