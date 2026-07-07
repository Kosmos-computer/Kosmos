<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 mx-auto max-w-6xl">
    <div class="flex flex-row mb-4">
      <h1 class="text-2xl text-gray-900 font-semibold leading-8">{{ t('Transcript') }}</h1>
      <div v-if="!currentMediaTranscriptLoading && showTranscript" class="flex flex-grow place-content-end gap-2 mr-6">
        <div @click="openTutorial = true" class="flex text-sm font-regular text-gray-500 mx-2 my-2 items-center space-x-2 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12" y2="17"></line>
          </svg>
        </div>
        <ModalsTranscriptTutorial class="relative z-9999" :open="openTutorial" @close="handleClose" />
        <div @click="openFindModel"
          class="flex flex-row mr-1 items-center w-fit bg-white pl-3 pr-3 h-10 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap">
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16.3169 15.3081L10.9262 10.0425C11.7525 9.02189 12.25 7.725 12.25 6.31251C12.25 3.03876 9.58623 0.375 6.31248 0.375C3.03873 0.375 0.375 3.03873 0.375 6.31248C0.375 9.58623 3.03876 12.25 6.31251 12.25C7.725 12.25 9.02188 11.7525 10.0425 10.9262L15.4331 16.1919C15.555 16.3137 15.715 16.375 15.875 16.375C16.035 16.375 16.195 16.3137 16.3169 16.1919C16.5613 15.9475 16.5613 15.5525 16.3169 15.3081ZM6.31251 11C3.7275 11 1.62501 8.89749 1.62501 6.31248C1.62501 3.72747 3.7275 1.62498 6.31251 1.62498C8.89752 1.62498 11 3.72747 11 6.31248C11 8.89749 8.89749 11 6.31251 11Z"
              fill="#6B7280" />
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M0 6.31248C0 2.83162 2.83162 0 6.31248 0C9.79334 0 12.625 2.83165 12.625 6.31251C12.625 7.69184 12.1786 8.96761 11.4261 10.0065L16.582 15.0429C16.9729 15.4337 16.9729 16.0662 16.5821 16.457C16.3872 16.6519 16.1307 16.75 15.875 16.75C15.6201 16.75 15.3643 16.6525 15.1696 16.4587L15.168 16.457L10.0128 11.4215C8.97279 12.1768 7.69464 12.625 6.31251 12.625C2.83165 12.625 0 9.79334 0 6.31248ZM6.31248 0.75C3.24584 0.75 0.75 3.24584 0.75 6.31248C0.75 9.37912 3.24587 11.875 6.31251 11.875C7.63526 11.875 8.84964 11.4095 9.80654 10.6348L10.0659 10.4248L15.6983 15.9267C15.7472 15.9756 15.8106 16 15.875 16C15.9394 16 16.0028 15.9756 16.0517 15.9267C16.1492 15.8292 16.1496 15.6725 16.0529 15.5745L10.4198 10.0721L10.6348 9.80654C11.4095 8.84964 11.875 7.63526 11.875 6.31251C11.875 3.24587 9.37912 0.75 6.31248 0.75ZM6.31251 1.99998C3.93461 1.99998 2.00001 3.93458 2.00001 6.31248C2.00001 8.69038 3.93461 10.625 6.31251 10.625C8.69038 10.625 10.625 8.69038 10.625 6.31248C10.625 3.93458 8.69041 1.99998 6.31251 1.99998ZM1.25001 6.31248C1.25001 3.52036 3.52039 1.24998 6.31251 1.24998C9.10463 1.24998 11.375 3.52036 11.375 6.31248C11.375 9.1046 9.1046 11.375 6.31251 11.375C3.52039 11.375 1.25001 9.1046 1.25001 6.31248Z"
              fill="#6B7280" />
          </svg>
        </div>
        <FindModal v-if="openFindModal" @close="openFindModal = false" :transcriptContent="transcriptContent"
            />
        <div @click="showSpeakers()"
          class="flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 h-10 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap">
          <SvgSpeakersIcon class="scale-75 ml-1 mr-2" />
          <span class="text-sm font-medium leading-5 text-gray-700">{{ t('Speaker Names') }}</span>
        </div>
        <div @click="copyTranscript()"
          class="flex flex-row mr-1 items-center w-fit bg-white pl-2 pr-4 h-10 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap">
          <div class="pr-2 pl-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z"
                fill="#6B7280" />
              <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z"
                fill="#6B7280" />
            </svg>
          </div>
          <div class="text-sm font-medium leading-5 text-gray-700">
            <span v-if="!copied">{{ t('Copy') }}</span>
            <span v-if="copied">{{ t('Copied!') }}</span>
          </div>
        </div>
        <ModalsAssetsDownloadFiles :open="openAssetsDownloadFilesModal" @close="openAssetsDownloadFilesModal = false" />

      </div>
    </div>
   
    <div v-if="currentMediaTranscriptLoading || !showTranscript || updateMediaTranscriptLoading" class="m-auto pb-[30vh]" style="">
           <SvgLoadingMd />

    </div>
    <Transcript v-if="!currentMediaTranscriptLoading && showTranscript"
      v-model:speakersModalVisible="speakersModalVisible" @playBack="playBack" @seekTime="seekVideoTime" />
    </div>
  </div>
  <!--div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0">
    <div v-if="videoFileUrl !== null && !currentMediaTranscriptLoading && showTranscript" class="flex relative w-full h-full">
      <video ref="videoPlayer" :src="videoFileUrl" class="absolute bottom-36 right-8 rounded-md" muted />
    </div>
  </div-->
  <div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0">
    <div v-if="videoFileUrl !== null && !currentMediaTranscriptLoading && showTranscript" 
         class="flex relative w-full h-full">
      <div class="absolute bottom-36 right-8">
        <video 
          ref="videoPlayer" 
          :src="videoFileUrl" 
          class="rounded-md" 
          muted
          @waiting="onVideoWaiting"
          @playing="onVideoPlaying"
          @canplay="onCanPlay"
          @seeking="onSeeking"
          @seeked="onSeeked"
          @error="onVideoError"
          @timeupdate="onTimeUpdate"
        />
    
        <div v-if="isLoading || isBuffering" 
         class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
          <div class="text-white text-center p-4">
            <div class="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-sm">{{ isBuffering ? 'Buffering...' : 'Loading...' }}</p>
          </div>
        </div>
      </div>
      
      <!--<div v-if="bufferedRanges.length > 0" class="absolute bottom-28 right-8 left-8 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          v-for="(range, index) in bufferedRanges" 
          :key="index"
          class="absolute h-full bg-blue-500"
          :style="{
            left: `${(range.start / videoDuration) * 100}%`,
            width: `${((range.end - range.start) / videoDuration) * 100}%`
          }"
        ></div>
      </div>-->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

