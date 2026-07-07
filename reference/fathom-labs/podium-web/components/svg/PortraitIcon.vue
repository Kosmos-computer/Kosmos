<template>
    <svg width="14" height="25" viewBox="0 0 14 25" :fill="color" fill-opacity="0.1" xmlns="http://www.w3.org/2000/svg">
      <rect x="13" y="1" width="23" height="12" rx="3" transform="rotate(90 13 1)" :stroke="color" stroke-width="2"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'PortraitIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' // Default stroke color
      }
    }
  }
  </script>