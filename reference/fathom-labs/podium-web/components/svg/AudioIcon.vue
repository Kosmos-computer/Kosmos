<template>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" :fill="color">
        <path d="M15.5355 8.46448C17.4881 10.4171 17.4881 13.5829 15.5355 15.5355M18.364 5.63599C21.8787 9.15071 21.8787 14.8492 18.364 18.3639M5.58579 15.0001H4C3.44772 15.0001 3 14.5523 3 14.0001V10.0001C3 9.44777 3.44772 9.00005 4 9.00005H5.58579L10.2929 4.29294C10.9229 3.66298 12 4.10915 12 5.00005V19.0001C12 19.891 10.9229 20.3371 10.2929 19.7072L5.58579 15.0001Z" :stroke="color" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.5355 8.46448C17.4881 10.4171 17.4881 13.5829 15.5355 15.5355M18.364 5.63599C21.8787 9.15071 21.8787 14.8492 18.364 18.3639M5.58579 15.0001H4C3.44772 15.0001 3 14.5523 3 14.0001V10.0001C3 9.44777 3.44772 9.00005 4 9.00005H5.58579L10.2929 4.29294C10.9229 3.66298 12 4.10915 12 5.00005V19.0001C12 19.891 10.9229 20.3371 10.2929 19.7072L5.58579 15.0001Z" :stroke="color" stroke-opacity="1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'AudioIcon',
    props: {
      color: {
        type: String,
        default: '#6B7280'  // Default color, assuming a gray tone
      }
    }
  }
  </script>
  