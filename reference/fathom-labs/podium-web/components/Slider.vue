<template>
  <div class="relative flex left-0 w-full pb-2">
    <div class="relative w-full">
      <div
          class="relative w-full h-8 cursor-pointer"
      >
        <div id="playbar__timeline"
          class="relative h-1 bg-gray-200 cursor-pointer rounded-full"
          style="top: 0.8rem;"
        >
          <div
            :style="{ width: '90%' }"
            class="h-1 mt-2 bg-indigo-700 rounded-full"
          ></div>
          <div
            :style="{ left: '94px' }"
            class="relative h-4 w-1 bg-indigo-700 bottom-2.5 rounded-full"
          >
        
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from "~/store/main"
import { useAudioSystem } from "~/store/audioSystem"
import { storeToRefs } from 'pinia'
const nuxtApp = useNuxtApp()

const mainStore = useMainStore()

</script>

<style scoped>
.absolute {
  transform: translateY(-50%);
}

.timecode {
  top: 4rem;
}

.gradient-overlay {
  position: absolute;
  top: -30px; /* Adjust this value for the height of the gradient */
  left: 0;
  width: 100%;
  height: 30px; /* Adjust this value for the height of the gradient */
  background-image: linear-gradient(to top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.scrub-time {
  transform: translateX(-50%) translateY(-100%);
}
</style>