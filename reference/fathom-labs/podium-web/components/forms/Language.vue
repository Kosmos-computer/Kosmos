<template>
    <div class="flex flex-col">
        <div class="mb-4">
            <h2 class="text-lg leading-6 font-medium mb-1 text-gray-900">{{ currentTranslations['Select Language'] }}</h2>
            <p class="text-sm font-regular text-gray-600">{{ currentTranslations['Please select your preferred language.'] }}</p>
        </div>
        <div class="my-scroll-area overflow-auto max-h-48 mb-4">
            <ul class="px-1 mt-2 w-full origin-top-right divide-y divide-gray-100 focus:outline-none">
                <li v-for="(language, index) in languages" :key="index">
                    <span @click="tempUpdateLanguage(language.code)" :class="['group flex justify-between items-center px-4 py-2 text-sm cursor-pointer', tempSelectedLanguage === language.code ? 'bg-gray-100 text-gray-900' : 'text-gray-700']">
                        {{ language.name }}
                        <span v-if="tempSelectedLanguage === language.code" class="selectedIcon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                            </svg>
                        </span>
                    </span>
                </li>
            </ul>
        </div>
        <div class="mt-4 pt-2 sm:mt-0 sm:flex sm:gap-x-3">
            <button type="button" class="btn btn-submit" @click="handleClose(true)">{{ currentTranslations['Save'] }}</button>
            <button type="button" class="btn btn-cancel" @click="handleClose(false)">{{ currentTranslations['Close'] }}</button>
        </div>
    </div>
</template>


<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import languageStore from '@/store/LanguageStore';
import translations from '@/assets/translations/FormsLanguage.json';

const languages = ref([
    { name: 'English', code: 'en' },
    { name: 'Español', code: 'es' },
    { name: 'Français', code: 'fr' },
    { name: 'Italiano', code: 'it' },
    { name: 'Português', code: 'pt' },
    { name: 'Deutsch', code: 'de' },
    { name: 'Русский', code: 'ru' },
    { name: 'العربية', code: 'ar' },
    { name: '中文', code: 'zh' },
    // Add more languages as needed
]);


const selectedLanguage = computed(() => languageStore.state.selectedLanguage);
const tempSelectedLanguage = ref(selectedLanguage.value); // Temporary local state

onMounted(() => {
  languageStore.methods.initializeLanguage();
  tempSelectedLanguage.value = selectedLanguage.value; // Initialize with current global state
});

const currentTranslations = computed(() => {
    return translations[tempSelectedLanguage.value];
});

const tempUpdateLanguage = (code) => {
  tempSelectedLanguage.value = code;
};

const emit = defineEmits(['close', 'updateLanguage']);

const handleClose = (saveChanges) => {
    if (saveChanges) {
        languageStore.methods.setLanguage(tempSelectedLanguage.value); // Update global state only on save
        emit('updateLanguage', tempSelectedLanguage.value);
    }
    emit('close');
};

</script>


<style lang="scss" scoped>

/* Targeting the scrollbar for all elements within this component */
.my-scroll-area::-webkit-scrollbar {
    width: 12px; /* width of the entire scrollbar */
}

.my-scroll-area::-webkit-scrollbar-track {
    background: #f0f0f0; /* color of the tracking area */
    border-radius: 8px;
}

.my-scroll-area::-webkit-scrollbar-thumb {
    background-color: #888; /* color of the scroll thumb */
    border-radius: 6px; /* roundness of the scroll thumb */
    border: 3px solid #f0f0f0; /* creates padding around scroll thumb */
}

.my-scroll-area::-webkit-scrollbar-thumb:hover {
    background: #555; /* color of the scroll thumb when hovered */
}

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