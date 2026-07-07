<template>
  <div class="flex flex-col">
    <div v-if="mainStore.podiumPackages.length > 0">
      <div v-for="media in mainStore.media" :key="media.id" >
        <UploadFileCard :media="media"/>
      </div>
    </div>
    <div v-else class="flex flex-col items-center pt-36 mt-6">
      <SvgProjects />
      <span class="text-primary font-medium opacity-80 mt-3">
        {{ t("Your files will") }} <br/> {{ t("appear here.") }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useMainStore } from "~/store/main";
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore();

// TODO: Update the list in podium packages with a filter for the unsorted files
onBeforeMount(async () => {
  await mainStore.retrieveUserMedia();
})
</script>
