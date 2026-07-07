<template>
    <div v-if="updateMediaTranscriptLoading || clipLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
    <ModalsTemplate :open="open" size="sm" @close="handleClose" v-if="!clipLoader">
        <div>
            <div class="mx-auto flex items-center justify-center rounded-full">
                <SvgWarningSync />
            </div>
            <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-lg	font-medium leading-6 text-gray-900">{{ t('Overwrite custom edits') }}</DialogTitle>
                <div class="mt-2">
              
                <p class="text-sm text-gray-500">
                    {{ t('If you sync this block with the latest version, any custom edits you made here will be overridden.') }}
                </p>
               
                </div>
            </div>
        </div>
        <div class="mt-5 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
            <button type="" 
                class="inline-flex w-full justify-center rounded-md bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                @click="handleSync()">
                {{ t('Sync') }}
            </button>
            <button type=""
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0" 
                @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>

    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
    import { DialogTitle } from '@headlessui/vue'
    import { WarningIcon } from '@heroicons/vue/24/outline'
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
    const clipLoader = ref(false)
    const mainStore = useMainStore();
    const mainStoreState = storeToRefs(mainStore)
    const runtimeConfig = useRuntimeConfig()
    const { updateMediaTranscriptLoading , currentMediaAssetsLoading} = storeToRefs(mainStore)
    const props = withDefaults(defineProps<{
        open: boolean,
    }>(), {
        open: false,
    })

    const emit = defineEmits(['close', 'sync'])

    const handleClose = () => {
        emit('close')
    }
    
    const handleSync = () => {
        emit('sync')
    }

  </script>