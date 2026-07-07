<template>
    <div
        :class="['upload-file-card', 'hover:bg-gray-100', 'cursor-pointer', 'transition-colors', 'duration-300', 'ease-in-out']"
        @mouseover="isHovering = true"
        @mouseleave="isHovering = false"
        @click="viewPackage()"
    >
        <div class="flex w-full justify-between">
            <div class="upload-file-card__podcast-image-wrapper bg-indigo-200" v-if="props.media.image_url || projectImage && (props.media.image_url != null && projectImage != null)" >
                <img  @click="viewPackage()" class="rounded-lg w-full h-full object-cover" :src="props.media.image_url ? props.media.image_url : projectImage">
             </div>
            <div
            v-else
                @click="viewPackage()"
                :class="[
                    'upload-file-card__podcast-image-wrapper bg-indigo-200'
                ]"
            >
            <SvgPlayIcon v-if="props.media.content_type === 'video'" class="w-8 h-8" color="#4F46E5" />
            <SvgCapIcon v-else-if="props.media.content_type === 'educational'" class="w-8 h-8" color="#4F46E5" />
            <SvgSpiritualIcon v-else-if="props.media.content_type === 'spiritual'" class="w-8 h-8" color="#4F46E5" />
            <SvgCalendarIcon v-else-if="props.media.content_type === 'meeting'" class="w-8 h-8" color="#4F46E5" />
            <SvgPhoneIcon v-else-if="props.media.content_type === 'customer_call'" class="w-8 h-8" color="#4F46E5" />
            <SvgMicrophoneIcon v-else class="w-8 h-8" color="#4F46E5" />
            </div>

            <div class="flex w-16 h-16" @click="viewPackage()"></div>
            <div class="upload-file-card__project-actions">
            <Menu as="div" class="relative inline-block text-left">
                <div>
                    <MenuButton
                        @click.stop
                        class="flex items-center rounded-full bg-white text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <span class="sr-only">Open options</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="w-6 h-6"
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
                            <!--<MenuItem v-slot="{ active }">
                                <span
                                    @click="viewPackage()"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                {{ t("View File") }}
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click="downloadFiles()"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                {{ t("Download Assets") }}
                                </span>
                            </MenuItem>-->
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click.stop="viewPackage('PodiumGPT')"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    PodiumGPT
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click.stop="openModal = true"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                {{ t("Move File") }}
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click.stop="openRenameModal = true"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                {{ t("Rename File") }}
                                </span>
                            </MenuItem>
                        </div>
                        <div class="py-1">
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click.stop="openDeleteModal = true"
                                    :class="[
                                        active
                                            ? 'bg-red-100 text-red-900'
                                            : 'text-red-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                {{ t("Delete") }}
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
            </div>
        </div>
        <div
            @click="viewPackage()"
            class="upload-file-card__project-information"
            v-if="podiumPackageStatus != null"
        >
            <p class="upload-file-card__project-name">{{ projectName }}</p>
            <!--<p class="upload-file-card__file-name truncate-two-lines">{{ media.name }}</p>-->
            <p ref="textElement" class="upload-file-card__file-name truncate-two-lines">{{ adjustedText }}</p>
            <div class="upload-file-card__quick-actions" v-if="podiumPackageStatus == 'Finished'" >
                <div class="flex flex-col w-full mb-2">
                  <div class="flex flex-row items-center space-x-1 mb-2"> 
                    <SvgPlayIcon v-if="props.media.content_type === 'video'" class="w-3 h-3" color="#4F46E5" />
                    <SvgCapIcon v-else-if="props.media.content_type === 'educational'" class="w-3 h-3" color="#4F46E5" />
                    <SvgSpiritualIcon v-else-if="props.media.content_type === 'spiritual'" class="w-3 h-3" color="#4F46E5" />
                    <SvgCalendarIcon v-else-if="props.media.content_type === 'meeting'" class="w-3 h-3" color="#4F46E5" />
                    <SvgPhoneIcon v-else-if="props.media.content_type === 'customer_call'" class="w-3 h-3" color="#4F46E5" />
                    <SvgMicrophoneIcon v-else class="w-3 h-3" color="#4F46E5" />
                    <span
                        v-if="mediaDuration != null"
                        class="text-indigo-600 font-normal text-xs"
                        > {{ t(capitalizeFirstLetter(props.media.content_type && props.media.content_type !== '' ? props.media.content_type : 'podcast')) }}</span
                    >
                  </div>
                  <div class="flex flex-row items-center space-x-2">
                    <div class="flex flex-row items-center space-x-1">  
                    <SvgAudioIcon class="w-3 h-3" />
                    <span
                        v-if="mediaDuration != null"
                        class="text-gray-500 font-normal text-xs"
                        >{{ t('Audio') }}</span
                    >
                    </div>
                    <div class="flex flex-row items-center space-x-1">  
                    <SvgClockIcon />
                    <span
                        v-if="mediaDuration != null"
                        class="text-gray-500 font-normal text-xs"
                        >{{ getFormatedDuration() }}</span
                    >
                    </div>
                  </div>
                </div>
                <span class="text-gray-500 font-normal text-xs"
                    >{{ t("Updated") }} {{ getFormatedLocalDate() }}</span
                >
            </div>
            <div class="upload-file-card__quick-actions" v-if="podiumPackageStatus == 'Processing'" >
                <div class="flex align-top">
                    <div class="w-[212px] mt-4 flex bg-gray-200 rounded-full h-[10px]">
                        <div
                            class="bg-indigo-600 h-[10px] rounded-full animate motion-safe:animate-pulse duration-100"
                            :style="{
                                width: `${percentageProcessingComplete}%`,
                            }"
                        ></div>
                    </div>
                </div>

                <div class="mt-4 flex">
                    <span
                        class="mr-3 relative h-6 bottom-[2px] inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700"
                        >{{ t("Processing") }}</span
                    >
                    <!--<span class="action mr-3" @click.stop="viewPackage()"
                        >View</span
                    >
                    <span
                        v-if="mediaDuration != null"
                        class="text-gray-500 font-normal text-xs relative top-[3px]"
                        >{{ getFormatedDuration() }}</span
                    >
                    <span
                        v-if="mediaDuration != null"
                        class="text-gray-500 font-normal text-xs relative top-[3px]"
                        >&nbsp;•&nbsp;</span
                    >
                    <span
                        class="text-gray-500 font-normal text-xs relative top-[3px]"
                        >Last updated {{ getFormatedLocalDate() }}</span
                    >-->
                </div>
            </div>
            <div class="upload-file-card__quick-actions" v-if="podiumPackageStatus == 'Insufficient Credits'" >
                <span
                    class="mr-3 relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                    >{{ podiumPackageStatus }}</span
                >
                <span class="action mr-3" @click.stop="navigateToPricing()"
                    >Purchase Credits</span
                >
                <span class="action mr-3" @click.stop="deleteMedia()"
                    >Remove</span
                >
            </div>
            <div class="upload-file-card__quick-actions" v-if="podiumPackageStatus == 'Error' || podiumPackageStatus == 'Unknown Error'" >
                <div class="flex felx-row items-center space-x-2 mt-6 mb-3">
                <span
                    v-if="podiumPackageStatus === 'Error'"
                    class="relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                    >{{ props.media.processing_error_description }}</span
                >
                <span
                    v-if="podiumPackageStatus === 'Unknown Error'"
                    class="relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-regular text-red-700"
                    >{{ t("Unknown Error") }}</span
                >
                <span class="action mr-3" @click.stop="deleteMedia()"
                    >{{ t("Remove") }}</span
                >
                </div>
                <span
                    v-if="mediaDuration != null"
                    class="text-gray-500 font-normal text-xs relative top-[0px]"
                    >{{ getFormatedDuration() }}</span
                >
                <span
                    v-if="mediaDuration != null"
                    class="text-gray-500 font-normal text-xs relative top-[0px]"
                    >&nbsp;•&nbsp;</span
                >
                <span
                    class="text-gray-500 font-normal text-xs relative top-[0px]"
                    >{{ t("Updated") }} {{ getFormatedLocalDate() }}</span
                >
            </div>
        </div>
        <div
          v-if="podiumPackageStatus == 'Finished'"
          :class="[
            'absolute inset-x-0 bottom-0 h-1/3 bg-black bg-opacity-50 flex items-center justify-center transition-all duration-300',
            isHovering ? 'translate-y-0 opacity-100 fade-in duration-150' : 'translate-y-full opacity-0'
          ]"
        >
          <!-- Your hover controls -->
          <button @click.stop="viewPackage()" class="bg-white border-r border-gray-100 p-2 text-xs text-gray-400 w-full h-full hover:bg-gray-50 flex flex-col items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2.45825 12C3.73253 7.94288 7.52281 5 12.0004 5C16.4781 5 20.2684 7.94291 21.5426 12C20.2684 16.0571 16.4781 19 12.0005 19C7.52281 19 3.73251 16.0571 2.45825 12Z" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-xs mt-1">{{ t('View') }}</span>
          </button>
          <button @click.stop="downloadFiles()" class="bg-white border-r border-gray-100 p-2 text-xs text-gray-400 w-full h-full hover:bg-gray-50 flex flex-col items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 12L12 16M12 16L8 12M12 16L12 4" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-xs mt-1">{{ t('Download') }}</span>
          </button>
          <button @click.stop="viewPackage('Clips')" class="bg-white p-2 text-xs text-gray-400 w-full h-full hover:bg-gray-50 flex flex-col items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_9942_3569)">
                    <path d="M8.5079 20L8.3999 16H5.6999C4.7099 16 3.8999 15.1 3.8999 14V6C3.8999 4.9 4.7099 4 5.6999 4H18.2999C19.2899 4 20.0999 4.9 20.0999 6V14C20.0999 15.1 19.2899 16 18.2999 16H13.3499L8.5079 20Z" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14.0971 9.35002L11.0551 7.40002C10.6321 7.13002 10.1011 7.47002 10.1011 8.01002V11.92C10.1011 12.46 10.6321 12.8 11.0551 12.53L14.0971 10.58C14.5201 10.31 14.5201 9.63002 14.0971 9.36002V9.35002Z" fill="#4F46E5"/>
                </g>
                <defs>
                    <clipPath id="clip0_9942_3569">
                        <rect width="18" height="18" fill="white" transform="translate(3 3)"/>
                    </clipPath>
                </defs>
            </svg>
            <span class="text-xs mt-1">{{ t('Clips') }}</span>
          </button>
        </div>
        <ModalsMoveFile
            :media-id="props.media.id"
            :open="openModal"
            @close="openModal = false"
        />
        <ModalsRenameFile
            :name="fileName"
            :media-id="props.media.id"
            :open="openRenameModal"
            @close="openRenameModal = false"
        />
        <ModalsDelete
            :open="openDeleteModal"
            @close="openDeleteModal = false"
            :media="props.media"
        />
        <ModalsDownloadFiles
            :media="props.media"
            :open="openDownloadFilesModal"
            @close="closeOpenDownloadFilesModal"
        />
        <ModalsAssetsDownloadFiles
            :open="openAssetsDownloadFilesModal"
            @close="openAssetsDownloadFilesModal = false"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import moment from "moment";
