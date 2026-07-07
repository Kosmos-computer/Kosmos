<template>
  <div>

    <div class="screen" />
    <div class="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center z-60">
      <Transition name="bounce" appear>
        <div class="w-[464px] flex flex-col items-center bg-white rounded-lg text-center px-6 py-6">
          <h1 class="text-lg leading-6 font-medium text-gray-900 text-center">
            {{ t('Your file is uploading...') }}
          </h1>

          <div class="my-4 w-3/4" aria-hidden="true">
            <div class="overflow-hidden rounded-full bg-gray-200">
              <div class="h-2.5 rounded-full bg-indigo-600" :style="{ width: uploadProgress + '%' }"> </div>
            </div>
          </div>

          <h2 class="text-xs leading-5 font-medium text-gray-400 text-center">
            {{uploadProgress}}% {{ t('Complete') }}
          </h2>

          <BaseTUIWhiteButton
              @click="cancelUpload()"
              class="w-full mt-4 font-medium">
            {{ t('Cancel') }}
          </BaseTUIWhiteButton>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import createPodiumPackage from "~/apollo/mutations/createPodiumPackage.gql";
import updatePodiumPackage from "~/apollo/mutations/updatePodiumPackage.gql";
import {useMainStore} from "~/store/main";
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const { files, fileSelected, addFiles, removeFile, clearAll, uploadError } = useFileList();

const props = defineProps({
  modalVisible: {
    type: Boolean,
    required: true
  },
  uploadFinished: {
    type: Boolean,
    required: true
  },
  projectId: {
    type: String,
    required: false
  }
});
const emits = defineEmits(['update:modalVisible', 'update:uploadFinished']);
const uploadPending = ref(false);
const uploadProgress = ref(0);


// used for first time folks to return to the job page
// I tried usng the mainstore.podiumPackageGuid but it was null after page redirect
// this is a specified way to address versus hijacking a different process
const podiumPackageGuid = useCookie<string>('podiumPackageGuid')

const mainStore = useMainStore();

onMounted(async () => {
  await startUpload();
});

const cancelUpload = async () => {
  uploadController.abort("canceled");
  try{ heap.track('cancel-upload-clicked', {}); } catch{}
  closeModal()
};

const closeModal = () => {
  clearAll()
  //emits('update:modalVisible', false);
};

const uploadController = new AbortController()

const startUpload = async () => {
  return
  try {
    if (mainStore.files.length === 0 || (mainStore.files[0].file && mainStore.files[0].file.size === 0)) {
      throw new Error('File is empty');
    }

    try {
        heap.track('file-upload-started', {
        'email': mainStore.user.email,
        'file-name': mainStore.files[0].file.name,
        'file-size': mainStore.files[0].file.size,
        'file-type': mainStore.files[0].file.type
        });
      } catch {}

    const { mutate, loading } = useMutation(createPodiumPackage, {
      variables: {
        userEmail: mainStore.user.email,
        originalFilename: mainStore.files[0].file.name,
        projectId: props.projectId,
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
    formData.append('file', mainStore.files[0].file);

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
          uploadProgress.value = Math.round((loaded * 100) / total);
        },
        signal: uploadController.signal
      }
    );

    // upload finished, set audioStored to true to trigger processing of transcript
    await setAudioStored();
    await mainStore.setMediaPage(1);

    try {
      heap.track('job-created', {
        'email': mainStore.user.email,
        'job-id': data.createPodiumPackage.podiumPackageGuid,
        'file-name': mainStore.files[0].file.name,
        'file-size': mainStore.files[0].file.size,
        'file-type': mainStore.files[0].file.type
      });
    } catch {}

    emits('update:uploadFinished', true);

    closeModal()
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

.screen {
    @apply fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity;
}

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

</style>
