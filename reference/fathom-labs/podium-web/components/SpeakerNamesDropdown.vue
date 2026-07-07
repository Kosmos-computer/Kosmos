<template>
  <div  class="user-dropdown__dropdown dropdown-shut  overflow-hidden isOpenSpeakerDropdown" v-if="mainStore.mIndex || mainStore.mIndex === 0 ">
  <ul v-for="speaker, index in mainStore.currentMediaTranscript.speakers">
    <li class="flex items-center hover:bg-gray-100"> 
        <a v-if=" mainStore.currentMediaTranscript.monologues[mainStore.mIndex].speaker_id == speaker.id"  
          @click="updateCurrentToSelectedSpeakerName(mainStore.currentMediaTranscript.monologues[mainStore.mIndex].speaker_id,speaker.id,props.currentSpeakersMindexx,props.from)"
          class='user-dropdown__dropdown-item text-gray-700 font-bold flex-1 truncate block'>
            {{ speaker.set_name ? speaker.set_name :  t('Speaker') +' '+ (index + 1)    }}
        </a>  
        <a v-else 
          @click="updateCurrentToSelectedSpeakerName(mainStore.currentMediaTranscript.monologues[mainStore.mIndex].speaker_id,speaker.id,props.currentSpeakersMindexx,props.from)"
          class='user-dropdown__dropdown-item text-gray-700 font-normal flex-1 truncate block '>
          {{ speaker.set_name ? speaker.set_name :  t('Speaker') +' '+ (index + 1)  }}
        </a> 
        <span class="text-indigo-600 text-sm w-fit text-center pr-4 font-normal" @click="openEditSpeakerModal(speaker.id, props.currentSpeakersMindexx, speaker.set_name ? speaker.set_name :  t('Speaker') +' '+ (index + 1), speaker.set_role)">{{ t('Edit') }}</span> 
    </li>
  </ul>
  <ul>
    <li >
      <a @click="openAddSpeakerModals(props.currentSpeakersMindexx)" class="user-dropdown__dropdown-item text-gray-700 font-normal flex">
        <svg fill="#7d828c" version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
          width="20" height="20" class="scale-75 ml-0 mr-3">
          <g id="Folder 1">
            <path id="Shape 1" class="s0"
              d="m9 2c0-0.6 0.4-1 1-1 0.6 0 1 0.4 1 1v16c0 0.6-0.4 1-1 1-0.6 0-1-0.4-1-1z" />
            <path id="Shape 1 copy" class="s0"
              d="m18 9c0.6 0 1 0.4 1 1 0 0.6-0.4 1-1 1h-16c-0.6 0-1-0.4-1-1 0-0.6 0.4-1 1-1z" />
          </g>
        </svg>
        {{ t('Add Speaker') }} 
      </a>
    </li>
  </ul>
</div>
<div>
</div>
</template>
<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
const props = defineProps(['currentSpeakersMindexx','from','currentSpeakerNames','lastChildEindex','firstChildMindex','transcriptData'])
const emits= defineEmits(['transcript','openAddSpkModal', 'editedSpkId'])
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const { updateMediaTranscriptLoading } = storeToRefs(mainStore)
const openAddSpeakerModal=ref(false)
const loadershow=ref(false)
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
import emitter from "~/plugins/eventBus";
const openAddSpeakerModals = (mIndex) => {
  var isOpenSpeakerDropdownn = document.querySelectorAll('.isOpenSpeakerDropdown')
  isOpenSpeakerDropdownn.forEach(isOpenSpeakerDropdown => {
    isOpenSpeakerDropdown.classList.remove('dropdown-open')
    isOpenSpeakerDropdown.classList.add('dropdown-shut')
  });
  isOpenSpeakerDropdownn[mIndex].classList.remove('dropdown-shut')
  isOpenSpeakerDropdownn[mIndex].classList.add('dropdown-open')
  var spkDetails = {
    spkId :'',
    spkName : '',
    spkRole : 'None'
  }
  emits('editedSpkInfo', spkDetails)
  emits('openAddSpkModal',true)
}

const getContinuesSpeakerMonologues = (speakerId,monologueId) => {
  var monologues = []
  for (var i = monologueId; i < props.transcriptData.monologues.length; i++) {
    if (props.transcriptData.monologues[i].speaker_id == speakerId) {
      monologues.push(i)
    }
    else {
      break
    }
  }
  return monologues
}

