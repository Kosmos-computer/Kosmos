<template>
    <form class="new-file-form">
        <div class="mb-4">
            <h2 class="new-file-form__title">{{ t('Confirm Upload') }}</h2>
            <!-- <p v-if="mainStore.files.length === 1" class="font-medium text-gray-400 text-xs">Selected options apply to file selected. </p> -->
            <!-- <p v-else class="font-medium text-gray-400 text-xs">Selected options apply to all files selected. </p> -->
        </div>
        <!-- <h2 v-if="!mainStore.user?.new_user_info_complete" class="new-file-form__title">Select Language</h2> -->
        <!-- <p class="text-xs text-gray-500 font-medium" style="line-height: 1.5;" v-if="!mainStore.user?.new_user_info_complete">Choose the language of your audio. If you don't select, our AI will automatically detect the language and generate the 
            output respectively.
        </p> -->
        <div  class="flex mb-4 place-items-center">
            <div class="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 18H22V19.5H8V18Z" fill="#6A727F"/>
                    <path d="M22 26H8V27.5H22V26Z" fill="#6A727F"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5 0C2.23858 0 0 2.23858 0 5V33C0 35.7614 2.23858 38 5 38H25C27.7614 38 30 35.7614 30 33V15.0711C30 13.745 29.4732 12.4732 28.5355 11.5355L18.4645 1.46447C17.5268 0.526784 16.255 0 14.9289 0H5ZM5 36.25H25C26.7949 36.25 28.25 34.7949 28.25 33V15.0711C28.25 14.2091 27.9076 13.3825 27.2981 12.773L17.227 2.7019C16.6175 2.09241 15.7909 1.75 14.9289 1.75H5C3.20507 1.75 1.75 3.20507 1.75 5V33C1.75 34.7949 3.20508 36.25 5 36.25Z" fill="#6A727F"/>
                </svg>
            </div>
            <span v-if="mainStore.files.length === 1"  class="text-sm leading-6 font-medium text-gray-600 ml-2 align-middle">{{mainStore.files[0].file.name}}</span>
            <span v-else  class="text-sm leading-6 font-medium text-gray-600 ml-2 align-middle">{{ mainStore.files.length }} {{ t('Files Selected') }} </span>
        </div>
        
        <div class="flex space-x-4">
            <div v-if="mainStoreState.projects.value.length > 0" class="new-file-form__row flex-1">
            <Menu   as="div" class="relative inline-block text-left w-full">
                <div>
                    <label class="text-sm mb-2 block text-gray-900">{{ t('Add to Project') }}</label>
                    <MenuButton class="project-combobox">
                        {{ selectedProject.name }}
                        <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-600" aria-hidden="true" />
                    </MenuButton>
                </div>

                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                    <MenuItems class="absolute right-0 z-10 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-52 overflow-auto scroll-smooth" style="scrollbar-width: thin;">
                        <div class="py-1" v-for="project in mainStoreState.projects.value" :key="project.id">
                            <MenuItem v-slot="{ active }">
                                <span @click="update(project)" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer']">
                                    {{project.name}}
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
            </div>

            <div class="new-file-form__row flex-1">
            <Menu  as="div" class="relative inline-block text-left w-full">
                <div>
                    <label class="text-sm mb-2 block text-gray-900">{{ t('Language') }}</label>
                    <MenuButton class="project-combobox">
                        {{ selectedLanguage }}
                        <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-600" aria-hidden="true" />
                    </MenuButton>
                </div>

                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                    <MenuItems class="absolute right-0 z-10 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-52 overflow-auto scroll-smooth" style="scrollbar-width: thin;">
                        <div class="py-1" v-for="language in mainStoreState.language.value" >
                            <MenuItem v-slot="{ active }">
                                <span @click="updateLanguage(language.name,language.code)" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer']">
                                    {{language.name}}
                                    <span v-if="language.name==selectedLanguage" class="slectedIcon absolute right-6 ">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                                        </svg>
                                        </span>
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
            </div>
        </div>

        <div>
            <label class="text-sm mb-2 block text-gray-900">Content Type</label>
            <!--<UsageContentProfiles @update="setType($event)"/>-->
            <div class="grid grid-cols-3 gap-2 mb-6">
                <button
                    v-for="(button, index) in buttons"
                    :key="index"
                    type="button"
                    :class="buttonClasses(button.label)"
                    @click="selectContentType(button.label)"
                    class="flex items-center px-2"
                >
                    <component
                        :is="button.icon"
                        class="h-5 w-5"
                        :color="iconColor(button.label)"
                    />
                    <span class="flex w-full text-center justify-center">{{ t(button.label) }}</span>
                </button>
            </div>
        </div>

        <div class="new-file-form__actions">
            <button type="button" class="btn btn-submit" @click="handleStartUpload">{{ t('Start Import') }}</button>
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </form>
</template>

