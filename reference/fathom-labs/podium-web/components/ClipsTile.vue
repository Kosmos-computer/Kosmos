<template>
    <ModalsClipDownload :open="downloadModal"  @close="downloadModal = false" />
    <h1 v-if="!openEditClip || receivedMessage !=''" class="text-2xl text-gray-900 font-semibold leading-8 mb-[17px] pt-5">{{ t('All Clips') }}</h1>
    <div  v-if="loader" class="m-auto pb-[30vh]" style="">
        <SvgLoadingMd />
    </div>
    
    <div class="flex flex-wrap gap-4 pb-20" v-if="!loader || receivedMessage !=''">
        <div 
        v-for="(asset, index) in assets"
        :key="index"
        :class="['upload-file-card cursor-pointer transition-all duration-300', highlightedClip === index ? 'bg-gray-100' : 'bg-white']"
        @mouseover="highlightClip(index)"
        @mouseleave="unhighlightClip()"
    >
    <div class="flex flex-row justify-between rounded-lg relative" style="margin-left: -1rem; margin-right: -1rem; margin-top: -1rem;">
        <div @click="editClipByAssetId(asset.id, asset.title)" :class="['upload-file-card__podcast-image-wrapper transition-all duration-300', highlightedClip === index ? 'bg-indigo-800' : 'bg-indigo-900']">
            <svg v-if="!asset.image_url" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M5.93147 3.66864C5.30663 3.0438 4.29357 3.0438 3.66873 3.66864C3.04389 4.29348 3.04389 5.30654 3.66873 5.93138L26.0687 28.3314C26.6936 28.9562 27.7066 28.9562 28.3315 28.3314C28.9563 27.7065 28.9563 26.6935 28.3315 26.0686L25.9744 23.7116C28.4345 21.7479 30.3025 19.0738 31.2679 16C29.2291 9.50862 23.1646 4.80001 16.0004 4.80001C13.4027 4.80001 10.9496 5.41908 8.78056 6.51773L5.93147 3.66864ZM12.7491 10.4863L15.1713 12.9085C15.4358 12.8377 15.7137 12.8 16.0005 12.8C17.7678 12.8 19.2005 14.2327 19.2005 16C19.2005 16.2868 19.1628 16.5647 19.092 16.8292L21.5142 19.2514C22.0774 18.2985 22.4005 17.187 22.4005 16C22.4005 12.4654 19.5351 9.60001 16.0005 9.60001C14.8135 9.60001 13.702 9.92316 12.7491 10.4863Z" fill="#6366F1"/>
                <path d="M19.9266 26.7147L15.5995 22.3877C12.3843 22.1889 9.81161 19.6162 9.61286 16.401L3.73597 10.5241C2.40111 12.1156 1.37029 13.9707 0.73291 16.0001C2.77175 22.4914 8.8362 27.2 16.0004 27.2C17.3551 27.2 18.6704 27.0317 19.9266 26.7147Z" fill="#6366F1"/>
            </svg>
          <img v-if="asset.image_url" :src="asset.image_url" alt="" class="h-full w-full object-cover" />
  
        </div>
        <div class="upload-file-card__project-actions absolute top-4 right-4 z-10">
            <Menu as="div" class="relative inline-block text-left">
                <div>
                    <MenuButton
                        class="flex items-center rounded-full bg-white text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <span class="sr-only">Open options</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                            class="w-5 h-5"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                            />
                        </svg>
                    </MenuButton>
                </div>

                <transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                >
                    <MenuItems
                        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                        <div class="py-1">
                            <MenuItem v-slot="{ active }">
                                <span @click="editClipByAssetId(asset.id,asset.title)"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    {{ t('Edit Clip') }}
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }"  >
                                <span
                                    @click="duplicateByClipId(asset.id)"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    {{ t('Duplicate') }}
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click="deleteClipByClipId(asset.id)"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    {{ t('Delete') }}
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
        </div>
    </div>
            <div
                :class="['upload-file-card__project-information']" 
                >
                <div @click="editClipByAssetId(asset.id, asset.title)">
                <p class="upload-file-card__file-name truncate-two-lines">{{ asset.title }}</p>
                <div class="text-gray-400 leading-5">
                    <!--<span
                    class="text-gray-400 font-normal text-xs"
                    > {{ mainStore.formatTime(asset.start_seconds) }} - {{ mainStore.formatTime(asset.end_seconds) }}</span
                    >
                    <span
                    class="text-gray-500 font-normal text-xs"
                    >&nbsp;•&nbsp;</span
                    >-->
                    <span class="text-gray-400 font-normal text-xs"
                    >{{ (asset.end_seconds - asset.start_seconds).toFixed(0) }} sec</span
                    >
                </div></div>
        </div>
    </div>    
    </div>
    <div v-if="!loader && assets.length === 0" class="font-base text-gray-700 text-center">No clips found.</div>
    <ClipEdit v-if="openEditClip && receivedMessage == ''" :clipId="clipsId"  :startFrom="start" :endTo="end" :title="clipTitle" :isClip="metaIsClip"   />
    <ModalsExportToClip :open="openExportToClipModal" @close="openExportToClipModal = false" :id="clipsId"  />
    <ModalsDelete  :open="isDelete" @close="closeDeletModal" :isDeleteClip="clipsId" @submit="refreshClipsLists" />
    <ModalsDuplicateClip :open="openDuplicateModal" @close="closeDuplicateModal" :clipId="clipsId"/>
