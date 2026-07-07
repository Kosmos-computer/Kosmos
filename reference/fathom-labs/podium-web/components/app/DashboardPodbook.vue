<template>
    <div class="dashboard-recents">
        <div class="relative h-76 cursor-pointer" @click="openFileSelectModal = true">

            <PodbookDropZone />
        </div>
        <h1 class="dashboard-recents__title">All Podbooks</h1>
        <div class="dashboard-recents__recent-uploads">
            <PodbookCard />  
        </div>
        
    </div>

    <ModalsPodbookFiles 
      :open="openFileSelectModal"
      @close="openFileSelectModal = false" />
</template>

<script lang="ts" setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
const uploadModalVisible = ref(false);

const openFileSelectModal = ref(false);

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
        @apply text-gray-900 text-2xl py-6 pb-4 border-b border-gray-200 leading-8 font-semibold;
    }
    &__recent-uploads {
        @apply overflow-auto relative;
    }
}
</style>