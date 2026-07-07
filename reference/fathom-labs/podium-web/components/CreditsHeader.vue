<template>
  <div v-if="!mainStore.user" class="z-20 bg-black w-full text-center text-white justify-center py-4">
    <span class="font-bold">Try Podium for free</span> - Up to 3 hours of audio, no signup or credit card required 
  </div>
  <div v-if="!isUserLoggedIn && mainStore.user" class="z-10 bg-black w-full text-center text-white justify-center py-4">
    <span class="font-bold">Try Podium for free</span> - You have {{ Math.round(mainStore.user.additionalCreditsBalance) }} credit minutes remaining
  </div>
</template>

<script setup>
import {useMainStore} from "~/store/main";

const { data, status, getCsrfToken, getProviders } = useSession()
const mainStore = useMainStore()

const isUserLoggedIn = computed(() => {
  return status.value != 'unauthenticated';
});
</script>
