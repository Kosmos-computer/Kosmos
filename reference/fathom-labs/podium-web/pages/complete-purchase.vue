<template>
  <div class="flex h-screen">
    <div class="m-auto">

      <div v-if="error != ''" class="font-bold pb-72 text-center">
        <h1 class="text-4xl font-bold">{{ t("An Error Occurred") }}</h1>
        <h2 class="text-xl font-bold mt-6">
          {{ error }}
        </h2>
        <h3 class="text-md font-bold mt-6">
          REF: {{ purchaseGuid }}
        </h3>
        <button type="button" class="text-[#007AFF] font-medium opacity-80 mt-4 cursor-pointer hover:underline" @click="contactSupport()">
          {{ t("Contact Support") }}
        </button>
      </div>

      <div v-if="error == '' && !loading" class="font-bold pb-72 text-center">
        <div class="mb-10 flex justify-center">
          <svg width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 35.4999C0 54.7849 15.645 70.4999 35.105 70.4999H35.14C54.39 70.4999 70.035 54.7849 70.035 35.4999C70.035 16.2149 54.39 0.499908 35.14 0.499908H34.895C15.645 0.499908 0 16.2149 0 35.4999ZM30.6772 51.7913L30.6949 51.8097H30.6599L30.6772 51.7913ZM30.6772 51.7913L51.7649 29.3747C53.0949 27.9747 53.0249 25.7697 51.6249 24.4397C50.2249 23.1097 48.0199 23.1797 46.6899 24.5797L30.6249 41.6597L21.1399 31.7897C19.8099 30.3897 17.6049 30.3547 16.2049 31.6847C14.8049 33.0147 14.7699 35.2197 16.0999 36.6197L30.6772 51.7913Z" fill="#4338ca"/>            
          </svg>
        </div>
        <h1 v-if="purchase.productType =='subscription'" class="text-4xl font-bold">{{ t("You're Subscribed!") }}</h1>
        <h1 v-else class="text-4xl font-bold">{{ t("Purchase Complete!") }}</h1>
        <div class="text-2xl font-semibold mt-10">
          <span v-if="purchase.productType =='payment'">{{ purchase.quantity }} x </span> {{ purchase.productTitle }}
        </div>

        <div v-if="purchase.productType =='payment'" class="text-xl font-semibold mt-4">
          {{ purchase.quantity * purchase.productCredits }} {{ t("Total Credit Minutes Purchased") }}
        </div>

        <button @click="navigateTo('/dashboard')" class="w-fit mt-10 bg-indigo-700 text-white font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
          {{ t("Go to Dashboard") }}
        </button>
        <h4 class="text-lg font-medium mt-10">
          {{ t("Thank you for your purchase!") }}
        </h4>
      </div>
      <div v-if="loading" class="m-auto inset-0 flex flex-col items-center pb-52 bg-white bg-opacity-80">
        <SvgLoadingMd />

      </div>      
    </div>
  </div>  
</template>

<script setup lang="ts">
import podiumGetPodiumPurchase from '@/apollo/queries/podiumGetPodiumPurchase.gql';
import {useMainStore} from "~/store/main";

import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const mainStore = useMainStore()
const { status, getCsrfToken, getProviders } = useSession()
const route = useRoute()
const gtag = useGtag()

const loading = ref(true)
const error = ref('')
const purchase = ref(null)

const purchaseGuid = route.query.purchaseGuid

const pendingStripePriceId = useCookie('pending_stripe_price_id')
pendingStripePriceId.value = null

const pendingStripeQuantity = useCookie('pending_stripe_quantity')
pendingStripeQuantity.value = null

const stripeCouponIdCookie = useCookie('stripe_coupon_id')
stripeCouponIdCookie.value = null


onMounted(async () => {
  try {
    const { result, onResult, onError } = useQuery(podiumGetPodiumPurchase, { purchaseGuid: purchaseGuid }, { fetchPolicy: "no-cache" });
    
    const handleResult = (data) => {
      if (data && data.podiumGetPodiumPurchase) {
        purchase.value = data.podiumGetPodiumPurchase
        
        var purchaseValue = purchase.value.productPrice * purchase.value.quantity
        if (purchase.value.productType == 'subscription') {
          if (purchase.value.productPeriod == 'monthly') {
            purchaseValue = purchaseValue * 10
          } 
          if (purchase.value.productPeriod == 'yearly') {
            purchaseValue = purchaseValue * 2
          }
        }

        // Google Conversion Event
        const purchaseEvent = {
          'product_description': purchase.value.productTitle,
          'product_type': purchase.value.productType,
          'product_period': purchase.value.productPeriod,
          'product_price': purchase.value.productPrice,
          'quantity': purchase.value.quantity,
          'value': (purchase.value.productPrice * purchase.value.quantity).toFixed(2),
          'currency': 'USD',
          'projected_ltv': purchaseValue.toFixed(2)
        }
        
        try{gtag("event", "purchase", purchaseEvent);}catch{}
        try{heap.track('complete-purchase-page-viewed', purchaseEvent);}catch{}
        try{rewardful('convert', { email: mainStore.user.email });}catch{}
        try{rdt('track', 'Purchase', {"transactionId": purchaseGuid})}catch{}

        loading.value = false

        setTimeout(() => {
          if (error.value == '') {
            confetti({
              particleCount: 200,
              spread: 120,
              startVelocity: 90,
              origin: { y: 1.2 },
              colors: ['#FF4FF8', '#FFF200', '#4FFFB5', '#FF4F4F', '#4FEAFF']
            }) 
          }
        }, 200);

      } else {
        error.value = "Unable to find purchase"
        loading.value = false
      }
    };

    const handleError = () => {
      error.value = "Unable to find purchase"
      loading.value = false
    }
    
    onResult(({ data }) => handleResult(data));
    onError(({ error }) => handleError());

    mainStore.retrieveUser(null)
  } catch (e) {
    console.log(e)
    error.value = "Unable to find purchase"
    loading.value = false
  }
});


const contactSupport = () => {
  Intercom('showNewMessage');
}

useHead({
  script: [
    {
      src: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js',
      async: false,
    },
  ],
});

</script>