<template>
    <div class="user-dropdown cursor-pointer" :class="{
        'user-dropdown__simple': simpleLayout,
        'user-dropdown__full': !simpleLayout
    }"  @click="isDropdownOpen = !isDropdownOpen">

        <div class="flex items-start cursor-pointer">

            <div class="user-dropdown__image-wrapper" v-if="mainStore.user?.profile_image_url">
                <img 
                    :class="{'mt-2': !simpleLayout}"
                    :src="mainStore.user?.profile_image_url" 
                    referrerpolicy="no-referrer" />
            </div>
            <div v-else class="user-dropdown__image-wrapper">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="18" fill="#F3F4F6"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M22.7314 13.3599C22.7314 15.964 20.6773 18.075 18.1435 18.075C15.6097 18.075 13.5556 15.964 13.5556 13.3599C13.5556 10.7558 15.6097 8.64478 18.1435 8.64478C20.6773 8.64478 22.7314 10.7558 22.7314 13.3599ZM18 27.3552C13.582 27.3552 10 23.7733 10 19.3552L26 19.3552C26 23.7746 22.418 27.3552 18 27.3552Z" fill="#D1D5DB"/>
                </svg>
            </div>
        </div>

        <div class="user-dropdown__user" v-if="!simpleLayout">

            <h2 class="user-dropdown__user-name">
                {{ userName }}
            </h2>
            <div class="user-dropdown__user-credits-badge"
                :class="{
                    'success': totalCredits >= 100,
                    'warning': totalCredits > 1 && totalCredits < 99,
                    'danger': totalCredits < 1
                }">
                {{ totalCredits }} {{ t('Credits') }}
            </div>
        </div>

        <SvgCarrot 
        class="user-dropdown__carrot" :class="[classes, simpleLayout ? 'ml-2' : 'ml-auto']" />
        
        <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
            <div class="user-dropdown__dropdown" :class="classes">
                <div v-if="mainStore.user?.current_subscription_title == null || mainStore.user?.current_subscription_title == ''" class="user-dropdown__dropdown-item border-b no-hover">
                    <button 
                        @click="navigateToPricing()" 
                        class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 px-6 bottom-0.5 relative w-full"
                        >
                        {{ t('Upgrade Plan') }}
                    </button> 
                </div>
                <div v-if="mainStore.user?.current_subscription_title && !mainStore.user?.current_subscription_title == ''" class="user-dropdown__dropdown-item border-b no-hover">
                    <button 
                        @click="purchaseCredits()" 
                        class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 px-6 bottom-0.5 relative w-full"
                        >
                        {{ t('Purchase Credits') }}
                    </button> 
                </div>
                <!-- TODO: UPDATE LINKS -->
                <NuxtLink to="/account-settings" class="user-dropdown__dropdown-item">
                    {{ t('Account Settings') }}
                </NuxtLink>
                <NuxtLink  :to="{ path: '/account-settings', query: { section: 'api-access' } }" class="user-dropdown__dropdown-item">
                    {{ t('API Access') }}
                </NuxtLink>
                <a @click="contactSupport" href="#" class="user-dropdown__dropdown-item">
                    {{ t('Customer Support') }}
                </a>
                <a href="https://hello.podium.page/affiliates" target="_blank" class="user-dropdown__dropdown-item">
                    {{ t('Become an Affiliate') }}
                </a>
                <div @click="openLanguageSelector = true" class="user-dropdown__dropdown-item flex justify-between items-center">
                    <div class="flex flex-row space-x-2 items-center">
                        <SvgTranslateIcon class="w-4 h-4"/>
                        <span>{{ t('English') }}</span>
                    </div>
                    <span @click="openLanguageSelector = true" class="text-xs font-regular text-indigo-600 underline cursor-pointer">{{ t('Change') }}</span>
                </div>
                <NuxtLink to="/logout" class="user-dropdown__dropdown-item border-t">
                    {{ t('Log Out') }}
                </NuxtLink>
            </div>
        </transition>
        <div v-if="isDropdownOpen" class="fixed inset-0 bg-transparent transition-opacity z-10" />

        <ModalsInterfaceLanguage :open="openLanguageSelector" @close="openLanguageSelector = false" />
    </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMainStore } from "~/store/main"
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const props = withDefaults(defineProps<{
  simplified?: boolean;
}>(), {
  simplified: false,
});

const mainStore = useMainStore()

const isDropdownOpen = ref(false)
const openLanguageSelector = ref(false)

const simpleLayout = computed(() => {
  return props.simplified
})

const classes = computed(() => {
    return {
        'dropdown-open': isDropdownOpen.value,
        'dropdown-shut': !isDropdownOpen.value,
        'simple': simpleLayout.value,
        'full': !simpleLayout.value,
    }
})


const userImage = computed(() => mainStore.user?.profileImageUrl);

const userName = computed(() => {
  if (mainStore.user?.name && mainStore.user?.name !== '') {
    return mainStore.user.name
  } else if (mainStore.user?.email && mainStore.user?.email !== '') {
    return mainStore.user.email
  }
  return ''
});

const totalCredits = computed(() => {
  var credits = Math.round(mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance)
  if (credits < 0) {
    credits = 0
  }

  return credits
})

// Polling mechanism to update credits in real time
let pollingInterval: any;
onMounted(() => {
  pollingInterval = setInterval(() => {
    // Trigger reactivity by updating a watched property or accessing the store
    mainStore.user.current_subscription_credits_balance += 0; // Dummy update to trigger reactivity
    mainStore.user.additional_credits_balance += 0;
  }, 5000); // Poll every 5 seconds
});


const needsMoreCredits = computed(() => {
  return !mainStore.user?.current_subscription_title || mainStore.user?.current_subscription_title == ''
})

const navigateToPricing = () : void => {
  window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
}

const purchaseCredits = () : void => {
    navigateTo(`/begin-purchase?stripePriceId=${mainStore.user?.additional_credits_stripe_price_id}`);
}

const contactSupport = () : void => {
  Intercom('showNewMessage');
}
</script>
<style lang="scss" scoped>
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
</style>