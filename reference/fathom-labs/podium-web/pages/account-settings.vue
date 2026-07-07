<template>
  <div class="flex flex-grow flex-row bg-gray-50" style="min-height: 100vh;">
    
    <div class="fixed pl-6 pt-4 left-0 top-[69px] w-[265px]">
      <nav class="space-y-1" aria-label="Sidebar">
        <a v-for="item in navigation" :key="item.id" :href="item.href" @click="sidenavSelect(item.id)" :class="[item.current ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900', 'flex items-center rounded-md px-3 py-2 text-sm font-medium w-52']" :aria-current="item.current ? 'page' : undefined">
          <span class="truncate" >{{ t(item.name) }}</span>
        </a>
      </nav>
    </div>

    <div class="w-full px-10 ml-[265px]">

      <div v-if="currentSidenavItem.id == 'account-settings'" class="w-full mt-8">
        <div class="text-2xl leading-8 font-semibold mb-4">{{ t('Account Settings') }}</div>

        <div class="bg-white w-full mr-8 shadow rounded-lg">
          <div class="px-6 py-6 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium">{{ t('Personal Information') }}</div>
              <div class="mt-4 w-96">

                <div class="form__row">
                  <label for="userName" class="form__label">{{ t('Your name') }}</label>
                  <div class="form__input-row">
                      <div class="form__input-wrapper">
                          <input
                              type="text"
                              name="userName"
                              id="userName"
                              v-model="userName"
                              autocomplete="userName"
                              class="form__input"
                              placeholder="" />
                      </div>
                  </div>
                </div>

                <div class="form__row">
                  <label for="email" class="form__label">{{ t('Email') }}</label>
                  <div class="form__input-row">
                      <div class="form__input-wrapper">
                          <input
                              type="text"
                              name="email"
                              id="email"
                              v-model="email"
                              autocomplete="email"
                              class="form__input"
                              placeholder="" />
                      </div>
                  </div>
                </div>

                <button @click="updateUser()" class="flex px-4 h-10 mt-0 bg-indigo-700 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all flex justify-center items-center">
                  <span v-if="!userUpdated">{{ t('Update') }}</span>
                  <span v-if="userUpdated" class="flex justify-center items-center">
                    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 10C0.5 15.51 4.97 20 10.53 20H10.54C16.04 20 20.51 15.51 20.51 10C20.51 4.49 16.04 0 10.54 0H10.47C4.97 0 0.5 4.49 0.5 10ZM9.26491 14.6547L9.26996 14.6599H9.25996L9.26491 14.6547ZM9.26491 14.6547L15.29 8.24995C15.67 7.84995 15.65 7.21995 15.25 6.83995C14.85 6.45995 14.22 6.47995 13.84 6.87995L9.24996 11.7599L6.53996 8.93995C6.15996 8.53995 5.52996 8.52995 5.12996 8.90995C4.72996 9.28995 4.71996 9.91995 5.09996 10.3199L9.26491 14.6547Z" fill="#FFFFFF"/>
                    </svg>
                  </span>
                </button>

                <span v-if="userUpdateError" class="mr-3 mt-6 relative bottom-[1px] inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">{{ userUpdateError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white w-full mr-8 shadow rounded-lg mt-4">
          <div class="px-6 py-6 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium">{{ t('Security') }}</div>
              <div class="mt-4">
                
                <div class="form__row last">
                  <label for="email" class="form__label">{{ t('Password') }}</label>
                  <div class="form__input-row">
                      <div class="form__input-wrapper w-96" style="display: inline-block">
                          <input
                              type="password"
                              name="email"
                              id="email"
                              autocomplete="email"
                              class="form__input"
                              value="a_real_nice_password"
                              placeholder=""
                              disabled
                          />
                      </div>
                      <a href="#" @click.stop="showChangePassword()" class="text-sm leading-5 font-medium text-indigo-700 hover:underline ml-5">{{ t('Change Password') }}</a>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>

      </div>

      <div v-if="currentSidenavItem.id == 'plan-billing'" class="w-full mt-8">
        <div class="text-2xl leading-8 font-semibold mb-4">{{ t('Plan & Billing Information') }}</div>
        
        <div class="bg-white w-full mr-8 shadow rounded-lg">
          <div class="px-6 py-6 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium">{{ t('Current Plan') }}</div>
              <div v-if="mainStore.user.current_subscription_title" class="flex flex-col gap-2">
                <div class="text-sm leading-5 text-gray-600">
                  {{ mainStore.user.current_subscription_title }} - ${{ mainStore.user.current_subscription_price }} ({{ mainStore.user.current_subscription_period }})
                </div>
                <div class="text-sm leading-5 text-gray-600">
                  <a href="https://hello.podium.page/pricing?logged_in=true" target="_blank" class="text-sm leading-5 font-medium text-indigo-700 hover:underline">{{ t('Change Plan') }}</a>
                </div>
              </div>
              <div v-else class="flex flex-col gap-2">
                <div class="text-sm leading-5 text-gray-600">{{ t('Free Trial') }}</div>
                <button @click="navigateToPricing()" class="w-fit mt-4 bg-indigo-700 text-white font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
                  {{ t('Upgrade Plan') }}
                </button>
              </div>
            </div>
            <div v-if="mainStore.user.current_subscription_title" class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium">{{ t('Billing Cycle') }}</div>
              <div v-if="mainStore.user.current_subscription_renews_on" class="text-sm leading-5 text-gray-600">
                {{ t('Subscription renews on') }} {{ moment(mainStore.user.current_subscription_renews_on).format('MMMM Do, YYYY') }}
              </div>
              <div v-else class="text-sm leading-5 text-red-700">
                {{ t('Subscription has been paused or cancelled and will not renew.') }}
              </div>
              <div class="text-sm leading-5 text-gray-600">
                <a @click.prevent="view_billing_info()" href="#" class="text-sm leading-5 font-medium text-indigo-700 hover:underline">{{ t('View Invoices') }}</a>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium">{{ t('Credits Balance') }}</div>
              <div class="text-sm leading-5 font-semibold text-gray-600">
                {{ t('Monthly Credits:') }} 
                <span class="text-sm font-normal leading-5 text-gray-600">
                  {{ mainStore.user.current_subscription_credits_balance }}
                </span>
              </div>
              <div v-if="mainStore.user.current_subscription_credits_expire_on" class="text-sm leading-5 font-semibold text-gray-600">
                {{ t('Monthly Credits Expire:') }}
                <span class="text-sm font-normal leading-5 text-gray-600">
                  {{ moment(mainStore.user.current_subscription_credits_expire_on).format('MMMM Do, YYYY') }}
                </span>
              </div>
              <div class="text-sm leading-5 font-semibold text-gray-600">
                {{ t('Non-Expiring Credits:') }} 
                <span class="text-sm font-normal leading-5 text-gray-600">
                  {{ mainStore.user.additional_credits_balance.toFixed(2) }}
                </span>
              </div>
              <button v-if="mainStore.user?.current_subscription_title && !mainStore.user?.current_subscription_title == ''" @click="purchaseCredits()" class="w-fit mt-4 bg-indigo-700 text-white font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
                {{ t('Purchase Credits') }}
              </button>
            </div>
          </div>
        </div>
      

        <div v-if="mainStore.user.current_subscription_title && mainStore.user.payment_method_brand" class="bg-white w-full mr-8 shadow rounded-lg mt-4">
          <div class="px-6 py-6 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="text-lg leading-6 font-medium mb-2">{{ t('Payment Information') }}</div>

              <div class="flex flex-row gap-4 mb-4">
                <div>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8C5.79086 8 4 9.79086 4 12V14H36V12C36 9.79086 34.2091 8 32 8H8Z" fill="#111827"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M36 18H4V28C4 30.2091 5.79086 32 8 32H32C34.2091 32 36 30.2091 36 28V18ZM8 26C8 24.8954 8.89543 24 10 24H12C13.1046 24 14 24.8954 14 26C14 27.1046 13.1046 28 12 28H10C8.89543 28 8 27.1046 8 26ZM18 24C16.8954 24 16 24.8954 16 26C16 27.1046 16.8954 28 18 28H20C21.1046 28 22 27.1046 22 26C22 24.8954 21.1046 24 20 24H18Z" fill="#111827"/>
                  </svg>
                </div>
                <div class="flex flex-col gap-0">
                  <div class="text-md leading-6 font-medium text-gray-900">
                    {{ mainStore.capitalizeFirstLetter(mainStore.user.payment_method_brand) }} {{ t('ending in') }} {{ mainStore.user.payment_method_last4 }}
                  </div>
                  <span class="text-sm font-normal leading-5 text-gray-600">
                    {{ t('Personal Information') }}Expires: {{ mainStore.user.payment_method_exp_month }}/{{ mainStore.user.payment_method_exp_year }}
                </span>
                </div>
              </div>

              <div class="text-sm leading-5 text-gray-600">
                <a @click.prevent="view_billing_info()" href="#" class="text-sm leading-5 font-medium text-indigo-700 hover:underline">{{ t('Update Payment Method') }}</a>
              </div>
            </div>
          </div>
        </div>
        <div v-if="mainStore.user.current_subscription_title && mainStore.user.current_subscription_renews_on ">
          <button @click="pauseSubscription()" class="text-red-600 text-sm font-medium leading-6 py-2 mt-2">{{ t('Pause Subscription') }}</button>
        </div>
        <div v-if="mainStore.user.current_subscription_title  && mainStore.user.current_subscription_renews_on ">
          <button @click="openCancelSubscription()"  class="text-gray-500 text-sm font-medium leading-6 py-2">{{ t('Cancel Subscription') }}</button>
        </div>
        <div v-if="mainStore.user.current_subscription_title && !mainStore.user.current_subscription_renews_on && mainStore.user.current_subscription_cancel_or_paused =='paused'">
          <button @click="renewSubscription()" class="text-indigo-600 text-sm font-medium leading-6 py-2 mt-2">{{ t('Resume Subscription') }}</button>
        </div>
      </div>
      
        <div  v-if="currentSidenavItem.id == 'api-access'" class="w-full mt-8">
        <div class="text-2xl leading-8 font-semibold mb-4">{{ t('API Access') }}</div>
        
        <div class="bg-white w-full mr-8 shadow rounded-lg">
          <div class="px-6 py-6 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
                <div class="text-lg leading-6 font-medium">API</div>
                <div class="text-sm leading-5 text-gray-700">{{ t('You need an active subscription in order to use the API') }}
                </div>
            </div>
            <div>
                  <UsageAPItoggle :modelValue="mainStore.stringToBoolean(mainStore.user?.settings.api_access)" />
            </div>
            <div v-if="mainStore.stringToBoolean(mainStore.user?.settings.api_access) && mainStore.user?.current_subscription_renews_on !=null || mainStore.user?.email =='mw@vast.faith' ||  mainStore.user?.email =='kevin@higherpixels.com'" class="text-sm leading-5 text-gray-500">{{ t('Your API access is active, go to') }}
               <NuxtLink to="/apikeys" class="text-indigo-600">{{ t('API Dashboard.') }}</NuxtLink>
              </div>
          </div>
        </div>
      </div> 
    </div>
    <ModalsDelete :open="openDeleteKeyModal" :apisKeyId="apiKeyId" @close="openDeleteKeyModal = false" />
    <ModalsGenerateAPIKeyName :open="openGenerateApiName" @close="openGenerateApiName = false" :apisName="apiName" :apiId="apiKeyId" />
    <ModalsCancelSubscription :open="openCancelSubscriptionModal" @close="openCancelSubscriptionModal = false"   />
    <ModalsPauseConfirmation :open="openPauseConfirmation" @close="openPauseConfirmation = false" />
    <ModalsResumeSubscription :open="openResumeConfirmation" @close="openResumeConfirmation = false" />

   
      </div>
    <ModalsResetPassword :open="openResetPasswordModal" @close="openResetPasswordModal = false" />
  
</template>

<script setup lang="ts">
  import {useMainStore} from "~/store/main"
  import moment from 'moment';
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});
  definePageMeta({ layout: "app"})

  const mainStore = useMainStore()
  const { params, query } = useRoute();
  const runtimeConfig = useRuntimeConfig()

  const openCancelSubscriptionModal = ref(false)
  const openResetPasswordModal = ref(false)
  const userName = ref('')
  const email = ref('')
  const emailConfigration = ref(false)
  const userUpdated = ref(false)
  const userUpdateError = ref(null)
  const openPauseConfirmation = ref(false)
  const openResumeConfirmation = ref(false)
  const errorMsg = ref('')
  const openGenerateApiName =ref(false)
  const openViewEditApi =ref(false)
  const openDeleteKeyModal = ref(false)
  const apiKeyId = ref(0)
  const apiName = ref('')

  const pauseSubscription = () => {
    openPauseConfirmation.value = true
  }

  const renewSubscription = () => {
    openResumeConfirmation.value = true
  }

  const navigation = ref([
    { name: 'Account Settings', id:'account-settings', href: '#', current: true },
    { name: 'Plan & Billing', id:'plan-billing', href: '#', current: false },
    { name: 'API Access', id:'api-access', href: '#', current: false }
   
  ])

  onMounted(() => {
    userName.value = mainStore.user.name
    email.value = mainStore.user.email
    emailConfigration.value = mainStore.user.settings.unsubscribe_confirmation_emails
  })
  const openCancelSubscription=()=>{
    openCancelSubscriptionModal.value = true
  }
