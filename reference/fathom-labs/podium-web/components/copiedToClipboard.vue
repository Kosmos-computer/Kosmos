<template>
  <div class="fixed z-50 h-10 border-2 border-indigo-200 bg-white rounded-lg shadow-md flex items-center justify-between px-2" :style="{ top: `${position.top}px`, left: `${position.left}px` }">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#4F46E5"/>
            <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#4F46E5"/>
    </svg>
    <div class="text-sm font-regular text-indigo-600 ml-2">
      {{ t('Copied to clipboard!') }}
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect, computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const props = defineProps({
  position: {
    type: Object,
    default: () => ({ top: 0, left: 0 })
  },
  visible: Boolean
});

watchEffect(() => {
  if (props.visible) {
    setTimeout(() => {
      props.visible = false;
    }, 2000); // Hide after 2 seconds
  }
});
</script>