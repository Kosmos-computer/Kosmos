<template>
    <ModalsTemplate :open="open" @close="handleClose">
        <div>
            <div v-if="mainUserLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
            <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ t('Are you sure to pause your subscription?') }}</DialogTitle>
            </div>
            <div class="mt-2">
                <p v-if="errorMsg" class="text-sm text-red-500 text-center">
                    {{ errorMsg }}
                </p></div>
        </div>
        <div class="mt-8 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
            <button type="button" 
                class="inline-flex w-full justify-center rounded-md bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                @click="pauseSubscription()">
                {{ t('Pause Subscription') }}
            </button>
            <button type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0" 
                @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>

    </ModalsTemplate>
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
    const errorMsg = ref('')
    const props = withDefaults(defineProps<{
        open: boolean,
    }>(), {
        open: false,
    })
    const emit = defineEmits(['close'])
    const handleClose = () => {
        errorMsg.value = ''
        emit('close')
    }
    
    const pauseSubscription = () => {
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/pause_subscription`, {
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
            // Refresh user data after subscription cancellation
            mainStore.retrieveUser(null)
            emit('close')
        }
      })
    }

  </script>