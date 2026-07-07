<template>
  <div class="fixed top-0 bottom-0 right-0 left-0 bg-black opacity-50 z-50">
  </div>
  <div class="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center px-4 sm:px-0 z-60">
    <Transition name="bounce" appear>
      <div class="email-modal flex flex-col items-center bg-white px-5 sm:px-10 pt-10 sm:pt-16 pb-6 sm:pb-7 rounded-3xl text-center">
        <SvgEmail class="mb-5 sm:mb-12"/>
        <h6 class="text-4xl font-bold mb-6">
          Enter your email to get your link.
        </h6>
        <span class="font-medium mb-9">
          Please provide your email for your file to begin processing. You will be sent a download link when your file is complete.
        </span>
        <form @submit.prevent="submitForm" class="w-full">
          <BaseInput
              placeholder="Add Email"
              class="w-full mb-5"
              id="email"
              type.prop="onWhite"
              inputmode="email"
              autocomplete="on"
              :value="emailAddress"
              @input="emits('update:emailAddress', $event.target.value)"
          />
          <Transition appear>
            <BaseSnackbar v-if="emailInvalid" class="font-semibold text-center leading-4 w-full mb-5 text-white">
              Sorry, that email address is not valid.
            </BaseSnackbar>
          </Transition>
          <BaseButton
              :disabled="!emailAddress"
              class="w-full"
              type="submit"
          >
            <template v-if="!uploadPending">
              Next
            </template>
            <template v-else>
              Uploading {{uploadProgress}}%...do not close this window.
            </template>
          </BaseButton>
          <div class="w-full mt-6">
            <button
              @click="cancelUpload()"
              type="button"
              class="font-medium text-primary opacity-80 hover:text-black hover:opacity-100"
          >
            Cancel Upload
          </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from "axios";
import createPodiumPackage from "~/apollo/mutations/createPodiumPackage.gql";
import updatePodiumPackage from "~/apollo/mutations/updatePodiumPackage.gql";
import podiumEmailRequiresLogin from "~/apollo/queries/podiumEmailRequiresLogin.gql";
import {useMainStore} from "~/store/main";

const props = defineProps<{
  modalVisible: boolean,
  emailAddress: string
}>();
const emits = defineEmits(['update:modalVisible', 'update:emailAddress', 'uploadError']);

const emailCookie = useCookie('email');
if (emailCookie && emailCookie.value) {
  emits('update:emailAddress', emailCookie.value);
}

const closeModal = () => {
  emits('update:modalVisible', false);
};

const {isValidEmailAddress} = useValidations();

const emailInvalid = ref(false);
const uploadPending = ref(false);
const uploadProgress = ref(0);

const mainStore = useMainStore();

const cancelUpload = async () => {
  console.log("upload cancelled")
  uploadController.abort("canceled")
  try{ heap.track('cancel-upload-clicked', {}); } catch{}
  navigateTo('/upload');
};

const uploadController = new AbortController()

const submitForm = async () => {
  if (!isValidEmailAddress(props.emailAddress)) {
    emailInvalid.value = true;
    return;
  }
  emailInvalid.value = false;

  emailCookie.value = props.emailAddress;

  try {
    const { data } = await useAsyncQuery(podiumEmailRequiresLogin, 
      { 
        email: props.emailAddress
      }
    )

    if (data.value.podiumEmailRequiresLogin) {
      navigateTo({ path: '/login', query: { message: 'email_upload_requires_login' } })
      return
    }
  } catch (e) {
    throw showError({
      statusCode: 404,
      statusMessage: 'Unable to validate email address',
    })  
  }

  
  await mainStore.retrieveUser(props.emailAddress)

  if (mainStore.user) {
    if (mainStore.user.additionalCreditsBalance <= 0) {
      navigateTo('https://hello.podium.page/pricing?message=credits_exhausted', {external: true});
      return
    }
  }
 
  try {

    try {
      window.intercomSettings.email = props.emailAddress
      Intercom('update', {'email': props.emailAddress})

      heap.identify(props.emailAddress);
      heap.addUserProperties({
        'email': props.emailAddress
      });
      heap.track('file-upload-started', {
      'email': props.emailAddress,
      'file-name': mainStore.files[0].file.name,
      'file-size': mainStore.files[0].file.size,
      'file-type': mainStore.files[0].file.type
      });
    } catch {}

    const { mutate, loading } = useMutation(createPodiumPackage, {
      variables: {
        userEmail: props.emailAddress,
        originalFilename: mainStore.files[0].file.name
      }
    });

    uploadPending.value = loading;

    const { data } = await mutate();

    mainStore.podiumPackageGuid = data.createPodiumPackage.podiumPackageGuid;
    if (!mainStore.user) {
      await mainStore.retrieveUser(props.emailAddress)
    }

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

    const creditLimit = useCookie<number>('creditLimit');

    const newValue = creditLimit.value - 1;

    creditLimit.value = newValue < 0 ? 0 : newValue;

    closeModal();
    
    try { 
      heap.track('job-created', {
        'email': props.emailAddress,
        'job-id': data.createPodiumPackage.podiumPackageGuid,
        'file-name': mainStore.files[0].file.name,
        'file-size': mainStore.files[0].file.size,
        'file-type': mainStore.files[0].file.type
      });
    } catch {}
    
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

const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute()
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path + '&user_email=' + mainStore.user.email + '&platform=web', '_blank');
}


watch(
    () => props.emailAddress,
    (newVal) => {
      console.log(newVal);
    }
)
</script>

<style lang="scss" scoped>
.email-modal {
  max-width: 693px;
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
