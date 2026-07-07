<template>
  <AppLayout sidebarLeft bordered>
    <template #sidebar-left>
      <AppDashboardSidebarAPI />
    </template>
    <AppDashboardRecents />
    
    <ModalsDashboardTutorial :open="openTutorial" @close="handleCloseTutorial" />
    <ModalsClipsIntroduce :open="openClipsNoti" @close="handleCloseClips" />
  </AppLayout>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useMainStore } from "~/store/main";
const mainStore = useMainStore()
const route = useRoute()
definePageMeta({ layout: "sidebar", auth: true })

mainStore.$state.selectedNavGuid = 'b148f22b-aa18-4848-b7b3-4d81a9cb5889'
mainStore.$state.lastDashboardRoute = route.path

const fileSelected = computed(() => {
  return mainStore.files.length > 0;
});

const openClipsNoti = ref(false);
const openTutorial = ref(false);

onMounted(() => {
  // Check if the dashboard tutorial has been shown
  const dashTutorialShown = localStorage.getItem('dashTutorialShown');
  const clipsIntroduceShown = localStorage.getItem('clipsIntroduceShown');

  // Show the dashboard tutorial modal if it hasn't been seen
  if (!dashTutorialShown) {
    openTutorial.value = true;
  }
  // If the dashboard tutorial has been seen, check if the clips introduce modal should be shown
  else if (dashTutorialShown && !clipsIntroduceShown) {
    openClipsNoti.value = true;
  }
});

function handleCloseTutorial() {
  // Set the flag in localStorage when the dashboard tutorial modal is closed
  localStorage.setItem('dashTutorialShown', 'true');
  openTutorial.value = false;

  // Now check if the clips introduce modal should be shown after the tutorial is closed
  if (!localStorage.getItem('clipsIntroduceShown')) {
    openClipsNoti.value = true;
  }
}

function handleCloseClips() {
  // Set the flag in localStorage when the clips introduce modal is closed
  localStorage.setItem('clipsIntroduceShown', 'true');
  openClipsNoti.value = false;
}

const uploadModalVisible = ref(false);

const pendingStripePriceId = useCookie('pending_stripe_price_id')
pendingStripePriceId.value = null

const pendingStripeQuantity = useCookie('pending_stripe_quantity')
pendingStripeQuantity.value = null

onMounted(() => {
  try{heap.track('dashboard-page-viewed', {});}catch{}
});
</script>

<style lang="scss" scoped>
.upload {
  &__grid {
    @apply relative grid flex-grow pb-28 px-10 xl:px-0 md:h-full items-start xl:justify-center justify-items-center xl:justify-items-stretch;

    grid-template-columns: 1fr minmax(600px, 1fr);
    @media screen and (max-width: 1170px) {
      grid-template-columns: 1fr;
    }
  }
}
.column {
  &__a {
    @apply flex flex-col pt-10 pl-14 h-full;
  }

  &__b {
    @apply h-96 overflow-hidden relative;
  }
}

@media screen and (max-width: 1170px) {
  .column {
    &__a {

      @media screen and (max-width: 1170px) {
        order: 2
      }
    }

    &__b {
      @media screen and (max-width: 1170px) {
        order: 1
      }
    }
  }
}
</style>
