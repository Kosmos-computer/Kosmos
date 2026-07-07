<template>
    <ModalsTemplate :open="props.open" @close="handleClose">
        <div>
            <div class="text-center">
                <div class="flex items-center justify-center mb-[10px]">
                    <img :src="clips_icon" alt="Upload Icon" class="text-center"/>
                </div>
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">{{ t('Clips are in Beta') }}</DialogTitle>
              <div class="mt-4">
                <p class="text-sm text-gray-500 mb-2 text-left">
                    {{ t("As this is a beta release, you might encounter some rough edges or features that aren't fully polished yet. Here’s what you need to know:") }}
                </p>
              </div>
            </div>
            <div class="mb-2">
                <p class="text-sm text-gray-500"><span class="text-sm font-bold text-gray-500">{{ t('Beta Phase:') }}</span> {{ t('Some features are under ongoing development and may not yet deliver optimal performance.') }}</p>
            </div>
            <div class="mb-2">
                <p class="text-sm text-gray-500"><span class="text-sm font-bold text-gray-500">{{ t('We Need Your Feedback:') }}</span> {{ t('Please let us know what you like, what could be improved, and how the Clips feature is working for you. Your feedback will directly influence the enhancements we make.') }}</p>
            </div>
            <div class="mb-2">
               
                <p class="text-sm text-gray-500"><span class="text-sm font-bold text-gray-500">{{ t('Continuous Updates:') }}</span> {{ t('Expect regular updates and improvements aimed at providing a smoother experience with each iteration.') }}</p>
            </div>

            <p class="text-sm text-gray-500 mb-4 italic">
                {{ t('Disclaimer: During the beta phase, you have unlimited access to Clips. However, please note that after the official release, access might get limited based on your subscription status.') }}
            </p>

            <div class="flex items-center mb-4">
                <input
                    v-model="doNotShow"
                    id="dont-show"
                    type="checkbox"
                    class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                >
                <label for="dont-show" class="text-sm leading-6 text-gray-900 pl-1 ml-2">{{ t('Do not show again') }}</label>
            </div>

            <button class="w-full bg-indigo-600 text-white text-sm font-semibold py-[9px] rounded-md" @click="handleClose">{{ t('Continue') }}</button>
      </div>
    </ModalsTemplate>
</template>

<script setup lang="ts">
import { DialogTitle } from '@headlessui/vue'
import { useMainStore } from "~/store/main"
import { storeToRefs } from 'pinia'

import clips_icon from '@/assets/icons/clips_icon.svg'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()

interface PropsType {
    open: boolean
}

const props = withDefaults(defineProps<PropsType>(), {
    open: false
})
const emit = defineEmits(['close'])
const doNotShow = ref(false)

const handleClose = () => {
    console.log('closing')
    emit('close')
    doNotShowNotAgain()
}

const doNotShowNotAgain=()=>{
    localStorage.setItem('showClipPrompt', `${!doNotShow.value}`)
}
</script>