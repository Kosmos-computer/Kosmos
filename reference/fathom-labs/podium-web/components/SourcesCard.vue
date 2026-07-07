<template>
    <div
        :class="['upload-file-card hover:bg-gray-100 cursor-pointer']"
        @mouseover="isHovering = true"
        @mouseleave="isHovering = false"
    >
    <div
            :class="[
                'upload-file-card__podcast-image-wrapper ml-3',
                isHovering ? 'bg-gray-50' : 'bg-gray-100',
            ]"
        >
            <svg
                width="16"
                height="20"
                viewBox="0 0 16 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M0.800049 2.79999C0.800049 1.47451 1.87457 0.399994 3.20005 0.399994H8.70299C9.33951 0.399994 9.94996 0.65285 10.4 1.10294L14.4971 5.19999C14.9472 5.65008 15.2 6.26053 15.2 6.89705V17.2C15.2 18.5255 14.1255 19.6 12.8 19.6H3.20005C1.87456 19.6 0.800049 18.5255 0.800049 17.2V2.79999ZM3.20005 9.99999C3.20005 9.33725 3.73731 8.79999 4.40005 8.79999H11.6C12.2628 8.79999 12.8 9.33725 12.8 9.99999C12.8 10.6627 12.2628 11.2 11.6 11.2H4.40005C3.73731 11.2 3.20005 10.6627 3.20005 9.99999ZM4.40005 13.6C3.73731 13.6 3.20005 14.1373 3.20005 14.8C3.20005 15.4627 3.73731 16 4.40005 16H11.6C12.2628 16 12.8 15.4627 12.8 14.8C12.8 14.1373 12.2628 13.6 11.6 13.6H4.40005Z"
                    fill="#6B7280"
                />
            </svg>
        </div>
        <div
            class="upload-file-card__project-information"
        >
            
            <p class="upload-file-card__project-name">Unsorted</p>
            <p class="upload-file-card__file-name">The Best Podcast</p>
            
            
                
            <div
                class="upload-file-card__quick-actions"
            >
                <span class="action mr-2"
                    >View</span
                >
                
                <span
                    class="text-gray-500 font-normal text-xs mr-2"
                    >&nbsp;•&nbsp;</span
                >

                <span class="action mr-2"
                    >Download</span
                >

                <span
                    class="text-gray-500 font-normal text-xs mr-2"
                    >&nbsp;•&nbsp;</span
                >

                <span
                    class="text-gray-500 font-normal text-xs"
                    >Last Updated Mar 1 2023</span
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
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    Edit Clip
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    Download
                                </span>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <span
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    Duplicate
                                </span>
                            </MenuItem>
                            <!-- <MenuItem v-slot="{ active }">
                                <span
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    Export
                                </span>
                            </MenuItem> -->
                            <MenuItem v-slot="{ active }">
                                <span
                                    :class="[
                                        active
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-700',
                                        'block px-4 py-2 text-sm',
                                    ]"
                                >
                                    Delete
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
        </div>
    </div>
</template>

<script setup>
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import moment from "moment";
import podiumGetPodiumPackageCard from "@/apollo/queries/podiumGetPodiumPackageCard.gql";
import podiumGetPodiumPackageUrl from "@/apollo/queries/podiumGetPodiumPackageUrl.gql";
import { useMainStore } from "~/store/main";
import { storeToRefs } from "pinia";
import useNotification from "~/composables/useNotification";
const runtimeConfig = useRuntimeConfig();


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
            @apply text-gray-500 text-sm font-medium mb-2;
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
