<template>
  <div class="flex flex-col h-full">
    <CreditsHeader/>
    <NavigationHeader/>
    <div :class="['flex-grow flex flex-col pt-16 pb-16 px-10 md:px-32 gap-5', pageCss]">
      <h1 class="text-4xl font-bold">
        {{ errorMessage }}
      </h1>
      <p v-if="fileUploadError" class="font-medium opacity-80">
        Sorry, something happened on our end. Hit the button below to reupload your file (this one doesn’t count against your upload count).
      </p>
      <p v-else-if="pageNotFoundError" class="font-medium opacity-80 xl:w-screen-half">
        But what DOES exist? Ever think about that? Like, what really is existence if all things are impermanent. I feel like I should meditate under a tree for awhile...
      </p>
      <BaseButton @click="errorCallToAction()" class="w-fit px-5">
        {{ buttonText }}
      </BaseButton>
      <button v-if="fileUploadError" class="text-[#007AFF] font-medium opacity-80 mb-10 cursor-pointer">
        Contact Support
      </button>
    </div>
    <NavigationFooter/>
  </div>
  <NavigationMobileMenu/>
</template>

<script setup lang="ts">
const { status } = useSession()

const props = defineProps({
  error: Object
})

const error = useError();

const errorCallToAction = () => {
  if (status.value == 'authenticated') {
    navigateTo('/dashboard');
  } else {
    navigateTo('/upload');
  }
}

const pageNotFoundError = computed(() => {
  return error.value?.message.includes('Page not found');
});

const fileUploadError = computed(() => {
  return error.value?.message.includes('error processing your file.')
});

const errorMessage = computed<string>(() => {
  if (pageNotFoundError.value) {
    return 'Sorry, that page doesn’t exist.';
  }
  return error.value?.message || 'Ooopsie, something went wrong.'
});

const buttonText = computed(() => {
  if (fileUploadError.value) {
    return 'Reupload your file';
  }
  return 'Want to upload a file?'
});

const pageCss = computed(() => {
  if (fileUploadError.value) {
    return 'items-center text-center';
  }
  return 'items-center sm:items-start text-center sm:text-start';
})
</script>
