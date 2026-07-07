<template>
  <div v-if="!uploadsDisabled">
    <template v-if="status != 'authenticated'
      || (mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance) > 0
      || (mainStore.user?.current_subscription_title)">
      <div
          :id="dragAreaId"
          v-bind="$attrs" 
          ref="droparea"
          @drop.stop.prevent="onDrop"
          @dragenter.stop.prevent="onDragEnter"
          @dragleave.stop.prevent="onDragLeave"
          @mouseover.stop.prevent="onMouseOver"
          @mouseleave.stop.prevent="onMouseLeave"
      >
        <section 
          id="drop_zone" 
          ref="dropareaSection"
          class="pointer-events-none"
        >
          <div 
            id="drop_zone_div"
            :class="['relative flex-grow flex flex-col items-center justify-center gap-5 px-7 xl:px-8 text-center overflow-hidden']" @click="$refs.fileInput.click()">
            <Transition mode="out-in" :duration="100">
              <template v-if="dragActive">
                <div class="flex flex-col gap-4 items-center pointer-events-none">
                  <img :src="uploadSvgSource" alt="Upload Icon" class="pr-2 rotate-180"/>
                  <span class="text-2xl font-semibold text-gray-500 pb-3">
                    {{ t("Release your file to upload") }}
                  </span>
                </div>
              </template>
              <template v-else> 
                <div id="drop_zone_buttons" :class="['flex flex-col gap-2 items-center pointer-events-none']" >
                  <img :src="uploadSvgSource" alt="Upload Icon" class="pr-2 rotate-180"/>
                  <span class="text-sm text-gray-600">
                    <a @click.stop.prevent="uploadFile" class="text-indigo-600 cursor-pointer" >{{ t("Upload a file") }}</a> {{ t("or drag and drop") }}
                  </span>
                  <span class="text-xs text-gray-500 whitespace-nowrap">
                    {{ t("All audio/video formats are supported. Max file size is 4GB.") }}
                  </span>
                  <div v-if="!dragActive" :class="{'button': route.name == 'upload'}" >
                    <div v-if="route.name == 'upload'" class="button-inner">{{ t("Upload File") }}</div>
                    <input ref="fileInput" maxlength="5" multiple @change="onBrowseComplete($event)" id="file_input" type="file" class="hidden" accept="audio/*,video/*"/>
                  </div>
                  <div v-if="route.name == 'upload'" class="text-base font-base text-gray-500 mt-16">{{ t("Join 3,573 creators uploading files this week!") }}</div>
                </div>
              </template>
              <!--
              <template v-else-if="fileSelected">
                <div class="flex flex-col gap-5 items-center">
                  <svg width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 35.4999C0 54.7849 15.645 70.4999 35.105 70.4999H35.14C54.39 70.4999 70.035 54.7849 70.035 35.4999C70.035 16.2149 54.39 0.499908 35.14 0.499908H34.895C15.645 0.499908 0 16.2149 0 35.4999ZM30.6772 51.7913L30.6949 51.8097H30.6599L30.6772 51.7913ZM30.6772 51.7913L51.7649 29.3747C53.0949 27.9747 53.0249 25.7697 51.6249 24.4397C50.2249 23.1097 48.0199 23.1797 46.6899 24.5797L30.6249 41.6597L21.1399 31.7897C19.8099 30.3897 17.6049 30.3547 16.2049 31.6847C14.8049 33.0147 14.7699 35.2197 16.0999 36.6197L30.6772 51.7913Z" fill="#2952E6"/>
                  </svg>
                  <span class="text-2xl leading-7 font-bold w-full">
                    {{ files[0].file.name}}
                  </span>
                  <BaseButton :color="files[0].file ? 'black-outline' : 'normal'" @click="removeFile(files[0])">
                    Remove
                  </BaseButton>
                </div>
              </template>
              -->
            </Transition>
            <Transition appear>
              <BaseSnackbar class="xl:absolute bottom-5 px-4 text-xs xl:text-base text-white leading-4" v-if="uploadError">
                <span class="hidden sm:block font-semibold">{{ t("Sorry, there was an error when uploading your file.") }}</span>
              </BaseSnackbar>
            </Transition>
          </div>
        </section>
        <div v-if="modalVisible">
          <ModalsUpload :open="modalVisible" :upload-finished="uploadFinished" :project-id="projectId"  :languageCode="languageCode" :contentType="contentType" @close="modalVisible = false" @update:uploadFinished="newVal => uploadFinished = newVal" />
        </div>
        <div v-if="errorModelForCreditLessFileDuration">
            <ModalsErrorCreditInsufficient :open="openErrorCreditInsufficientModal" :fileName="fileName" :subsRenewOn="subsRenewOn" :currentSubscTitle="currentSubscTitle"
              @close="openErrorCreditInsufficientModal = false"
             />
        </div>
        <ModalsAddFile 
              :open="openAddFileModal"
              :projectId="projectId"
              :languageCode="languageCode" 
              @close="openAddFileModal = false"
              @submit="startUpload" />
      </div>
    </template>
    <template v-if="status == 'authenticated' &&
        (mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance) <= 0">
        <div id="upgrade_now">
          <section>
            <div class="relative flex-grow flex flex-col items-center justify-center gap-4 px-7 xl:px-8 text-center overflow-hidden">
              <div class="flex flex-col gap-0 items-center pb-8 pt-5">
                <span class="text-[3rem] mb-1">
                  🙌
                </span>
                <span class="text-md font-bold mb-1">
                  {{ t("Looks like you've been using Podium to the fullest!") }}
                </span>
                <span class="text-md whitespace-nowrap mb-3">
                  {{ t("Let's keep the momentum going.") }}
                </span>
                <div class="flex flex-row space-x-4">
                  <button @click="navigateToPricing()" class="w-64 bg-indigo-700 text-white font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
                    {{ t("Upgrade Plan") }}
                  </button>
                  <button v-if="(mainStore.user?.current_subscription_title && mainStore.user?.current_subscription_title != '')" @click="navigateToCredits()" class="w-64 bg-indigo-200 text-indigo-600 font-medium rounded-lg py-2 px-4 hover:bg-indigo-300 transition-all">
                    {{ t("Buy Credits") }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
    </template>
    <!--<template v-if="status == 'authenticated' &&
      (mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance) <= 0 &&
      (!mainStore.user?.current_subscription_title || mainStore.user?.current_subscription_title == '')">
      <div id="upgrade_now">
        <section>
          <div class="relative flex-grow flex flex-col items-center justify-center gap-4 px-7 xl:px-8 text-center overflow-hidden">
            <div class="flex flex-col gap-0 items-center pb-8 pt-5">
              <span class="text-[3rem] mb-1">
                😅
              </span>
              <span class="text-md font-bold mb-1">
                {{ t("You've used all your credits") }}
              </span>
              <span class="text-md whitespace-nowrap mb-3">
                {{ t("Let's find a plan that works for you!") }}
              </span>
              <button @click="navigateToPricing()" class="w-80 bg-indigo-700 text-white font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
                {{ t("Upgrade Now") }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </template>-->
  </div>
  <div v-if="uploadsDisabled">
    <span class="inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-500">{{ t("Uploading files is temporarily disabled due to an AI outage.") }}</span>
    <a href="https://status.podium.page" target="_blank" class="text-indigo-700 text-sm ml-2 cursor-pointer">{{ t("Check status") }}</a>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {useMainStore} from "~/store/main"
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

import uploadSvgSource from '@/assets/icons/upload.svg';
import moment from 'moment';

const mainStore = useMainStore()
const route = useRoute()

const { status } = useSession()
const modalVisible = ref(false)
const openAddFileModal = ref(false)
const openErrorCreditInsufficientModal =ref(false)
const projectId = ref(null)
const languageCode =ref(null)
const contentType =ref(null)
const uploadsDisabled = ref(false)
const audioDuration= ref(null)
const errorModelForCreditLessFileDuration = ref(false)
const fileName = ref(null)
const subsRenewOn =ref(null)
const currentSubscTitle = ref(null)
const { files, fileSelected, addFiles, removeFile, uploadError } = useFileList();
const props = defineProps({
  uploadFinished: Boolean,
  showAddFileModal: {
    default: true,
    type: Boolean
  },
  projectId: String,

})
const uploadFinished = ref(props.uploadFinished)

const emits = defineEmits(['update:uploadFinished']);

function navigateToPricing() {
  window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
}
function getAudioDurations(files) {
  const totalCredits = mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance;
  let totalDurationMinutes = 0;
  let filesProcessed = 0;

  function processFile(index) {
    if (index >= files.length) {
      // All files processed
      if (totalCredits < totalDurationMinutes) {
        errorModelForCreditLessFileDuration.value = true;
        openAddFileModal.value = false;
        openErrorCreditInsufficientModal.value = true;
      } else {
        console.log('All files processed successfully');
        // You can proceed with other logic here
      }
      return;
    }

    const file = files[index];
    const audio = new Audio();

    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(audio.duration);
      const durationMinutes = Math.ceil(duration / 60);
      totalDurationMinutes += durationMinutes;
      filesProcessed++;
      processFile(filesProcessed);
    });

    audio.addEventListener('error', () => {
      console.error(`Error loading file: ${file.name}`);
      filesProcessed++;
      processFile(filesProcessed);
    });

    audio.src = URL.createObjectURL(file);
  }

  processFile(0);
}
const totalLengthFiles = ref(0)
function onBrowseComplete(e) {
  subsRenewOn.value=moment(mainStore.user?.current_subscription_renews_on).format('Do MMMM')
  currentSubscTitle.value=mainStore.user?.current_subscription_title
  const file = Array.from(e.target.files)
  totalLengthFiles.value = file.length
  if(totalLengthFiles.value > 5){
    alert('You can upload only 5 files at a time.');
    return
  }
  if (file) {
    getAudioDurations(file);
  }
  addFiles(e.target.files);
  if (e.target.files.length > 0) {
    if (props.showAddFileModal) {
      openAddFileModal.value = true;
    } else {
      startUpload();
    }
    try{heap.track('upload-file-added', {
      'method': 'browse',
      'file-name': e.target.files[0].name,
      'file-size': e.target.files[0].size,
      'file-type': e.target.files[0].type,
    });}catch{}
  }

  e.target.value = ''
}
function startUpload(project,langId,type) {
  if (project != null && project.id != null) {
    projectId.value = project.id;
  }
  languageCode.value = langId
  contentType.value = type
  modalVisible.value = true;
}

