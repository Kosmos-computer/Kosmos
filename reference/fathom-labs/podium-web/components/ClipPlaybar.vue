<template>
    <div class="relative flex left-0 w-full bg-white pt-5 pb-3 flex-wrap">
      <div class="relative w-full px-6">
        <div
            class="relative w-full h-auto"
            @mousemove="showLine"
            @mouseleave="hideLine"
        >
          <div class="slidecontainer relative pt-0">
              <input type="range" min="1" max="100" value="0" class="slider cursor-pointer" id="seekSlider" @input="fillSlider" @click="handleSliderChange">
          </div>
        </div>
      </div>
      <div class="flex-1 w-100 flex justify-between	items-center px-8 pt-3">
        <div class="timecode  transform min-h-6 flex-1 w-28 text-center">
          <div class="text-xs font-regular leading-5 text-black"> Time Elapsed</div>
          <span class="text-md bg-gray-200 w-100 block px-2 py-2 rounded-xl">
            <span class=" text-lg text-black font-normal" id="currentTime" >00:00:00</span>

          </span>
        </div>
        <div class="flex flex-wrap justify-center flex-1 pt-0">
          <div class="text-xs font-regular leading-5 text-black h-5 w-full"></div>
          <button class="focus:outline-none active:scale-[90%] outline-none transition-all duration-250">
            <SvgPauseButton  v-if="playing"   :color="'#4338ca'" @click="pauseVideo" />
            <SvgPlayButton   v-if="!playing"  :color="'#4338ca'" @click="playVideo"  />
          </button>
        </div>
        <div class="timecode transform min-h-6 flex-1 w-28 text-center">
          <div class="text-xs font-regular leading-5 text-black">Duration</div>
          <span class=" text-md bg-gray-200 w-100 block px-2 py-2 rounded-xl">
            <span class=" text-lg text-black font-normal" id="totalTime">00:00:00</span> 

          </span>
        </div>
      </div>
      <div class="flex-1 w-100 flex justify-between	items-center px-8 pt-2">
        <div class="timing flex-1 w-full text-center">
          <!-- <div class="text-xs font-regular leading-4 text-black font-normal" id="differenceStartEndTime">{{differenceInSeconds}} second</div> -->
        </div>
      </div>
    </div>
