<template>
    <div v-if="isLoading" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
    <ModalsTemplate :open="open" size="" @close="handleClose" v-if="!isLoading">
        <div>
            <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ t('Are you sure you want to duplicate this clip?') }}</DialogTitle>
            </div>
        </div>
        <div class="mt-8 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
            <button type="button" 
                class="inline-flex w-full justify-center rounded-md bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                @click="createDuplicateClip(props.clipId)">
                {{ t('Duplicate') }}
            </button>
            <button type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0" 
                @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>

    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { DialogTitle } from '@headlessui/vue'
    import { useMainStore } from "~/store/main";
    import { storeToRefs } from 'pinia'
    import emitter from '~/plugins/eventBus';
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
    const props = defineProps(['open', 'clipId', 'source'])
    const emit = defineEmits(['close', 'latestClipId','updatedClipTitle','submit'])
    const isLoading =ref(false)

    const handleClose = () => {
        emit('close')
    }
    
    const createDuplicateClip = (id) => {
        if(id != null){
            isLoading.value = true
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${id}/duplicate/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
            })
            .then((response) => response.json())
            .then(data => {
                if(data){
                    isLoading.value = false
                    emit('submit')
                    emit('latestClipId', data.id)
                    emit('updatedClipTitle', data.title)
                    emit('close')
                }
            })
        }
    }

  </script>