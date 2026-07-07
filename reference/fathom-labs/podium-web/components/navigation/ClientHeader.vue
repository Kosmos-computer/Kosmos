<template>
  <header :class="['sticky top-0 flex px-4 py-4 z-40 relative border-b border-solid border-gray-300 bg-white']">
    <div class="flex flex-row items-center w-full">
      <div class="z-50 cursor-pointer min-w-[240px]">

        <svg v-if="!hasCustomLogo" width="112" height="24" viewBox="0 0 112 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M18.9251 8.60797C18.9251 12.8404 15.5862 16.2719 11.468 16.2719V0.944092C15.5874 0.944092 18.9251 4.37555 18.9251 8.60797ZM0 12.7361H10.3216V23.3439H0V12.7361ZM5.1614 11.5593C8.01196 11.5593 10.3228 9.18435 10.3228 6.25474C10.3228 3.32514 8.01196 0.950225 5.1614 0.950225C2.31084 0.950225 0 3.32514 0 6.25474C0 9.18435 2.31084 11.5593 5.1614 11.5593ZM29.9887 14.1877H32.8581V14.1865C37.2788 14.1865 39.0445 11.4652 39.0445 8.78992C39.0445 5.7378 36.9824 3.33988 32.8581 3.33988H26.5518V20.9487H29.9887V14.1877ZM35.5096 8.79117C35.5096 10.3558 34.6491 11.3396 32.7116 11.3396H29.9887V6.21664H32.7116C34.6491 6.21664 35.5096 7.22655 35.5096 8.79117ZM45.7185 20.9472C41.7915 20.9472 38.8217 18.1214 38.8217 13.7323C38.8217 9.34313 41.8883 6.51737 45.8166 6.51737C49.7448 6.51737 52.8138 9.3195 52.8138 13.7323C52.8138 18.145 49.6722 20.9472 45.7197 20.9472H45.7185ZM45.7185 17.8689C47.5362 17.8689 49.2789 16.5083 49.2789 13.7323C49.2789 10.9563 47.5846 9.59561 45.7669 9.59561C43.9493 9.59561 42.307 10.9326 42.307 13.7323C42.307 16.5319 43.8779 17.8689 45.7185 17.8689ZM64.3546 8.68906C63.424 7.37443 61.7031 6.5175 59.912 6.5175C56.4304 6.5175 53.6809 9.31963 53.6809 13.6826C53.6809 18.0457 56.4292 20.9473 59.889 20.9473C62.0238 20.9473 63.5462 19.9399 64.3546 18.6526V20.7209H67.8399V2.05499H64.3546V8.68906ZM57.1891 13.6826C57.1891 11.0347 58.9318 9.6231 60.7725 9.6231C62.6616 9.6231 64.3812 11.0832 64.3812 13.7324C64.3812 16.3815 62.6132 17.8454 60.7725 17.8454C58.9318 17.8454 57.1891 16.3306 57.1891 13.6826ZM69.6317 6.74507H73.0686V20.7209H69.6317V6.74507ZM84.2629 20.7209H87.7228V6.74507H84.2629V14.44C84.2629 16.6837 83.0358 17.8951 81.2181 17.8951C79.4005 17.8951 78.2 16.685 78.2 14.44V6.74507H74.7631V14.9438C74.7631 18.7794 77.0455 20.8975 80.2125 20.8975C81.9067 20.8975 83.4025 20.1401 84.2629 18.956V20.7209ZM108.562 13.0022C108.562 10.7809 107.358 9.62295 105.544 9.62295C103.73 9.62295 102.499 10.7809 102.499 13.0022V20.7208H99.0621V13.0022C99.0621 10.7809 97.8616 9.62295 96.0439 9.62295C94.2262 9.62295 92.9773 10.7809 92.9773 13.0022V20.7208H89.5404V6.74496H92.9773V8.43643C93.8341 7.27603 95.2815 6.54472 96.9757 6.54472C99.0887 6.54472 100.831 7.47876 101.763 9.21625C102.647 7.62801 104.438 6.54472 106.427 6.54472C109.692 6.54472 112 8.66279 112 12.5221V20.7208H108.563V13.0022H108.562ZM73.3856 3.01242C73.3856 4.15472 72.4846 5.08075 71.3731 5.08075C70.2616 5.08075 69.3606 4.15472 69.3606 3.01242C69.3606 1.87011 70.2616 0.944092 71.3731 0.944092C72.4846 0.944092 73.3856 1.87011 73.3856 3.01242Z" fill="black"/>
        </svg>
        <img v-else :src="props.clientConfigs.logo_url" alt="Transcript Editor" class="" style="max-height:46px;" />
      </div>

      <div class="grow">
        <div v-if="props.fileName != ''" class="text-sm text-gray-900 text-center">
          &nbsp;{{ props.fileName }}
        </div>
      </div>

      <div class="text-end text-black font-medium leading-5 whitespace-nowrap min-w-[240px] flex items-center justify-end">
        <div class="text-gray-300 min-w-[68px] text-left inline-block">
          <!-- <SvgLoading v-if="props.saveState == 'saving'"/>
          <SvgTranscriptSaved v-if="props.saveState == 'saved'"/>
          <span v-if="showSaveState">{{ getSaveState }}</span> -->
          <span :class="[mainStore.transcriptSavingSavedState == 'Saved' ? 'text-gray-400 ' : 'text-indigo-600', 'flex gap-2 items-center text-sm']">
          <SvgLoading v-if="mainStore.transcriptSavingSavedState == 'Saving...'"/>
          <SvgTranscriptSaved v-if="mainStore.transcriptSavingSavedState == 'Saved'"/>
          {{ mainStore.transcriptSavingSavedState }}
        </span>
        </div>
        <button
          @click="finished()" 
          class="bg-indigo-600 transition-colors duration-250 w-32 hover:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold rounded-md py-2 px-6 ml-4 relative "
          :disabled="mainStore.transcriptSavingSavedState  == 'Saving...'"
        >
          Done
        </button>
      </div>
    </div>

  </header>
</template>

<script setup lang="ts">
import { useNavigationStore } from "~/store/navigation"
import { useMainStore } from "~/store/main"
const props = defineProps(['returnUrl', 'saveState', 'fileName', 'podcastName', 'clientConfigs'])

const mainStore = useMainStore()
const { data, status, getCsrfToken, getProviders, signOut } = useSession()

const emits = defineEmits(['toggleMenu'])

const navigationStore = useNavigationStore()

const showSaveState = computed(() => {
  return props.saveState && props.saveState != '' && props.saveState != 'idle'
});

const getSaveState = computed(() => {
  if (props.saveState == 'saving') {
    return 'Saving...'
  } else if (props.saveState == 'saved') {
    return 'Saved'
  } else if (props.saveState == 'error') {
    return 'Error'
  }
});

const hasCustomLogo = computed(() => {
  return props.clientConfigs && props.clientConfigs.logo_url && props.clientConfigs.logo_url != ''
});

function finished() {
  if (props.returnUrl && props.returnUrl != '') {
    window.location = props.returnUrl
  } else {
    history.back()
  }
}
</script>

<style lang="scss" scoped>
.header__hamburger {
  top: 29px;

  &--logged-in {
    :deep(rect) {
      width: 20px;
    }
  }
}
</style>
