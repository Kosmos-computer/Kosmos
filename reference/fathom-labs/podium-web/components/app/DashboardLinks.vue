<template>
    <div class="dashboard-links">

        <ul class="dashboard-links__wrapper">
            <li class="dashboard-links__item ">
                <NuxtLink to="/dashboard" exact-active-class="active" class="flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path class=" stroke-current" d="M20 13V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V13M20 13V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V13M20 13H17.4142C17.149 13 16.8946 13.1054 16.7071 13.2929L14.2929 15.7071C14.1054 15.8946 13.851 16 13.5858 16H10.4142C10.149 16 9.89464 15.8946 9.70711 15.7071L7.29289 13.2929C7.10536 13.1054 6.851 13 6.58579 13H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>

                    <span class=" ml-3">{{ t("Recents") }}</span>
                </NuxtLink>
            </li>
            <li class="dashboard-links__item">
                <NuxtLink to="/projects" exact-active-class="active" class="flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path class=" stroke-current" d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>


                    <span class=" ml-3">{{ t("Projects") }}</span>
                </NuxtLink>
            </li>
            <li :class="['dashboard-links__item', {'dashboard-links__selected': mainStoreState.selectedNavGuid == project.id}]" v-for="project in mainStoreState.projects.value"  :key="project.id">
                <div class="indent">

                    <NuxtLink :to="'/projects/' + project.id" exact-active-class="active" class="flex items-start">
                        <svg class="min-w-[24px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="stroke-current" d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>

                        <span class=" ml-3 pt-0.5">{{ project.name }}</span>
                    </NuxtLink>
                </div>
            </li>
            <!-- <li class="dashboard-links__item">
                <NuxtLink to="/dashboard/team" exact-active-class="active" class="flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path class=" stroke-current" d="M12 4.35418C12.7329 3.52375 13.8053 3 15 3C17.2091 3 19 4.79086 19 7C19 9.20914 17.2091 11 15 11C13.8053 11 12.7329 10.4762 12 9.64582M15 21H3V20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21ZM15 21H21V20C21 16.6863 18.3137 14 15 14C13.9071 14 12.8825 14.2922 12 14.8027M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>

                    <span class=" ml-3">Team</span>
                </NuxtLink>
            </li> -->
        </ul>
    </div>
</template>

<script setup>
import { useMainStore } from "~/store/main"
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
const mainStoreState = storeToRefs(mainStore)
</script>

<style lang="scss" scoped>
.dashboard-links {
    @apply pt-5 px-2;
    &__wrapper {
        @apply w-full;
    }
    &__item {
        a {
            @apply rounded-md p-2 text-gray-600 text-sm leading-5 font-medium;
            &.active {
                @apply bg-gray-100 text-indigo-600;
                svg {
                    @apply text-indigo-600;
                }
            }
            &:hover {
                @apply bg-gray-100;
                &.active {
                    @apply bg-gray-100 text-indigo-600;
                    svg {
                        @apply text-indigo-600;
                    }
                }
            }
        
        }
    }
    &__selected {
        svg {
            @apply text-indigo-600;
        }
    }

}
.indent {
    @apply ml-4;
}
</style>