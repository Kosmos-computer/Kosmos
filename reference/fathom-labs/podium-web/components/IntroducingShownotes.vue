<template>
    <div class="flex flex-col">
        <div class="relative flex flex-col w-full text-center items-center justify-center py-6 bg-gradient-to-tr from-indigo-100 to-indigo-300 rounded-lg mb-2">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_5390_2947)">
                    <g clip-path="url(#clip1_5390_2947)">
                        <path d="M17 14.4499V17.1699C17 18.3399 16.06 19.2799 14.89 19.2799H5C3.9 19.2799 3 18.3799 3 17.2799V7.06995C3 5.96995 3.9 5.06995 5 5.06995H10.47" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9.65039 10.6701L15.7104 4.60005C16.5204 3.79005 17.8204 3.79005 18.6304 4.60005C19.4404 5.41005 19.4404 6.71005 18.6304 7.52005L12.5704 13.5801" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9.65031 10.67L8.07031 15.17L12.5703 13.59" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                </g>
                <defs>
                    <clipPath id="clip0_5390_2947">
                        <rect width="18.24" height="17.28" fill="white" transform="translate(2 3)"/>
                    </clipPath>
                    <clipPath id="clip1_5390_2947">
                        <rect width="18.24" height="17.28" fill="white" transform="translate(2 3)"/>
                    </clipPath>
                </defs>
            </svg>
            <h2 class="text-lg leading-6 mt-2 font-medium mt-2 text-gray-900">{{ t('Show Notes Have Changed') }}</h2>
        </div>
        <div class="mt-2 mb-4">
            <div class="text-base font-regular text-gray-600">
                <div class="mb-1 text-lg font-bold">
                    Welcome to the new and improved show notes!
                </div>
                <div class="mb-2">
                    Your show notes are now <span class="font-bold">fully editable, customizable,</span> and even <span class="font-bold">automated</span>. On the right, you'll find Podium-generated content that you can add instantly. You can also create <span class="font-bold">custom blocks</span>—whether static (like links and intros) or dynamic (AI-powered content tailored to each episode).
                </div>
                <div class="mb-2">
                    Once you're happy with your setup, <span class="font-bold">save it as a template</span>, and Podium will <span class="font-bold">automatically apply</span> it to future uploads.
                </div>
                <div class="mb-2 font-bold">
                    Get started and make your show notes work your way!
                </div>
            </div>
        </div>
        <div class="mt-2 pt-2 sm:mt-0 sm:flex sm:gap-x-3s">
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Close') }}</button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


    const emit = defineEmits(['close'])

    const handleClose = () => {
        emit('close')
    }
    
    
</script>
<style lang="scss" scoped>

.btn {
    @apply
    mt-3
    inline-flex
    w-full
    justify-center
    rounded-md
    px-3 py-2.5
    text-sm
    font-medium
    shadow-sm
    ring-1
    ring-inset
    sm:col-start-1
    sm:mt-0;
    
    &-submit {
        @apply
        bg-indigo-700
        ring-indigo-700
        text-white
        hover:bg-indigo-600
        hover:ring-indigo-600
    }
    &-cancel {
        @apply
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
    &-change {
        @apply
        w-auto
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
}
</style>