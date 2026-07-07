<template>
    <svg width="26" height="14" viewBox="0 0 26 14" :fill="color" fill-opacity="0.1" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="24" height="12" rx="3" :stroke="color" stroke-width="2"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'LandscapeIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' // Default stroke color
      }
    }
  }
  </script>