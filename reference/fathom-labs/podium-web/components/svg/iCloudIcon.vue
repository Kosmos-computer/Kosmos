<template>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.2967 10.7741C18.1649 8.08446 16.055 6 13.4176 6C11.5715 6 9.85714 7.07591 9.0659 8.68978C8.67028 8.42074 8.20878 8.28625 7.74722 8.28625C6.42854 8.28625 5.37361 9.36204 5.30767 10.7069C3.92306 11.2448 3 12.5896 3 14.0689C3 16.0861 4.58243 17.7 6.56047 17.7H17.5055C19.4175 17.7 21 16.0863 21 14.1362C20.8682 12.5895 19.8133 11.1776 18.2967 10.7741Z" :stroke="color" stroke-width="2"/>
    </svg>
</template>
  
<script>
  export default {
    name: 'iCloudIcon',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' 
      }
    }
  }
</script>