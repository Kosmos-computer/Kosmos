<template>
  <ModalsTemplate :open="open" size="md" @close="handleClose">
      <div>
          <div >
              <DialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900">{{ t('Password Reset Email') }}</DialogTitle>
              <div v-if="loading" class="flex justify-center items-center h-full w-full ">
                <div class="scale-50">
                  <SvgLoadingMd />
                </div>

              </div>
              <div v-if="error == null && !loading" class="mt-5">
                <p class="text-base text-gray-500 mt-s">
                  {{ t('An email has been sent to') }} {{ mainStore.user.email }}. {{ t('A link provided in the email will allow you to reset your password.') }} 
                </p>

                <p class="text-base text-gray-500 mt-4">
                  {{ t('Do you need any more help?') }}
                  <a href="#" @click.stop="contactSupport()" class="text-base text-indigo-700 hover:underline ml-2">{{ t('Contact Support') }}</a>
                </p>
              </div>
              <div v-if="error != null" class="mt-4">
                <p class="text-sm text-red-500 mt-2">
                  {{ error }}
                </p>
              </div>
          </div>
      </div>
      <div class="mt-5 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
          <button type="button"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0" 
              @click="handleClose" 
              ref="cancelButtonRef"
          >
          {{ t('Close') }}
          </button>
      </div>

  </ModalsTemplate>
</template>
<script setup lang="ts">
  import { withDefaults } from 'vue'
  import { DialogTitle } from '@headlessui/vue'
  import { useMainStore } from "~/store/main";
  import { storeToRefs } from 'pinia'
  import axios from 'axios'
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
  const error = ref(null)
  const loading = ref(true)

  const props = withDefaults(defineProps<{
      open: boolean,
  }>(), {
      open: false,
  })

  const emit = defineEmits(['close', 'submit'])

  watch(() => props.open, async (newVal) => {
    if (newVal) {
      try {
        loading.value = true
        await axios.post(runtimeConfig.public.fathomWebApiURL + '/api/podium/internal/v1/user/request_reset_password', { email: mainStore.user.email });
        loading.value = false
      } catch (e) {
        console.log(e)
        loading.value = false
        error.value = 'An error occurred. Please try again.'
      }
    }
  });


  onMounted(async () => {
  })

  const contactSupport = () => {
    Intercom('showNewMessage');
    //const route = useRoute()
    //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path + '&user_email=' + mainStore.user.email + '&platform=web', '_blank');
  }
  
  const handleClose = () => {
      emit('close')
  }
  
</script>