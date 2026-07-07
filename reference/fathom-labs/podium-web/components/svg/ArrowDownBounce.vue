<template>

  <svg :class="{'bounce': bounce, }" width="49" height="48" viewBox="0 0 49 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_1849_53640)">
    <path d="M30.5 26L24.5 32M24.5 32L18.5 26M24.5 32L24.5 16M24.5 42C14.5589 42 6.5 33.9411 6.5 24C6.5 14.0589 14.5589 6 24.5 6C34.4411 6 42.5 14.0589 42.5 24C42.5 33.9411 34.4411 42 24.5 42Z" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <defs>
    <clipPath id="clip0_1849_53640">
    <rect width="48" height="48" fill="white" transform="translate(0.5)"/>
    </clipPath>
    </defs>
  </svg>
</template>
<script setup lang="ts">
withDefaults(defineProps<{
  bounce?: boolean
}>(), {
  bounce: false
})
</script>
<style lang="scss" scoped>
.arrow-circle-down {
  display: block;
  width: 40px;
  height: 40px;
  margin: 16px 0;
}

.bounce {
  -webkit-animation: bounce 2s;
  animation: bounce 2s;
  -webkit-animation-iteration-count: infinite;
  animation-iteration-count: infinite;
}

@-webkit-keyframes bounce {
  0%,
  25%,
  50%,
  75%,
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
  }
  40% {
    -webkit-transform: translateY(-20px);
    transform: translateY(-20px);
  }
  60% {
    -webkit-transform: translateY(-12px);
    transform: translateY(-12px);
  }
}

@keyframes bounce {
  0%,
  25%,
  50%,
  75%,
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
  }
  40% {
    -webkit-transform: translateY(-20px);
    transform: translateY(-20px);
  }
  60% {
    -webkit-transform: translateY(-12px);
    transform: translateY(-12px);
  }
}
</style>
