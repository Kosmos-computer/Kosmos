<template>
  <ModalsTemplate :open="open">
    <h1 v-if="mainStore.files.length>1" class="text-lg leading-6 font-medium text-gray-900 text-center">
      {{ t('Your files are uploading...') }} 
    </h1>
    <h1 v-else class="text-lg leading-6 font-medium text-gray-900 text-center">
      {{ t('Your file is uploading...') }} 
    </h1>
    
    
    <div v-for="(file, index) in fileProgressArray">
      <div  class="my-4 w-full" aria-hidden="true">
        <div class="overflow-hidden rounded-full bg-gray-200">
          <div class="h-2.5 rounded-full bg-indigo-600" :style="{ width: file + '%' }"> </div>
        </div>
      </div>
  
      <h2 class="text-xs leading-5 font-medium text-gray-400 text-center mb-4">
      {{ mainStore.files[index].file.name }}  {{file}}{{ t('% Complete') }}
      </h2>
      <button v-if="file!=100" type="button" class="btn btn-cancel" @click="cancelUpload()">{{ t('Cancel') }}</button>
    </div>
    

    
  </ModalsTemplate>
</template>

<script setup>
import axios from "axios";
import createPodiumPackage from "~/apollo/mutations/createPodiumPackage.gql";
import updatePodiumPackage from "~/apollo/mutations/updatePodiumPackage.gql";
import {useMainStore} from "~/store/main";
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const gtag = useGtag()


const { files, fileSelected, addFiles, removeFile, clearAll, uploadError } = useFileList();

const props = defineProps({
        open: { type: Boolean, required: true },
        uploadFinished: { type: Boolean, required: true },
        projectId: { type: String, required: false, default: null },
        languageCode: { type: String, required: false, default: null }, 
        contentType: { type: String, required: false, default: null },
    });

const emit = defineEmits(['close', 'submit', 'update:uploadFinished'])
const uploadPending = ref(false);
const uploadProgress = ref(0);


// used for first time folks to return to the job page
// I tried usng the mainstore.podiumPackageGuid but it was null after page redirect
// this is a specified way to address versus hijacking a different process
const podiumPackageGuid = useCookie('podiumPackageGuid')

const mainStore = useMainStore();

onMounted(async () => {
  await startUpload();
});
const fileProgressArray = ref([]);

const cancelUpload = async () => {
  uploadController.abort("canceled");
  try{ heap.track('cancel-upload-clicked', {}); } catch{}
  handleClose()
};

const handleClose = () => {
  clearAll()
  emit('close')
};

const uploadController = new AbortController()

const startUpload = async () => {
  console.log('strat upload in upload',props)
  
  try {
    if (mainStore.files.length === 0) {
      throw new Error('File is empty');
    }
    
    for (let i = 0; i < mainStore.files.length; i++) {
      if(mainStore.files.length === 0) {
        break;
      }
      if  (mainStore.files[i].file && mainStore.files[i].file.size === 0){
        throw new Error('File is empty');
      }

    try {
        heap.track('file-upload-started', {
        'email': mainStore.user.email,
        'file-name': mainStore.files[i].file.name,
        'file-size': mainStore.files[i].file.size,
        'file-type': mainStore.files[i].file.type
        });
      } catch {}
    const { mutate, loading } = useMutation(createPodiumPackage, {
      variables: {
        userEmail: mainStore.user.email,
        originalFilename: mainStore.files[i].file.name,
        projectId: props.projectId,
        languageCode: props.languageCode,
        contentType: props.contentType
      }
    });

    uploadPending.value = loading;

    const { data } = await mutate();

    mainStore.podiumPackageGuid = data.createPodiumPackage.podiumPackageGuid;

    podiumPackageGuid.value = data.createPodiumPackage.podiumPackageGuid;

    const formData = new FormData();

    formData.append('key', data.createPodiumPackage.key);
    formData.append('AWSAccessKeyId', data.createPodiumPackage.AWSAccessKeyId);
    formData.append('policy', data.createPodiumPackage.policy);
    formData.append('signature', data.createPodiumPackage.signature);
    formData.append('file', mainStore.files[i].file);

    /*
    const res = await $fetch(data.createPodiumPackage.url, {
      method: 'POST',
      body: formData,
      signal: signal
    });
    */

    const response = await axios.post(
      data.createPodiumPackage.url,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          fileProgressArray.value[i] = Math.round((loaded / total) * 100);
          },
        signal: uploadController.signal
      }
    );

    // upload finished, set audioStored to true to trigger processing of transcript

    // Google Conversion Event
    const uploadEvent = {
      'description': 'User Upload',
      'value': 1.00,
      'currency': 'USD'
    }
    gtag("event", "user_upload", uploadEvent);

    await setAudioStored();
    await mainStore.setMediaPage(1);
    await mainStore.setProjectMediaPage(1);
    
    try {
      heap.track('job-created', {
        'email': mainStore.user.email,
        'job-id': data.createPodiumPackage.podiumPackageGuid,
        'file-name': mainStore.files[i].file.name,
        'file-size': mainStore.files[i].file.size,
        'file-type': mainStore.files[i].file.type
      });
    } catch {}
  }

    emit('update:uploadFinished', true);

    handleClose()
  } catch (err) {
    console.log(err.message);

    if (err.message ==='canceled') {
      mainStore.files = [];
      return;
    }

    throw showError({
      statusCode: 404,
      statusMessage: 'There was an error processing your file.',
    });
  }
};

const setAudioStored = async () => {
  const { mutate, loadingUpdateAudioStored } = useMutation(updatePodiumPackage, {
      variables: {
        podiumPackageGuid: mainStore.podiumPackageGuid,
        audioStored: true,
      }
    });

  const { updateAudioStoredData } = await mutate();
};
</script>

<style lang="scss" scoped>
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
