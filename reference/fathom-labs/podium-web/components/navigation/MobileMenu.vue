<template>
  <Transition appear>
    <div v-if="navigationStore.mobileMenuVisible" 
      class="absolute inset-0 md:hidden flex flex-col gap-10 bg-white z-60 pt-14 px-10 pb-10 text-2xl font-medium text-[#161616] overflow-auto" style="padding-top: 180px; z-index: 1;">
      <NuxtLink to="https://hello.podium.page/#what-you-get" class="hover:underline">
        What you get
      </NuxtLink>
      <NuxtLink to="https://hello.podium.page/pricing" class="hover:underline">
        Pricing
      </NuxtLink>
      <NuxtLink to="https://hello.podium.page/api" class="hover:underline">
        API
      </NuxtLink>
      <NuxtLink to="https://hello.podium.page/blog" class="hover:underline">
        Resources
      </NuxtLink>
      <NuxtLink v-if="!isUserLoggedIn" to="/login" @click="hideMobileMenu()" class="hover:underline">
        Log In
      </NuxtLink>
      <NuxtLink v-if="isUserLoggedIn" to="/logout" @click="hideMobileMenu()" class="hover:underline">
        Log Out
      </NuxtLink>
      <div v-if="!isUserLoggedIn" class="flex flex-col items-center gap-2.5 text-base">
        <BaseButton class="w-full" @click="tryIt()">
          Try it - It's Free
        </BaseButton>
        <p class="text-primary opacity-80">
          No account required!
        </p>
      </div>
      <div v-if="isUserLoggedIn" class="flex flex-col items-center gap-2.5 text-base">
        <BaseButton class="w-full" @click="navigateToPricing()">
          Upgrade Now
        </BaseButton>
      </div>
      <div class="mt-auto flex flex-col gap-2.5 text-primary text-base">
        <NuxtLink to="">
          Contact Us
        </NuxtLink>
        <NuxtLink to="">
          Terms of Service
        </NuxtLink>
        <NuxtLink to="">
          Privacy Policy
        </NuxtLink>
        <span class="text-xs">
          Podium © 2022
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const { data, status, getCsrfToken, getProviders, signOut } = useSession()
import {useNavigationStore} from "~/store/navigation";

const navigationStore = useNavigationStore();

const browserWidth = ref(0);

const hideMobileMenu = () => {
  navigationStore.mobileMenuVisible = false;
};

const tryIt = () => {
  hideMobileMenu()
  navigateTo('/upload');
};

function navigateToPricing() {
  window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
}

const isUserLoggedIn = computed(() => {
  return status.value == 'authenticated';
})

onMounted(() => {
  console.log('mounted');
  window.addEventListener('resize', (evt) => {
    browserWidth.value = window.innerWidth;
  });
});

watch(() => browserWidth.value, (newBrowserWidth) => {
  //console.log(newBrowserWidth);
  if (newBrowserWidth >= 768 && navigationStore.mobileMenuVisible) {
    navigationStore.mobileMenuVisible = false;
  }
});
</script>
