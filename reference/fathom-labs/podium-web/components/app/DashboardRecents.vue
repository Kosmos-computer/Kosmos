<template>
    <div class="dashboard-recents">
        <div class="flex flex-row w-full space-x-4">
          <div class="relative w-full h-76">
            <DropZone :class="{'dashboard-recents__drop-zone': true}" />
          </div>
        </div>  
        <div class="dashboard-recents__header flex justify-between items-center">
          <h1 class="dashboard-recents__title">{{ t("Recent Uploads") }}</h1>
          <button @click="toggleView" class="flex flex-row items-center w-fit bg-white px-2 text-sm font-medium leading-5 text-gray-700 border border-gray-300 h-10 rounded-md cursor-pointer hover:bg-gray-100 whitespace-nowrap">
            <SvgListIcon v-if="isFirstComponentVisible" />
            <SvgGridIcon v-else />
          </button>
        </div>
        <div class="dashboard-recents__recent-uploads">
          <RecentUploads2 v-if="isFirstComponentVisible"/>
          <RecentUploads v-else/>
        </div>
        <!--Align this to the far right-->
        <div class="flex pt-4">
            <NavigationPageNumbers :current-page="mainStoreState.mediaPage.value" :page-size="mainStoreState.mediaPageSize.value" :total-count="mainStoreState.mediaTotalCount.value" @page-change="mainStore.setMediaPage"/>
        </div>

        <div v-if="uploadModalVisible" style="z-index:60">
            <UploadModal v-model:modal-visible="uploadModalVisible"/>
        </div>
        
    </div>
</template>

<script lang="ts" setup>
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

const uploadModalVisible = ref(false);

const storageKey = 'recentUploadsView'
const isFirstComponentVisible = ref(true)


onMounted(() => {
  const savedState = localStorage.getItem(storageKey)
  isFirstComponentVisible.value = savedState === null || savedState === 'true'
})

watch(isFirstComponentVisible, (newValue) => {
  localStorage.setItem(storageKey, newValue.toString())
})

function toggleView() {
  isFirstComponentVisible.value = !isFirstComponentVisible.value
}

const mainStore = useMainStore();
const mainStoreState = storeToRefs(mainStore)
const fileSelected = computed(() => {
  return mainStore.files.length > 0;
});

</script>


<style lang="scss" scoped>
.dashboard-recents {
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
    &__header {
      @apply border-b border-gray-200 ;  
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
}
</style>