import podiumGetPodiumPackageCard from "@/apollo/queries/podiumGetPodiumPackageCard.gql";
import podiumGetPodiumPackageUrl from "@/apollo/queries/podiumGetPodiumPackageUrl.gql";
import { useMainStore } from "~/store/main";
import { storeToRefs } from "pinia";
import useNotification from "~/composables/useNotification";
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const runtimeConfig = useRuntimeConfig();

const props = defineProps(["media"]);
const { showSuccess } = useNotification();
const mainStore = useMainStore();
const mainStoreState = storeToRefs(mainStore);
const openModal = ref(false);
const openDeleteModal = ref(false);
const openDownloadFilesModal = ref(false);
const openAssetsDownloadFilesModal = ref(false);
const percentageProcessingComplete = ref(0);
const podiumPackageStatus = ref(null);
const mediaDuration = ref(null);
const isHovering = ref(false);
const isUnmounted = ref(false);
var progressUpdater = null;
const openRenameModal = ref(false);

const textElement = ref(null);

const adjustedText = computed(() => {
  if (!textElement.value) return props.media.name;
  const containerWidth = textElement.value.offsetWidth;
  let text = props.media.name;
  textElement.value.textContent = text;

  // Check if text overflow is happening
  while (textElement.value.scrollWidth > containerWidth && text.length > 0) {
    text = text.slice(0, -1); // Shorten text progressively
    textElement.value.textContent = text + '...';
  }

  return text + (text.length < props.media.name.length ? '...' : '');
});