function preventDefaults(e) {
  e.preventDefault()
}

const dragAreaId = computed(() => {
  if (route.name == 'upload') {
    return 'drag_area'
  } else {
    return 'drag_area_dashboard'
  }
});

const droparea = ref(null);
const dropareaSection = ref(null);
const dragCount = ref(0);

const dragActive = computed(() => {
  return dragCount.value > 0;
});

const onMouseOver = (event) => {
  if (dragCount.value == 0) {
    try {
      document.getElementById('drop_zone').classList.remove('pointer-events-none');
      document.getElementById('drop_zone_div').classList.remove('pointer-events-none');
      document.getElementById('drop_zone_buttons').classList.remove('pointer-events-none');
    } catch {}
  }
}

const onMouseLeave = (event) => {
  try {
    document.getElementById('drop_zone').classList.add('pointer-events-none');
    document.getElementById('drop_zone_div').classList.add('pointer-events-none');
    document.getElementById('drop_zone_buttons').classList.add('pointer-events-none');
  } catch {}
}

const onDragEnter = (event) => {
  dragCount.value = 1;
  document.getElementById('drop_zone').classList.add('active');
};

const onDragLeave = (event) => {
  dragCount.value = 0;
  if (dragCount.value === 0) {
    document.getElementById('drop_zone').classList.remove('active');
  }
};

