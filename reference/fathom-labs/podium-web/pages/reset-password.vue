<template>
  <div class="h-full flex flex-col pt-16 pb-16 px-8 xl:px-0 items-center bg-gray-50">
    <div class="w-full sm:w-3/5 max-w-[464px]" v-if="showForm">
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-left">
        {{ t("Reset Password") }}
      </h1>
      <h2 class="my-6 text-base leading-6 text-gray-500 text-left">
        {{ t("Your password should contain at least:") }}
        <ul class="list-disc list-inside pl-3">
          <li>{{ t("8 characters.") }}</li>
          <li>{{ t("1 letter (abcd)") }}</li>
          <li>{{ t("1 number (1234)") }}</li>
          <li>{{ t("1 special character (#@$%)") }}</li>
        </ul>
      </h2>

      <form @submit.prevent="resetPassword" class="flex flex-col gap-6">
        <BaseTUIInput
            class="w-full"
            id="password"
            type="password"
            inputmode="password"
            autocomplete="new-password"
            v-model="password"
            @input="password = $event.target.value"
            label="New Password"
            required
        />
        <BaseTUIInput
            class="w-full"
            id="re-password"
            type="password"
            inputmode="password"
            autocomplete="new-password"
            v-model="rePassword"
            @input="rePassword = $event.target.value"
            label="Confirm Password"
            required
        />
        <BaseTUIButton type="submit" class="w-full">
          {{ t("Reset Password") }}
        </BaseTUIButton>
      </form>
      <div v-if="passwordError != null" class="text-red-800 font-medium leading-5 px-6 py-4 rounded-md bg-red-50 mt-6">
        <SvgError class="inline mr-3" /> {{ passwordError }}
      </div>
    </div>
    <div class="w-full sm:w-3/5 max-w-[464px]" v-else>
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-left">
        {{ t("Your Password is Reset!") }}
      </h1>
      <h2 class="my-6 text-base leading-6 text-gray-500 text-left">
        {{ t("Click the button below to log in.") }}
      </h2>

      <BaseTUIButton type="submit" class="w-full" @click="navigateTo('/login')">
        {{ t("Log in") }}
      </BaseTUIButton>

    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
import axios from 'axios'
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

const route = useRoute();
const config = useRuntimeConfig()

const token = ref(route.query.token);
const password = ref('');
const rePassword = ref('');
const passwordError = ref(null);
const showForm = ref(true);


const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute();
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path +'&user_email=' + emailAddress.value + '&platform=web', '_blank');
}

const checkPassword = (password, rePassword) => {
    const specialChars = new Set(["#", "@", "$", "%", "!", "&", "*", "(", ")", "+", "-", "_", "=", "{", "}", "[", "]", ":", ";", "'", "<", ">", ",", ".", "?"]);

    if (password !== rePassword) {
        return "Passwords do not match.";
    }

    if (!password.split('').some(char => char.toLowerCase() !== char.toUpperCase())) {
        return "Password must contain at least 1 letter.";
    }

    if (!password.split('').some(char => !isNaN(char))) {
        return "Password must contain at least 1 number.";
    }

    if (!password.split('').some(char => specialChars.has(char))) {
        return "Password must contain at least 1 special character (#@$%).";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    return "";
}

const resetPassword = async () => {
  passwordError.value = checkPassword(password.value, rePassword.value);
  
  if (passwordError.value != '') {
    return;
  }
  
  try {
    const response = await axios.post(config.public.fathomWebApiURL + '/api/podium/internal/v1/user/reset_password', {
      token: token.value,
      new_password: password.value
    })

    // if response status is not 200, an error will be thrown and caught in the catch block
    showForm.value = false
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      passwordError.value = error.response.data.detail
    } else {
      passwordError.value = 'Unexpected error occurred.'
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