<script lang="ts" setup>
    import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
    import { ref, defineProps, defineEmits, computed, watch } from "vue";
    import { ChevronDownIcon } from '@heroicons/vue/20/solid'
    import { useMainStore } from "~/store/main"
    import { storeToRefs } from 'pinia'
    import MicrophoneIcon from "../svg/MicrophoneIcon.vue";
    import PlayIcon from "../svg/PlayIcon.vue";
    import CapIcon from "../svg/CapIcon.vue";
    import SpiritualIcon from "../svg/SpiritualIcon.vue";
    import CalendarIcon from "../svg/CalendarIcon.vue";
    import PhoneIcon from "../svg/PhoneIcon.vue";
    import languageStore from '@/store/LanguageStore';

    const t = computed(() => {
      return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
      };
    });

    const { files, fileSelected, addFiles, removeFile, clearAll, uploadError } = useFileList();

const buttons = [
  { label: "Podcast", icon: MicrophoneIcon },
  { label: "Video", icon: PlayIcon },
  { label: "Educational", icon: CapIcon },
  { label: "Spiritual", icon: SpiritualIcon },
  { label: "Meeting", icon: CalendarIcon },
  { label: "Customer Call", icon: PhoneIcon },
];

const selectedContentType = ref("Podcast")

const selectContentType = (label) => {
  selectedContentType.value = label
  emit('setType', label)
};

const buttonClasses = (label) => {
  return [
    "rounded-md px-3 py-2 text-sm font-medium shadow-sm",
    selectedContentType.value == label
      ? "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600"
      : "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
    "h-10",
  ].join(" ");
};

const iconColor = (label) => {
  return selectedContentType.value == label ? "#FFFFFF" : "#9CA3AF";
};

    const mainStore = useMainStore()
    const mainStoreState = storeToRefs(mainStore)
    
    const props = defineProps({
        projectId: {
            type: String,
            required: true
        },
        
    })
    const emit = defineEmits(['close', 'submit','selectedLanguageCode','setType'])
    const selectedLanguage = ref(
      localStorage.getItem('processingLanguage') || t.value('Auto-Detect')
    )
    const selectedProject =ref({'name': t.value('None Selected'), 'id': null}) 
    const selectedLanguageCode = ref(
      localStorage.getItem('selectedLanguageCode') || ''
    )
    const update = (project) => {
        selectedProject.value = project
    }
    const setType = (type) => {
        emit('setType',type)
    }
    const updateLanguage = (language,code) => {
      
        selectedLanguage.value = language
        selectedLanguageCode.value = code

        // Persist the selection in localStorage
        localStorage.setItem('processingLanguage', language)
        localStorage.setItem('selectedLanguageCode', code)

        emit('selectedLanguageCode',code)
    }
    const handleClose = () => {
        emit('close')
    }
    const handleStartUpload = () => {
     
        emit('submit', selectedProject.value)
        emit('close')
    }

    const projectName = ref('')
    const languageCode = ref('')

    const data = computed(() => {
        return {
            projectName: projectName.value,
            languageCode: languageCode.value
        }
    })

const capitalizeWords = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

onMounted(async () => {
  // Language selection persistence
  const savedLanguage = localStorage.getItem('processingLanguage')
  const savedLanguageCode = localStorage.getItem('selectedLanguageCode')
  
  if (savedLanguage && savedLanguageCode) {
    selectedLanguage.value = savedLanguage
    selectedLanguageCode.value = savedLanguageCode
    emit('selectedLanguageCode', savedLanguageCode)
  }

  if (props.projectId != null) {
    const project = mainStoreState.projects.value.find(project => project.id == props.projectId)
    if (project != null) {
      selectedProject.value = project
      // Set content type based on project
      const contentType = project.content_type || 'Podcast'
      selectedContentType.value = capitalizeWords(contentType)
      emit('setType', contentType)
    }
  } else {
    // Default to Podcast if no project selected
    emit('setType', 'Podcast')
  }
})
    
</script>
<style lang="scss" scoped>
.new-file-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-1 text-gray-900;

    }
    &__row {
        @apply col-span-full pb-4 ;
    }
    &__actions {
        @apply
        mt-4
        pt-2
        sm:mt-0
        sm:flex
        sm:gap-x-3;
    }
}
.project-combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md bg-white
    px-3 py-2
    text-sm leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;

//    white-space: nowrap; /* Prevent text from wrapping to multiple lines */
    overflow: hidden;    /* Hide overflowing text */
    text-overflow: ellipsis; /* Add ellipsis to the truncated text */
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