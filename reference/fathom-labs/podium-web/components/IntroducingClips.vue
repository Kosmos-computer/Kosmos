<template>
    <div class="flex flex-col">
        <div class="relative flex flex-col w-full text-center items-center justify-center py-6 bg-indigo-200 rounded-lg mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_9836_3303)">
                    <path d="M9.7921 30.2222L9.6001 23.111H4.8001C3.0401 23.111 1.6001 21.511 1.6001 19.5555V5.33327C1.6001 3.37771 3.0401 1.77771 4.8001 1.77771H27.2001C28.9601 1.77771 30.4001 3.37771 30.4001 5.33327V19.5555C30.4001 21.511 28.9601 23.111 27.2001 23.111H18.4001L9.7921 30.2222Z" stroke="#4F46E5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19.728 11.2889L14.32 7.82222C13.568 7.34222 12.624 7.94666 12.624 8.90666V15.8578C12.624 16.8178 13.568 17.4222 14.32 16.9422L19.728 13.4755C20.48 12.9955 20.48 11.7867 19.728 11.3067V11.2889Z" fill="#4F46E5"/>
                </g>
                <defs>
                    <clipPath id="clip0_9836_3303">
                        <rect width="32" height="32" fill="white"/>
                    </clipPath>
                </defs>
            </svg>
            <h2 class="text-lg leading-6 mt-1 font-medium mt-2 text-gray-900">{{ t('Introducing Clips') }}</h2>
        </div>
        <div class="mt-2 mb-4">
            <div class="text-sm font-regular text-gray-600">
                <div class="mb-1">
                    We're excited to roll out our latest feature, Clips, that will significantly improve how you create and share your content.
                </div>
                <div class="mb-1 font-bold">
                    What's New?
                </div>
                <div class="mb-1">
                    <span class="font-bold">Create Engaging Clips:</span> Easily generate shareable clips from your podcast episodes. Podium will find shareable content for you, and you can also generate clips yourself by highlighting text in your transcript.
                </div>
                <div class="mb-1">
                    <span class="font-bold">Fully Customizable:</span> Tailor your clips with unique backgrounds, fonts, colors, and more to match your brand identity.
                </div>
                <div class="mb-1">
                    <span class="font-bold">Flexible Formatting:</span> Choose your desired aspect ratio to ensure your clips look great on any social media platform.
                </div>
                <div class="mb-1">
                    <span class="font-bold">Get Started:</span> Just go to the Clips section inside any of your existing files to find Podium’s suggested clips, and start creating ready to share clips within minutes.
                </div>
                <div class="italic">
                    Clips is currently in beta, and we're eager to hear your thoughts. Use it, test its limits, and let us know how it could be even better!
                </div>
            </div>
        </div>
        <div class="mt-4 pt-2 sm:mt-0 sm:flex sm:gap-x-3s">
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