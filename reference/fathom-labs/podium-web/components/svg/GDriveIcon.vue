<template>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M5.91913 19.4316L2.91895 14.2344L8.91888 3.83988L8.91886 3.83984H8.9189H14.9191L20.9189 14.2344H14.9191L11.0559 7.54188L11.919 9.03711L8.91897 14.2345H20.9189L17.9188 19.4317H5.91906L5.91913 19.4316Z" :fill="color"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M5.91913 19.4316L2.91895 14.2344L8.91888 3.83988L8.91886 3.83984H8.9189H14.9191L20.9189 14.2344H14.9191L11.0559 7.54188L11.919 9.03711L8.91897 14.2345H20.9189L17.9188 19.4317H5.91906L5.91913 19.4316Z" :fill="color" fill-opacity="0.2"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'GDriveIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF'  // Default to current font color
        }
    },
  }
  </script>