const route = useRoute()
const router = useRouter()
  
  const sidenavSelect = (id) => {
    navigation.value.forEach((navItem) => {
      navItem.current = navItem.id == id;
    })
    currentSidenavItem.value = id
    // Update the query parameter if it's different from the current
    if (route.query.section !== id) {
    router.push({ query: { section: id } })
    }
  }

  // Handle the initial query parameter on mount
  onMounted(() => {
  const section = route.query.section
  if (section) {
    sidenavSelect(section)
  }
  })

  watch(() => route.query.section, (newSection) => {
    if (newSection) {
      sidenavSelect(newSection)
    }
  })

  if (query && query.sidenav) {
    sidenavSelect(query.sidenav)
  }

  const showCancelSubscription = () => {
    openCancelSubscriptionModal.value = true
  }

  const showChangePassword = () => {
    openResetPasswordModal.value = true
  }

  const validateUserUpdate = () => {
    userUpdateError.value = null
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email.value)) {
      userUpdateError.value = "Invalid email format"
    }
  }

  const updateUser = () => {
    validateUserUpdate()
    if (!userUpdateError.value) {
      fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/update`, {
                  method: 'PUT',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                  },
                  body: JSON.stringify({
                      name: userName.value,
                      email: email.value
                  })
      })
      .then((response) => {
        if (response.ok) {
            return response.json()
        } else {
            return response.text().then(text => { throw new Error(text) })
        }
      })
      .then(data => {
          userUpdated.value = true
          mainStore.retrieveUser(null)
          setTimeout(() => {
              userUpdated.value = false
          }, 3000)
      })
      .catch((error) => {
          console.log(error)
          userUpdateError.value = error.message.replace('{"detail":"', '').replace('"}', '')
      });
    }
  }

  const view_billing_info = () => {
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/stripe_billing_info_url?return_url=${runtimeConfig.public.baseUrl}/account-settings?sidenav=plan-billing`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                }
            })
            .then(response => response.json())
            .then(data => {
                window.location.href = data.url
            })
  }

  function navigateToPricing() {
    window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
  }

  function purchaseCredits() {
    navigateTo(`/begin-purchase?stripePriceId=${mainStore.user.additional_credits_stripe_price_id}`);
  }

  if (query && query.sidenav) {
    sidenavSelect(query.sidenav)
  }

  const currentSidenavItem = computed(() => {
    return navigation.value.find((navItem) => navItem.current);
  })

