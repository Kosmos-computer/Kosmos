<template>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="12" height="12" :rx="radius" :fill="color" fill-opacity="0.1" :stroke="color" stroke-width="2"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'SquareIcon',
    props: {
      color: {
        type: String,
        default: '#4F46E5' // Default stroke color
      },
      radius: {
        type: Number,
        default: 3 // Default radius for rounded corners
      }
    }
  }
  </script>