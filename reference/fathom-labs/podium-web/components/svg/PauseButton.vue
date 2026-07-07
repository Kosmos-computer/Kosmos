<template>
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.5 41C31.8218 41 41 31.8218 41 20.5C41 9.17816 31.8218 0 20.5 0C9.17816 0 0 9.17816 0 20.5C0 31.8218 9.17816 41 20.5 41Z" :fill="getColor()"/>
    <path d="M23 28.2001C23 28.6001 23.4 29 23.8 29H26.2C26.6 29 27 28.6001 27 28.2001V13.8001C27 13.4001 26.6 13 26.2 13H23.8C23.4 13 23 13.4001 23 13.8001V28.2001Z" fill="white"/>
    <path d="M15 28.2001C15 28.6001 15.4 29 15.8 29H18.2C18.6 29 19 28.6001 19 28.2001V13.8001C19 13.4001 18.6 13 18.2 13H15.8C15.4 13 15 13.4001 15 13.8001V28.2001Z" fill="white"/>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps(['color'])
const getColor = () => props.color || 'black'
</script>