function onDrop(e) {
  dragCount.value = 0;
  document.getElementById('drop_zone').classList.remove('active');
  addFiles(e.dataTransfer.files); 
  if (e.dataTransfer.files.length > 0) {
    if (props.showAddFileModal) {
      openAddFileModal.value = true;
    } else {
      startUpload();
    }
    try{heap.track('upload-file-added', {
      'method': 'drag-and-drop',
      'file-name': e.dataTransfer.files[0].name,
      'file-size': e.dataTransfer.files[0].size,
      'file-type': e.dataTransfer.files[0].type,
    });}catch{}
  }
}

const uploadFile = () => {
  document.getElementById('file_input').click();
}

const events = ['dragover','drop']

onMounted(() => {


  projectId.value = props.projectId;
  events.forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults)
  });
});

onUnmounted(() => {
  events.forEach((eventName) => {
    document.body.removeEventListener(eventName, preventDefaults)
  });
});

watch(() => uploadError.value, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      uploadError.value = false;
      try {
        document.getElementById('drop_zone').classList.add('pointer-events-none');
        document.getElementById('drop_zone_div').classList.add('pointer-events-none');
        document.getElementById('drop_zone_buttons').classList.add('pointer-events-none');
      } catch {}
      dragCount.value = 0;
    }, 2000);
  }
});

