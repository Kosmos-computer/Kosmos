<template>
  <ModalsTemplate :open="open" size="md" @close="handleClose">
      <div>
        <div v-if="mainUserLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
        <div class="">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mt-1">{{ t('We are sorry to see you go!') }}</DialogTitle>
              <div class="mt-1">
                <p v-if="!mainStore.user.current_subscription_already_availed_free_offer" class="text-sm text-gray-500 mt-0 font-medium">
                  {{ t('We would like you to offer one month free on us so you can continue using Podium on us. You can still cancel any time.') }}</p>
                <p v-if="mainStore.user.current_subscription_already_availed_free_offer" class="text-sm text-gray-500 mt-0 font-medium">
                  {{ t('You can pause your subscription for a few months and then come back to Podium. Pausing will lock in your rates') }}
                   {{ t('and you will be unaffected by any price increases during this period.') }}</p>
              </div>
              <div class="mt-2">
                <p v-if="errorMsg" class="text-sm text-red-500 text-center">
                    {{ errorMsg }}
                </p></div>
        </div>
      </div>
      <div class="mt-5 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
          <button v-if="!mainStore.user.current_subscription_already_availed_free_offer" type="button" 
              class="btn btn-submit"
              @click="acceptOffer()">
              {{ t('Accept Offer') }}
          </button>
          <button v-if="mainStore.user.current_subscription_already_availed_free_offer" type="button" 
              class="btn btn-submit"
              @click="pauseSubscription()">
              {{ t('Pause Subscription') }}
          </button>
          <button type="button"
              class="btn btn-end" 
              @click="endSubscriptionPlan()" ref="endButtonRef">{{ t('End Subscription') }}</button>
      </div>
      <div class="flex flex-row gap-3 pt-6">
            <button  type="button" class="btn btn-cancel" @click="handleClose()" ref="cancelButtonRef">{{ t('Cancel') }}</button>
          </div>

  </ModalsTemplate>
  <ModalsEndSubscription :open="openEndSubscriptionModal"  @close="openEndSubscriptionModal = false"  />
</template>
<script setup lang="ts">
  import { withDefaults } from 'vue'
  import { DialogTitle } from '@headlessui/vue'
  import { useMainStore } from "~/store/main";
  import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

  const mainStore = useMainStore();
  const mainStoreState = storeToRefs(mainStore)
  const runtimeConfig = useRuntimeConfig()
  const openEndSubscriptionModal = ref(false)
  const { mainUserLoader } = storeToRefs(mainStore)
  const props = withDefaults(defineProps<{
      open: boolean,
  }>(), {
      open: false,
  })
  const errorMsg = ref('')
  const emit = defineEmits(['close'])
 const endSubscriptionPlan = ()=>{
    errorMsg.value = ''
    emit('close')
    openEndSubscriptionModal.value = true
 }
  const handleClose = () => {
      errorMsg.value = ''
      emit('close')
  }
  const pauseSubscription =()=>{
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/pause_subscription`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
          },
      })
      .then(response => response.json())
      .then(data => {
        if(data){
            emit('close')
            // Refresh user data after subscription cancellation
            mainStore.retrieveUser(null)
        }
      })

  }
  const acceptOffer = ()=>{
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/avail_one_month_free_subscription`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
          },
      })
      .then(response => {
        if (response.ok) {
                    return response.json()
                } else if(response.status === 400) {
                response.json().then(data => {
                errorMsg.value = data.detail
                });
                }else if(response.status === 500){
                    errorMsg.value = 'Something went wrong!'
                }
      })
      .then(data => {
        if(data){
           errorMsg.value = ''
            // Refresh user data after subscription cancellation
            mainStore.retrieveUser(null)
            emit('close')
        }
      })
      
  }
  onMounted(()=>{})
</script>
<style scoped>
.btn {
  @apply mt-3 inline-flex w-full justify-center rounded-md text-sm px-3 py-2 text-sm leading-5 font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;

  &-submit {
    @apply bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
  }

  &-end {
    @apply bg-red-200 text-red-600 ring-red-200 hover:bg-red-50;
  }

  &-cancel {
    @apply w-full bg-white text-gray-700 ring-gray-300 hover:bg-gray-50;
  }
 
}
</style>