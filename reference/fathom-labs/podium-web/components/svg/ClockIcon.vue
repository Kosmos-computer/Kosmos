<template>
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" :stroke="color" stroke-width="2">
      <circle cx="12" cy="12" r="10" :stroke="color"/>
      <path :stroke="color" d="M12 12V8"/>
      <path :stroke="color" d="M12 12L16 14"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'ClockIcon',
    props: {
      color: {
        type: String,
        default: '#6B7280'  // Default color is black, can be overridden when using the component
      }
    }
  }
  </script>
  