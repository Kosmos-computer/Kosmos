<template>
  <div class="h-full flex flex-col pt-16 pb-16 px-8 xl:px-0 items-center bg-gray-50">
    <div class="w-full sm:w-3/5 max-w-[464px]">
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-center">
        {{ t("Log in") }}
      </h1>
      <h2 v-if="pendingStripePriceId" class="w-full text-center mt-6 text-lg leading-8 text-gray-600 text-[#4F46E5]">
        {{ t("Please log in to continue your purchase.") }}
      </h2>
      <h2 v-if="route.query && route.query.message == 'email_upload_requires_login'" class="w-full text-center mt-6 text-base leading-8 text-gray-500">
        {{ t("Please log in to your account to upload files.") }}
      </h2>

      <form @submit.prevent="login" class="flex flex-col gap-6">
        <BaseTUIWhiteButton
          @click="signInGoogle()"
          color="black-outline"
          class="mt-8"
          type="button"
        >
            <img src="/images/google_icon.svg" class="w-8 h-8 inline bottom-px relative" />
            Google
        </BaseTUIWhiteButton>
        <div class="relative">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-300" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-gray-50 px-2 text-sm text-gray-500">{{ t("Or use your email") }}</span>
          </div>
        </div>
        <BaseTUIInput
            :label="t('Email Address')"
            class="w-full"
            id="email"
            inputmode="email"
            autocomplete="on"
            v-model="email"
            required
        />
        <BaseTUIInput
            :label="t('Password')"
            class="w-full"
            id="password"
            type="password"
            inputmode="password"
            autocomplete="new-password"
            v-model="password"
            required
        />
        <div class="flex">
          <div class="grow">
            <input
              id="remember_me"
              name="remember_me"
              type="checkbox"
              class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <span class="text-sm leading-6 text-gray-900 pl-1">
              {{ t("Remember me") }}
            </span>
          </div>
          <div class="grow text-end">
            <a class="cursor-pointer leading-6 text-indigo-600"  @click="navigateTo('/forgot-password')">
              {{ t("Forgot Password?") }}
            </a>
          </div>
        </div>
        <BaseTUIButton type="submit" class="w-full">
          {{ t("Log in") }}
        </BaseTUIButton>
      </form>
    </div>
    <h2 v-if="loginError" class="text-red-500 font-bold mt-2">
      {{ t("Login failed. Please try again.") }}
    </h2>

    <span class="order-5 order-none text-gray-500 font-base pt-6">
      {{ t("Having trouble?") }}
      <a class="cursor-pointer leading-6 text-indigo-600"  @click="contactSupport()">
        {{ t("Contact Support") }}
      </a>
    </span>
    <span class="order-5 order-none text-gray-500 font-base pt-16">
      {{ t("Need to create an account?") }}
      <a class="cursor-pointer leading-6 text-indigo-600" @click="navigateTo('/create-account')">
        {{ t("Click here") }}
      </a>
    </span>

  </div>
</template>

<script setup lang="ts">
import { definePageMeta, useSession, navigateTo } from '#imports'
import { useMainStore } from "~/store/main";
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
const pendingStripePriceId = useCookie('pending_stripe_price_id')
const { signIn, status } = useSession()
const mainStore = useMainStore();
const email = ref('')
const password = ref('')
const loginError = ref(false);

if (route.query.error) {
  loginError.value = true
}

if (status.value == 'authenticated') {
    navigateTo('/dashboard')
}

const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute()
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path + '&user_email=&platform=web', '_blank');
}

const signInGoogle = async () => {
  try{heap.track('user-login-attempted', {type: 'google'});}catch{}
  mainStore.user = null
  signIn('google', { callbackUrl: '/authorize' });
}

const login = async () => {
  try{heap.track('user-login-attempted', {type: 'credentials'});}catch{}
  mainStore.user = null
  const { error, url } = await signIn('credentials', { email: email.value, password: password.value, callbackUrl: '/authorize'})
  if (error) {
    loginError.value = true
  } else {
    return navigateTo(url)
  }
}

onMounted(() => {
  try{heap.track('login-page-viewed', {});}catch{}
});

</script>

<style lang="scss" scoped>
form {
  max-width: 600px;
  width: 100%;
}
</style>