// Simple debounce implementation
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const mainStore = useMainStore()
const { currentMediaTranscriptLoading,updateMediaTranscriptLoading } = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()
const speakersModalVisible = ref(false)
const copied = ref(false)
const showTranscript = ref(false)
const openFindModal = ref(false)
const openAssetsDownloadFilesModal = ref(false)
const route = useRoute();
onMounted(() => {
  mainStore.isClipEdit = false
  setTimeout(() => {
    showTranscript.value = true
  }, 100)
})
const transcriptContent = ref(null)
const openTutorial = ref(false);

const videoFileUrl = ref('');

function getVideoFileUrl() {
   const base_url = useRuntimeConfig().public.fathomWebApiURL;
   const token = mainStore.getUserPodiumToken();
   const id = route.params.id;
 
   return $fetch(`${base_url}/api/podium/clients/v1/media/${id}`, {
       method: 'GET',
       headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
       }
   })
   .then(data => {
       videoFileUrl.value = data.video_file_url; // Set the ref value
       // console.log('videoFileUrl', videoFileUrl.value);
       return videoFileUrl.value; // Return the URL
   })
   .catch(error => {
       // console.log('Error fetching video file URL:', error);
       return null; // Return null or handle the error as needed
   });
}

const playBack = (value) => {
  console.log(value)
  if (value === 'playing') {
    isPlaying.value = true;
  } else {
    isPlaying.value = false;
  }
}
const seekVideoTime = (value) => {
  console.log(value)
  seekTime.value = value
}

/*const videoPlayer = ref(null);

const isPlaying = ref(false);
const seekTime = ref(null);

// Play/pause control
watch(isPlaying, (play) => {
  if (!videoPlayer.value) return;
  if (play) {
    videoPlayer.value.play();
  } else {
    videoPlayer.value.pause();
  }
});

// Seek control
watch(seekTime, (newTime) => {
  if (videoPlayer.value && newTime !== null) {
    videoPlayer.value.currentTime = newTime;
  }
});*/

const videoPlayer = ref(null);
const isPlaying = ref(false);
const seekTime = ref(null);
const isLoading = ref(true);
const isBuffering = ref(false);
const videoDuration = ref(0);
const bufferedRanges = ref([]);

// Debounced seek function
const debouncedSeek = debounce((time) => {
  if (!videoPlayer.value) return;
  videoPlayer.value.currentTime = time;
}, 150); // 150ms debounce time

// Play/pause control
watch(isPlaying, (play) => {
  if (!videoPlayer.value) return;
  
  const playPromise = play ? videoPlayer.value.play() : videoPlayer.value.pause();
  
  if (play) {
    isBuffering.value = true;
    playPromise.catch(e => {
      console.error('Playback failed:', e);
      isPlaying.value = false;
      isBuffering.value = false;
    });
  }
});

