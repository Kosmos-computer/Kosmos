<template>
    <AppLayout sidebarLeft bordered>
        <template #sidebar-left>
            <AppDashboardSidebarAPI />
        </template>

        <div class="dashboard-projects">
            <div class="relative flex-1">
                <button @click="openModal = true" class="dashboard-projects__add-new hover:bg-gray-100 cursor-pointer">
                    <svg class="text-gray-400" width="49" height="48" viewBox="0 0 49 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class=" stroke-current" d="M18.5 26H30.5M24.5 20V32M6.5 34V14C6.5 11.7909 8.29086 10 10.5 10H22.5L26.5 14H38.5C40.7091 14 42.5 15.7909 42.5 18V34C42.5 36.2091 40.7091 38 38.5 38H10.5C8.29086 38 6.5 36.2091 6.5 34Z" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h2 class="dashboard-projects__add-new__action-title">{{ t('New Project') }}</h2>
                    <p class="dashboard-projects__add-new__action-description">{{ t('Click here to create a new project.') }}</p>

                </button>
            </div>
            <div class="flex justify-between items-center border-b border-gray-200 ">

                <h1 class="dashboard-projects__title">{{ t('All Projects') }}</h1>
                <div class="flex flex-row items-center space-x-2">
                    <SortingDropdown @changeActive="handleFilterType($event)" />
                    <button @click="toggleView" class="flex flex-row items-center w-fit bg-white px-2 text-sm font-medium leading-5 text-gray-700 border border-gray-300 h-10 rounded-md cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                        <SvgListIcon v-if="isFirstComponentVisible" />
                        <SvgGridIcon v-else />
                    </button>
                </div>
            </div>
            <ProjectTile :sort="currentSort" v-if="isFirstComponentVisible" />
            <ProjectCards :sort="currentSort" v-else />
            <div v-show="mainStoreState.projects.value.length == 0" class="flex flex-col items-center pt-10 mt-6">
                <div class="flex items-center justify-center w-[68px] h-[68px] rounded-xl bg-gray-100 object-cover overflow-hidden">
                    <svg class="scale-75" width="45" height="46" viewBox="0 0 45 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.625 13.625V32.375C5.625 34.4461 7.30393 36.125 9.375 36.125H35.625C37.6961 36.125 39.375 34.4461 39.375 32.375V17.375C39.375 15.3039 37.6961 13.625 35.625 13.625H24.375L20.625 9.875H9.375C7.30393 9.875 5.625 11.5539 5.625 13.625Z" stroke="#9ca3af" stroke-width="3.75" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <span class="text-primary font-medium opacity-80 mt-3">
                    Your projects will <br/> appear here.
                </span>
            </div>
            <ModalsProject 
                :open="openModal" 
                @close="openModal = false"
                @submit="handleSubmit($event)" />
        </div>
    </AppLayout>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

definePageMeta({ layout: "sidebar", auth: true })
const mainStore = useMainStore()
const route = useRoute()
const mainStoreState = storeToRefs(mainStore)
mainStore.$state.selectedNavGuid = 'b148f22b-aa18-4848-b7b3-4d81a9cb5889'
mainStore.$state.lastDashboardRoute = route.path

const storageKey = 'recentUploadsView'
const isFirstComponentVisible = ref(true)

onMounted(() => {
  const savedState = localStorage.getItem(storageKey)
  isFirstComponentVisible.value = savedState === 'true'
})

watch(isFirstComponentVisible, (newValue) => {
  localStorage.setItem(storageKey, newValue.toString())
})

function toggleView() {
  isFirstComponentVisible.value = !isFirstComponentVisible.value
}

withDefaults(defineProps<{
    unsortedFiles?: Array<{
        title: string;
        slug: string;
        lastUpdated: string;
        numberOfFiles: number;
    }> | null;
}>(), {
    unsortedFiles: null,
});

const openModal = ref(false);

//TODO: Handle this with a model
const currentSort = ref('Last Upload');
const handleFilterType = (e) => {
    currentSort.value = e
}

const handleSubmit = (e) => {
}
</script>

<style lang="scss" scoped>
.dashboard-projects {
    @apply flex flex-col w-full h-full relative;
    &__add-new {
        @apply w-full cursor-pointer overflow-hidden mt-4 py-8 px-6 flex flex-col items-center justify-center border rounded-xl;
        max-height: 150px; 
        min-height: 150px;
        svg {
            @apply w-12 h-12;
        }
        &:focus {
        }
        &:focus {
            svg {
                @apply text-gray-300;
            }
        }
        &__action {
            &-title {
                @apply text-sm leading-5 font-medium text-gray-900;
            }
            &-description {
                @apply text-sm leading-5 font-normal text-gray-500;
            }
        }
    }
    &__title {
        @apply text-gray-900 text-2xl py-6 pb-4 mb-1 leading-8 font-semibold;
    }
    &__recent-uploads {
        @apply overflow-auto relative;
    }
}
</style>