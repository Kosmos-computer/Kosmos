<template>
  <button class="share-link p-6 sm:p-8 rounded-xl border-black border border-3 w-fit" @click="share()">
    <component :is="resolvedComponent" class="share-link__icon"/>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  component: string,
}>();

const resolvedComponent = computed(() => {
  switch (props.component) {
    case 'facebook':
      return resolveComponent('SvgFacebook');
    case 'reddit':
      return resolveComponent('SvgReddit');
    case 'twitter':
      return resolveComponent('SvgTwitter');
  }
  return resolveComponent('SvgFacebook');
});

const share = () => {
  try { heap.track('podium-share-link-clicked', {'type': props.component});} catch {}
  switch (props.component) {
    case 'facebook':
      return window.open('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fhello.podium.page%2F', '_blank');
    case 'reddit':
      return window.open('https://www.reddit.com/submit?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20https%3A%2F%2Fhello.podium.page%2F', '_blank');
    case 'twitter':
      return window.open('https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=https%3A%2F%2Fhello.podium.page%2F', '_blank');
  }
};
</script>

<style lang="scss">
.share-link {
  transition: transform .2s ease-in-out;

  &:hover:not(:active) {
    box-shadow: 4px 4px 0 #000000;
    transform: translate(-4px, -4px);
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
</style>