const openEditSpeakerModal = (id, mIndex, name, role)=>{
  var isOpenSpeakerDropdownn = document.querySelectorAll('.isOpenSpeakerDropdown')
  isOpenSpeakerDropdownn.forEach(isOpenSpeakerDropdown => {
    isOpenSpeakerDropdown.classList.remove('dropdown-open')
    isOpenSpeakerDropdown.classList.add('dropdown-shut')
  });
  isOpenSpeakerDropdownn[mIndex].classList.remove('dropdown-shut')
  isOpenSpeakerDropdownn[mIndex].classList.add('dropdown-open')
  var spkDetails = {
    spkId : id,
    spkName : name,
    spkRole : role
  }
  emits('editedSpkInfo', spkDetails)
  emits('openAddSpkModal',true)
}
const updateCurrentToSelectedSpeakerName = (currentSpeakerId,selectedSpeakerId,mIndex,from) => {
  if(selectedSpeakerId == mainStore.currentMediaTranscript.monologues[mIndex].speaker_id){
    return;
  }
  if(from){
    mainStore.transcriptSavingSavedState = "Saving..."
    var data={
      speaker_id: selectedSpeakerId,
      monologue_index: mIndex,
      start:props.firstChildMindex,
      end:props.lastChildEindex
    }
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      mainStore.transcriptSavingSavedState = "Saved"
      emits('transcript',data)
        if (!data) {
          alert('There was an error saving the speakers. Please try again.')
        } 
      })
  }else{
    mainStore.transcriptSavingSavedState = "Saving..."
    var data = []

    var monologues = getContinuesSpeakerMonologues(currentSpeakerId,mIndex)
    for (var i = 0; i < monologues.length; i++) {
      data.push({
      speaker_id: currentSpeakerId,
      new_speaker_id: selectedSpeakerId,
      monologue_index: monologues[i]
      })
    }
      
  fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
      if(data){
        mainStore.transcriptSavingSavedState = "Saved"
        emits('transcript',data)
      }
      if (!data) {
        alert('There was an error saving the speakers. Please try again.')
      } 
    })
  }
}

const currentSpeakerId = ref(0)
const handleCurrentSpeakerkId = (data) => {
   currentSpeakerId.value = data;
};

watch(() => props.currentSpekId,(newVal)=>{
  currentSpeakerId.value = ''
})

onMounted(()=>{
  emitter.on('currentSpeakerkId', handleCurrentSpeakerkId);
})

onUnmounted(() => {
    emitter.off('currentSpeakerkId', handleCurrentSpeakerkId);
});

</script>
<style lang="scss" scoped>
.user-dropdown {
  @apply flex relative;

  &__simple {
    @apply items-center;
  }

  &__full {
    @apply items-start;
  }

  &__image-wrapper {
    @apply relative;

    img,
    svg {
      @apply rounded-full max-w-none w-9 h-9;

      &.full {}
    }
  }

  &__carrot {
    @apply self-center mr-2 cursor-pointer w-6 h-6;

    &.dropdown-open {
      transform: rotate(-180deg);
    }

    &.dropdown-shut {
      transform: rotate(0deg);
    }
  }

  &__user {
    @apply mr-auto ml-3 mr-3 overflow-hidden;

    &-name {
      @apply font-medium leading-5 text-sm text-left text-gray-700 mb-2 whitespace-nowrap overflow-hidden truncate;
    }

    &-credits-badge {
      @apply text-center p-1 rounded-2xl w-auto px-2 w-fit text-xs font-medium leading-4;

      &.success {
        @apply text-teal-500 bg-teal-100;
      }

      &.warning {
        @apply text-yellow-500 bg-yellow-100;
      }

      &.danger {
        @apply text-red-500 bg-red-100;
      }
    }
  }

  &__dropdown {
    @apply absolute top-12 bg-white rounded-lg w-60 shadow-lg ring-1 ring-black ring-opacity-5 pt-2 z-50;

    &.simple {
      @apply right-0;
    }

    &.full {
      @apply z-50;
      right: -180px;
    }

    &-item {
      @apply relative cursor-auto items-center px-4 py-2 font-inter text-sm hover:bg-gray-100 ;
      

      &:not(.no-hover) {
        @apply hover:bg-gray-100 cursor-pointer;
      }

      &-icon {
        @apply mr-3;
      }

      &-text {
        @apply text-sm;
      }
    }

    &.dropdown-open {
      @apply opacity-100 visible h-auto -left-2 pt-0 top-full;
    }

    &.dropdown-shut {
      @apply opacity-0 invisible h-0;
    }
  }
}
</style>     