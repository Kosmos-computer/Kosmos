<template>
  <div v-if="loadershow" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
  style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
  <SvgLoadingMd />

    </div>
    <div class="fixed top-0 bottom-0 right-0 left-0 bg-black opacity-50 z-50"> </div>
    <div id="speakersModal" class="fixed top-0 left-0 right-0 bottom-0 overflow-y-auto flex items-start justify-center px-4 sm:px-0 z-60 text-gray-900 min-w-fit">
      <Transition name="bounce" appear>
        <div class="min-w-[400px] p-6 flex flex-col bg-white rounded-lg bg-white relative top-28">
          <div class="text-xl leading-6 font-medium pb-0 text-center" >
            {{ t('Change all?') }} 
          </div>
          <div class="set-speakers-form">
            <div  class="py-6">
              <div class="flex flex-row items-center text-gray-500 font-normal text-sm">
                {{ t('Do you want to change all instances of') }} <strong class="mx-1"> {{ props.currentSpeakerNames }}  </strong> {{ t('to the') }} {{$props.updatedSpeakerName}}?
              </div>
            </div>
            <div class="flex flex-row gap-3 pt-0">
              <button type="button" class="btn btn-submit" @click="changeAllSpeakerNames">{{ t('Change all') }}</button>
              <button type="button" class="btn btn-cancel" @click="handleClose()" ref="cancelButtonRef">{{ t('Close') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </template>
  
<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const loadershow=ref(false)
const { updateMediaTranscript } = storeToRefs(mainStore)
const emits = defineEmits(['close','latestSpeakerNames'])
const props= defineProps(['updatedSpeakerName','currentSpeakerId','newSpeakerId','currentSpeakerNames'])
const handleClose = () => {
  updateMediaTranscript.value = false
  emits('close')
}
const changeAllSpeakerNames=()=>{
  mainStore.transcriptSavingSavedState = "Saving..."
  loadershow.value=true
    var data=[{
      speaker_id:props.currentSpeakerId,
      new_speaker_id:props.newSpeakerId
  }]
  fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then (data => {
       mainStore.transcriptSavingSavedState = "Saved"
       emits('latestSpeakerNames',data)
      if (!data) {
        alert('There was an error saving the speakers. Please try again.')
      } else{
        loadershow.value=false
        emits('close')
      }
    })
  }
  </script>
  
  <style lang="scss" scoped>
  .bounce-enter-active {
    animation: bounce-in .5s;
  }
  
  .bounce-leave-active {
    animation: bounce-in .5s linear;
  }
  
  @keyframes bounce-in {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  
  .set-speakers-form {
    &__input {
        @apply
        block
        flex-1
        border-0
        bg-transparent
        py-2 pl-3
        text-gray-900
        placeholder:text-gray-400
        focus:ring-0
        text-sm
        leading-6
        rounded-md
        outline-0;
        &-before {
            @apply
            bg-gray-50
            text-gray-300
            border
            border-gray-300
            rounded-tl-md
            rounded-bl-md
            flex
            select-none
            items-center
            pl-3
            sm:text-base
            pr-2;
            margin-left:.5px;
            margin-top: .5px;
            margin-bottom: .6px;
        }
        &-row {
            @apply mt-2;
        }
        &-wrapper {
            @apply
            block
            rounded-md
            shadow-sm
            ring-1
            ring-inset
            ring-gray-300
            focus-within:ring-1
            focus-within:ring-inset
            focus-within:ring-indigo-600;
        }
    }
    
    &__combobox {
      @apply
      inline-flex w-full justify-between items-center
      gap-x-1.5 rounded-md bg-white
      px-3 py-2
      text-sm leading-6 font-normal text-gray-900
      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
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
      leading-5
      font-medium
      shadow-sm
      ring-1
      ring-inset
      sm:col-start-1
      sm:mt-0;
      &-submit {
          @apply
          bg-indigo-700
          text-white
          hover:bg-indigo-600
          focus-visible:outline
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-indigo-700 sm:col-start-2;
      }
      &-cancel {
          @apply
          bg-white
          text-gray-900
          ring-gray-300
          hover:bg-gray-50;
      }
      &-change {
          @apply
          w-auto
          bg-white
          text-gray-900
          ring-gray-300
          hover:bg-gray-50;
      }
  }
  </style>
  