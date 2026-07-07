<template>
    <AppLayout sidebarLeft bordered>
      <template #sidebar-left>
        <AppDashboardSidebarAPI />
      </template>
      <div v-if="mainStoreState.projects.value.length > 0 && project" class="h-full w-full relative">

        <div class="project-page__info">
          <div v-if="!project.image_url || project.image_url == 'null'" class="project-page__project-image--wrapper">
            <svg class="project-page__project-image" width="45" height="46" viewBox="0 0 45 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.625 13.625V32.375C5.625 34.4461 7.30393 36.125 9.375 36.125H35.625C37.6961 36.125 39.375 34.4461 39.375 32.375V17.375C39.375 15.3039 37.6961 13.625 35.625 13.625H24.375L20.625 9.875H9.375C7.30393 9.875 5.625 11.5539 5.625 13.625Z" stroke="#6B7280" stroke-width="3.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

          </div>
          <div  v-if="project.image_url && project.image_url != 'null'" class="project-page__project-image-lg rounded-lg w-[120px] h-[120px]">
            <img :src="project.image_url" class="w-full h-full object-cover rounded-lg " />
          </div>
          <div class="project-page__project-data">
            <NuxtLink to="/projects" class="projects-link">
              <span>{{ t('Projects') }}</span>
              <span class="arrow">
                <svg  width="7" height="10" viewBox="0 0 7 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M0.792894 9.70711C0.402369 9.31658 0.402369 8.68342 0.792894 8.29289L4.08579 5L0.792893 1.70711C0.402369 1.31658 0.402369 0.683418 0.792893 0.292894C1.18342 -0.0976312 1.81658 -0.0976312 2.20711 0.292894L6.20711 4.29289C6.59763 4.68342 6.59763 5.31658 6.20711 5.70711L2.20711 9.70711C1.81658 10.0976 1.18342 10.0976 0.792894 9.70711Z" fill="#9CA3AF"/>
                </svg>
              </span>
            </NuxtLink>
            <h1 class="project-title">
              {{project.name}}
            </h1>
          </div>
          <div class="project-page__project-actions">
            <button type="button" @click="openSettingsModal = true"
              class="btn btn-secondary btn-base with-icon ">
              <svg class="-ml-0.5 h-5 w-5" aria-hidden="true" width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.10386 3.59776C9.45919 2.13408 11.5408 2.13408 11.8961 3.59776C12.1257 4.54327 13.209 4.99198 14.0398 4.48571C15.3261 3.70199 16.798 5.17392 16.0143 6.46015C15.508 7.29105 15.9567 8.37431 16.9022 8.60386C18.3659 8.95919 18.3659 11.0408 16.9022 11.3961C15.9567 11.6257 15.508 12.709 16.0143 13.5398C16.798 14.8261 15.3261 16.298 14.0398 15.5143C13.209 15.008 12.1257 15.4567 11.8961 16.4022C11.5408 17.8659 9.45919 17.8659 9.10386 16.4022C8.87431 15.4567 7.79105 15.008 6.96016 15.5143C5.67392 16.298 4.20199 14.8261 4.98571 13.5398C5.49198 12.709 5.04327 11.6257 4.09776 11.3961C2.63408 11.0408 2.63408 8.95919 4.09776 8.60386C5.04327 8.37431 5.49198 7.29105 4.98571 6.46015C4.20199 5.17392 5.67392 3.70199 6.96015 4.48571C7.79105 4.99198 8.87431 4.54327 9.10386 3.59776Z" fill="white"/>
                <path d="M13 10C13 11.3807 11.8807 12.5 10.5 12.5C9.11929 12.5 8 11.3807 8 10C8 8.61929 9.11929 7.5 10.5 7.5C11.8807 7.5 13 8.61929 13 10Z" fill="white"/>
                <path d="M9.10386 3.59776C9.45919 2.13408 11.5408 2.13408 11.8961 3.59776C12.1257 4.54327 13.209 4.99198 14.0398 4.48571C15.3261 3.70199 16.798 5.17392 16.0143 6.46015C15.508 7.29105 15.9567 8.37431 16.9022 8.60386C18.3659 8.95919 18.3659 11.0408 16.9022 11.3961C15.9567 11.6257 15.508 12.709 16.0143 13.5398C16.798 14.8261 15.3261 16.298 14.0398 15.5143C13.209 15.008 12.1257 15.4567 11.8961 16.4022C11.5408 17.8659 9.45919 17.8659 9.10386 16.4022C8.87431 15.4567 7.79105 15.008 6.96016 15.5143C5.67392 16.298 4.20199 14.8261 4.98571 13.5398C5.49198 12.709 5.04327 11.6257 4.09776 11.3961C2.63408 11.0408 2.63408 8.95919 4.09776 8.60386C5.04327 8.37431 5.49198 7.29105 4.98571 6.46015C4.20199 5.17392 5.67392 3.70199 6.96015 4.48571C7.79105 4.99198 8.87431 4.54327 9.10386 3.59776Z" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 10C13 11.3807 11.8807 12.5 10.5 12.5C9.11929 12.5 8 11.3807 8 10C8 8.61929 9.11929 7.5 10.5 7.5C11.8807 7.5 13 8.61929 13 10Z" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ t('Settings') }}
            </button>
            <div class="relative flex-1">
              <button type="button"  class="btn btn-base btn-primary">{{ t('Add File') }}</button>
            </div>
            <!--
            <button type="button" @click="openAddFileModal = true" class="btn btn-primary btn-base">
              Add File
            </button>
            -->
          </div>
        </div>
        <div class="flex-1 mt-10">
          <DropZone :project-id="projectId" />
        </div>
        <div class="border-b border-gray-200 flex justify-between items-center">
          <h1 class="project-files__title">{{ t('Project Files') }}</h1>
          <button @click="toggleView" class="flex flex-row items-center w-fit bg-white px-2 text-sm font-medium leading-5 text-gray-700 border border-gray-300 h-10 rounded-md cursor-pointer hover:bg-gray-100 whitespace-nowrap">
            <SvgListIcon v-if="isFirstComponentVisible" />
            <SvgGridIcon v-else />
          </button>
        </div>
        <div class="project-files__uploads">
            <ProjectUploads2 v-if="isFirstComponentVisible"/>
            <ProjectUploads v-else/>
        </div>
        <!--Align this to the far right-->
        <div class="flex py-4">
            <NavigationPageNumbers :current-page="mainStoreState.projectMediaPage.value" :page-size="mainStoreState.projectMediaPageSize.value" :total-count="mainStoreState.projectMediaTotalCount.value" @page-change="mainStore.setProjectMediaPage"/>
        </div>
        <!--
        <div v-if="uploadModalVisible" style="z-index:60">
            <UploadModal v-model:modal-visible="uploadModalVisible"/>
        </div>
        -->
        <ModalsProject 
            :open="openSettingsModal" 
            type="edit"
            :project="project"
            @close="closeSettingsModal"
            @submit="handleSubmit($event)" />
            <ModalsAddFile 
            :open="openAddFileModal" 
            @close="openAddFileModal = false"
            @submit="handleSubmit($event)" />
      </div>
    </AppLayout>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useMainStore } from "~/store/main"
