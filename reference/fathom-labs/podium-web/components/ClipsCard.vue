<template>
    <ModalsClipDownload :open="downloadModal"  @close="downloadModal = false" />
    <h1 v-if="!openEditClip || receivedMessage !=''" class="text-2xl text-gray-900 font-semibold leading-8 mb-[17px] pt-8">{{ t('All Clips') }}</h1>
    <div  v-if="loader" class="m-auto pb-[30vh]" style="">
        <SvgLoadingMd />

    </div>
    <div class="pr-8 pb-20" v-if="!loader || receivedMessage !=''">
        <div 
        v-for="(asset, index) in assets"
        :key="index"
        :class="['upload-file-card hover:bg-gray-100 cursor-pointer']"
        @mouseover="isHovering = true"
        @mouseleave="isHovering = false"
    >
            <div
                class="upload-file-card__project-information pr-3" 
                >
                <div @click="editClipByAssetId(asset.id, asset.title)">
                <p class="upload-file-card__file-name">{{ asset.title }}</p>
                <p class="upload-file-card__project-name">"{{ getElementsWithinRange(asset.end_seconds,asset.start_seconds)}}"</p>
                <div class="text-gray-400 leading-5">
                    <span
                    class="text-gray-400 font-normal text-xs"
                    > {{ mainStore.formatTime(asset.start_seconds) }} - {{ mainStore.formatTime(asset.end_seconds) }}</span
                    >
                    <span
                    class="text-gray-500 font-normal text-xs"
                    >&nbsp;•&nbsp;</span
                    >
                    <span class="text-gray-400 font-normal text-xs"
                    >{{ (asset.end_seconds - asset.start_seconds).toFixed(0) }} sec</span
                    >
                </div></div>
                
            <div
                class="upload-file-card__quick-actions"
            >
                <span class="action mr-0" @click="editClipByAssetId(asset.id , asset.title)"
                    >{{ t('View') }}</span
                >
            </div>
        </div>
        <div class="upload-file-card__project-actions" >
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
                        <div class="py-1 border-b">
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
            <img v-if="asset.image_url" :src="asset.image_url" alt="" class="h-[140px] w-[140px] bg-gray-100 rounded-lg ml-3 object-cover" />
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

const renameClipId =(id, title)=>{
    clipTitle.value = title
    updatedClipId.value= id
    openRenameModal.value = true
}

const closeRenameModalUpdateClip =()=>{
    openRenameModal.value = false
}

const cancelRenameMOdal = ()=>{
    getClipListsByJobId()
    openRenameModal.value = false
}

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
const  getElementsWithinRange = ( end, start)=> {
        if(transcript.value){
            let result = '';
            let data = transcript.value.monologues
            data.forEach(speaker => {
                let filteredElements = speaker.elements.filter(element => {
                    return element.start >= start && element.end <= end;
                });
                if (filteredElements.length > 0) {
                    result+= (filteredElements.map(item => item.value)).join('');
                }
            });

            return truncateString(result);
        }
}

const truncateString = (str)=> {
    if (str.length > 470) {
        return str.substring(0, 470) + "...";
    } else {
        return str;
    }
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

const duplicateByClipId =(id)=>{
    clipsId.value = id
    openDuplicateModal.value = true
}

const closeDeletModal =()=>{
    isDelete.value = false
}
const cancelDeleteModal = ()=>{
    getClipListsByJobId()
    isDelete.value = false
}

const closeDuplicateModal =()=>{
    openDuplicateModal.value = false
}

const cancelDuplicateModal =()=>{
    getClipListsByJobId()
    openDuplicateModal.value = false
  }


</script>

<style lang="scss" scoped>
.upload-file-card {
    @apply flex border-t justify-between py-4;
    &:last-child {
        @apply border-b;
    }

    &__podcast-image-wrapper {
        @apply flex items-center justify-center w-16 h-16 rounded-lg;
    }
    &__project {
        &-information {
            @apply mr-auto flex-1 ml-0;
        }
        &-name {
            @apply text-gray-500 text-sm font-medium mb-2;
        }
        &-actions {
            @apply cursor-pointer px-0;
        }
    }
    &__file-name {
        @apply text-sm text-gray-900 font-medium pb-2 leading-5;
    }
    &__quick-actions {
        @apply text-sm leading-5 font-medium pt-2;
        .action {
            @apply text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer;
        }
    }
}
</style>