onMounted(() => {
  // Trigger computation initially
  adjustedText.value;
});

watch(() => props.media.name, () => {
  // Re-compute when media.name changes
  adjustedText.value;
});


onMounted(async () => {
    podiumPackageStatus.value = determinePodiumPackageStatus(props.media);
    mediaDuration.value = props.media.duration;
    if (podiumPackageStatus.value == "Processing") {
        updateProgress();
    }
});

onBeforeUnmount(() => {
    isUnmounted.value = true;
});

function capitalizeFirstLetter(string) {
  if (!string) return ''; // Return empty if the string is empty
  return string
  .split('_')                // Split string by underscores
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter of each word
  .join(' ');   
}
const closeOpenDownloadFilesModal = () => {
    openDownloadFilesModal.value = false;
    const doNotShowNoti = localStorage.getItem("doNotShowNoti");
    if (doNotShowNoti === "true") {
    } else {
        openAssetsDownloadFilesModal.value = true;
    }
};
const projectName = computed(() => {
    if (props.media.project_id != null) {
        if (mainStoreState.projects.value.length > 0) {
            const project = mainStoreState.projects.value.find(
                (project) => project.id == props.media.project_id,
            );
            if (project != null) {
                return project.name;
            }
        }
    }
    return t.value('Unsorted');
});