</template>
<script setup>
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { useMainStore } from "~/store/main";
import emitter from '@/plugins/eventBus';
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});
const mainStore = useMainStore()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const props = defineProps(["media"]);
const isHovering = ref(false);
const assets = ref([])
const openEditClip = ref(false)
const clipsId = ref('')
const start = ref(0)
const end = ref(0)
const clipTitle = ref('')
const transcript  = ref([])
const receivedMessage = ref('');
const openExportToClipModal = ref(false)
const downloadModal = ref(false)
const isContinueApi =ref('')
const isDelete =ref(false)
const openDuplicateModal =ref(false)
const { params, query } = useRoute();
const loader = ref(false)
const metaIsClip = ref(false)
const highlightedClip = ref(null)

const highlightClip = (index) => {
    highlightedClip.value = index;
}
const unhighlightClip = () => {
    highlightedClip.value = null;
}

const handleTestEvent = (data) => {
  receivedMessage.value = data.message;
};

const handleExportModal = (data) => {
    if(data=='Close Export'){
        openExportToClipModal.value = false;
    }
};

const handleExecutionApi = (data) => {
  isContinueApi.value = data;
};

onUnmounted(() => {
  emitter.off('testEvent', handleTestEvent);
  emitter.off('stopApi', handleExecutionApi);
  emitter.off('closeExportModal', handleExportModal);
});

onMounted(async () => {
  getClipListsByJobId()
  emitter.on('testEvent', handleTestEvent);
  emitter.on('stopApi', handleExecutionApi);
  emitter.on('closeExportModal', handleExportModal);
});

watch(()=>assets.value, (a, b)=>{
    loader.value = false
})

watch(()=>isDelete.value,(a,b)=>{
    assets.value
})

const getClipListsByJobId=()=>{
    loader.value = true
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            }
    }).then(response => response.json())
    .then(data =>{
        transcript.value = data
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/media/${route.params.id}/clips/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
             if(data){
                loader.value = false
                assets.value = data
             }
        })
        .catch(error => {
            console.error('Error checking progress:', error);
        });
    })
} 

const editClipByAssetId =(id, title)=>{
    if (!localStorage.getItem('showClipPrompt')) {
        localStorage.setItem('showClipPrompt', 'true')
    }
    mainStore.clipTitleByClipId = title
    navigateTo(`/job/${route.params.id}/clip/${id}`);
}

const deleteClipByClipId=(id)=>{
    clipsId.value = id
    isDelete.value = true
}

const refreshClipsLists =()=>{
    getClipListsByJobId()
}

const duplicateByClipId =(id)=>{
    clipsId.value = id
    openDuplicateModal.value = true
}

const closeDeletModal =()=>{
    isDelete.value = false
}
const closeDuplicateModal =()=>{
    loader.value = true
    getClipListsByJobId()
    assets.value
    openDuplicateModal.value = false
}


</script>

<style lang="scss" scoped>
.upload-file-card {
    @apply relative flex flex-col border rounded-lg shadow p-4 pb-3 gap-4 overflow-hidden ;
    width: 245px;

    &__podcast-image-wrapper {
        @apply flex items-center justify-center w-full h-[245px] ;
    }
    &__project {
        &-information {
            @apply mr-auto flex-1;
        }
        &-name {
            @apply text-gray-500 text-xs font-medium ;
        }
        &-actions {
            @apply cursor-pointer ;
        }
    }
    &__file-name {
        @apply text-lg text-gray-900 font-semibold mb-2;
    }
    &__quick-actions {
        @apply text-xs leading-5 font-medium;
        .action {
            @apply text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer;
        }
    }
}
.truncate-two-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 3rem; /* Adjust based on your line-height and font-size */
  line-height: 1.5rem; /* Example line height */
  word-break: break-word; /* Force word break */
}
</style>
