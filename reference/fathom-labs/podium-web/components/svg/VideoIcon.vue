<template>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" :fill="color">
      <!-- Replace below with the actual SVG paths or elements from your SVG file -->
      <path d="M22 7L18 9V15L22 17V7Z" fill="currentColor"/>
      <path d="M16 7H4C2.89543 7 2 7.89543 2 9V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V9C18 7.89543 17.1046 7 16 7Z" stroke="currentColor"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'VideoIcon',
    props: {
      color: {
        type: String,
        default: '#6B7280'  // Default gray-500 color
      }
    }
  }
  </script>
  