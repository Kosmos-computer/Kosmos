<template>
  <div class="h-full flex flex-col pt-16 pb-16 px-8 xl:px-0 items-center bg-gray-50">
    <div class="w-full sm:w-3/5 max-w-[464px]" v-if="showForm">
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-left">
        {{ t("Reset Password") }}
      </h1>
      <h2 class="my-6 text-base leading-6 text-gray-500 text-left">
        {{ t("Enter your email and we'll send you a link to reset your password.") }}
      </h2>

      <form @submit.prevent="resetPassword(false)" class="flex flex-col gap-6">
        <BaseTUIInput
            :label="t('Email Address')"
            class="w-full"
            id="email"
            inputmode="email"
            autocomplete="on"
            v-model="email"
            required
        />
        <BaseTUIButton type="submit" class="w-full">
          {{ t("Send Link to Email") }}
        </BaseTUIButton>
      </form>
      <div v-if="error != null" class="text-red-800 font-medium leading-5 px-6 py-4 rounded-md bg-red-50 mt-6">
        <SvgError class="inline mr-3" /> {{ error }}
      </div>
    </div>
    <div class="w-full sm:w-3/5 max-w-[464px]" v-else>
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-left flex items-center">
        <img :src="checkCircleSvgSource" alt="Check Cirle" class="pr-6"/>
        {{ t("Email Sent") }}
      </h1>
      <div class="my-6 text-base leading-6 text-gray-500 text-left">
        {{ t("An email has been sent to") }} <span class="font-bold">{{ email }}</span> {{ t("if the email associated with a Podium account.") }}
      </div>
      <div class="my-6 text-base leading-6 text-gray-500 text-left">
        {{ t("A link provided in the email will allow you to reset your password.") }}
      </div>

      <div class="mb-6">
        <span class="order-5 order-none text-gray-500 font-base pt-6">
          {{ t("Don't see the email?") }}
          <a class="cursor-pointer leading-6 text-indigo-600"  @click="resetPassword(true)">
            {{ t("Click here to resend it") }}
          </a>
        </span>
      </div>

      <span class="order-5 order-none text-gray-500 font-base pt-6">
        {{ t("Do you need any more help?") }}
        <a class="cursor-pointer leading-6 text-indigo-600"  @click="contactSupport()">
          {{ t("Contact Support") }}
        </a>
      </span>

      <div v-if="passwordResent" class="mt-6 rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <CheckCircleIcon class="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">{{ t("An email has been resent") }}</h3>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";

import { definePageMeta } from '#imports'
import checkCircleSvgSource from '@/assets/icons/check-circle.svg'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});



definePageMeta({
  layout: "app",
  auth: false
});

const config = useRuntimeConfig()

const email = ref('')
const error = ref(null);
const showForm = ref(true);
const passwordResent = ref(false);

const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute();
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path +'&user_email=' + emailAddress.value + '&platform=web', '_blank');
}

const isValidEmail = () => {
  const emailRegex = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (!emailRegex.test(email.value)) {
    error.value = 'This is not a valid email address.'
    return false
  }
  return true;
}

const resetPassword = async (resend: boolean) => {
  if (isValidEmail()) {
    try {
      await axios.post(config.public.fathomWebApiURL + '/api/podium/internal/v1/user/request_reset_password', { email: email.value });
      showForm.value = false;
      if (resend) {
        passwordResent.value = true;
        setTimeout(() => {
          passwordResent.value = false;
        }, 5000);
      }
    } catch (e) {
      console.log(e)
      error.value = 'An error occurred. Please try again.'
    }
  }
}

</script>

<style lang="scss" scoped>
form {
  max-width: 600px;
  width: 100%;
}
</style>
