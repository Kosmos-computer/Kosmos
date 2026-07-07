<template>
  <div class="flex-grow flex flex-col pt-16 pb-16 px-10 xl:px-0 md:h-full items-center text-center">
    <Transition appear>
      <div v-if="modalVisible" style="z-index:60">
        <EmailModal v-model:modal-visible="modalVisible" v-model:email-address="emailAddress"/>
      </div>
    </Transition>

    <h6 class="text-4xl font-bold mb-5">
      Your files are processing. <br/> Check your email.
    </h6>
    <span class="mb-5" style="max-width: 650px;">
      An email has been sent to <b>{{ emailAddress }}</b> containing the URL where you’ll download your assets once they’re complete.<br/>Another email will be sent when your files are ready!
    </span>
    <form @submit.prevent="alterEmail" class="w-full">
      <div class="flex flex-col sm:flex-row justify-center w-full mb-5 gap-5 sm:gap-4">
        <BaseInput v-model:model-value="emailAddress"></BaseInput>
        <BaseButton type="submit" class="w-56" color="black-outline">
          <template v-if="!updateEmailPending && !emailUpdated">
            Resend Email
          </template>
          <template v-if="updateEmailPending && !emailUpdated">
            Resending...
          </template>
          <template v-if="emailUpdated">
            Resent!
          </template>
        </BaseButton>
      </div>
    </form>

    <h6 class="text-3xl font-bold mb-5 mt-16">
      Ready to create an account?
    </h6>
    <span class="mb-5" style="max-width: 650px;">
      Check on the status of all your files and access even more AI magic by creating an account.
    </span>
    <BaseButton @click="navigateTo('/create-account')" class="w-56">
      Let's Go!
    </BaseButton>

    <button class="text-[#007AFF] font-medium mb-2.5 mt-16" @click="contactSupport()">
      Contact Support
    </button>
  </div>
</template>

<script setup lang="ts">
import updatePodiumPackage from "../apollo/mutations/updatePodiumPackage.gql";
import {useMainStore} from "~/store/main";

definePageMeta({
  auth: false,
  middleware: () => {
    const mainStore = useMainStore();
    if (!mainStore.files.length) {
      return navigateTo('/upload');
    }
    return true;
  }
})
const modalVisible = ref(false);
const emailAddress = ref('');
const updateEmailPending = ref(false);
const emailUpdated = ref(false);

onMounted(() => {
  modalVisible.value = true;
  try{heap.track('confirm-email-page-viewed');}catch{}
});

const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute();
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path +'&user_email=' + emailAddress.value + '&platform=web', '_blank');
}

const mainStore = useMainStore();

const alterEmail = async () => {
  try {
    const { mutate, loading } = useMutation(updatePodiumPackage, {
      variables: {
        podiumPackageGuid: mainStore.podiumPackageGuid,
        userEmail: emailAddress.value,
      }
    });
    updateEmailPending.value = loading.value;
    const result = await mutate();
    try{heap.track('confirm-email-page-email-changed', {
      email: emailAddress.value,
    });}catch{}
  } catch (err) {
    console.error(err);
  } finally {
    updateEmailPending.value = false;
    emailUpdated.value = true;
    setTimeout(() => {
      emailUpdated.value = false;
    }, 2000);
  }
};
</script>

<style lang="scss" scoped>
input {
  max-width: 455px;
  width: 100%;

  @media screen and (max-width: 640px) {
    max-width: unset;
  }
}
</style>