const projectImage = computed(() => {
    if (props.media.project_id != null) {
        if (mainStoreState.projects.value.length > 0) {
            const project = mainStoreState.projects.value.find(
                (project) => project.id == props.media.project_id,
            );
            if (project != null) {
                return project.image_url;
            }
        }
    }
});

const fileName = computed(() => {
    return props.media?.name;
});

function navigateToPricing() {
    window.location.href = "https://hello.podium.page/pricing?logged_in=true";
}

const totalCredits = computed(() => {
    var credits = Math.round(
        mainStore.user?.current_subscription_credits_balance +
            mainStore.user?.additional_credits_balance,
    );
    if (credits < 0) {
        credits = 0;
    }

    return credits;
});

const updateProgress = () => {
    fetch(
        `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.media.id}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
            },
        },
    )
        .then((response) => response.json())
        .then((data) => {
            var progress = determineProgress(data) + 10;
            if (progress > 100) {
                progress = 100;
            }
            percentageProcessingComplete.value = progress;

            podiumPackageStatus.value = determinePodiumPackageStatus(data);
            mediaDuration.value = data.duration;
            if (
                podiumPackageStatus.value == "Processing" &&
                !isUnmounted.value
            ) {
                if (progressUpdater) {
                    clearTimeout(progressUpdater);
                    progressUpdater = null;
                }
                progressUpdater = setTimeout(updateProgress, 5000);
            } else if (!isUnmounted.value) {
                mainStore.retrieveUser(null);
            }
        });
};

const determineProgress = (media) => {
    let totalTasks = media.processing_tasks.length;
    let completedTasks = media.processing_tasks.filter(
        (task) => task.completed,
    ).length;
    let completionPercentage = (completedTasks / totalTasks) * 100;
    return completionPercentage;
};

const determinePodiumPackageStatus = (media) => {
    if (totalCredits === 0) {
        return "Insufficient Credits";
    }
    if (media.processing_completed) {
        return "Finished";
    } else if (media.processing_error) {
        if (
            media.processing_error_description == null ||
            media.processing_error_description == "" ||
            media.processing_error_description == "Unknown"
        ) {
            return "Unknown Error";
        } else {
            return "Error";
        }
    } else {
        return "Processing";
    }
};

const getFormatedLocalDate = () => {
    return moment(props.media.created_at).format("MMM DD YYYY");
};

const getFormatedDuration = () => {
    const duration = mediaDuration.value;

    if (duration == null) {
        return "";
    }

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const minutesUp = Math.ceil((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    if (hours == 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${hours}h ${minutesUp}m`;
    }
};

const downloadFiles = async () => {
    openDownloadFilesModal.value = true;
};

const viewPackage = (sidenav = null) => {
    if(sidenav == 'Clips'){
        localStorage.setItem('stayClipCards', 'true')
    }else{
        localStorage.setItem('stayClipCards', 'false')
    }
    if(sidenav == 'Summary'){
        localStorage.setItem('stayShowNotes', 'true')
    }else{
        localStorage.setItem('stayShowNotes', 'false')
    }
    if (sidenav) {
        mainStore.currentMediaSideNavSelection = sidenav;
        navigateTo(`/job/${props.media.id}`);
    } else {
        navigateTo(`/job/${props.media.id}`);
    }
};

const deleteMedia = () => {
    fetch(
        `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.media.id}/delete`,
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
            },
            body: JSON.stringify({}),
        },
    )
        .then((response) => response.json())
        .then((data) => {
            //delete project from mainStore.projects
            mainStoreState.projectMedia.value =
                mainStoreState.projectMedia.value.filter(
                    (media) => media.id != props.media.id,
                );
            mainStoreState.media.value = mainStoreState.media.value.filter(
                (media) => media.id != props.media.id,
            );
        });
};
</script>
<style lang="scss" scoped>
.upload-file-card {
    @apply relative flex flex-col border rounded-lg shadow p-4 pb-3 gap-4 overflow-hidden ;
    width: 245px;

    &__podcast-image-wrapper {
        @apply flex items-center justify-center w-16 h-16 rounded-lg;
    }
    &__project {
        &-information {
            @apply mr-auto flex-1;
        }
        &-name {
            @apply text-gray-500 text-xs font-medium mb-2;
        }
        &-actions {
            @apply cursor-pointer ;
        }
    }
    &__file-name {
        @apply text-lg text-gray-900 font-semibold mb-3;
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
