<template>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.8333 9.16675C15.8333 12.3884 13.2217 15.0001 10 15.0001M10 15.0001C6.77834 15.0001 4.16667 12.3884 4.16667 9.16675M10 15.0001V18.3334M10 18.3334H6.66667M10 18.3334H13.3333M10 11.6667C8.61929 11.6667 7.5 10.5475 7.5 9.16675V4.16675C7.5 2.78604 8.61929 1.66675 10 1.66675C11.3807 1.66675 12.5 2.78604 12.5 4.16675V9.16675C12.5 10.5475 11.3807 11.6667 10 11.6667Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'MicrophoneIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' // Default color
      }
    }
  }
  </script>