<template>
  <div @click="togglePlay" class="cursor-pointer focus:outline-none active:scale-[95%] outline-none transition-all duration-250">
    <SvgPauseButton :color="'#4338ca'" v-if="playing" />
    <SvgPlayButton :color="'#4338ca'" v-if="!playing" />
  </div>
</template>

<script setup>
import { useAudioSystem } from "~/store/audioSystem"
import { storeToRefs } from 'pinia'

const audioSystem = useAudioSystem();
const { currentClip } = storeToRefs(audioSystem)
const props = defineProps(['clip'])
const playing = ref(false)
watch(currentClip, () => {
  if (currentClip.value == null) {
    playing.value = false
  } else {
    if (currentClip.value.start != props.clip?.start || currentClip.value.end != props.clip?.end) {
      playing.value = false
    }
  }
})

const togglePlay = () => {
  if (playing.value == false) {
    audioSystem.playClip(props.clip)
    playing.value = true
  } else {
    audioSystem.pauseCurrentClip()
    playing.value = false
  }
}
</script>
