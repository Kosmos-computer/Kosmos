<template>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.50002 4.16667C2.50002 3.24619 3.24621 2.5 4.16668 2.5H6.89938C7.25807 2.5 7.57652 2.72953 7.68995 3.06981L8.93813 6.81434C9.06927 7.20777 8.89116 7.63776 8.52024 7.82322L6.63919 8.76375C7.55772 10.801 9.199 12.4423 11.2363 13.3608L12.1768 11.4798C12.3623 11.1088 12.7922 10.9307 13.1857 11.0619L16.9302 12.3101C17.2705 12.4235 17.5 12.7419 17.5 13.1006V15.8333C17.5 16.7538 16.7538 17.5 15.8333 17.5H15C8.09646 17.5 2.50002 11.9036 2.50002 5V4.16667Z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </template>
  
  <script>
  export default {
    name: 'PhoneIcon',
    props: {
      color: {
        type: String,
        default: '#6B7280' // Default color
      }
    }
  }
  </script>