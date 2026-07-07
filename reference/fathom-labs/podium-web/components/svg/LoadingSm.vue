<template>
    <div class="loader-box w-7 h-7 rounded-lg border border-gray-200	shadow-lg bg-white flex items-center	justify-center	">
    <span class="loader-spin">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_10046_5109)">
            <mask id="mask0_10046_5109" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="18" height="18">
            <path d="M18 0H0V18H18V0Z" fill="white"/>
            </mask>
            <g mask="url(#mask0_10046_5109)">
            <path d="M1.35001 8.97944C1.35001 13.1931 4.76578 16.6088 8.9794 16.6088C13.193 16.6088 16.6087 13.1931 16.6087 8.97944C16.6087 4.76591 13.193 1.3501 8.9794 1.3501" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round"/>
            </g>
            </g>
            <defs>
            <clipPath id="clip0_10046_5109">
            <rect width="18" height="18" fill="white"/>
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