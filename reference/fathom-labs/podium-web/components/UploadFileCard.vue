<template>
    <div
        :class="['upload-file-card hover:bg-gray-100 cursor-pointer']"
        @mouseover="isHovering = true"
        @mouseleave="isHovering = false"
    >
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
            <SvgSpiritualIcon v-else-if="props.media.content_type === 'religious'" class="w-8 h-8" color="#4F46E5" />
            <SvgCalendarIcon v-else-if="props.media.content_type === 'meeting'" class="w-8 h-8" color="#4F46E5" />
            <SvgPhoneIcon v-else-if="props.media.content_type === 'customer_call'" class="w-8 h-8" color="#4F46E5" />
            <SvgMicrophoneIcon v-else class="w-8 h-8" color="#4F46E5" />
            </div>
        <div
            @click="viewPackage()"
            class="upload-file-card__project-information"
            v-if="podiumPackageStatus != null"
        >
            <p class="upload-file-card__project-name">{{ projectName }}</p>
            <p class="upload-file-card__file-name">{{ media.name }} </p>
            <div
                class="upload-file-card__quick-actions"
                v-if="podiumPackageStatus == 'Finished'"
            >
                <span class="action mr-3" @click.stop="viewPackage()"
                    >{{ t("View") }}</span
                >

                <span class="action mr-3" @click.stop="downloadFiles()"
                    >{{ t("Download Assets") }}</span
                >

                <span class="action mr-3" @click.stop="viewPackage('PodiumGPT')"
                    >PodiumGPT</span
                >

                <span class="action mr-3" @click.stop="viewPackage('Clips')"
                    >{{ t('Clips') }}
                    <span class="bg-indigo-600 text-white text-xs font-regular rounded-lg px-2">{{ t('New!') }}</span>
                </span>

                <span
                    v-if="mediaDuration != null"
                    class="text-gray-500 font-normal text-xs"
                    >{{ getFormatedDuration() }}</span
                >
                <span
                    v-if="mediaDuration != null"
                    class="text-gray-500 font-normal text-xs"
                    >&nbsp;•&nbsp;</span
                >
                <span class="text-gray-500 font-normal text-xs"
                    >{{ t("Updated") }} {{ getFormatedLocalDate() }}</span
                >
            </div>
            <div
                class="upload-file-card__quick-actions"
                v-if="podiumPackageStatus == 'Processing'"
            >
                <div class="flex align-top mt-1">
                    <div class="w-[240px] bg-gray-200 rounded-full h-[10px]">
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
                        class="mr-3 relative bottom-[2px] inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700"
                        >{{ t("Processing") }}</span
                    >
                    <span class="action mr-3" @click.stop="viewPackage()"
                        >{{ t("View") }}</span
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
                        >{{ t("Updated") }} {{ getFormatedLocalDate() }}</span
                    >
                </div>
            </div>
            <div
                class="upload-file-card__quick-actions"
                v-if="podiumPackageStatus == 'Insufficient Credits'"
            >
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
            <div
                class="upload-file-card__quick-actions"
                v-if="
                    podiumPackageStatus == 'Error' ||
                    podiumPackageStatus == 'Unknown Error'
                "
            >
                <span
                    v-if="podiumPackageStatus === 'Error'"
                    class="mr-3 relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                    >{{ props.media.processing_error_description }}</span
                >
                <span
                    v-if="podiumPackageStatus === 'Unknown Error'"
                    class="mr-3 relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                    >{{ t("Unknown Error") }}</span
                >
                <span class="action mr-3" @click.stop="deleteMedia()"
                    >{{ t("Remove") }}</span
                >
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
        <div class="upload-file-card__project-actions">
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
                            <MenuItem v-slot="{ active }">
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
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    @click="viewPackage('PodiumGPT')"
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
                                    @click="openModal = true"
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
                                    @click="openRenameModal = true"
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
                                    @click="openDeleteModal = true"
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
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
import { computed } from 'vue';
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
const closeOpenDownloadFilesModal = () => {
    openDownloadFilesModal.value = false;
    const doNotShowNoti = localStorage.getItem("doNotShowNoti");
    if (doNotShowNoti === "true") {
    } else {
        openAssetsDownloadFilesModal.value = true;
    }
};
const projectName = computed(() => {
    console.log()
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
    return moment(props.media.created_at).format("MMM Do YYYY");
};

const getFormatedDuration = () => {
    const duration = mediaDuration.value;

    if (duration == null) {
        return "";
    }

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    if (hours == 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
};

const downloadFiles = async () => {
    openDownloadFilesModal.value = true;
};

const viewPackage = (sidenav = null) => {
  mainStore.backToClip = false
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
    @apply flex border-b justify-between py-4;

    &__podcast-image-wrapper {
        @apply flex items-center justify-center w-16 h-16 rounded-lg;
    }
    &__project {
        &-information {
            @apply mr-auto flex-1 ml-3;
        }
        &-name {
            @apply text-gray-500 text-xs font-medium mb-2;
        }
        &-actions {
            @apply cursor-pointer px-3;
        }
    }
    &__file-name {
        @apply text-sm text-gray-900 font-medium pb-2;
    }
    &__quick-actions {
        @apply text-sm leading-5 font-medium;
        .action {
            @apply text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer;
        }
    }
}
</style>