// Seek control
watch(seekTime, (newTime) => {
  if (videoPlayer.value && newTime !== null) {
    isBuffering.value = true;
    debouncedSeek(newTime);
  }
});

// Update buffered ranges
const updateBufferedRanges = () => {
  if (!videoPlayer.value) return;
  
  const ranges = [];
  for (let i = 0; i < videoPlayer.value.buffered.length; i++) {
    ranges.push({
      start: videoPlayer.value.buffered.start(i),
      end: videoPlayer.value.buffered.end(i)
    });
  }
  bufferedRanges.value = ranges;
};

// Event Handlers
const onVideoWaiting = () => {
  isBuffering.value = true;
};

const onVideoPlaying = () => {
  isBuffering.value = false;
};

const onCanPlay = () => {
  isLoading.value = false;
  isBuffering.value = false;
  videoDuration.value = videoPlayer.value.duration;
  updateBufferedRanges();
};

const onSeeking = () => {
  isBuffering.value = true;
};

const onSeeked = () => {
  isBuffering.value = false;
};

const onVideoError = (error) => {
  console.error('Video error:', error);
  isLoading.value = false;
  isBuffering.value = false;
};

const onTimeUpdate = () => {
  updateBufferedRanges();
};

// Cleanup
onBeforeUnmount(() => {
  if (debouncedSeek?.cancel) {
    debouncedSeek.cancel();
  }
});

onMounted(() => {
  getVideoFileUrl();
  setTimeout(() => {
    // Check if the tutorial has been shown before
    if (!localStorage.getItem('tutorialShown')) {
      openTutorial.value = true;
    }
  }, 5000); // Delay in milliseconds
  Intercom('update', {
      "alignment":'left',
    });
});

onBeforeUnmount(() => {
  Intercom('update', {
      "alignment":'right',
    })
 })

function handleClose() {
  // Set the flag in localStorage when the modal is closed
  localStorage.setItem('tutorialShown', 'true');
  openTutorial.value = false;
}

//add Watch for updateMediaTranscriptLoading
watch(() => updateMediaTranscriptLoading.value, (value) => {
  const element = document.getElementById('transcript-component')
  if (value === true) {
    //get element by id transcript-component
    
    //hide element
    element.style.display = 'None'
  }
  else {
    //remove all inline styles
    element.removeAttribute('style')
  }
})

const showSpeakers = () => {
  mainStore.currentMediaShowSpeakersModal = true
}
const copyTranscript = () => {
  var content = ""
  var lastSpeakerId = null
  mainStore.currentMediaTranscript.monologues.forEach(monologue => {
    if (lastSpeakerId !== monologue.speaker_id) {
      lastSpeakerId = monologue.speaker_id
      const [name, role] = mainStore.getTranscriptSpeakerNameRole(monologue.speaker_id, mainStore.currentMediaTranscript)
      if (role != 'Unknown') {
        content += `${mainStore.formatTime(monologue.elements[0].start)} - ${name} (${role})\n`
      } else {
        content += `${mainStore.formatTime(monologue.elements[0].start)} - ${name}\n`
      }
    } else {
      content += `${mainStore.formatTime(monologue.elements[0].start)}\n`
    }

    monologue.elements.forEach(element => {
      content += element.value
    })

    content += "\n\n"
  })
  navigator.clipboard.writeText(content);
  copied.value = true;
  setTimeout(() => {
    copied.value = null;
  }, 2500);
  if (copied.value = 'true') {
    const doNotShowNoti = localStorage.getItem('doNotShowNoti')
    if (doNotShowNoti === 'true') {
    } else {
      openAssetsDownloadFilesModal.value = true
    }
  }
}
const openFindModel = () => {
  openFindModal.value = true

  var content = ""
  var lastSpeakerId = null
  mainStore.currentMediaTranscript.monologues.forEach(monologue => {
    if (lastSpeakerId !== monologue.speaker_id) {
      lastSpeakerId = monologue.speaker_id
      const [name, role] = mainStore.getTranscriptSpeakerNameRole(monologue.speaker_id, mainStore.currentMediaTranscript)
      if (role != 'Unknown') {
        content += `${mainStore.formatTime(monologue.elements[0].start)} - ${name} (${role})\n`
      } else {
        content += `${mainStore.formatTime(monologue.elements[0].start)} - ${name}\n`
      }
    } else {
      content += `${mainStore.formatTime(monologue.elements[0].start)}\n`
    }

    monologue.elements.forEach(element => {
      content += element.value
    })

    content += "\n\n"
  })
  transcriptContent.value = content
}

</script>

<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
</style>