watch(() => uploadFinished.value, (newVal) => {
  emits('update:uploadFinished', newVal)
});
</script>

<style lang="scss" scoped>
.button {
  background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
  padding-left: 30px;
  padding-right: 30px;
  padding-top: 15px;
  padding-bottom: 15px;
  transition: transform 250ms cubic-bezier(0, .8, .37, 1.28), background 100ms ease;
  cursor: pointer;
  border-radius: 10px;
  margin-top: 20px;
  box-shadow: rgba(123, 97, 255, 0.69) 0px 1px 10px 0px;
}

.button:hover {
  background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
  transform: scale(1.2);
}

.button:active {
  transform: scale(1.1);
}

.button-inner {
  font-weight: bold;
  color: #fff;
  text-align: center;
  font-size: 24px;
  transition: transform 200ms cubic-bezier(0, .8, .37, 1.28);
}

.button:hover .button-inner {
  transform: scale(0.9);
}

.upload-button{
  box-shadow: 0px 1px 10px rgba(123, 97, 255, 0.69);
}

#drag_area_no_credits {

  section {
    aspect-ratio: 1/1;
    max-width: 600px;
    max-height: 600px;
    min-height: 327px;
    background: #f3f4f6;

    > div {
      position: relative;

      border: 2px dashed #D1D5DB;
      border-radius: 16px;

      label {
        background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
        line-height: 15px;

        &:hover, &:focus {
          background: #f3f4f6;
          color: #000;
        }
      }
    }

    &::before {
      box-shadow: inset 0 0 40px rgba(0, 0, 0, .25);
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      max-width: 600px;
      max-height: 600px;
      border-radius: 16px;
    }

    &.active::before {
      opacity: 1;
    }

    @media screen and (min-width: 640px) {
      min-height: 600px;
    }

    @media screen and (max-width: 426px) {
      aspect-ratio: auto;
      max-width: 90vw;
    }
  }
}

#drag_area {
  @apply relative align-top rounded-xl cursor-pointer;

  section {
    @apply p-10 flex rounded-2xl;
    aspect-ratio: 1/1;
    background: #f3f4f6;
    height: 550px;
    width: 550px;

    > div {
      @apply relative border-2 border-dashed border-gray-300 rounded-2xl px-6 py-7 h-full;

      border: 2px dashed #D1D5DB;
      border-radius: 16px;

      label {
        background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
        line-height: 15px;

        &:hover, &:focus {
          background: #f3f4f6;
          color: #000;
        }
      }
    }

    @media screen and (min-width: 640px) {
      max-height: 550px;
      max-width: 550px;
    }

    @media screen and (max-width: 426px) {
      aspect-ratio: auto;
      max-width: 90vw;
    }
  }
}


#drag_area_dashboard {
  @apply relative align-top rounded-2xl cursor-pointer hover:bg-gray-100 ;

  section {
    @apply h-[150px] rounded-2xl flex mt-4;

    > div {
      @apply relative border-2 border-dashed border-gray-300 rounded-2xl px-6 py-7 h-full;

      border: 2px dashed #D1D5DB;
      border-radius: 16px;

      label {
        background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
        line-height: 15px;

        &:hover, &:focus {
          background: #f3f4f6;
          color: #000;
        }
      }
    }

    &.active {
      @apply bg-gray-100
    }

    @media screen and (min-width: 640px) {
    }

    @media screen and (max-width: 426px) {
      aspect-ratio: auto;
    }
  }
}

#upgrade_now {
  @apply relative align-top rounded-xl h-52 mb-6 mt-2;

  section {
    @apply  rounded-xl flex;

    > div {
      @apply relative border-2 border-dashed border-indigo-700 rounded-md px-6 h-full;
      border-radius: 16px;
    }

    &::before {
      box-shadow: inset 0 0 40px rgba(0, 0, 0, .25);
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      max-width: 600px;
      max-height: 600px;
      border-radius: 16px;
    }

    &.active::before {
      opacity: 1;
    }

    @media screen and (min-width: 640px) {
    }

    @media screen and (max-width: 426px) {
      aspect-ratio: auto;
    }
  }
}
</style>

<style lang="scss" scoped>
.new-file-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-8 text-gray-900;

    }
    &__row {
        @apply col-span-full pb-6;
    }
    &__actions {
        @apply
        mt-4
        sm:mt-4
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
