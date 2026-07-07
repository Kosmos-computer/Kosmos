<template>
  <div class="fixed bottom-0 left-0 w-full bg-white pb-4">
    <div class="gradient-overlay"></div>
    <div class="relative w-full px-8">
      <div
          class="relative w-full h-8 cursor-pointer"
          @mousemove="showLine"
          @mouseleave="hideLine"
          @click="seekPlayback"
      >
        <div id="playbar__timeline"
          class="relative h-1 bg-gray-200 cursor-pointer rounded-full"
          style="top: 0.8rem;"
        >
          <div
            :style="{ width: progressPercentage + '%' }"
            class="h-1 mt-2 bg-indigo-700 rounded-full"
          ></div>
          <!-- Chapter markers -->
          <template v-if="isAudioReady">
            <template v-for="(marker, index) in chapterMarkers" :key="index">
              <div 
                :style="{ left: marker.position + '%' }"
                class="absolute h-4 w-1 -top-0.5 bg-white">
              </div>
            </template>
          </template>
          <!--div v-if="showVerticalLine && scrubTime != ''" :style="{ left: linePosition + 'px' }" class="scrub-time absolute bottom-1">
            <div class="bg-indigo-700 text-white  text-xs rounded py-1 px-2">{{ scrubTime }}</div>
          </div-->
          <div 
            v-if="showVerticalLine && scrubTime != ''" 
            :style="{ left: tooltipPosition + 'px' }" 
            class="scrub-time absolute -translate-y-full -top-2 left-0 flex flex-col items-center w-[250px] bg-white border border-gray-200 shadow-md rounded-lg z-50"
          >
            <!-- Video Preview -->
            <!--div class="w-[128px] h-[72px] mb-1 mt-2 overflow-hidden border border-gray-300 rounded shadow-lg bg-black">
              <div
                class="w-full h-full bg-[url('/thumbnails/thumbnail-sprite.png')]"
                :style="spriteStyle"
              ></div>
            </div-->
  
            <!-- Transcript Preview -->
            <div class="text-gray-700 text-base rounded shadow-lg w-full">
              <div v-if="transcriptPreview" class="px-4 py-4">
                <div v-if="transcriptPreview.chapter" 
                     class="font-semibold text-gray-700 mb-1">
                  {{ transcriptPreview.chapter }}
                </div>
                <div class="leading-5">
                  {{ transcriptPreview.text }}
                </div>
              </div>
              <div class="px-3 py-1.5 text-center border-t bg-indigo-600 text-white rounded-b-md">
                {{ scrubTime }}
              </div>
            </div>
          </div>
          <div
            v-if="showVerticalLine"
            :style="{ left: linePosition + 'px' }"
            class="relative h-4 w-1 bg-indigo-700 bottom-2.5 rounded-full"
          >
        
        </div>
        </div>
      </div>
    </div>
    <div class="flex justify-center pt-1">
      <button @click="jumpBackward15Seconds"  :class="[ formattedCurrentTime < '00:15' ? 'mr-4 cursor-not-allowed opacity-50 ' :'mr-4']">
        <SvgNextToAudio />
      </button>
     
      <button  class="focus:outline-none active:scale-[90%] outline-none transition-all duration-250 w-[41px] h-[41px]">
        <SvgPauseButton @click="togglePlay" :color="'#4338ca'" v-if="playing && !showBuffering" />
        <SvgPlayButton @click="togglePlay" :color="'#4338ca'" v-if="!playing && !showBuffering"  />
        <span v-if="showBuffering && audioTime.length != 0" class="inline-flex items-center w-[38px] h-[38px]   justify-center rounded-full p-1 bg-indigo-700"><SvgAudioLoader /></span>
      </button>
     
      <button @click="jumpForward15Seconds" :class="[compareTimes(audioTime , subtract15Seconds(formattedDuration))  ? 'ml-4 cursor-not-allowed opacity-50 ' : 'ml-4']">
        <SvgBackToAudio />
      </button>
    </div>
    
    <div class="timecode absolute right-8 transform">
      <span class=" text-md">{{ formattedCurrentTime }} / {{ formattedDuration }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from "~/store/main"
import { useAudioSystem } from "~/store/audioSystem"
import { storeToRefs } from 'pinia'
import emitter from "~/plugins/eventBus";
const nuxtApp = useNuxtApp()
const showBuffering = ref(false)
const mainStore = useMainStore()
const audioSystem = useAudioSystem()
const { currentClip } = storeToRefs(audioSystem)
const emit = defineEmits(["audio-timeupdate", "update:modelValue", "clickSeek"])
const props = defineProps({
  jumpToSeconds: {
    type: Number,
    required: true,
    default: 0
  },
  audioUrl: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
 
  hideIntercom: {
    default: true,
    required: false,
    type: Boolean
  },
  transcript: {
    type: Object,
    required: false,
    default: () => ({})
  },
  chapters: {
    type: Object,
    required: false,
    default: () => ({})
  }
})
const scrubTime = ref("");
var audio = null
const transcriptBlock = ref({});
const chaptersBlock = ref({});

const tooltipPosition = computed(() => {
  const pos = Math.min(
    Math.max(linePosition.value, 120),
    window.innerWidth - 180
  );
  // console.log('Tooltip position:', pos, 'Line position:', linePosition.value);
  return pos;
});

watch(currentClip, () => {
  if (currentClip.value != null) {
    if (audio.currentTime >= currentClip.value.start && audio.currentTime < currentClip.value.end) {
      togglePlay()
    } else {
      audio.currentTime = audioSystem.currentClip.start
      audioSystem.currentTime = audio.currentTime
      if (!playing.value) {
        togglePlay()
      }
    }
  } else {
    togglePlay()
  }

});

const isAudioReady = ref(false);

const setAudio = (url) => {
  audio = new Audio()
  audio.src = url
  audio.preload = "auto"

  audio.addEventListener('loadedmetadata', () => {
    console.log('Audio metadata loaded, duration:', audio.duration);
    isAudioReady.value = true;
  });
  audio.addEventListener("durationchange", () => {
      formattedDuration.value = mainStore.formatTime(audio.duration);
  });
};

// watch for changes to the jumpToSeconds prop
watch(() => props.jumpToSeconds, (newVal) => {
  if (audio && newVal != null) {
    if (playing.value) {
      togglePlay()
    }
    audio.currentTime = newVal
    currentTime.value = audio.currentTime
    emit("clickSeek", audio.currentTime);
  }
})

watch(() => props.audioUrl, (newVal) => {
  setAudio(newVal)
})

watch(() => props.transcript, (newVal) => {
  transcriptBlock.value = newVal
})

watch(() => props.chapters, (newVal) => {
  chaptersBlock.value = newVal
})

onBeforeUnmount(() => {
  if (audio) {
    audio.pause()
    audio = null
  }

  Intercom('update', {
    "vertical_padding": 20,
    "horizontal_padding": 20,
  })
})

onMounted(() => {
  emit("update:modelValue", {'playbackState': 'paused'})
  
  if (props.hideIntercom) {
    Intercom('update', {
      "hide_default_launcher": true
    })
  } else {
    Intercom('update', {
      "vertical_padding": 150,
      "horizontal_padding": 30,
    })
  }
  
  if (props.audioUrl != '') {
    setAudio(props.audioUrl)
  }

  if (props.transcript != '') {
    transcriptBlock.value = props.transcript
  }

  if (props.chapters != '') {
    chaptersBlock.value = props.chapters
    console.log(chaptersBlock)
  }

  setInterval(function () {
    if (audio != null && audio.currentTime != null) {
      currentTime.value = audio.currentTime
      audioSystem.currentTime = audio.currentTime

      if (audioSystem.currentClip != null && (audioSystem.currentClip.end) <= (currentTime.value)) {
        audioSystem.pauseCurrentClip()
      }
    }
    
    if (lastCurrentTime.value != currentTime.value) {
      lastCurrentTime.value = currentTime.value;
      emit("audio-timeupdate", audio.currentTime);
    }
  }, 30);
})

const playing = ref(false);
const currentTime = ref(0);
const lastCurrentTime = ref(0);
const showVerticalLine = ref(false);
const linePosition = ref(0);
const bufferingTimeout = ref(null);

const togglePlay = async () => {
  if (playing.value) {
    audio.pause();
    showBuffering.value = false
    if (bufferingTimeout.value) {
      clearTimeout(bufferingTimeout.value)
    }
    emit("update:modelValue", {'playbackState': 'paused'});
    playing.value = false
  } else {

    var playPromise = audio.play()
    if (playPromise != undefined) {
      bufferingTimeout.value = setTimeout(() => {
        if (!playing.value) {
          showBuffering.value = true;
        }
        bufferingTimeout.value = null
      }, 500);

      playPromise.then(() => {
        if (bufferingTimeout.value) {
          clearTimeout(bufferingTimeout.value)
        }
        playing.value = true
        showBuffering.value = false
        emit("update:modelValue", {'playbackState': 'playing'});
      }).catch(error => {
        showBuffering.value = false
        emit("update:modelValue", {'playbackState': 'paused'});
        playing.value = false
      });

    }

  }
};
const audioTime = ref('')

const handleAudioTime = (data) => {
  audioTime.value = mainStore.formatTime(data);
};
const progressPercentage = computed(() => {
  var duration = 0.00000001
  if (audio && audio.duration) {
    duration = audio.duration
  } 
  return (currentTime.value / duration) * 100
});

const showLine = (event) => {
  showVerticalLine.value = true
  const timelineElementRect = document.getElementById("playbar__timeline")?.getBoundingClientRect()
  var lineX = event.clientX - event.currentTarget.getBoundingClientRect().left
  if (lineX < 0) {
    lineX = 0
  }
  if (lineX > timelineElementRect?.width) {
    lineX = timelineElementRect?.width
  }
  linePosition.value = lineX
  var lineTime = (linePosition.value / event.currentTarget.getBoundingClientRect().width) * audio.duration
  if (lineTime < 0) {
    lineTime = 0;
  }
  if (lineTime > audio.duration) {
    lineTime = audio.duration;
  }
  if (audio) {
    scrubTime.value = mainStore.formatTime(lineTime);
  } else {
    scrubTime.value = "";
  }
};

const hideLine = () => {
  showVerticalLine.value = false;
};

const seekPlayback = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const clickPosition = event.clientX - rect.left;
  const clickPercentage = clickPosition / rect.width;
  audio.currentTime = clickPercentage * audio.duration;
  emit("clickSeek", audio.currentTime);
};

