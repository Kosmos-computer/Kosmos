<template>
  <div  class="flex flex-col w-full min-h-[calc(100vh - 69px)] min-w-[730px]">
    <div class="flex flex-col w-full pr-8 mx-auto max-w-6xl">
    <!--ClipsCard />-->
    <ClipsTile />
    </div>
  </div>
  <div v-if="!mainStore.isClipEdit" class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0"></div>
</template>
<script setup>
import { useMainStore } from "~/store/main";
 const mainStore = useMainStore()
</script>