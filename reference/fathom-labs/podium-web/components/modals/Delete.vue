<template>
    <div v-if="updateMediaTranscriptLoading || clipLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
    <ModalsTemplate :open="open" size="sm" @close="handleClose" v-if="!clipLoader">
        <div>
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <TrashIcon class="h-12 w-12 text-gray-900" aria-hidden="true" />
            </div>
            <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ t('Are you sure?') }}</DialogTitle>
                <div class="mt-2">
              
                <p v-if="props.from =='customTemplate'"  class="text-sm text-gray-500">
                    {{ t('This cannot be undone.') }}
                </p>
                <p v-else class="text-sm text-gray-500">
                    {{ t('Deletion is permanent and cannot be recovered.') }}
                </p>
                <p v-show="props.project != null" class="text-sm text-gray-500 mt-2">
                    {{ t('Deleting a project will delete all files within the project.') }}
                </p>
                </div>
            </div>
        </div>
        <div class="mt-5 sm:mt-6 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
            <button type="" 
                class="inline-flex w-full justify-center rounded-md bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                @click="handleDelete()">
                {{ t('Delete') }}
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
    import { TrashIcon } from '@heroicons/vue/24/outline'
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
        media?: Object | null,
        project?: Object | null,
        from?:string,
        assestId?:string|null,
        apisKeyId?:number ,
        isDelete?: number,
        isDeleteClip?:number
    }>(), {
        open: false,
        file: null
        
    })

    const emit = defineEmits(['close', 'submit'])

    const handleClose = () => {
        emit('close')
    }
    
    const handleDelete = () => {
        if (props.project != null) {
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/project/${props.project.id}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                //delete project from mainStore.projects
                mainStoreState.projects.value = mainStoreState.projects.value.filter(project => project.id != props.project.id)
                mainStoreState.media.value = mainStoreState.media.value.filter(media => media.project_id != props.project.id)
                emit('close')
            })
            emit('submit')
        }
        
        if (props.media != null) {
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.media.id}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                //delete project from mainStore.projects
                mainStoreState.projectMedia.value = mainStoreState.projectMedia.value.filter(media => media.id != props.media.id)
                mainStoreState.media.value = mainStoreState.media.value.filter(media => media.id != props.media.id)
                emit('close')
            })
            emit('submit')
        }
        if (props.assestId != null) {
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/custom-prompt/${props.assestId}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                //delete project from mainStore.projects
                mainStore.refreshCustomPrompts()
                emit('close')
            })
            emit('submit')
        }
        if (props.apisKeyId != null) {
            updateMediaTranscriptLoading.value = true
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/api_keys/delete/${props.apisKeyId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                //delete project from mainStore.projects
                mainStore.refreshAPIKeyLists()
                updateMediaTranscriptLoading.value = false
                emit('close')
            })
            emit('submit')
        }
        if (props.isDelete != null) {
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${props.isDelete}/image/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                emit('close')
            })
            emit('submit')
        }
        if (props.isDeleteClip != null) {
            clipLoader.value = true;
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${props.isDeleteClip}/delete/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                    clipLoader.value = false
                    emit('submit')
                    emit('close')
            })
        }
    }

  </script>