const jumpBackward15Seconds = () => {
  if (mainStore.formatTime(currentTime.value) < '00:15') {
    return;
  }

  audio.currentTime = Math.max(audio.currentTime - 15, 0);

  setTimeout(() => {
    if (audio.readyState < 4) {  // HAVE_ENOUGH_DATA is 4
      showBuffering.value = true;
    }
  }, 500);

  // Add listeners for both canplaythrough and playing events
  const hideBuffering = () => {
    showBuffering.value = false;
  };

  audio.addEventListener('canplaythrough', hideBuffering, { once: true });
  audio.addEventListener('playing', hideBuffering, { once: true });
};

const jumpForward15Seconds = () => {
      if( compareTimes(audioTime.value , subtract15Seconds(formattedDuration.value))){
    return
  }

  audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);

  setTimeout(() => {
    if (audio.readyState < 4) {  // HAVE_ENOUGH_DATA is 4
      showBuffering.value = true;
    }
  }, 500);

  // Add listeners for both canplaythrough and playing events
  const hideBuffering = () => {
    showBuffering.value = false;
  };

  audio.addEventListener('canplaythrough', hideBuffering, { once: true });
  audio.addEventListener('playing', hideBuffering, { once: true });
};


const formattedCurrentTime = computed(() => {
  return mainStore.formatTime(currentTime.value);
});

