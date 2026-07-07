<template>
    <div>
      <div class="block text-lg leading-6 font-medium text-gray-900">
          Export
      </div>
      <div class="relative flex flex-col text-sm font-medium leading-5 text-gray-900 items-left justify-left mt-6 mb-1">
        Share to
      </div>
      <div class="flex flex-wrap gap-2 justify-between mb-6">
        <button type="button" class="rounded-md leading-8 inline-flex items-center justify-center h-[38px] min-w-[83px] bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
         <SvgClipFacebook @click="goToPodium('facebook')" />
        </button>
        <button type="button" class="rounded-md leading-8 inline-flex items-center justify-center h-[38px] min-w-[83px]  bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
         <SvgClipTwitter  @click="goToPodium('twitter')"/>
        </button>
        <button type="button" class="rounded-md leading-8 inline-flex items-center justify-center h-[38px] min-w-[83px]  bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
         <SvgClipInstagram @click="goToPodium('instagram')" />
        </button>
        <button type="button" class="rounded-md leading-8 inline-flex items-center justify-center h-[38px] min-w-[83px]  bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
         <SvgClipLinkedin  @click="goToPodium('linkedin')"/>
        </button>
        <button type="button" class="rounded-md leading-8 inline-flex items-center justify-center h-[38px] min-w-[83px] bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
         <SvgClipTiktok @click="goToPodium('tiktok')" />
        </button>
      </div>
      <div class="form__actions mt-6">
              <button type="button" class="btn btn-submit" @click="downloadAllFiles(props.clipId)">Download  Files</button>
              <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">Cancel</button>
      </div>
    </div> 
  <ModalsClipDownload :open="downloadModal"  @close="downloadModal = false" />
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useMainStore } from "~/store/main";
  import emitter from '@/plugins/eventBus';
  const mainStore = useMainStore()
  const runtimeConfig = useRuntimeConfig()
  const props = defineProps(['clipId'])
  const emit = defineEmits(['close'])
  const downloadModal = ref(false)
  const status = ref(true)
  const intervalId = ref('')
  const isContinueApi =ref('')
  const handleClose = () => {
      emit('close')
  }

  const handleExecutionApi = (data) => {
  isContinueApi.value = data;
  console.log(isContinueApi.value,'isContinueApi.value')
  };

  onUnmounted(() => {
    emitter.off('stopApi', handleExecutionApi);
  });

  onMounted(async () => {
    emitter.on('stopApi', handleExecutionApi);
  });
  
  const goToPodium =(source)=>{
    return
    // if(source =='facebook'){
    //   return window.open('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    // }else if(source =='twitter'){
    //   return window.open('https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    // }else if(source =='instagram'){
    //   return window.open('https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    // }else if(source =='linkedin'){
    //   return window.open('https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    // }else if(source =='tiktok'){
    //   return window.open('https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    // } 
  }

  const checkProgress = (id) => {
    if(isContinueApi.value !='stop execution'){
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${id}/progress/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            }
        })
        .then(response => response.json())
        .then(val => {
            if (val) {
                mainStore.clipProgress = Math.round(val.progress);
                status.value = val.status
                if (status.value === val.status && val.progress === 100 ) {
                    // Stop further checks if progress is 100 or status matches
                    mainStore.clipVideoUrl = val.url
                    emitter.emit('videoUrl', val.url);
                    emitter.emit('closeExportModal', 'Close Export');
                    clearInterval(intervalId.value);
                } else {
                    // Retry after 5 seconds if progress is not 100 and statuses are not equal
                    setTimeout(() => checkProgress(id), 5000);
                }

                return val;
            } 
            mainStore.clipProgress = 0;
            downloadModal.value = false;
        })
        .catch(error => {
            console.error('Error checking progress:', error);
        });
    }
  };

  const downloadAllFiles = async(id)=>{
    isContinueApi.value=''
    status.value = true
    downloadModal.value = true;
    setTimeout(async() => {
      try {
            const response = await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${id}/process/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                }
            });

            const data = await response.json();
            if (data.success) {
                    intervalId.value = setInterval(() => {
                    if (!status.value){
                          clearInterval(intervalId.value);
                    } else{
                           checkProgress(id);
                        }
                }, 5000);
            }
        } catch (error) {
            console.error('Error processing clip:', error);
        }
    },2000);
  }
  </script>
  
  <style lang="scss" scoped>
  .form {
      &__actions {
          @apply
          mt-0
          sm:mt-0
          sm:flex
          sm:gap-x-3;
      }
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
  }


input {
  margin-bottom: 10px;
}


  </style>