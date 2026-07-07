<template>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 11.6666L17.5 7.49992L10 3.33325L2.50002 7.49992L10 11.6666ZM10 11.6666L15.1326 8.81513C15.5848 9.95541 15.8333 11.1986 15.8333 12.4999C15.8333 13.0843 15.7832 13.657 15.687 14.214C13.5119 14.4255 11.5409 15.3338 10 16.7129C8.45915 15.3338 6.48811 14.4255 4.31303 14.214C4.21682 13.657 4.16668 13.0843 4.16668 12.4998C4.16668 11.1986 4.41522 9.95539 4.86741 8.81512L10 11.6666ZM6.66668 16.6665V10.4166L10 8.56473" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'CapIcon',
    props: {
      color: {
        type: String,
        default: '#6B7280' // Default color
      }
    }
  }
  </script>