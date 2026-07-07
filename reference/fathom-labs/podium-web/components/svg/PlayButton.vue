<template>
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.5 41C31.8218 41 41 31.8218 41 20.5C41 9.17816 31.8218 0 20.5 0C9.17816 0 0 9.17816 0 20.5C0 31.8218 9.17816 41 20.5 41Z" :fill="getColor()"/>
  <path d="M28.8159 20.3213L16.219 13.0853C15.6772 12.8173 15 13.2193 15 13.7553V28.2273C15 28.8973 15.6772 29.1653 16.219 28.8973L28.8159 21.6613C29.3577 21.3933 29.3577 20.5893 28.8159 20.3213Z" fill="white"/>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps(['color'])
const getColor = () => props.color || 'black'
</script>