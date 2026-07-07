<template>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="23" height="23" rx="1.5" stroke="#9CA3AF" stroke-dasharray="2 2"/>
        <rect x="6" y="6" width="12" height="12" :fill="color"/>
        <rect x="6" y="6" width="12" height="12" fill="black" fill-opacity="0.2"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'VideoCenterAlign',
    props: {
      color: {
        type: String,
        default: '#4F46E5' // Default stroke color
      }
    }
  }
  </script>