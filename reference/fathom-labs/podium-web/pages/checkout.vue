<template>
  <div class="flex-grow flex flex-col pt-16 pb-16 px-10 xl:px-0 md:h-full items-center text-center">
    <h1 class="text-4xl font-bold mb-5">
      You've run out of free uploads.
    </h1>
    <span class="font-medium mb-5 opacity-80">
      Lame - we know. But how much does a production team cost again?
    </span>
    <h3 class="text-2xl font-bold mb-5">
      <span class="text-[#614BEF] opacity-80">SPECIAL PRICE</span>
      $3 per upload
    </h3>
    <BaseButton class="checkout__button mb-2.5 w-full">
      Continue to checkout
    </BaseButton>
    <button class="text-[#007AFF] font-medium opacity-80 mb-10 cursor-pointer">
      Contact Support
    </button>
    <button class="text-primary font-medium opacity-80" @click="cancelUpload">
      Not ready? Click here to cancel
    </button>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'empty-header',
});

const cancelUpload = async () => {
  try{heap.track('cancel-upload-clicked', {})}catch{}
  await navigateTo('/upload');
}
</script>
<style lang="scss" scoped>
.checkout__button {
  max-width: 600px;
}
</style>