const formattedDuration = ref("00:00")



function subtract15Seconds(timeString) {
  // Helper function to parse time string into seconds
  function parseTimeString(timeString) {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) { // HH:mm:ss format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // mm:ss format
      return parts[0] * 60 + parts[1];
    } else {
      throw new Error('Invalid time format');
    }
  }

  // Helper function to format seconds back into time string
  function formatTimeString(seconds, originalLength) {
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    let secs = seconds % 60;

    if (originalLength === 3) { // HH:mm:ss format
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else if (originalLength === 2) { // mm:ss format
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      throw new Error('Invalid time format');
    }
  }

  // Parse the input time string into seconds
  let totalSeconds = parseTimeString(timeString);
  // Subtract 15 seconds
  totalSeconds -= 15;
  // Make sure the total seconds is not negative
  if (totalSeconds < 0) totalSeconds = 0;
  // Format the result back into the original time format
  return formatTimeString(totalSeconds, timeString.split(':').length);
}




function parseTime(timeString) {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) { // HH:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // mm:ss
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

function compareTimes(timeA, timeB) {
    const timeInSecondsA = parseTime(timeA);
    const timeInSecondsB = parseTime(timeB);
    return timeInSecondsA >= timeInSecondsB;
}


onMounted(()=>{
  emitter.on('audioLatestTime', handleAudioTime);
})

onUnmounted(() => {
    emitter.off('audioLatestTime', handleAudioTime);
});

const areStringsEqual = computed(() => {
  if(audioTime.value.length === 0){
    return true
  }
  return audioTime.value.trim().toLowerCase() === formattedCurrentTime.value.trim().toLowerCase();
});

const numThumbs = 10404;  // total thumbs in sprite
const thumbsPerRow = 102; // if 10x10 grid
const thumbWidth = 128; // px
const thumbHeight = 64;

const spriteStyle = computed(() => {
  if (!audio || !audio.duration) return {};

  const hoverTime = (linePosition.value / document.getElementById("playbar__timeline").offsetWidth) * audio.duration;
  const index = Math.floor((hoverTime / audio.duration) * numThumbs);

  const row = Math.floor(index / thumbsPerRow);
  const col = index % thumbsPerRow;

  return {
    backgroundPosition: `-${col * thumbWidth}px -${row * thumbHeight}px`,
  };
});

const getCurrentChapter = (time) => {
  if (!chaptersBlock.value?.length) return null;
  
  // Find the most recent chapter that hasn't ended yet
  const currentChapter = [...chaptersBlock.value]
    .sort((a, b) => a.start_seconds - b.start_seconds)
    .findLast(chapter => time >= chapter.start_seconds);
  
  // If we found a chapter and we're still within its duration
  if (currentChapter && time <= currentChapter.end_seconds) {
    return {
      title: currentChapter.title,
      startTime: currentChapter.start_seconds,
      endTime: currentChapter.end_seconds
    };
  }
  
  return null;
};


const CHUNK_DURATION = 10; // seconds per chunk

const createTranscriptChunks = () => {
  if (!transcriptBlock.value?.monologues?.length) return [];
  
  const chunks = [];
  const allElements = [];
  
  // First, create chunks for each monologue individually
  transcriptBlock.value.monologues.forEach(monologue => {
    const elements = monologue.elements
      .filter(el => el && el.start !== undefined)
      .sort((a, b) => a.start - b.start);
    
    if (!elements.length) return;
    
    const speaker = transcriptBlock.value.speakers?.find(s => s.id === monologue.speaker_id) || 
                   { id: monologue.speaker_id, name: 'Speaker' };
    
    let chunkStartTime = elements[0].start;
    let chunkEndTime = chunkStartTime + CHUNK_DURATION;
    let chunkElements = [];
    
    for (const element of elements) {
      // If element is too far ahead, finalize current chunk
      if (element.start >= chunkEndTime) {
        if (chunkElements.length > 0) {
          addChunk(chunkElements, speaker, chunks);
          chunkElements = [];
        }
        chunkStartTime = Math.floor(element.start / CHUNK_DURATION) * CHUNK_DURATION;
        chunkEndTime = chunkStartTime + CHUNK_DURATION;
      }
      
      chunkElements.push(element);
      
      // If we've reached the chunk duration, finalize it
      if (element.end >= chunkEndTime) {
        if (chunkElements.length > 0) {
          addChunk(chunkElements, speaker, chunks);
          chunkElements = [];
        }
        chunkStartTime = chunkEndTime;
        chunkEndTime += CHUNK_DURATION;
      }
    }
    
    // Add any remaining elements in the last chunk
    if (chunkElements.length > 0) {
      addChunk(chunkElements, speaker, chunks);
    }
  });
  
  // Sort all chunks by their start time
  return chunks.sort((a, b) => a.startTime - b.startTime);
};

// Helper function to create a chunk from elements
const addChunk = (elements, speaker, chunks) => {
  const text = elements
    .filter(el => el.type === 'text' || (el.type === 'punct' && ![' ', '\n'].includes(el.value)))
    .map(el => el.value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (text) {
    chunks.push({
      startTime: elements[0].start,
      endTime: elements[elements.length - 1].end,
      text,
      speakers: [speaker]
    });
  }
};

// Memoize the chunks
const transcriptChunks = computed(() => createTranscriptChunks());

// Update the getTranscriptPreview function
const getTranscriptPreview = (time) => {
  if (!transcriptChunks.value.length) return null;
  
  // Get current chapter
  const currentChapter = getCurrentChapter(time);
  
  // Find the chunk that contains this time
  const chunk = transcriptChunks.value.find(chunk => 
    time >= chunk.startTime && time < chunk.endTime
  );
  
  if (!chunk) return null;
  
  return {
    text: chunk.text,
    speaker: chunk.speakers[0]?.name || 'Speaker',
    chapter: currentChapter?.title || null
  };
};

const convertToSeconds = (timeString) => {
  if (!timeString) {
    console.log('Empty time string');
    return -1;
  }
  
  try {
    const parts = timeString.split(':');
    
    // Handle hh:mm:ss format
    if (parts.length === 3) {
      const hours = parseFloat(parts[0]);
      const minutes = parseFloat(parts[1]);
      const seconds = parseFloat(parts[2]);
      
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        console.log('Invalid number in time string', timeString);
        return -1;
      }
      
      return (hours * 3600) + (minutes * 60) + seconds;
    }
    // Handle mm:ss format
    else if (parts.length === 2) {
      const minutes = parseFloat(parts[0]);
      const seconds = parseFloat(parts[1]);
      
      if (isNaN(minutes) || isNaN(seconds)) {
        console.log('Invalid number in time string', timeString);
        return -1;
      }
      
      return (minutes * 60) + seconds;
    } 
    // Invalid format
    else {
      console.log('Invalid time format, expected hh:mm:ss or mm:ss', timeString);
      return -1;
    }
  } catch (error) {
    console.error('Error converting time:', error, timeString);
    return -1;
  }
};

const transcriptPreview = computed(() => {
  if (!scrubTime.value) {
    console.log('No scrub time');
    return null;
  }
  
  const timeInSeconds = convertToSeconds(scrubTime.value);
  if (timeInSeconds < 0) {
    console.log('Invalid time in seconds:', scrubTime.value);
    return null;
  }
  
  return getTranscriptPreview(timeInSeconds);
});

const chapterMarkers = computed(() => {
  console.log('chaptersBlock:', chaptersBlock.value);
  console.log('audio.duration:', audio?.duration);
  
  if (!chaptersBlock.value?.length) {
    console.log('No chapters available');
    return [];
  }
  
  if (!isAudioReady.value || !audio?.duration) {
    console.log('Audio not ready or duration not available');
    return [];
  }
  
  const markers = chaptersBlock.value.map(chapter => {
    const position = (chapter.start_seconds / audio.duration) * 100;
    console.log(`Chapter at ${chapter.start_seconds}s (${position}%):`, chapter.title);
    return { position };
  });
  
  console.log('Generated markers:', markers);
  return markers;
});
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