</template>  
<script setup lang="ts">
  import { useMainStore } from "~/store/main"
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

  const playing = ref(false);
  const mainStore = useMainStore()
  const showVerticalLine = ref(false)
  const linePosition = ref(0)
  const audio  = ref(0)
  const scrubTime = ref('')
  const props = defineProps({
  startFrom: {
    type: Number,
    required: true
  },
  endTo: {
    type: Number,
    required: true
  },
  noOfFrames: {
    type: Number,
    required: true
  },
  framePerSec: {
    type: Number,
    required: true
  }
})
  const playVideo =()=>{
    playing.value = true
    const iframe = document.getElementById('videoPlayer');
    iframe.contentWindow.postMessage({ channel: 'podium-video-editor', type: 'play' }, '*');
  }

  const pauseVideo = ()=>{
    playing.value = false
    const iframe = document.getElementById('videoPlayer');
    iframe.contentWindow.postMessage({ channel: 'podium-video-editor', type: 'pause' }, '*');
  }

  function formatTime(seconds) {
    const pad = (num) => String(num).padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

  function frameToTime(frame) {
      const timeInSeconds = frame / props.framePerSec;
      return formatTime(Math.floor(timeInSeconds));
  }

  function seekTo(seekframe) {
    const iframe = document.getElementById('videoPlayer');
    iframe.contentWindow.postMessage({ channel: 'podium-video-editor', type: 'seek',params:{frame:seekframe}}, '*');
  }
  function handleSliderChange() {
      const seekSlider = document.getElementById('seekSlider');
      const seekFrame = Math.round((seekSlider.value / 100) * props.noOfFrames); // Calculate frame based on slider percentage
      const value = (seekSlider.value - seekSlider.min) / (seekSlider.max - seekSlider.min) * 100;
      seekSlider.style.background = `linear-gradient(to right, #818CF8 0%, #818CF8 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
      seekTo(seekFrame);
  }

  const fillSlider =()=>{
    const seekSlider = document.getElementById('seekSlider');
    const value = (seekSlider.value - seekSlider.min) / (seekSlider.max - seekSlider.min) * 100;
    seekSlider.style.background = `linear-gradient(to right, #818CF8 0%, #818CF8 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
  }
  const isLeft = ref('left-0')
  const diffStartEndTime = ref(0)
  const differenceInSeconds = ref(0)

  if(process.client){
    window.addEventListener('message', (event) => {
      if (event.data.channel === 'podium-video-editor' && event.data.type === 'onFrameUpdate') {
          const { frame } = event.data.params;
          const percentage = (frame / props.noOfFrames) * 100;
          const seekSlider = document.getElementById('seekSlider');
          seekSlider.value = percentage;
          const value = seekSlider.value
          seekSlider.style.background = `linear-gradient(to right, #818CF8 0%, #818CF8 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
          const currentTimeDisplay = document.getElementById('currentTime');
           currentTimeDisplay.textContent = frameToTime(frame)
           differenceInSeconds.value = calculateDifference(currentTimeDisplay.textContent,  diffStartEndTime.value);
           if(differenceInSeconds.value === 0){
            playing.value = false
           }
      }
  });
}
 
  
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
  function timeToSeconds(time) {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

function calculateDifference(time1, time2) {
    const seconds1 = timeToSeconds(time1);
    const seconds2 = timeToSeconds(time2);
    return Math.abs(seconds1 - seconds2);
}


  onMounted(()=>{
    const totalTimeDisplay = document.getElementById('totalTime');
      totalTimeDisplay.textContent = frameToTime(props.noOfFrames)
      diffStartEndTime.value = totalTimeDisplay?.textContent
  })

  watch(()=>props.noOfFrames , (a,b)=>{
    document.getElementById('totalTime').textContent =  frameToTime(props.noOfFrames)
    diffStartEndTime.value = document.getElementById('totalTime').textContent
  })

watch([() => props.startFrom, () => props.endTo], (newValues, oldValues) => {

  const totalTimeDisplay = document.getElementById('totalTime');
  const currentTimeDisplay = document.getElementById('currentTime');
  if (totalTimeDisplay) {
    const totalFrames = (props.endTo - props.startFrom)*props.framePerSec;
    console.log('Total frames:', totalFrames);
    totalTimeDisplay.textContent = frameToTime(totalFrames);
  }

  if (newValues[0] !== oldValues[0]) {
    seekTo(0) ;
  }

  if (newValues[1] !== oldValues[1]) {
    const seconds1 = timeToSeconds(currentTimeDisplay.textContent);
    const seconds2 = timeToSeconds(totalTimeDisplay.textContent);
    const percentage = (seconds1 / seconds2) * 100;
    const seekSlider = document.getElementById('seekSlider');
    seekSlider.value = percentage;
    const value = seekSlider.value
    seekSlider.style.background = `linear-gradient(to right, #818CF8 0%, #818CF8 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
  }
  
})
</script>
<style scoped>
  .absolute {
    transform: translateY(-50%);
  }
  .timecode {
    top: auto;
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


<style>
.slidecontainer {
  width: 100%;
}

.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 7px;
  border-radius: 5px;
  background: #e5e7eb;
  outline: none;
  opacity: 1;
  -webkit-transition: .2s;
  transition: opacity .2s;
}

.slider:hover {
  opacity: 1;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 5px;
  height: 16px;
  border-radius: 20px;
  background: #4338ca;
  cursor: pointer;
  border:1px solid #fff;
}

.slider::-moz-range-thumb {
  width: 5px;
  height: 16px;
  border-radius: 20px;
  background: #4338ca;
  cursor: pointer;
  border:1px solid #fff;
}

.slider::-moz-range-progress {
  background: #4338ca !important; 
}

input::-moz-range-track {  
  background-color: #e5e7eb !important;
}
/* IE*/
input::-ms-fill-lower {
  background-color: #4338ca !important; 
}
input::-ms-fill-upper {  
  background-color: #e5e7eb !important;
}

/* .slidecontainer .slider:hover ~ span {
  opacity: 1;
  visibility: visible;
} */

</style>