</script>

<style scoped>
.form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }
    &__label {
        @apply text-sm leading-5 font-medium mb-1.5 block text-gray-700;

    }
    &__row {
        @apply col-span-full pb-0;
        &:not(.last){
            @apply pb-6;
        }
    }
    &__input {
        @apply
        block
        flex-1
        border-0
        bg-transparent
        py-1.5 pl-2
        text-gray-900
        placeholder:text-gray-400
        focus:ring-0
        sm:text-base
        sm:leading-6
        rounded-md;
        &-before {
            @apply
            bg-gray-50
            text-gray-300
            border
            border-gray-300
            rounded-tl-md
            rounded-bl-md
            flex
            select-none
            items-center
            pl-3
            sm:text-base
            pr-2;
            margin-left:.5px;
            margin-top: .5px;
            margin-bottom: .6px;
        }
        &-row {
            @apply mt-0;
        }
        &-wrapper {
            @apply
            flex
            rounded-md
            shadow-sm
            ring-1
            ring-inset
            ring-gray-300
            focus-within:ring-2
            focus-within:ring-inset
            focus-within:ring-indigo-600;
        }
    }
    &__textarea {
        @apply
        block
        w-full
        rounded-md
        border-0
        text-gray-900
        shadow-sm
        ring-1
        ring-inset
        ring-gray-300
        placeholder:text-gray-400
        focus:ring-2
        focus:ring-inset
        focus:ring-indigo-600
        sm:py-1.5
        sm:text-base
        sm:leading-6;
    }
    &__actions {
        @apply
        mt-5
        sm:mt-6
        sm:flex
        sm:gap-x-3;
    }
}
</style>