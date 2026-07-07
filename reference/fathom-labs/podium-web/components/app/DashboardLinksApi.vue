<template>
    <div class="dashboard-links">
      <ul class="dashboard-links__wrapper">
        <li class="dashboard-links__item">
          <NuxtLink to="/dashboard" exact-active-class="active" class="flex items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path class=" stroke-current" d="M20 13V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V13M20 13V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V13M20 13H17.4142C17.149 13 16.8946 13.1054 16.7071 13.2929L14.2929 15.7071C14.1054 15.8946 13.851 16 13.5858 16H10.4142C10.149 16 9.89464 15.8946 9.70711 15.7071L7.29289 13.2929C7.10536 13.1054 6.851 13 6.58579 13H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="ml-3">{{ t("Recent") }}</span>
          </NuxtLink>
        </li>
        <li class="dashboard-links__item">
          <NuxtLink to="/projects" exact-active-class="active" class="flex items-center">
            <svg   width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path class=" stroke-current" d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="ml-3">{{ t("Projects") }}</span>
          </NuxtLink>
        </li>
        <li :class="['dashboard-links__item', {'dashboard-links__selected': mainStoreState.selectedNavGuid == project.id}]" v-for="project in mainStoreState.projects.value"  :key="project.id">
                <div class="indent">
                    <NuxtLink :to="'/projects/' + project.id" exact-active-class="active" class="flex items-center">
                        <svg  v-if="!project.image_url || project.image_url == 'null'" class="min-w-[24px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path class="stroke-current" d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="min-w-[24px] w-[24px] h-[24px] rounded-lg flex items-center justify-center" v-if="project.image_url && project.image_url != 'null'">
                          <img  class="rounded-lg w-full h-full object-cover" :src="project.image_url"   >
                        </div>
                        <span class=" ml-3 pt-0.5">{{ project.name }}</span>
                    </NuxtLink>
                </div>
            </li>
            <li class="dashboard-links__item" v-if="mainStore.user?.current_subscription_renews_on != null && mainStore.stringToBoolean(mainStore.user?.settings.api_access) || mainStore.user?.email ==='mw@vast.faith' || mainStore.user?.email ==='kevin@higherpixels.com'">
              <ul>
                <li>
                  <div class="user-dropdown cursor-pointer" :class="{
                      'user-dropdown__simple': simpleLayout,
                      'user-dropdown__full': !simpleLayout
                  }"  >


                  <div class="dashboard-links__item"  @click="isDropdownOpen = !isDropdownOpen">
                      <NuxtLink exact-active-class="active" class="flex items-center block relative">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path class=" stroke-current" d="M8 9L11 12L8 15M13 15H16M5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="ml-3">API</span>
                        <span class="absolute right-0">
                          <SvgCarrot class="user-dropdown__carrot" :class="[classes, simpleLayout ? 'ml-2' : 'ml-auto']" /></span>
                      </NuxtLink>
                    </div>
                      
                      
                      <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                          <div class="user-dropdown__dropdown" :class="classes" v-if="isDropdownOpen">
                              <li  class="dashboard-links__item" >
                                <div class="indent" >
                                  <NuxtLink to="/usage" exact-active-class="active" class="flex items-center">
                                    <svg class="min-w-[24px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path class="stroke-current" d="M16 8V16M12 11V16M8 14V16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span class="ml-3 pt-0.5">{{ t("Usage") }}</span>
                                  </NuxtLink></div>
                              </li>
                              
                              <li  class="dashboard-links__item">
                                <div class="indent">
                                  <NuxtLink to="/apikeys" exact-active-class="active" class="flex items-center">
                                    <svg class="min-w-[24px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path class="stroke-current" d="M15 7C16.1046 7 17 7.89543 17 9M21 9C21 12.3137 18.3137 15 15 15C14.3938 15 13.8087 14.9101 13.2571 14.7429L11 17H9V19H7V21H4C3.44772 21 3 20.5523 3 20V17.4142C3 17.149 3.10536 16.8946 3.29289 16.7071L9.25707 10.7429C9.08989 10.1914 9 9.60617 9 9C9 5.68629 11.6863 3 15 3C18.3137 3 21 5.68629 21 9Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span class="ml-3 pt-0.5">{{ t("API Keys") }}</span>
                                  </NuxtLink>
                                </div>
                              </li>
                          </div>
                      </transition>
                  </div>
                </li>
              </ul>
            </li>
      </ul>
    </div>
</template>
  
<script setup>
import {useMainStore} from "~/store/main"
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
  const isDropdownOpen = mainStoreState.isDropdownOpen

  const simpleLayout =ref('simple')

  const classes = computed(() => {
      return {
          'dropdown-open': isDropdownOpen.value,
          'dropdown-shut': !isDropdownOpen.value,
          'simple': simpleLayout.value,
          'full': !simpleLayout.value,
      }
  })
 
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

<style lang="scss" scoped>
.user-dropdown {
    
    &__carrot {
        @apply self-center mr-2 cursor-pointer w-6 h-6;
        &.dropdown-open {
            transform: rotate(-180deg);
        }
        &.dropdown-shut {
            transform: rotate(0deg);
        }
    }

    
    &__dropdown {
        @apply top-12 bg-white rounded-lg w-56 py-2 z-20;
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
  