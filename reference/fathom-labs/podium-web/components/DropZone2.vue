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
            @mouseover="isHovering = true"
            @mouseleave="isHovering = false"
        >
          <section 
            id="drop_zone2" 
            ref="dropareaSection"
            class="pointer-events-none"
          >
            <div 
              id="drop_zone_div2"
              :class="['relative flex-grow flex flex-col items-center justify-center gap-5 px-7 xl:px-8 text-center overflow-hidden']" @click="$refs.fileInput.click()">
              <Transition mode="out-in" :duration="100">
                <template v-if="dragActive">
                  <div class="flex flex-col gap-4 items-center pointer-events-none">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.6667 22.6667C6.98477 22.6667 4 19.6819 4 16C4 12.7354 6.34656 10.0188 9.44502 9.44502C10.0188 6.34656 12.7354 4 16 4C19.2646 4 21.9812 6.34656 22.555 9.44502C25.6534 10.0188 28 12.7354 28 16C28 19.6819 25.0152 22.6667 21.3333 22.6667M12 16L16 12M16 12L20 16M16 12V28" stroke="#0891B2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="text-xl font-semibold text-cyan-500 pb-3">
                      {{ t("Release your file to upload") }}
                    </span>
                  </div>
                </template>
                <template v-else> 
                  <div id="drop_zone_buttons2" :class="['flex flex-col gap-2 items-center pointer-events-none']" >
                    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_9945_3575)">
                      <path d="M14.7921 35.2222L14.6001 28.111H9.8001C8.0401 28.111 6.6001 26.511 6.6001 24.5555V10.3333C6.6001 8.37771 8.0401 6.77771 9.8001 6.77771H32.2001C33.9601 6.77771 35.4001 8.37771 35.4001 10.3333V24.5555C35.4001 26.511 33.9601 28.111 32.2001 28.111H23.4001L14.7921 35.2222Z" stroke="#0891B2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M24.7278 16.2889L19.3198 12.8222C18.5678 12.3422 17.6238 12.9467 17.6238 13.9067V20.8578C17.6238 21.8178 18.5678 22.4222 19.3198 21.9422L24.7278 18.4755C25.4798 17.9955 25.4798 16.7867 24.7278 16.3067V16.2889Z" fill="#0891B2"/>
                      </g>
                      <defs>
                      <clipPath id="clip0_9945_3575">
                      <rect width="32" height="32" fill="white" transform="translate(5 5)"/>
                      </clipPath>
                      </defs>
                    </svg>
                    <span class="text-base my-2">
                      <a @click.stop.prevent="uploadFile" class="text-cyan-600 cursor-pointer" :class="['transition-all duration-300', isHovering ? 'opacity-0 visibility-hidden' : 'opacity-100 visibility-visible']" >{{ t("Create a New Clip") }}</a>
                    </span>
                    <span @click.stop.prevent="uploadFile" class="absolute inset-x-0 top-20 text-cyan-600 text-base cursor-pointer" :class="['transition-all duration-300', isHovering ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']"> {{ t('Drag and drop your file or click here') }} </span>
                    <span class="absolute inset-x-0 top-28 text-xs text-cyan-600 whitespace-nowrap" :class="['transition-all duration-300', isHovering ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
                      {{ t("All audio/video formats are supported. Max file size is 4GB.") }}
                    </span>
                    <div v-if="!dragActive" :class="{'button': route.name == 'upload'}" >
                      <div v-if="route.name == 'upload'" class="button-inner">Upload File</div>
                      <input ref="fileInput" maxlength="5" multiple @change="onBrowseComplete($event)" id="file_input" type="file" class="hidden" accept="audio/*,video/*"/>
                    </div>
                    <div v-if="route.name == 'upload'" class="text-base font-base text-gray-500 mt-16">Join <span class="font-bold">3,573 creators</span> uploading files this week!</div>
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
            <ModalsUpload :open="modalVisible" :upload-finished="uploadFinished" :project-id="projectId"  :languageCode="languageCode" :contentType="contentType"  @close="modalVisible = false" @update:uploadFinished="newVal => uploadFinished = newVal" />
          </div>
          <div v-if="errorModelForCreditLessFileDuration">
              <ModalsErrorCreditInsufficient :open="openErrorCreditInsufficientModal" :fileName="fileName" :subsRenewOn="subsRenewOn" :currentSubscTitle="currentSubscTitle"
                @close="openErrorCreditInsufficientModal = false"
               />
          </div>
          <ModalsAddFile 
                :open="openAddFileModal"
                ::projectId="projectId"
                :languageCode="languageCode" 
                @close="openAddFileModal = false"
                @submit="startUpload" />
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
  
  import moment from 'moment';
  
  const mainStore = useMainStore()
  const route = useRoute()

  const isHovering = ref(false)
  const { status } = useSession()
  const modalVisible = ref(false)
  const openAddFileModal = ref(false)
  const openErrorCreditInsufficientModal =ref(false)
  const projectId = ref(null)
  const languageCode =ref(null)
  const contentType =ref(null)
  const uploadsDisabled = ref(false)
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
        document.getElementById('drop_zone2').classList.remove('pointer-events-none');
        document.getElementById('drop_zone_div2').classList.remove('pointer-events-none');
        document.getElementById('drop_zone_buttons2').classList.remove('pointer-events-none');
      } catch {}
    }
  }
  
  const onMouseLeave = (event) => {
    try {
      document.getElementById('drop_zone2').classList.add('pointer-events-none');
      document.getElementById('drop_zone_div2').classList.add('pointer-events-none');
      document.getElementById('drop_zone_buttons2').classList.add('pointer-events-none');
    } catch {}
  }
  
  const onDragEnter = (event) => {
    dragCount.value = 1;
    document.getElementById('drop_zone2').classList.add('active');
  };
  
  const onDragLeave = (event) => {
    dragCount.value = 0;
    if (dragCount.value === 0) {
      document.getElementById('drop_zone2').classList.remove('active');
    }
  };
  
  function onDrop(e) {
    dragCount.value = 0;
    document.getElementById('drop_zone2').classList.remove('active');
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
          document.getElementById('drop_zone2').classList.add('pointer-events-none');
          document.getElementById('drop_zone_div2').classList.add('pointer-events-none');
          document.getElementById('drop_zone_buttons2').classList.add('pointer-events-none');
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
    @apply relative align-top rounded-2xl cursor-pointer bg-cyan-200 hover:bg-cyan-300 ;
  
    section {
      @apply h-[150px] rounded-2xl flex mt-4;
  
      > div {
        @apply relative rounded-2xl px-6 py-7 h-full;
  
        label {
          background: linear-gradient(90.11deg, #007AFF 0.04%, #F300FF 99.86%);
          line-height: 15px;
        }
      }
  
      &.active {
        @apply bg-cyan-300
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
  