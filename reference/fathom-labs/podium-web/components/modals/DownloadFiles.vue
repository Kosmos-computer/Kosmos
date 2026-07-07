<template>
  <ModalsTemplate :open="open" size="sm" @close="handleClose">
      <div>
          <div class="mt-3 text-center sm:mt-5">
              <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ t('Packaging Files') }}</DialogTitle>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  {{ t('Your files are being packaged.') }} 
                </p>
              </div>
              <div class="flex place-content-center mt-8 mb-4 scale-100">
                <SvgLoaderMd />

              </div>
          </div>
      </div>

  </ModalsTemplate>
</template>
<script setup>
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
const props = defineProps({
        open: { type: Boolean, required: true },
        media: { type: Object, required: false, default: null },
    })

const emit = defineEmits(['close'])

const handleClose = () => {
    emit('close')
}

watch(() => props.open, (newVal) => {
  if (newVal) {
    handleDownloadFiles()
  }
})

const handleDownloadFiles = () => {
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.media.id}/download_files_url`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        },
    })
    .then(response => response.json())
    .then(data => {
      try{heap.track('assets-downloaded', {});}catch{}
      window.location = data.url
      handleClose()
    })
}

</script>