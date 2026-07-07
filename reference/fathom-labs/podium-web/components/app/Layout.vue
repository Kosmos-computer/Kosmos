<template>
    <div class="dashboard">
        <div class="dashboard__sidebar dashboard__sidebar-left" v-if="sidebarLeft"
            :class="{
                'bordered': bordered
            }">
            <slot name="sidebar-left" />
        </div>
        <div class="dashboard__body-wrapper">
            <div v-if="!mainStore.user?.current_subscription_title && mainStore.user?.number_of_completed_purchases === 0 && totalCredits > 30 && !isOutage" 

                class="dashboard__banner">
                <p class="font-base">
                    <span class="font-semibold">{{ t('Enjoying the magic?') }}</span> {{ t('Join thousands who\'ve upgraded and made podcasting a breeze!') }}
                </p>

                <button 
                    @click="navigateToPricing()" 
                    class="bg-white transition-all hover:bg-purple-700 hover:ring-white hover:ring-2 hover:text-white text-purple-700 font-medium font-medium rounded-lg py-2 px-6 relative"
                    >
                    {{ t('Upgrade Now') }}
                </button> 
            </div>

            <div v-if="totalCredits === 0 && !isOutage" 
                class="dashboard__banner" style="background: #f43d45; background-image: linear-gradient(to right, #d72b2b, #ff4a52);">
                <p class="font-base font-medium">
                    {{ t('Sorry, you are out of credits. Purchase more to continue uploading files.') }}
                </p>

                <button 
                    @click="navigateToPricing()" 
                    class="bg-white transition-all hover:bg-indigo-600 hover:text-white text-indigo-500 font-medium font-medium rounded-lg py-2 px-6 relative"
                    >
                    {{ t('Purchase Credits') }}
                </button> 
            </div>
            <div  v-if="totalCredits < 30 && totalCredits > 0 && !isOutage"
                class="dashboard__banner" style="background: #ff8f44; background-image: linear-gradient(to right, #ff5b0c, #ff9b34);">
                <p class="font-base font-medium">
                    {{ t('You are low on credits. Purchase more to continue uploading files.') }}
                </p>

                <button 
                    @click="navigateToPricing()" 
                    class="bg-white transition-all hover:bg-indigo-600  hover:text-white text-indigo-500 font-medium font-medium rounded-lg py-2 px-6 relative"
                    >
                    {{ t('Purchase Credits') }}
                </button> 
            </div>
            <div v-if="isOutage"
                class="dashboard__banner" style="background: #FCA5A5; background-image: linear-gradient(to right, #DC2626, #F87171);">
                <div class="flex felx-row items-center space-x-2">
                    <SvgWarning class="w-6 h-6" />
                    <p class="font-base font-medium">
                        We're experiencing a service disruption that might affect your file processing. <a href="https://status.podium.page/" class="cursor-pointer underline" >View live updates.</a>
                    </p>
                </div>
            </div>

            <div class="dashboard__body">
                <slot />
            </div>
        
        <div class="dashboard__sidebar dashboard__sidebar-right" v-if="sidebarRight"
            :class="{
                'bordered': bordered
            }">
            <slot name="sidebar-right" />
        </div>

        </div>
        <Notifications />
    </div>
</template>


<script setup lang="ts">

import { useMainStore } from "~/store/main"
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const mainStore = useMainStore()

const isOutage = ref(false);

const fetchIncidents = async () => {
  try {
    console.group('Fetch Incidents');
    console.time('fetchIncidents-duration');
    
    console.log('Initiating monitor status fetch', {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE
    });

    const response = await fetch('/api/monitor');

    console.log('Fetch Response', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      console.error('Failed to fetch monitor data', {
        status: response.status,
        statusText: response.statusText
      });
      isOutage.value = true;
      console.timeEnd('fetchIncidents-duration');
      console.groupEnd();
      return;
    }

    const result = await response.json();

    console.log('Parsed Monitor Result', {
      fullResult: result,
      status: result.status,
      dataStatus: result.data?.status,
      additionalDetails: result.data
    });

    // Determine system status
    const isUp = 
      result.status === 'success' && 
      result.data?.status === 'up';

    if (isUp) {
      console.log('System is UP', {
        previousOutageState: isOutage.value,
        details: result.data
      });
      isOutage.value = false;
    } else {
      console.warn('System is DOWN', {
        previousOutageState: isOutage.value,
        resultStatus: result.status,
        dataStatus: result.data?.status,
        details: result.data
      });
      isOutage.value = true;
    }

    console.timeEnd('fetchIncidents-duration');
    console.groupEnd();
  } catch (error) {
    console.error('Critical Error in fetchIncidents', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Default to not showing outage in case of error
    isOutage.value = false;
    
    console.groupEnd();
  }
};



// Fetch data when the component is mounted
onMounted(() => {
  fetchIncidents();

  // Optional: Auto-refresh every 5 minutes
  setInterval(() => {
    fetchIncidents();
  }, 90000); // 90000 ms = 1.5 minutes
});

withDefaults(defineProps<{
    sidebarLeft?: boolean;
    sidebarRight?: boolean;
    bordered?: boolean;
}>(), {
    sidebarLeft: false,
    sidebarRight: false,
    bordered: false
});

const totalCredits = computed(() => {
  var credits = Math.round(mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance)
  if (credits < 0) {
    credits = 0
  }

  return credits
})

function navigateToPricing() {
  window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
}

</script>
<style lang="scss" scoped>
.dashboard {
    @apply flex relative;
    z-index: 2;

    &__body {
        @apply relative flex-1 px-8 py-6;
    }
    &__body-wrapper {
        @apply relative flex-1;
    }
    &__sidebar {
        @apply max-w-xs pt-4 z-10;
        &-left {
            @apply sticky inset-0;
            width: 256px;
            height: calc(100vh);
            &.bordered {
                @apply border-r border-gray-200;
            }
        }
        &-right {
            @apply w-1/3;
            width: 256px;
            &.bordered {
                @apply border-l border-gray-200;
            }
        }
        
    }
    &__banner {
        @apply z-10 absolute sticky top-0 inset-0 w-auto bottom-auto flex justify-between items-center px-8 py-3 bg-gradient-to-r from-indigo-700 to-purple-700 text-white;
        left: 256px;
    }
}
</style>