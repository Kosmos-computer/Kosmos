<template>
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      @mouseover="hover(true)"
      @mouseleave="hover(false)"
    >
      <path
        d="M3 5H15M9 3V5M10.0482 14.5C8.52083 12.9178 7.28073 11.0565 6.41187 9M12.5 18H19.5M11 21L16 11L21 21M12.7511 5C11.7831 10.7702 8.06969 15.6095 3 18.129"
        :stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M3 5H15M9 3V5M10.0482 14.5C8.52083 12.9178 7.28073 11.0565 6.41187 9M12.5 18H19.5M11 21L16 11L21 21M12.7511 5C11.7831 10.7702 8.06969 15.6095 3 18.129"
        stroke="black"
        stroke-opacity="0.2"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </template>
  
  <script>
  export default {
    name: 'CustomSvg',
    props: {
      color: {
        type: String,
        default: '#9CA3AF' // default color
      }
    },
    data() {
      return {
        currentColor: this.color
      }
    },
    methods: {
      hover(isHovering) {
        this.currentColor = isHovering ? '#4F46E5' : this.color; // Switch to indigo-600 on hover
      }
    }
  }
  </script>
  