import { storeToRefs } from 'pinia'
import languageStore from '@/store/LanguageStore';
definePageMeta({ layout: "sidebar", auth: true })
const route = useRoute()
const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const { params, query } = useRoute();
const projectId = params.id
const uploadModalVisible = ref(false);
const openSettingsModal = ref(false);
const openAddFileModal = ref(false);
const storageKey = 'recentUploadsView'
const isFirstComponentVisible = ref(true)

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const project = computed(() => mainStoreState.projects.value.find(project => project.id == projectId))

mainStore.$state.selectedNavGuid = projectId

mainStore.$state.lastDashboardRoute = route.path

onMounted(() => {
  mainStore.retrieveUserProjectMedia()
  const savedState = localStorage.getItem(storageKey)
  isFirstComponentVisible.value = savedState === 'true'
})

watch(isFirstComponentVisible, (newValue) => {
  localStorage.setItem(storageKey, newValue.toString())
})

function toggleView() {
  isFirstComponentVisible.value = !isFirstComponentVisible.value
}

const closeSettingsModal = () => {
  console.log("Parent close")
  openSettingsModal.value = false
}

const handleSubmit = (data: any) => {
  console.log(data)
}
</script>
<style lang="scss" scoped>
.project-page {
  &__info {
    @apply flex items-start justify-between mt-4;

  }
  &__project {
    &-image {
      @apply w-12 h-12;

      &--wrapper {
        @apply 
        flex items-center justify-center 
        w-[120px] h-[120px] 
        rounded-2xl bg-gray-100 object-cover overflow-hidden;
      
      }
    }
    &-data {
      @apply flex flex-col ml-4 flex-1;
      .projects-link {
        @apply flex items-center mb-2 text-sm leading-5 font-medium text-gray-500;
        .arrow {
          @apply ml-3 transform transition-transform duration-200;
        }
        &:hover {
          .arrow {
            @apply translate-x-1;
          }
        }
      }
      .project-title {
        @apply text-3xl leading-9 font-bold text-gray-900 mr-4;
      }
    }
    &-actions {
      @apply flex items-center gap-x-3;
    }
  }
  
}
.btn {
  @apply 
  font-medium shadow-sm ;
  &-primary{
    @apply 
    bg-indigo-700  
    text-white
    hover:bg-indigo-600 
    focus-visible:outline-offset-2 
    focus-visible:outline-indigo-700
    focus-visible:outline focus-visible:outline-2;
  }
  &-secondary {
    @apply 
    bg-white
    text-gray-700 
    ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
  }
  &-base {
    @apply rounded-md text-sm px-3.5 py-2.5;
  }
  &.with-icon {
    @apply 
    inline-flex 
    items-center 
    gap-x-2;
  }
}

.project-files {
    @apply flex flex-col w-full h-full relative;
    &__drop-zone {
        @apply overflow-hidden;
    }
    &__title {
        @apply text-gray-900 text-2xl py-6 pb-4 leading-8 font-semibold;
    }
    &__recent-uploads {
        @apply overflow-auto relative;
    }
}
</style>