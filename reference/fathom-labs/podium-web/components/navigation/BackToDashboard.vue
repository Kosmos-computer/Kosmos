<template>
    <div class="nav__back-to-dashboard">
          <NuxtLink :to="mainStore.$state.lastDashboardRoute" v-if="!isRouteClip" >
            <span class="">{{ t('← Back to Dashboard') }}</span>
          </NuxtLink>
          <span v-if="isRouteClip" class="back-to-clip" @click="goToClipLists()">← {{ t('Back to Clips') }}</span>
      </div>
</template>
<script setup>
import { useMainStore } from "~/store/main"
import languageStore from '@/store/LanguageStore';
import emitter from "~/plugins/eventBus";

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const props = defineProps(['hideIntercom'])
const { params } = useRoute();
const route = useRoute()

const isRouteClip = computed(()=>{
  return route.name == 'job-jobId-clip-id'
})

const goToClipLists=()=>{
    mainStore.backToClip = true
    params.id = params.jobId
    delete params.jobId;
    navigateTo(`/job/${params.id}`)
    if (props.hideIntercom) {
      Intercom('update', {
        "hide_default_launcher": true
      })
    } else {
      Intercom('update', {
        "alignment":'right',
      })
    }
 
}


</script>
<style lang="scss" scoped>
.nav__back-to-dashboard {
    @apply justify-self-start mr-auto ml-7 z-50;
    
    a,.back-to-clip {
        &,
        &:link,
        &:visited {
        @apply cursor-pointer font-normal bg-gray-100 text-gray-800 rounded-xl px-3 py-1 hover:bg-gray-200;

        font-weight: 500;
        font-size: 12px;
        line-height: 16px;
        }
    }
}
</style>
