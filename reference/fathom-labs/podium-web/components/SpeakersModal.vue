<template>
  <div class="fixed top-0 bottom-0 right-0 left-0 bg-black opacity-50 z-30">
  </div>
  <div id="speakersModal" class="fixed top-0 left-0 right-0 bottom-0 overflow-y-auto flex items-start justify-center px-4 sm:px-0 z-40 text-gray-900 min-w-fit">
    <Transition name="bounce" appear>
      <div class="min-w-[400px] p-6 flex flex-col bg-white rounded-lg bg-white relative top-28">

        <div class="text-lg leading-6 font-medium pb-6">
          {{ transcript.speakers.length }} {{ t("Speakers Detected") }}
        </div>
        <div class="set-speakers-form">
          <div v-for="speaker, index in transcript.speakers" class="pb-6 flex flex-wrap items-end">
            <div class="w-72 mr-3 flex-1">
                <div class="text-sm leading-5 font-medium pb-1">
                {{ t("Speaker") }} {{ index + 1 }} 
                </div>
                <div class="set-speakers-form__input-wrapper ">
                <input
                      type="text"
                      name="projectName"
                      id="projectName"
                      v-model="speaker.set_name"
                      class="set-speakers-form__input w-72"
                      autocomplete="off"
                      :placeholder="t('Speaker Name')" />
                </div>
            </div>
            <div class="flex-1 w-36 mr-3">
                <Menu as="div" class="relative text-left">
                  <div>
                      <label class="text-sm leading-5 font-medium pb-1 block">Role</label>
                      <MenuButton class="set-speakers-form__combobox">
                          {{ speaker.set_role ? t(speaker.set_role.charAt(0).toUpperCase() + speaker.set_role.slice(1)) : ''}}
                          <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                      </MenuButton>
                  </div>

                  <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                      <MenuItems class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div class="py-1" v-for="role in roleList">
                              <MenuItem v-slot="{ active }">
                                  <span @click="speaker.set_role = role" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer']">
                                    {{ t(role) }}
                                  </span>
                              </MenuItem>
                          </div>
                      </MenuItems>
                  </transition>
                </Menu>
            </div>
            
            <div class="">
                <div class="">
                  <PlayClipButton class="scale-[90%]" :clip="speaker.clip" />
                </div>
            </div>
          </div>
          <input
              id="remember_me"
              name="remember_me"
              type="checkbox"
              v-model="doNotChecked"
              @click="doNotSetToLocalStorage"
              class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <span class="text-sm leading-6 text-gray-900 pl-1">
              {{ t("Do not show again") }}</span>
          <div class="flex flex-row gap-3 pt-6">
            <button type="button" class="btn btn-submit" @click="handleSave(data)">
              <span v-if="saveState != 'saving'">{{ t("Save") }}</span>
              <div v-if="saveState == 'saving'" class="loader-white">
              </div>
            </button>
            <button type="button" class="btn btn-cancel" @click="handleSkip()" ref="cancelButtonRef">{{ t(getCancelButtonText()) }}</button>
          </div>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { useAudioSystem } from "~/store/audioSystem"
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const runtimeConfig = useRuntimeConfig()
const props = defineProps(['transcript', 'modalVisible', 'cancelButtonText'])
const emits = defineEmits(['update:transcript', 'update:modalVisible'])

const mainStore = useMainStore()
const { currentMediaShowSpeakersModal } = storeToRefs(mainStore)
const audioSystem = useAudioSystem();
const route = useRoute()

const roleList = ref([
'Host', 'Guest', 'Co-host', 'Ad', 'Announcement', 'Caller', 'Interviewer', 'Interviewee',  'None'
])
const selectedRole = ref('None')
const saveState = ref('idle')

var originalSpeakers = []
const doNotChecked=ref(false)
const getCancelButtonText = () => {
  if (props.cancelButtonText) {
    return props.cancelButtonText
  } else {
    return t.value('Cancel')
  }
}

const updateSpeakerRole = (role) => {
  selectedRole.value = role
}

const handleSkip = () => {
  mainStore.currentMediaSpeakersSkipped = true
  props.transcript.speakers = originalSpeakers
  currentMediaShowSpeakersModal.value = false
  emits('update:modalVisible', false)
}
const handleSave = async () => {
  saveState.value = 'saving'
  audioSystem.currentClip = null
  var speakersToSave = []
  
  props.transcript.speakers.forEach(speaker => {
    if (speaker.set_name == null) {
      speaker.set_name = speaker.default_name
    }
    speakersToSave.push({
      id: speaker.id,
      set_name: speaker.set_name,
      set_role: speaker.set_role
    })
  })

  // save speakers
  fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
      },
      body: JSON.stringify(speakersToSave)
  })
  .then(response => {
    saveState.value = 'idle'
    if (!response.ok) {
      alert('There was an error saving the speakers. Please try again.')
    } else {
      currentMediaShowSpeakersModal.value = false
      emits('update:modalVisible', false)  

    }
  })
}

const setInitialRoles = () => {
  props.transcript.speakers.forEach(speaker => {
    if (speaker.set_role == null) {
      speaker.set_role = 'host'
    }
  })
}
const doNotSetToLocalStorage =()=>{
  localStorage.setItem('doNotCheck',!doNotChecked.value)
}
const determineClips = () => {
  props.transcript.speakers.forEach(speaker => {
    var maxMonologueLength = 0
    var speakerMonologueIndex = null
    var lastMonoglogueSpeakerId = null
    
    props.transcript.monologues.forEach((monologue, index) => {
      if (monologue.speaker_id == speaker.id && lastMonoglogueSpeakerId != speaker.id && monologue.elements.length > maxMonologueLength) {
        maxMonologueLength = monologue.elements.length
        speakerMonologueIndex = index
      }
      lastMonoglogueSpeakerId = monologue.speaker_id
    })
    if (speakerMonologueIndex != null) {
      speaker.clip = getClipFromMonologue(props.transcript.monologues[speakerMonologueIndex])
    }
  })
}

const getClipFromMonologue = (monologue) => {
  var clip = {
    start: monologue.elements[0].start,
    end: monologue.elements[monologue.elements.length - 1].end
  }

  return clip
}

onMounted(() => {
  //check localstorage for doNotChecked value and set accordingly
  if(localStorage.getItem('doNotCheck')=='true'){
    doNotChecked.value=true
  }
  else{
    doNotChecked.value=false
  }
  originalSpeakers = props.transcript.speakers.map(speaker => ({...speaker}))
  setInitialRoles()
  determineClips()
})
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
