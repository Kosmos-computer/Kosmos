import {ref} from 'vue'
export const useAudioSystem = defineStore('audioSystem', () => {
  const currentClip = ref(null)
  const currentTime = ref(0)

  function playClip(clip) {
    currentClip.value = clip
  }

  function pauseCurrentClip() {
    currentClip.value = null
  }

  return { currentClip, currentTime, playClip, pauseCurrentClip }
})
