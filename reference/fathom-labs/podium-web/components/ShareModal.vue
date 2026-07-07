<template>
  <div class="fixed top-0 bottom-0 right-0 left-0 bg-black opacity-50 z-50">
  </div>
  <div class="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center px-4 sm:px-0 z-60">
    <Transition name="bounce" appear>
      <div class="share-modal flex flex-col items-center bg-white px-5 sm:px-16 pt-10 sm:pt-16 pb-6 sm:pb-7 rounded-3xl text-center">
        <h1 class="text-4xl font-bold mb-5 sm:mb-6">
          Get Free Credits
        </h1>
        <span class="font-medium mb-2 sm:mb-2">
          Podcasters LOVE Podium's AI generated show notes. <br/> 
          <i>(check out your download - pretty amazing, right?)</i> <br/><br/>
          <b>Spread the word about Podium to help your fellow podcasters.</b><br/>
          <span class="font-bold">- We'll give you 60 free credit minutes! -</span><br/><br/>
          It's easy! Here's how...
        </span>
        <div class="font-medium mb-5 sm:mb-5 text-left">
          1 - Follow us on Twitter <a class="text-[#007AFF]" href="https://twitter.com/PodiumDotPage" target="_blank">@PodiumDotPage</a><br/>
          2 - Click the Tweet button below<br/>
          3 - Tag at least 2 podcasters in your tweet<br/>
        </div>
        <div class="mb-6 sm:mb-6 font-bold">They'll thank you for it!</div>
        <div class="flex gap-3 sm:gap-5 mb-5 sm:mb-10">
          <ShareLink component="twitter"></ShareLink>
        </div>
        <button class="flex text-[#007AFF] font-medium mb-5 sm:mb-5" @click="copyLink">
          <SvgLink/>
          <span class="ml-3 opacity-80">
            {{ copyLinkText }}
          </span>
        </button>
        <span class="italic text-sm mb-5 sm:mb-5">
        No Twitter? No problem. Just click the copy link above and share it with your friends.<br/>
        Let support know who you shared it with and we'll hook you up!
        </span>
        <button @click="closeModal" class="text-primary font-medium opacity-80 mb-5 sm:mb-5">
          Skip
        </button>
        <span class="italic text-xs">
          Limit 1 per customer.
        </span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modalVisible: boolean,
}>();
const emits = defineEmits(['update:modalVisible']);

const closeModal = () => {
  emits('update:modalVisible', false);
};

const linkCopied = ref(false);
const copyLink = () => {
  navigator.clipboard.writeText('https://hello.podium.page');
  linkCopied.value = true;
  try { heap.track('podium-share-link-clicked', {'type': 'copy-link'});} catch {}
};
const copyLinkText = computed(() => {
  return linkCopied.value ? 'Link Copied' : 'Copy a link';
})
</script>

<style lang="scss" scoped>
.share-modal {
  max-width: 693px;

  &__social-button {
    &:hover:not(:active) {
      box-shadow: 4px 4px 0 #000000;
    }

    &__icon {
      width: 43px;
      height: 43px;
      @media screen and (min-width: 640px) {
        width: auto;
        height: auto;
      }
    }
  }
}

.bounce-enter-active {
  animation: bounce-in .5s;
}

.bounce-leave-active {
  animation: bounce-in .5s linear;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
</style>
