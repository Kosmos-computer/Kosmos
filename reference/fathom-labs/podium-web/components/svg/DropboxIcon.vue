<template>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 4L3 6.88827L7.5 9.73407L12 6.88827L7.5 4ZM16.5 4L12 6.88827L16.5 9.73407L21 6.88827L16.5 4ZM3 12.6223L7.5 15.5106L12 12.6223L7.5 9.73407L3 12.6223ZM16.5 9.73407L12 12.6223L16.5 15.5106L21 12.6223L16.5 9.73407ZM7.5 16.4451L12 19.3333L16.5 16.4451L12 13.5993L7.5 16.4451Z" :fill="color"/>
    </svg>
</template>
  
<script>
  export default {
    name: 'DropboxIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' // Default color
      }
    }
  }
</script>