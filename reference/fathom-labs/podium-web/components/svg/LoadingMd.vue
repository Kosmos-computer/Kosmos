<template>
  <div class="loader-box w-20 h-20 rounded-lg border border-gray-200	shadow-lg bg-white flex items-center	justify-center	">
  <span class="loader-spin">
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_685_4526)">
      <path d="M3 19.9541C3 29.3177 10.5906 36.9083 19.9542 36.9083C29.3177 36.9083 36.9083 29.3177 36.9083 19.9541C36.9083 10.5907 29.3177 3 19.9542 3" stroke="#4F46E5" stroke-width="5.5" stroke-linecap="round"/>
      </g>
      <defs>
      <clipPath id="clip0_685_4526">
      <rect width="40" height="40" fill="white"/>
      </clipPath>
      </defs>
    </svg>
  </span>
</div>
  </template>
  <style>
  .loader-spin{
      animation: spin 0.7s linear infinite;
      transform-origin: center; /* Center origin */
  }
  @keyframes spin {
    0% { transform: rotate(0deg); transform-origin: center; }
    100% { transform: rotate(360deg); transform-origin: center; }
  }
</style>