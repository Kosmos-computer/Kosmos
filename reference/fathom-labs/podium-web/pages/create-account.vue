<template>
  <div class="h-max flex">
    <div class="h-max w-full sm:min-w-[500px] sm:w-8/12 bg-gray-50">
      <Transition mode="out-in">
        <div class="pt-12 pb-12 h-max w-full flex flex-col items-center px-8 sm:px-24">
          <div class="w-full sm:w-3/5 sm:max-w-[464px] sm:min-w-[464px]">
            <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-center">{{ t("Get 3 Free Hours of AI Magic.") }}</h1>
            <h2 class="mt-6 text-base leading-6 text-gray-500 text-center">
              {{ t("Trusted by over 4,000 podcast creators.") }}
            </h2>
            <form @submit.prevent="registerUser" class="flex flex-col gap-6 text-sm">
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
                  class="w-full"
                  id="email"
                  inputmode="email"
                  autocomplete="on"
                  v-model="emailAddress"
                  :label="t('Email Address')"
                  required
              />
              <BaseTUIInput
                  class="w-full"
                  id="password"
                  type="password"
                  inputmode="password"
                  autocomplete="new-password"
                  v-model="password"
                  @input="password = $event.target.value"
                  :label="('Password')"
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
                  :label="('Retype Password')"
                  required
              />
              <BaseTUIButton
                  type="submit"
                  class="w-full">
                  {{ t("Create Account") }}
              </BaseTUIButton>
            </form>
          </div>
          <h2 v-if="createUserError != ''" class="text-red-500 font-bold mt-2">
              {{ createUserError }}
          </h2>
          <span class="order-5 order-none text-gray-500 font-base pt-6">
            {{ t("Having trouble?") }}
            <a class="cursor-pointer leading-6 text-indigo-600"  @click="contactSupport()">
              {{ t("Contact Support") }}
            </a>
          </span>
          <span class="order-5 order-none text-gray-500 font-base pt-16">
            {{ t("Already have an account?") }}
            <a class="cursor-pointer leading-6 text-indigo-600" @click="navigateTo('/login')">
              {{ t("Login here") }}
            </a>
          </span>
        </div>
      </Transition>
    </div>
    <div class="flex-grow bg-gray-100 hidden justify-center sm:flex">
      <div class="flex flex-col gap-20 items-center justify-center" style="height: calc(100vh - 129px)">
        <div class="bg-white w-[378px] p-9 text-lg flex flex-col rounded-lg mx-16">
          <div>
            {{ t("The speed is INCREDIBLE considering how much time we spend currently developing the transcript, notes, and various meta data for distribution and promotion.") }}
          </div>

          <div class="flex items-start mt-4">
            <img src="/images/ellipse.png" class="pr-2"/>

            <div>
              <div class="font-bold">Colleen O'Connell</div>
              <div>Harper Collins</div>
            </div>
          </div>
        </div>

        <div class="bg-white w-[378px] p-9 text-lg flex flex-col rounded-lg mx-16">
          <div>
            {{ t("Absolutely LOVE Podium. It easily saves me over $150 per episode and what used to take hours, literally takes minutes.") }}
          </div>

          <div class="flex items-start mt-4">
            <img src="/images/derek_gehl.png" class="pr-2"/>

            <div>
              <div class="font-bold">Derek Gehl</div>
              <div>Project Ignite Podcast</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
definePageMeta({
  layout: "app",
  auth: false
});
import podiumCreateUser from "~/apollo/mutations/podiumCreateUser.gql"
import { useMainStore } from "~/store/main"
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const mainStore = useMainStore();
const { signIn, status } = useSession();

if (status.value == 'authenticated') {
    navigateTo('/dashboard')
}

const {isValidEmailAddress} = useValidations();

const pendingStripePriceId = useCookie('pending_stripe_price_id')
const firstTimeVisit = useCookie<boolean>('firstTimeVisit')
const gtag = useGtag()

const emailAddress = ref('');
const password = ref('');
const rePassword = ref('');
const alternateEmail = useCookie('email')
const createUserPending = ref(false);
const createUserError = ref("");

if (alternateEmail.value) {
  emailAddress.value = alternateEmail.value;
}

const contactSupport = () => {
  Intercom('showNewMessage');
  //const route = useRoute()
  //window.open('https://xlibglob9oh.typeform.com/to/TPAJ56kr#route_name=' + route.name + '&route_path=' + route.path + '&user_email=&platform=web', '_blank');
}

const signInGoogle = async () => {
  try{heap.track('new-account-created-attempted', {type: 'google'});}catch{}

  try {
        // Google Conversion Event
        const accountEvent = {
          'description': 'New User Account Created',
          'value': 1.00,
          'currency': 'USD'
        }
        gtag("event", "new_account_created", accountEvent);
  } catch {}

  firstTimeVisit.value = true
  mainStore.user = null
  signIn('google', { callbackUrl: '/authorize' });
}

const registerUser = async () => {
  mainStore.user = null
  createUserError.value = null;

  if (!isValidEmailAddress(emailAddress.value)) {
    createUserError.value = "Please enter a valid email address.";
    return;
  }

  if (password.value !== rePassword.value) {
    createUserError.value = "Passwords do not match.";
    return;
  }

  if (password.value.length < 8) {
    createUserError.value = "Password must be at least 8 characters.";
    return;
  }

  try {
    try{heap.track('new-account-created-attempted', {type: 'credentials'});}catch{}

    const { mutate, loading } = useMutation(podiumCreateUser, {
      variables: {
        email: emailAddress.value,
        password: password.value,
        alternateEmail: alternateEmail.value
      }
    });

    createUserPending.value = loading.value;
    const result = await mutate();
    if (result && result.data.podiumCreateUser.ok) {
      firstTimeVisit.value = true

      try {
        // Google Conversion Event
        const accountEvent = {
          'description': 'New User Account Created',
          'value': 1.00,
          'currency': 'USD'
        }
        gtag("event", "account_created", accountEvent);
      } catch {}

      await signIn('credentials', {
        email: emailAddress.value,
        password: password.value,
        callbackUrl: '/authorize'
      });
    } else {
      createUserError.value = "There is an account for the email you provided. Please login or try again.";
    }

  } catch (error) {
    createUserError.value = "There was an error creating your account. Please try again.";
    console.log('error', error);
  }

  //await navigateTo('/new-user-info');
  onMounted(() => {
    try{heap.track('create-account-page-viewed', {});}catch{}
  });
}
</script>

<style lang="scss" scoped>
form {
  max-width: 600px;
  width: 100%;
}
</style>
