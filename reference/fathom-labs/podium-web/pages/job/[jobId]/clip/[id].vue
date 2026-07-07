<template>
   <div :class="['fade-container',{ hidden: !isIframeLoading } ]" ref="fadeContainer">
      <SvgLoadingMd />
   </div>
   <div class="flex flex-col w-full bg-gray-50 pr-6 pt-2.5" v-cloak style="height: calc(100vh - 69px); padding-right: 393px;">
       <div class="w-full h-full flex flex-row">
          <!-- <div class="w-28 h-full flex flex-col pt-6 px-6 gap-4 fixed top-[79px] left-0">
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer active:bg-indigo-200" @click="sidebarDrawer('template')">
                <div class="text-center">
                   <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <mask id="path-1-inside-1_138_2799" fill="white">
                      <rect x="1" y="5.45459" width="20" height="14.5455" rx="1"/>
                      </mask>
                      <rect x="1" y="5.45459" width="20" height="14.5455" rx="1" stroke="#9CA3AF" stroke-width="4" mask="url(#path-1-inside-1_138_2799)"/>
                      <rect x="1" y="5.45459" width="20" height="14.5455" rx="1" stroke="black" stroke-opacity="0.2" stroke-width="4" mask="url(#path-1-inside-1_138_2799)"/>
                      <rect x="3.45455" y="3.18184" width="15.0909" height="0.909091" rx="0.454545" stroke="#9CA3AF" stroke-width="0.909091"/>
                      <rect x="3.45455" y="3.18184" width="15.0909" height="0.909091" rx="0.454545" stroke="black" stroke-opacity="0.2" stroke-width="0.909091"/>
                      <rect x="6.45455" y="0.454545" width="9.09091" height="0.909091" rx="0.454545" stroke="#9CA3AF" stroke-width="0.909091"/>
                      <rect x="6.45455" y="0.454545" width="9.09091" height="0.909091" rx="0.454545" stroke="black" stroke-opacity="0.2" stroke-width="0.909091"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Template</div>
             </div>
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer active:bg-indigo-200">
                <div class="text-center">
                   <svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.98 4.05005H6.02002C5.42002 4.05005 5.02002 4.45005 5.02002 5.05005V7.04005C5.02002 7.64005 5.42002 8.04005 6.02002 8.04005C6.62002 8.04005 7.02002 7.64005 7.02002 7.04005V6.04005H10.01V14H9.01002C8.41002 14 8.01002 14.4 8.01002 15C8.01002 15.6 8.41002 16 9.01002 16H12.99C13.59 16 13.99 15.6 13.99 15C13.99 14.4 13.59 14 12.99 14H11.99V6.04005H14.98V7.04005C14.98 7.64005 15.38 8.04005 15.98 8.04005C16.58 8.04005 16.98 7.64005 16.98 7.04005V5.05005C16.98 4.45005 16.58 4.05005 15.98 4.05005Z" fill="#9CA3AF"/>
                      <path d="M15.98 4.05005H6.02002C5.42002 4.05005 5.02002 4.45005 5.02002 5.05005V7.04005C5.02002 7.64005 5.42002 8.04005 6.02002 8.04005C6.62002 8.04005 7.02002 7.64005 7.02002 7.04005V6.04005H10.01V14H9.01002C8.41002 14 8.01002 14.4 8.01002 15C8.01002 15.6 8.41002 16 9.01002 16H12.99C13.59 16 13.99 15.6 13.99 15C13.99 14.4 13.59 14 12.99 14H11.99V6.04005H14.98V7.04005C14.98 7.64005 15.38 8.04005 15.98 8.04005C16.58 8.04005 16.98 7.64005 16.98 7.04005V5.05005C16.98 4.45005 16.58 4.05005 15.98 4.05005Z" fill="black" fill-opacity="0.2"/>
                      <path d="M19 2.03003H3V18.03H19V2.03003Z" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10"/>
                      <path d="M19 2.03003H3V18.03H19V2.03003Z" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10"/>
                      <path d="M2.99997 4.06C4.12111 4.06 5.02997 3.15114 5.02997 2.03C5.02997 0.908862 4.12111 0 2.99997 0C1.87883 0 0.969971 0.908862 0.969971 2.03C0.969971 3.15114 1.87883 4.06 2.99997 4.06Z" fill="#9CA3AF"/>
                      <path d="M2.99997 4.06C4.12111 4.06 5.02997 3.15114 5.02997 2.03C5.02997 0.908862 4.12111 0 2.99997 0C1.87883 0 0.969971 0.908862 0.969971 2.03C0.969971 3.15114 1.87883 4.06 2.99997 4.06Z" fill="black" fill-opacity="0.2"/>
                      <path d="M19 4.06C20.1211 4.06 21.03 3.15114 21.03 2.03C21.03 0.908862 20.1211 0 19 0C17.8788 0 16.97 0.908862 16.97 2.03C16.97 3.15114 17.8788 4.06 19 4.06Z" fill="#9CA3AF"/>
                      <path d="M19 4.06C20.1211 4.06 21.03 3.15114 21.03 2.03C21.03 0.908862 20.1211 0 19 0C17.8788 0 16.97 0.908862 16.97 2.03C16.97 3.15114 17.8788 4.06 19 4.06Z" fill="black" fill-opacity="0.2"/>
                      <path d="M19 20.06C20.1211 20.06 21.03 19.1511 21.03 18.03C21.03 16.9089 20.1211 16 19 16C17.8788 16 16.97 16.9089 16.97 18.03C16.97 19.1511 17.8788 20.06 19 20.06Z" fill="#9CA3AF"/>
                      <path d="M19 20.06C20.1211 20.06 21.03 19.1511 21.03 18.03C21.03 16.9089 20.1211 16 19 16C17.8788 16 16.97 16.9089 16.97 18.03C16.97 19.1511 17.8788 20.06 19 20.06Z" fill="black" fill-opacity="0.2"/>
                      <path d="M2.99997 20.06C4.12111 20.06 5.02997 19.1511 5.02997 18.03C5.02997 16.9089 4.12111 16 2.99997 16C1.87883 16 0.969971 16.9089 0.969971 18.03C0.969971 19.1511 1.87883 20.06 2.99997 20.06Z" fill="#9CA3AF"/>
                      <path d="M2.99997 20.06C4.12111 20.06 5.02997 19.1511 5.02997 18.03C5.02997 16.9089 4.12111 16 2.99997 16C1.87883 16 0.969971 16.9089 0.969971 18.03C0.969971 19.1511 1.87883 20.06 2.99997 20.06Z" fill="black" fill-opacity="0.2"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Add Text</div>
             </div>
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer active:bg-indigo-200">
                <div class="text-center">
                   <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.33337 5.0601C3.33337 4.13962 4.07957 3.39343 5.00004 3.39343H15C15.9205 3.39343 16.6667 4.13962 16.6667 5.0601V15.0601C16.6667 15.9806 15.9205 16.7268 15 16.7268H5.00004C4.07957 16.7268 3.33337 15.9806 3.33337 15.0601V5.0601Z" fill="white"/>
                      <path d="M3.33337 13.3934L7.15486 9.57194C7.80574 8.92107 8.86101 8.92107 9.51189 9.57194L13.3334 13.3934M11.6667 11.7268L12.9882 10.4053C13.6391 9.7544 14.6943 9.7544 15.3452 10.4053L16.6667 11.7268M11.6667 6.72677H11.675M5.00004 16.7268H15C15.9205 16.7268 16.6667 15.9806 16.6667 15.0601V5.0601C16.6667 4.13962 15.9205 3.39343 15 3.39343H5.00004C4.07957 3.39343 3.33337 4.13962 3.33337 5.0601V15.0601C3.33337 15.9806 4.07957 16.7268 5.00004 16.7268Z" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M3.33337 13.3934L7.15486 9.57194C7.80574 8.92107 8.86101 8.92107 9.51189 9.57194L13.3334 13.3934M11.6667 11.7268L12.9882 10.4053C13.6391 9.7544 14.6943 9.7544 15.3452 10.4053L16.6667 11.7268M11.6667 6.72677H11.675M5.00004 16.7268H15C15.9205 16.7268 16.6667 15.9806 16.6667 15.0601V5.0601C16.6667 4.13962 15.9205 3.39343 15 3.39343H5.00004C4.07957 3.39343 3.33337 4.13962 3.33337 5.0601V15.0601C3.33337 15.9806 4.07957 16.7268 5.00004 16.7268Z" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Add Image</div>
             </div>
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer">
                <div class="text-center">
                   <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 8.06006H17M7 12.0601H11M12 20.0601L8 16.0601H5C3.89543 16.0601 3 15.1646 3 14.0601V6.06006C3 4.95549 3.89543 4.06006 5 4.06006H19C20.1046 4.06006 21 4.95549 21 6.06006V14.0601C21 15.1646 20.1046 16.0601 19 16.0601H16L12 20.0601Z" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M7 8.06006H17M7 12.0601H11M12 20.0601L8 16.0601H5C3.89543 16.0601 3 15.1646 3 14.0601V6.06006C3 4.95549 3.89543 4.06006 5 4.06006H19C20.1046 4.06006 21 4.95549 21 6.06006V14.0601C21 15.1646 20.1046 16.0601 19 16.0601H16L12 20.0601Z" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Add Captions</div>
             </div>
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer active:bg-indigo-200">
                <div class="text-center">
                   <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.96997 3.06006V16.1201" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M9.96997 3.06006V16.1201" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M12.96 5.65015V13.5301" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M12.96 5.65015V13.5301" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M15.95 7.94006V11.2301" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M15.95 7.94006V11.2301" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M18.9399 6.02002V13.16" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M18.9399 6.02002V13.16" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M6.97998 13.5301V5.65015" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M6.97998 13.5301V5.65015" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M3.98999 11.2301V7.94006" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M3.98999 11.2301V7.94006" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M1 13.16V6.02002" stroke="#9CA3AF" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                      <path d="M1 13.16V6.02002" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Add Wave</div>
             </div>
             <div class="inline-flex items-center justify-center h-14 flex-col gap-2 text-[#7D828C] hover:bg-gray-100 hover:text-gray-600 rounded-md cursor-pointer active:bg-indigo-200">
                <div class="text-center">
                   <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 3.06006H19C20.1046 3.06006 21 3.95549 21 5.06006V13.8174C21 14.3479 20.7893 14.8566 20.4142 15.2316L17.7929 17.853L15.1716 20.4743C14.7965 20.8493 14.2878 21.0601 13.7574 21.0601H5C3.89543 21.0601 3 20.1646 3 19.0601V5.06006C3 3.95549 3.89543 3.06006 5 3.06006Z" stroke="#9CA3AF" stroke-width="2"/>
                      <path d="M5 3.06006H19C20.1046 3.06006 21 3.95549 21 5.06006V13.8174C21 14.3479 20.7893 14.8566 20.4142 15.2316L17.7929 17.853L15.1716 20.4743C14.7965 20.8493 14.2878 21.0601 13.7574 21.0601H5C3.89543 21.0601 3 20.1646 3 19.0601V5.06006C3 3.95549 3.89543 3.06006 5 3.06006Z" stroke="black" stroke-opacity="0.2" stroke-width="2"/>
                      <path d="M20.5 13.5601H17.5C15.2909 13.5601 13.5 15.3509 13.5 17.5601V20.5601" stroke="#9CA3AF" stroke-width="2"/>
                      <path d="M20.5 13.5601H17.5C15.2909 13.5601 13.5 15.3509 13.5 17.5601V20.5601" stroke="black" stroke-opacity="0.2" stroke-width="2"/>
                      <path d="M8 14.0601C11.0854 16.7119 12.8422 16.7415 16 14.0601" stroke="#9CA3AF" stroke-linecap="round"/>
                      <path d="M8 14.0601C11.0854 16.7119 12.8422 16.7415 16 14.0601" stroke="black" stroke-opacity="0.2" stroke-linecap="round"/>
                      <circle cx="9" cy="9.06006" r="1" fill="#9CA3AF"/>
                      <circle cx="9" cy="9.06006" r="1" fill="black" fill-opacity="0.2"/>
                      <circle cx="15" cy="9.06006" r="1" fill="#9CA3AF"/>
                      <circle cx="15" cy="9.06006" r="1" fill="black" fill-opacity="0.2"/>
                   </svg>
                </div>
                <div class="w-full text-center leading-3 font-semibold text-[9px] hover:text-gray-600">Add Sticker</div>
             </div>
          </div>-->
          
          <div class="drawer w-64 fixed left-28 bottom-3 top-[79px] max-h-full flex-col pt-0 z-10 px-0 bg-white rounded-[10px] border border-slate-200 border-solid hidden" :class="{ flex: openTemplateDrawer }">
             <div class="drawer-header flex relative items-center text-base justify-between leading-none p-3 pr-2 border-b border-slate-200 border-solid">
                <span class="font-medium leading-6 inline-block">Templates</span>
                <span class="close-btn inline-flex cursor-pointer h-5 w-5 items-center justify-center" @click="closeTemplateDrawer">
                   <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.434266 0.434266C0.746685 0.121846 1.25322 0.121846 1.56564 0.434266L4.99995 3.86858L8.43427 0.434266C8.74669 0.121846 9.25322 0.121846 9.56564 0.434266C9.87806 0.746685 9.87806 1.25322 9.56564 1.56564L6.13132 4.99995L9.56564 8.43427C9.87806 8.74669 9.87806 9.25322 9.56564 9.56564C9.25322 9.87806 8.74669 9.87806 8.43427 9.56564L4.99995 6.13132L1.56564 9.56564C1.25322 9.87806 0.746685 9.87806 0.434266 9.56564C0.121846 9.25322 0.121846 8.74669 0.434266 8.43427L3.86858 4.99995L0.434266 1.56564C0.121846 1.25322 0.121846 0.746685 0.434266 0.434266Z" fill="#9CA3AF"/>
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.434266 0.434266C0.746685 0.121846 1.25322 0.121846 1.56564 0.434266L4.99995 3.86858L8.43427 0.434266C8.74669 0.121846 9.25322 0.121846 9.56564 0.434266C9.87806 0.746685 9.87806 1.25322 9.56564 1.56564L6.13132 4.99995L9.56564 8.43427C9.87806 8.74669 9.87806 9.25322 9.56564 9.56564C9.25322 9.87806 8.74669 9.87806 8.43427 9.56564L4.99995 6.13132L1.56564 9.56564C1.25322 9.87806 0.746685 9.87806 0.434266 9.56564C0.121846 9.25322 0.121846 8.74669 0.434266 8.43427L3.86858 4.99995L0.434266 1.56564C0.121846 1.25322 0.121846 0.746685 0.434266 0.434266Z" fill="black" fill-opacity="0.2"/>
                   </svg>
                </span>
             </div>
             <div class="drawer-body block text-center p-2 gap-2 justify-center overflow-auto scroll-smooth">
 
                <div class="template-outer inline-block m-auto p-2 rounded-xl border border-transparent border-solid">
                   <div class="template-inner inline-flex p-2 bg-[#278315] rounded-lg relative">
                      <div class="template-item h-64 w-36"> </div>
                      <div class="actionbtn bg-white inline-block absolute rounded-full cursor-pointor right-2 top-2 h-6 w-6 z-10">
                         <svg class="inline-block cursor-pointor" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#filter0_d_105_4372)">
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="#9CA3AF"/>
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="#9CA3AF"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="#9CA3AF"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="black" fill-opacity="0.2"/>
                            </g>
                            <defs>
                            <filter id="filter0_d_105_4372" x="0.5" y="0" width="24" height="24" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="1"/>
                            <feGaussianBlur stdDeviation="1"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_105_4372"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_105_4372" result="shape"/>
                            </filter>
                            </defs>
                         </svg>
                      </div>
                   </div>
                </div>
                <div class="template-outer inline-block m-auto p-2 rounded-xl border border-[#4F46E5] border-solid bg-[#E0E7FF]">
                   <div class="template-inner inline-flex p-2 bg-[#6D268C] rounded-lg relative">
                      <div class="template-item h-64 w-36"> </div>
                      <div class="actionbtn bg-white inline-block absolute rounded-full cursor-pointor right-2 top-2 h-6 w-6 z-10">
                         <svg class="inline-block cursor-pointor" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#filter0_d_105_4372)">
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="#9CA3AF"/>
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="#9CA3AF"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="#9CA3AF"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="black" fill-opacity="0.2"/>
                            </g>
                            <defs>
                            <filter id="filter0_d_105_4372" x="0.5" y="0" width="24" height="24" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="1"/>
                            <feGaussianBlur stdDeviation="1"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_105_4372"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_105_4372" result="shape"/>
                            </filter>
                            </defs>
                         </svg>
                      </div>
                   </div>
                </div>
                <div class="template-outer inline-block m-auto p-2 rounded-xl border border-transparent border-solid">
                   <div class="template-inner inline-flex p-2 bg-[#DECB21] rounded-lg relative">
                      <div class="template-item h-64 w-36"> </div>
                      <div class="actionbtn bg-white inline-block absolute rounded-full cursor-pointor right-2 top-2 h-6 w-6 z-10">
                         <svg class="inline-block cursor-pointor" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#filter0_d_105_4372)">
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="#9CA3AF"/>
                            <path d="M8.5 11C8.5 12.1046 7.60457 13 6.5 13C5.39543 13 4.5 12.1046 4.5 11C4.5 9.89543 5.39543 9 6.5 9C7.60457 9 8.5 9.89543 8.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="#9CA3AF"/>
                            <path d="M14.5 11C14.5 12.1046 13.6046 13 12.5 13C11.3954 13 10.5 12.1046 10.5 11C10.5 9.89543 11.3954 9 12.5 9C13.6046 9 14.5 9.89543 14.5 11Z" fill="black" fill-opacity="0.2"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="#9CA3AF"/>
                            <path d="M18.5 13C19.6046 13 20.5 12.1046 20.5 11C20.5 9.89543 19.6046 9 18.5 9C17.3954 9 16.5 9.89543 16.5 11C16.5 12.1046 17.3954 13 18.5 13Z" fill="black" fill-opacity="0.2"/>
                            </g>
                            <defs>
                            <filter id="filter0_d_105_4372" x="0.5" y="0" width="24" height="24" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="1"/>
                            <feGaussianBlur stdDeviation="1"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_105_4372"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_105_4372" result="shape"/>
                            </filter>
                            </defs>
                         </svg>
                      </div>
                   </div>
                </div>
 
             </div>
          </div>
 
          <div class="h-full flex flex-1 pl-28">
             <div class="flex flex-col w-full pt-10 pr-0 items-center text-center">
                <div id="podiumGPT-body" class="w-full px-1 mb-[100px] pr-[373px];">
                   <div class="flex flex-col items-center justify-center h-full">
                      
                      <div v-if="!isIframeLoading" class="leading-5 font-regular text-gray-400 mb-1" style="font-size: 9px;">
                         {{ t('Select Aspect Ratio') }}
                      </div>
                      <div v-if="!isIframeLoading"  class="flex space-x-0 items-center justify-center pillsContainer">
                         <div v-for="(icon, index) in icons" :key="index" @click="selectIcon(index)" 
                         :class="[selectedIndex === index ? ' bg-indigo-100' : ' bg-white',  'pill_ cursor-pointer w-12 h-10 inline-flex items-center justify-center border border-solid border-gray-300']"
                         >
                            <component :is="icon.type"
                               :color="selectedIndex === index ? '#6366F1' : '#9CA3AF'"> 
                            </component>
                         </div>
                      </div>
                      <div id="video-container" ref="videoContainer" class="mt-6" :style="{ width: iframeWidth2 + 'px'}" >  
                         
                         <div :class="[!isIframeLoading ? 'relative fade-in' : 'relative'] ">
                               <iframe id="videoPlayer" :width="iframeWidth2" :height="iframeHeight2" :src="iframeSrc" frameborder="0" allow="autoplay"></iframe>
                         </div>
                         <div v-if="!isIframeLoading"  class="w-full text-left mt-6 flex justify-between">
                            <div>
                                  <div class="text-sm leading-5 font-medium text-gray-700" > {{ t(iframeLayoutType) }} </div>
                                  <div v-if="iframeLayoutType =='Portrait'" class="leading-5 font-regular text-gray-700 mt-1 leading-4 whitespace-nowrap" style="font-size: 9px;">{{ t('Exports as 1080x1920px (Facebook, Instagram)') }}</div>
                                  <div v-if="iframeLayoutType =='Landscape'" class="leading-5 font-regular text-gray-700 mt-1 leading-4" style="font-size: 9px;" >{{ t('Exports as 1080x1920px (Facebook, Instagram)') }}</div>
                                  <div v-if="iframeLayoutType =='Square'" class="leading-5 font-regular text-gray-700 mt-1 leading-4 whitespace-nowrap" style="font-size: 9px;">{{ t('Exports as 1080x1080px (Facebook, Instagram)') }}</div>
                            </div>
                            <div class="inline-flex">
                                  <button class="bg-indigo-600 text-white rounded-full p-2 content-center h-10 w-10 inline-flex items-center justify-center"
                                  @click="downloadVideoByLayout()">
                                     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M2.33301 12.166C2.33301 12.9944 3.00458 13.666 3.83301 13.666L12.1663 13.666C12.9948 13.666 13.6663 12.9944 13.6663 12.166L13.6663 11.3327C13.6663 10.7804 14.1141 10.3327 14.6663 10.3327C15.2186 10.3327 15.6663 10.7804 15.6663 11.3327L15.6663 12.166C15.6663 14.099 14.0993 15.666 12.1663 15.666L3.83301 15.666C1.90001 15.666 0.333008 14.099 0.333008 12.166L0.333008 11.3327C0.333008 10.7804 0.780723 10.3327 1.33301 10.3327C1.88529 10.3327 2.33301 10.7804 2.33301 11.3327L2.33301 12.166ZM3.95923 7.29224C4.34976 6.90172 4.98292 6.90172 5.37345 7.29224L6.99967 8.91847L6.99967 1.33268C6.99967 0.780399 7.44739 0.332683 7.99967 0.332683C8.55196 0.332683 8.99967 0.780398 8.99967 1.33268L8.99967 8.91847L10.6259 7.29224C11.0164 6.90172 11.6496 6.90172 12.0401 7.29224C12.4306 7.68277 12.4306 8.31593 12.0401 8.70646L8.70678 12.0398C8.31626 12.4303 7.68309 12.4303 7.29257 12.0398L3.95923 8.70646C3.56871 8.31593 3.56871 7.68277 3.95923 7.29224Z" fill="white"/>
                                     </svg>
                                  </button>
                               </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
      
 
   </div>
    <transition :name="transitionName">
   <div v-if="!isIframeLoading"  class='fixed overflow-y-auto right-0 top-[69px] min-w-[393px] max-w-[393px] border-l border-gray-200 top-0 bg-white  overscroll-contain pb-[40px]' style="height: calc(100vh - 226px + 34px);">
    <div class="flex overflow-scroll border-b border-gray-200 px-6 pt-4 sticky top-0 bg-white z-10">
         <div v-if="whichTabClickedInIframe" @click="showTitleSections" :class="[TitleSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-3 px-1 border-indigo-500 cursor-pointer mr-8']">{{ t('Selected') }}</div>
         <div @click="showDesignSections" :class="[DesignSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-3 px-1 border-indigo-500 cursor-pointer mr-8']">{{ t('Background') }}</div>
         <!--<div @click="showTemplatesSections" :class="[TemplatesSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-3 px-1 border-indigo-500 cursor-pointer mr-8']">{{ t('Templates') }}</div>-->
         <div @click="showTranscriptSections" :class="[TranscriptSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-3 px-1 border-indigo-500 cursor-pointer']">{{ t('Transcript') }}</div>
      </div>
 
      <!--Title section start-->
      <div v-if="TitleSection" class="flex flex-col pt-6 pl-6 gap-2 pr-6 max-h-full">
          <div class="labelMain flex items-center gap-4 mb-2" v-if="!hideTypographyShowImageSettings">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.95 4.04999H5.98999C5.38999 4.04999 4.98999 4.44999 4.98999 5.04999V7.03999C4.98999 7.63999 5.38999 8.03999 5.98999 8.03999C6.58999 8.03999 6.98999 7.63999 6.98999 7.03999V6.03999H9.97999V14H8.97999C8.37999 14 7.97999 14.4 7.97999 15C7.97999 15.6 8.37999 16 8.97999 16H12.96C13.56 16 13.96 15.6 13.96 15C13.96 14.4 13.56 14 12.96 14H11.96V6.03999H14.95V7.03999C14.95 7.63999 15.35 8.03999 15.95 8.03999C16.55 8.03999 16.95 7.63999 16.95 7.03999V5.04999C16.95 4.44999 16.55 4.04999 15.95 4.04999Z" fill="#4B5563"/>
                      <path d="M18.97 2.03003H2.96997V18.03H18.97V2.03003Z" stroke="#4B5563" stroke-width="2" stroke-miterlimit="10"/>
                      <path d="M2.96994 4.06C4.09108 4.06 4.99994 3.15114 4.99994 2.03C4.99994 0.908862 4.09108 0 2.96994 0C1.8488 0 0.939941 0.908862 0.939941 2.03C0.939941 3.15114 1.8488 4.06 2.96994 4.06Z" fill="#4B5563"/>
                      <path d="M18.9699 4.06C20.0911 4.06 20.9999 3.15114 20.9999 2.03C20.9999 0.908862 20.0911 0 18.9699 0C17.8488 0 16.9399 0.908862 16.9399 2.03C16.9399 3.15114 17.8488 4.06 18.9699 4.06Z" fill="#4B5563"/>
                      <path d="M18.9699 20.06C20.0911 20.06 20.9999 19.1511 20.9999 18.03C20.9999 16.9089 20.0911 16 18.9699 16C17.8488 16 16.9399 16.9089 16.9399 18.03C16.9399 19.1511 17.8488 20.06 18.9699 20.06Z" fill="#4B5563"/>
                      <path d="M2.96994 20.06C4.09108 20.06 4.99994 19.1511 4.99994 18.03C4.99994 16.9089 4.09108 16 2.96994 16C1.8488 16 0.939941 16.9089 0.939941 18.03C0.939941 19.1511 1.8488 20.06 2.96994 20.06Z" fill="#4B5563"/>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Text Box') }}</span>
          </div>
         <div v-if="!hideTypographyShowImageSettings && !isHideShowtypographyText">
            <label for="name" class="block text-sm font-medium leading-5 text-gray-700">{{ t('Text') }}</label>
            <div class="mt-1">
               <input type="text" :placeholder="t('Show Name')" v-model="typographyText"  @input="updateTypographyText"  id="name" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 text-sm min-h-10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-7"  />
            </div>
         </div>
         <!--Font size start-->
         <div class="new-file-form__row mt-0" v-if="!hideTypographyShowImageSettings">
             <Menu as="div" class="relative text-left w-full mr-0">
                <div>
                   <label class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Font') }}</label>
                   <MenuButton class="project-combobox set-speakers-form__combobox">
                      {{ selectedFont }} 
                      <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-500" aria-hidden="true" />
                   </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100"
                   enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                   leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                   leave-to-class="transform opacity-0 scale-95">
                   <MenuItems
                      class="absolute z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div class="py-0 border-none" v-for="font in fontsLists">
                         <MenuItem v-slot="{ active  }">
                            <span 
                               @click="updateFont(font)"
                               :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer relative',
                               ]">
                               {{ font }}  
                               <span v-if="font==selectedFont" class="slectedIcon absolute right-6 ">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                     <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                                  </svg>
                               </span>
                            </span>
                         </MenuItem>
                      </div>
                   </MenuItems>
                </transition>
             </Menu>
          </div>
          <!--Font size end-->
 
         <div class="flex flex-row items-start space-x-5 mb-2" v-if="!hideTypographyShowImageSettings">
             <div class="col-span-full w-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Color') }}</label>
                   <div class="mt-0 flex items-center gap-5">
                      <!--<div  :class="{
                      'border border-transparent': fontValidColorCode != '#FFFFFF' && fontValidColorCode != '#D3D3D3'  && fontValidColorCode != 'null',
                      'border border-black': fontValidColorCode == '#FFFFFF' || fontValidColorCode == '#D3D3D3' || fontValidColorCode == 'null',
                      'h-10 w-[38px] min-w-[38px] cursor-pointer rounded-lg': true
                   }" @click="openColorPicker('font')" :style="fontValidColorCode && fontValidColorCode !='null' ? { backgroundColor: fontValidColorCode } : {}">
                      </div>-->
                      <div class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow border border-gray-200 rounded-lg" @click="openColorPicker('font')" :style="fontValidColorCode && fontValidColorCode !='null' ? { backgroundColor: fontValidColorCode } : {}">
                      </div>
                      <input 
                        type="text" 
                        v-model="fontLatestClr" 
                        @input="validateAndUpdateFontColor"
                        class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
                      <!--<span class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" >{{fontValidColorCode && fontValidColorCode!= 'null' ? fontValidColorCode : '#FFFFFF'}}</span>-->
                   </div>
             </div>
             <div class="col-span-full mt-0 flex w-full flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Font Size') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="fontSize" min="1" max="40" @input="updateFontSize" @blur="saveClipDetailsByClipId()"    />
                </div>
             </div>
          </div>
          <div class="flex flex-row items-start space-x-5 mb-2" v-if="!hideTypographyShowImageSettings">
             <div class="col-span-full w-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Alignment') }}</label>
                   <div class="flex w-full space-x-0 items-center justify-center pillsContainer">
                         <div v-for="(icon, index) in alignIcons" :key="index" @click="selectAlignIcon(icon.align)" 
                         :class="[textAlign === icon.align ? ' bg-gray-100' : ' bg-white',  'pill_ cursor-pointer w-full h-10 inline-flex items-center justify-center border border-solid border-gray-300']"
                         >
                            <component :is="icon.type"
                               :color="textAlign === icon.align ? '#9CA3AF' : '#9CA3AF'"> 
                            </component>
                         </div>
                      </div>
             </div>
             <div class="col-span-full mt-0 flex w-full flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Opacity') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="fontOpacity" min="0" max="100" @input="updateFontOpacity" @blur="saveClipDetailsByClipId()"    />
                </div>
             </div>
          </div>
       
         <div class="hr block -mx-6 border-t border-gray-300" v-if="!hideTypographyShowImageSettings"></div>
          <!-- start image setting-->
          <div class="labelMain grid grid-cols-3 gap-4 mb-2 mt-0" v-if="hideTypographyShowImageSettings">
             <div v-if="!showVideoControls" class="col-span-2 flex items-center gap-4">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 16L6.73223 10.2678C7.70854 9.29146 9.29146 9.29146 10.2678 10.2678L16 16M13.5 13.5L15.4822 11.5178C16.4585 10.5415 18.0415 10.5415 19.0178 11.5178L21 13.5M13.5 6H13.5125M3.5 21H18.5C19.8807 21 21 19.8807 21 18.5V3.5C21 2.11929 19.8807 1 18.5 1H3.5C2.11929 1 1 2.11929 1 3.5V18.5C1 19.8807 2.11929 21 3.5 21Z" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Image Setting') }}</span>
             </div>
             <div v-if="showVideoControls" class="col-span-2 flex items-center gap-4">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 6.66667C2.5 5.74619 3.24619 5 4.16667 5H10.8333C11.7538 5 12.5 5.74619 12.5 6.66667V13.3333C12.5 14.2538 11.7538 15 10.8333 15H4.16667C3.24619 15 2.5 14.2538 2.5 13.3333V6.66667Z" fill="white"/>
                      <path d="M12.5 8.33333L16.294 6.43634C16.8481 6.1593 17.5 6.56221 17.5 7.18169V12.8183C17.5 13.4378 16.8481 13.8407 16.294 13.5637L12.5 11.6667M4.16667 15H10.8333C11.7538 15 12.5 14.2538 12.5 13.3333V6.66667C12.5 5.74619 11.7538 5 10.8333 5H4.16667C3.24619 5 2.5 5.74619 2.5 6.66667V13.3333C2.5 14.2538 3.24619 15 4.16667 15Z" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Video Setting') }}</span>
             </div>
         </div>
         <div class="flex flex-row space-x-10 mb-2 justify-between items-center w-full" v-if="hideTypographyShowImageSettings">
             <div class="col-span-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('View') }}</label>
                   <div class="mt-0 flex items-center gap-5">
                      <div v-if="!showVideoControls" class="h-10 w-[38px] min-w-[38px] bg-gray-600 rounded-lg bg-gray-300">
                         <img v-if="srcOfFile" :src="srcOfFile" class="h-10 w-full rounded-lg object-cover"/>
                      </div>
                       
                      
                      <Menu as="div" class="relative text-left w-full mr-0">
                         <div>
                            <MenuButton class="project-combobox set-speakers-form__combobox">
                               {{ t(mainStore.capitalizeFirstLetter(selectedFill)) }}  
                               <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-500" aria-hidden="true" />
                            </MenuButton>
                         </div>
                         <transition enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95">
                            <MenuItems
                               class="absolute z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none min-w-[130px]">
                               <div class="py-0 border-none" v-for="fill in fillLists">
                                  <MenuItem v-slot="{ active  }">
                                     <span 
                                        @click="updateFill(fill)"
                                        :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer relative',
                                        ]">
                                        {{ t(mainStore.capitalizeFirstLetter(fill)) }}
                                        <span v-if="fill==selectedFill" class="slectedIcon absolute right-6 ">
                                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                                           </svg>
                                        </span>
                                     </span>
                                  </MenuItem>
                               </div>
                            </MenuItems>
                         </transition>
                      </Menu>
                  
                   </div>
             </div>
 
             
             <div class="col-span-full mt-0 flex flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Corner Radius') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="cornerRadius" min="0" max="400" @input="updateCornerRadius" @blur="saveClipDetailsByClipId()"    />
                </div>
             </div>
          </div>
             <div v-if="showVideoControls && hideTypographyShowImageSettings" class="flex w-full flex-row space-x-2 mb-2">
                <div class="col-span-full w-full mt-0">
                  <label for="photo" class="block text-sm font-medium leading-6 text-gray-700 mb-1">{{ t('Alignment') }}</label>
                  <div class="grid grid-cols-3 mt-2 w-fit rounded-md shadow-sm overflow-hidden border border-gray-200">
                    <!-- Top Left Corner -->
                    <div class="w-10 h-10"></div>
                    <!-- Top Center -->
                    <div v-if="videoAlignIcons.length > 0" @click="selectVideoAlign(videoAlignIcons[0].align)" 
                         :class="[videoAlign === videoAlignIcons[0].align ? 'bg-gray-50' : 'bg-white', 'pill_ cursor-pointer w-10 h-10 inline-flex items-center justify-center']">
                         <component :is="videoAlignIcons[0].type" :color="videoAlign === videoAlignIcons[0].align ? '#9CA3AF' : ''"></component>
                    </div>
                    <!-- Top Right Corner -->
                    <div class="w-10 h-10"></div>
 
                    <!-- Middle Left -->
                    <div v-if="videoAlignIcons.length > 1" @click="selectVideoAlign(videoAlignIcons[1].align)" 
                         :class="[videoAlign === videoAlignIcons[1].align ? 'bg-gray-50' : 'bg-white', 'pill_ cursor-pointer w-10 h-10 inline-flex items-center justify-center']">
                         <component :is="videoAlignIcons[1].type" :color="videoAlign === videoAlignIcons[1].align ? '#9CA3AF' : ''"></component>
                    </div>
 
                    <!-- Middle Center -->
                    <div v-if="videoAlignIcons.length > 2" @click="selectVideoAlign(videoAlignIcons[2].align)" 
                         :class="[videoAlign === videoAlignIcons[2].align ? 'bg-gray-50' : 'bg-white', 'pill_ cursor-pointer w-10 h-10 inline-flex items-center justify-center']">
                         <component :is="videoAlignIcons[2].type" :color="videoAlign === videoAlignIcons[2].align ? '#9CA3AF' : ''"></component>
                    </div>
 
                    <!-- Middle Right -->
                    <div v-if="videoAlignIcons.length > 3" @click="selectVideoAlign(videoAlignIcons[3].align)" 
                         :class="[videoAlign === videoAlignIcons[3].align ? 'bg-gray-50' : 'bg-white', 'pill_ cursor-pointer w-10 h-10 inline-flex items-center justify-center']">
                         <component :is="videoAlignIcons[3].type" :color="videoAlign === videoAlignIcons[3].align ? '#9CA3AF' : ''"></component>
                    </div>
 
                    <!-- Bottom Left Corner -->
                    <div class="w-10 h-10"></div>
 
                    <!-- Bottom Center -->
                    <div v-if="videoAlignIcons.length > 4" @click="selectVideoAlign(videoAlignIcons[4].align)" 
                         :class="[videoAlign === videoAlignIcons[4].align ? 'bg-gray-100' : 'bg-white', 'pill_ cursor-pointer w-10 h-10 inline-flex items-center justify-center']">
                         <component :is="videoAlignIcons[4].type" :color="videoAlign === videoAlignIcons[4].align ? '#9CA3AF' : ''"></component>
                    </div>
 
                    <!-- Bottom Right Corner -->
                    <div class="w-10 h-10 flex items-center justify-center"></div>
                  </div>
                </div>
                <div class="flex flex-col w-full mt-0">
                   <div class="flex flex-col mt-0 w-full">
                      <label class="block text-sm font-medium leading-6 text-gray-700 w-full">Opacity</label>
                      <div class="relative mt-2 rounded-md shadow-sm w-full">
                         <input type="number" 
                         class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            v-model="videoOpacity" min="0" max="100" @input="updateVideoOpacity" @blur="saveClipDetailsByClipId()"   placeholder="%" />
                      </div>
                   </div>
                   <div class="col-span-full mt-2 flex w-full flex-wrap">
                      <label class="block text-sm font-medium leading-6 text-gray-700 w-full">Scale</label>
                      <div class="relative mt-2 rounded-md shadow-sm w-full">
                         <input type="number" 
                         class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            v-model="videoScale" min="0" max="400" @input="updateVideoScale" @blur="saveClipDetailsByClipId()"   placeholder="%" />
                      </div>
                   </div>
                </div>
             </div>
          <div class="hr block -mx-6 border-t border-gray-300" v-if="hideTypographyShowImageSettings"></div>
 
       <!-- end image setting-->
         <div class="labelMain flex items-center gap-4 mb-2 mt-2">
             <span class="icn w-6 text-center inline-flex justify-center">
                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M6.3501 2.03003V18.03H2.3501V2.03003H6.3501ZM8.3501 0.0300293H0.350098V20.03H8.3501V0.0300293Z" fill="#4B5563"/>
                   <path d="M8.36006 18.03H4.57007V20.03H8.36006V18.03Z" fill="#4B5563"/>
                   <path d="M8.36006 14.03H4.57007V16.03H8.36006V14.03Z" fill="#4B5563"/>
                   <path d="M8.36006 10.03H4.57007V12.03H8.36006V10.03Z" fill="#4B5563"/>
                   <path d="M8.36006 6.03003H4.57007V8.03003H8.36006V6.03003Z" fill="#4B5563"/>
                   <path d="M18.3501 2.03003V6.03003H2.3501V2.03003H18.3501ZM20.3501 0.0300293H0.350098V8.03003H20.3501V0.0300293Z" fill="#4B5563"/>
                   <path d="M20.3601 4.23999H18.3601V8.02999H20.3601V4.23999Z" fill="#4B5563"/>
                   <path d="M16.3601 4.23999H14.3601V8.02999H16.3601V4.23999Z" fill="#4B5563"/>
                   <path d="M12.3601 4.23999H10.3601V8.02999H12.3601V4.23999Z" fill="#4B5563"/>
                   <path d="M8.36011 4.23999H6.36011V8.02999H8.36011V4.23999Z" fill="#4B5563"/>
                </svg>
             </span>
             <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Layout') }}</span>
         </div>
 
         <div class="flex flex-row items-start space-x-5 mb-0">
             <div class="basis-1/2 mt-0">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">X</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="yLayout" min="0" max="400" @input="updateYLayout" @blur="saveClipDetailsByClipId()"   />
                </div>
             </div>
             <div class="basis-1/2 mt-0 flex w-full flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">Y</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="xLayout" min="0" max="400" @input="updateXLayout" @blur="saveClipDetailsByClipId()"   />
                </div>
             </div>
          </div>
 
          <div class="flex flex-row items-start space-x-5 mb-2">
             <div class="basis-1/2 mt-0 flex flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Width') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="widthLayout" min="0" max="400" @input="updateWidthLayout" @blur="saveClipDetailsByClipId()"    />
                </div>
             </div>
             <div v-if="whichTabClickedInIframe === 'image-overlay' || whichTabClickedInIframe === 'video-overlay'" class="basis-1/2 mt-0">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Height') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="heightLayout" min="0" max="400" @input="updateHeightLayout" @blur="saveClipDetailsByClipId()" />
                </div>
             </div>
          </div>
 
          <div v-if="!hideTypographyShowImageSettings" class="hr block -mx-6 border-t border-gray-300"></div>
       
 
          <div v-if="!hideTypographyShowImageSettings" class="labelMain grid grid-cols-3 gap-4 mb-2 mt-2">
             <div class="col-span-2 flex items-center gap-4">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.9298 2.02979C17.7298 2.02979 18.2598 2.55979 18.2598 3.35979V6.02979C18.2598 6.82979 17.7298 7.35979 16.9298 7.35979C16.1298 7.35979 15.5998 6.82979 15.5998 6.02979V4.69978H11.5998V15.3698H12.9298C13.7298 15.3698 14.2598 15.8998 14.2598 16.6998C14.2598 17.4998 13.7298 18.0298 12.9298 18.0298H7.59977C6.79977 18.0298 6.26977 17.4998 6.26977 16.6998C6.26977 15.8998 6.79977 15.3698 7.59977 15.3698H8.92978V4.68979H4.92978V6.01978C4.92978 6.81979 4.39977 7.34978 3.59977 7.34978C2.79977 7.34978 2.26978 6.81979 2.26978 6.01978V3.34979C2.26978 2.54979 2.79977 2.01979 3.59977 2.01979H16.9298M16.9298 0.0297852H3.59977C1.69977 0.0297852 0.269775 1.45979 0.269775 3.35979V6.02979C0.269775 7.92979 1.69977 9.35979 3.59977 9.35979C5.26977 9.35979 6.57978 8.24978 6.86978 6.68979H6.92978V13.4198C5.36978 13.7098 4.25977 15.0198 4.25977 16.6898C4.25977 18.5898 5.68977 20.0198 7.58977 20.0198H12.9198C14.8198 20.0198 16.2498 18.5898 16.2498 16.6898C16.2498 15.0198 15.1398 13.7098 13.5798 13.4198V6.68979H13.6398C13.9298 8.24978 15.2398 9.35979 16.9098 9.35979C18.8098 9.35979 20.2398 7.92979 20.2398 6.02979V3.35979C20.2398 1.45979 18.8098 0.0297852 16.9098 0.0297852H16.9298Z" fill="#4B5563"/>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Outline Stroke') }}</span>
             </div>
             <div class="cancelBtn text-right">
                <span v-if="!isOpenOutLineStroke" class="inline-flex cursor-pointer" @click="showOutLineStroke">
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M8.00016 1.44092V14.7743M14.6668 8.10758L1.3335 8.10758" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </span>
                <span v-if="isOpenOutLineStroke" class="inline-flex cursor-pointer" @click="hideOutLineStroke">
                   <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.378831C0.683418 -0.0116936 1.31658 -0.0116935 1.70711 0.378831L6 4.67172L10.2929 0.378831C10.6834 -0.0116931 11.3166 -0.0116931 11.7071 0.378831C12.0976 0.769355 12.0976 1.40252 11.7071 1.79304L7.41421 6.08594L11.7071 10.3788C12.0976 10.7694 12.0976 11.4025 11.7071 11.793C11.3166 12.1836 10.6834 12.1836 10.2929 11.793L6 7.50015L1.70711 11.793C1.31658 12.1836 0.683418 12.1836 0.292893 11.793C-0.0976311 11.4025 -0.0976311 10.7694 0.292893 10.3788L4.58579 6.08594L0.292893 1.79304C-0.0976311 1.40252 -0.0976309 0.769355 0.292893 0.378831Z" fill="#4B5563"/>
                   </svg>
 
                </span>
             </div>
         </div>
    
         <div class="flex flex-row items-start space-x-5 mb-2" v-if="isOpenOutLineStroke">
             <div class="col-span-full w-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Color') }}</label>
                   <div class="mt-0 flex items-center gap-5">
                      <div  class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow border border-gray-200 rounded-lg" @click="openColorPicker('stroke')" :style="strokeValidColorCode && strokeValidColorCode !='null' ? { backgroundColor: strokeValidColorCode } : {}">
                      </div>
                      <input 
                        type="text" 
                        v-model="strokeLatestClr" 
                        @input="validateAndUpdateStrokeColor"
                        class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
                   </div>
             </div>
             <div class="col-span-full mt-0 flex w-full flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Width') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="widthOutlineStroke" min="0" max="400" @input="updateWidthOutlineStroke" @blur="saveClipDetailsByClipId()"    />
                </div>
             </div>
          </div>
 
          <div class="hr block -mx-6 border-t border-gray-300"></div>
 
          <div class="labelMain grid grid-cols-3 gap-4 mb-2 mt-2">
             <div class="col-span-2 flex items-center gap-4">
              
               
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.05 2.00901V14.003H2.05005V2.00901H14.05ZM16.05 0.0100098H0.0500488V16.002H16.05V0.0100098Z" fill="#4B5563"/>
                      <path d="M16 15.932V4.008H20V20H4V16.002L16 15.932Z" fill="#4B5563"/>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Drop Shadow') }}</span>
             </div>
             <div class="cancelBtn text-right">
                <span v-if="!isOpenDropShadow" class="inline-flex cursor-pointer"  @click="showDropShadow">
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M8.00016 1.44092V14.7743M14.6668 8.10758L1.3335 8.10758" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </span>
                <span v-if="isOpenDropShadow" class="inline-flex cursor-pointer"  @click="hideDropShadow">
                   <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.378831C0.683418 -0.0116936 1.31658 -0.0116935 1.70711 0.378831L6 4.67172L10.2929 0.378831C10.6834 -0.0116931 11.3166 -0.0116931 11.7071 0.378831C12.0976 0.769355 12.0976 1.40252 11.7071 1.79304L7.41421 6.08594L11.7071 10.3788C12.0976 10.7694 12.0976 11.4025 11.7071 11.793C11.3166 12.1836 10.6834 12.1836 10.2929 11.793L6 7.50015L1.70711 11.793C1.31658 12.1836 0.683418 12.1836 0.292893 11.793C-0.0976311 11.4025 -0.0976311 10.7694 0.292893 10.3788L4.58579 6.08594L0.292893 1.79304C-0.0976311 1.40252 -0.0976309 0.769355 0.292893 0.378831Z" fill="#4B5563"/>
                   </svg>
 
                </span>
             </div>
         </div>
 
         <div class="flex flex-row items-start space-x-5 mb-2" v-if="isOpenDropShadow">
             <div class="col-span-full w-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Color') }}</label>
                   <div class="mt-0 flex items-center gap-5">
                      <div  class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow-md border border-gray-200 rounded-lg"  @click="openColorPicker('dropshadow')"  
                   :style="dropShadowValidColorCode && dropShadowValidColorCode !='null' ? { backgroundColor: dropShadowValidColorCode } : {}">
                      </div>
                      <input 
                        type="text" 
                        v-model="latestDropShadow" 
                        @input="validateAndUpdateShadowColor"
                        class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
                      <!--<span class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" >{{dropShadowValidColorCode && dropShadowValidColorCode!= 'null'  ? dropShadowValidColorCode : '#FFFFFF'}}</span>-->
                   </div>
             </div>
 
             <!--Start presets for drop shadow-->
             <div class="new-file-form__row w-full mt-0">
             <Menu as="div" class="relative text-left w-full mr-0">
                <div>
                   <label class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Size') }}</label>
                   <MenuButton class="project-combobox set-speakers-form__combobox">
                      {{ t(selectedSpread) }} 
                      <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-500" aria-hidden="true" />
                   </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100"
                   enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                   leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                   leave-to-class="transform opacity-0 scale-95">
                   <MenuItems
                      class="absolute z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none  min-w-[110px]">
                      <div class="py-0 border-none" v-for="spread in spreadLists">
                         <MenuItem v-slot="{ active  }">
                            <span 
                               @click="updateselectedSpread(spread)"
                               :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center justify-between px-4 py-2 text-sm cursor-pointer relative',
                               ]">
                               {{ t(spread) }}  
                               <span v-if="spread==selectedSpread" class="slectedIcon">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                     <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                                  </svg>
                               </span>
                            </span>
                         </MenuItem>
                      </div>
                   </MenuItems>
                </transition>
             </Menu>
          </div>
             <!--End presets for drop shadow-->
          </div>
 
          <div class="hr block -mx-6 border-t border-gray-300" v-if="!hideTypographyShowImageSettings"></div>
          <div class="labelMain grid grid-cols-3 gap-4 mb-2 mt-2" :class="{'pb-4': !isOpenBackground}"  v-if="!hideTypographyShowImageSettings">
             <div class="col-span-2 flex items-center gap-4">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_9978_3944)">
                         <path d="M18.22 0H1.78C0.8 0 0 0.8 0 1.78V18.21C0 19.2 0.8 20 1.78 20H18.21C19.2 20 19.99 19.2 19.99 18.22V1.78C20 0.8 19.2 0 18.22 0ZM15.97 7.01C15.97 7.61 15.57 8.01 14.97 8.01C14.37 8.01 13.97 7.61 13.97 7.01V6.01H10.98V13.97H11.98C12.58 13.97 12.98 14.37 12.98 14.97C12.98 15.57 12.58 15.97 11.98 15.97H8C7.4 15.97 7 15.57 7 14.97C7 14.37 7.4 13.97 8 13.97H9V6.01H6.01V7.01C6.01 7.61 5.61 8.01 5.01 8.01C4.41 8.01 4.01 7.61 4.01 7.01V5.02C4.01 4.42 4.41 4.02 5.01 4.02H14.97C15.57 4.02 15.97 4.42 15.97 5.02V7.01Z" fill="#4B5563"/>
                      </g>
                      <defs>
                         <clipPath id="clip0_9978_3944">
                            <rect width="20" height="20" fill="white"/>
                         </clipPath>
                      </defs>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">{{ t('Text Background') }}</span>
             </div>
             <div class="cancelBtn text-right">
                <span v-if="!isOpenBackground" class="inline-flex cursor-pointer"  @click="showBackground">
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M8.00016 1.44092V14.7743M14.6668 8.10758L1.3335 8.10758" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </span>
                <span v-if="isOpenBackground" class="inline-flex cursor-pointer" @click="hideBackground">
                   <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.378831C0.683418 -0.0116936 1.31658 -0.0116935 1.70711 0.378831L6 4.67172L10.2929 0.378831C10.6834 -0.0116931 11.3166 -0.0116931 11.7071 0.378831C12.0976 0.769355 12.0976 1.40252 11.7071 1.79304L7.41421 6.08594L11.7071 10.3788C12.0976 10.7694 12.0976 11.4025 11.7071 11.793C11.3166 12.1836 10.6834 12.1836 10.2929 11.793L6 7.50015L1.70711 11.793C1.31658 12.1836 0.683418 12.1836 0.292893 11.793C-0.0976311 11.4025 -0.0976311 10.7694 0.292893 10.3788L4.58579 6.08594L0.292893 1.79304C-0.0976311 1.40252 -0.0976309 0.769355 0.292893 0.378831Z" fill="#4B5563"/>
                   </svg>
 
                </span>
             </div>
         </div>
 
         <div class="flex flex-row items-start space-x-5 mb-2 pb-10" v-if="isOpenBackground">
             <div class="col-span-full w-full mt-0">
                   <label for="photo" class="block text-sm font-medium leading-5 text-gray-700 mb-1">{{ t('Color') }}</label>
                   <div class="mt-0 flex items-center gap-5">
                      <div  class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow-md border border-gray-200 rounded-lg" @click="openColorPicker('background')" 
                   :style="backgroundValidColorCode && backgroundValidColorCode !='null' ? { backgroundColor: backgroundValidColorCode } : {}">
                      </div>
                      <input 
                        type="text" 
                        v-model="backgroundLatestClr" 
                        @input="validateAndUpdateTextBgColor"
                        class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
                   </div>
             </div>
             <div class="col-span-full mt-0 flex w-full flex-wrap">
                <label class="block text-sm font-medium leading-5 text-gray-700 w-full mb-1">{{ t('Padding') }}</label>
                <div class="relative mt-0 rounded-md shadow-sm w-full">
                   <input type="number" 
                   class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6"
                      v-model="paddingBackground" min="0" max="400" @input="updatePaddingBackground" @blur="saveClipDetailsByClipId()"   />
                </div>
             </div>
          </div>
 
          <div class="hr block -mx-6 border-t border-gray-200"></div>
      </div>
      <!--Design section start-->
      <div v-if="DesignSection" class="flex flex-col pt-6 pl-6 gap-2 pr-5 design-tab-clip overflow-x-hidden">
          <div class="col-span-2 flex items-center gap-4">
             <span class="icn w-6 text-center inline-flex justify-center" >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M18 2.00901V18.001H2V2.00901H18ZM20 0.0100098H0V20H20V0.0100098Z" fill="#4B5563"/>
                   <path d="M8.50994 1.27936L0.939941 8.84557" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                   <path d="M15.51 1.15942L1 15.6622" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                   <path d="M18.9501 4.58771L4.37012 19.1604" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                   <path d="M18.82 11.5942L11.25 19.1604" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                </svg>
             </span>
             <span class="text-base leading-6 font-bold text-gray-700" >{{ t('Background') }}</span>
          </div>
 
          <div v-if="videoFileUrl" class="col-span-full mt-2">
             <label class="block text-sm font-medium leading-6 text-gray-700">{{ t('Video') }}</label>
             <div
               class="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full shadow-sm border-2 border-transparent transition-colors duration-400 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
               :class="isVideo ? 'bg-indigo-600' : 'bg-gray-200'"
               @click="toggleVideo"
               role="switch"
               aria-checked="isVideo"
             >
               <!-- Toggle Switch Circle -->
               <div
                 class="pointer-events-none inline-block h-5 w-5 bg-white rounded-full shadow-md transform transition duration-400 ease-in-out"
                 :style="{ transform: isVideo ? 'translateX(20px)' : 'translateX(0px)' }"
               ></div>
             </div>
          </div>
         
         <div class="col-span-full mt-2">
            <label for="photo" class="block text-sm font-medium leading-6 text-gray-700">{{ t('Feature Image') }}</label>
            <div class="mt-2 flex items-center gap-x-3" >
               <img v-if="srcOfFile" :src="srcOfFile" class="h-[38px] w-[38px] bg-gray-300 rounded-lg object-cover" @click="uploadFile()"/> 
               <div v-else @click="uploadFile()" class="flex items-center min-w-[38px] min-h-[40px]">
                   <svg width="40" height="38" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_6063_3462)">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M3 0C1.34314 0 0 1.34375 0 3V18C0 19.6562 1.34314 21 3 21H18C19.6569 21 21 19.6562 21 18V3C21 1.34375 19.6569 0 18 0H3ZM3 15.5L7.5 6L11 13L13.5 8L17.5 15.5H3Z" fill="#4B5563"/>
                      </g>
                      <defs>
                         <clipPath id="clip0_6063_3462">
                           <rect width="21" height="21" fill="white"/>
                         </clipPath>
                      </defs>
                   </svg>
                </div>
               
               <button type="button" @click="uploadFile()"  class="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">{{ srcOfFile ? t('Change') : t('Upload') }}</button>
               <input   ref="fileInput" id="file_input" @change="onBrowseComplete($event)"  type="file" class="hidden" accept="image/*"/>
               <SvgTrashIcon v-if="srcOfFile" @click="openDeleteModal()"  class="cursor-pointer" />
            </div>
         </div>
         <div class="col-span-full my-2">
            <label for="photo" class="block text-sm font-medium leading-6 text-gray-700">{{ t('Background Color') }}</label>
            <div class="mt-2 flex items-center gap-x-3">
               <div class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow-md border border-gray-200 rounded-lg" @click="openColorPicker('designBackground')" 
                       :style="designBackgroundvalidColorCode && designBackgroundvalidColorCode !='null' ? { backgroundColor: designBackgroundvalidColorCode } : {}"></div>
                      <input 
                        type="text" 
                        v-model="designBackClrLatestClr" 
                        @input="validateAndUpdateBackgroundColor"
                        class="text-gray-700 text-sm block w-24 rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
               <button type="button" @click="openColorPicker('designBackground')"  class="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" v-if="designBackgroundvalidColorCode == 'null'">{{ t('Change') }}</button>
            </div>
         </div>
         <div class="hr block -mx-6 border-t border-gray-200"></div>
 
         <div class="labelMain grid grid-cols-3 gap-4 my-2">
             <div class="col-span-2 flex items-center gap-4">
                <span class="icn w-6 text-center inline-flex justify-center">
                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_9978_7781)">
                         <path d="M14.05 2V14H2.05005V2H14.05ZM16.05 0H0.0500488V16H16.05V0Z" fill="#4B5563"/>
                         <path d="M17.99 5.94V17.94H5.98999V5.94H17.99ZM19.99 3.94H3.98999V19.94H19.99V3.94Z" fill="#4B5563"/>
                         <path d="M15.0701 12.2902L7.71007 4.93018" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                         <path d="M12.2903 15.07L4.93028 7.70996" stroke="#4B5563" stroke-width="2.06" stroke-miterlimit="10"/>
                      </g>
                      <defs>
                         <clipPath id="clip0_9978_7781">
                         <rect width="20" height="20" fill="white"/>
                         </clipPath>
                      </defs>
                   </svg>
                </span>
                <span class="txt text-base leading-6 font-bold text-gray-700">Overlay</span>
             </div>
             <div class="cancelBtn text-right">
                <span v-if="!isOPenOverlayColor" class="inline-flex cursor-pointer" @click="showOverlay">
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M8.00016 1.44092V14.7743M14.6668 8.10758L1.3335 8.10758" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </span>
                <span v-if="isOPenOverlayColor" class="inline-flex cursor-pointer" @click="hideOverlay">
                   <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.378831C0.683418 -0.0116936 1.31658 -0.0116935 1.70711 0.378831L6 4.67172L10.2929 0.378831C10.6834 -0.0116931 11.3166 -0.0116931 11.7071 0.378831C12.0976 0.769355 12.0976 1.40252 11.7071 1.79304L7.41421 6.08594L11.7071 10.3788C12.0976 10.7694 12.0976 11.4025 11.7071 11.793C11.3166 12.1836 10.6834 12.1836 10.2929 11.793L6 7.50015L1.70711 11.793C1.31658 12.1836 0.683418 12.1836 0.292893 11.793C-0.0976311 11.4025 -0.0976311 10.7694 0.292893 10.3788L4.58579 6.08594L0.292893 1.79304C-0.0976311 1.40252 -0.0976309 0.769355 0.292893 0.378831Z" fill="#4B5563"/>
                   </svg>
 
                </span>
             </div>
         </div>
          <div class="flex flex-row items-start space-x-5 mb-4" v-if="isOPenOverlayColor">
                <div class="col-span-full w-full mt-0">
                      <label for="photo" class="block text-sm font-medium leading-6 text-gray-700">Overlay Color</label>
                      <div class="mt-2 flex items-center gap-x-3">
                         <div  class="h-10 w-[38px] min-w-[38px] cursor-pointer shadow-md border border-gray-200 rounded-lg" @click="openColorPicker('overlay')"  :style="overlayValidColorCode && overlayValidColorCode !='null' ? { backgroundColor: overlayValidColorCode } : {}"></div>
                      <input 
                        type="text" 
                        v-model="overlayLatestClr" 
                        @input="validateAndUpdateOverlayColor"
                        class="text-gray-700 text-sm block w-full rounded-md border-0 px-3 py-2 min-h-10 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        :class="{'border border-red-500': !isValidColorCode}"
                      />
                      </div>
                </div>
                <div class="col-span-full mt-0 flex w-full flex-wrap">
                   <label class="block text-sm font-medium leading-6 text-gray-700 w-full">Opacity</label>
                   <div class="relative mt-2 rounded-md shadow-sm w-full">
                      <input type="number" 
                      class="block w-full rounded-md border-0 px-3 py-2 min-h-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                         v-model="opacity" min="0" max="100" @input="updateOpacity" @blur="saveClipDetailsByClipId()"   placeholder="%" />
                   </div>
                </div>
          </div>
 
          
          <!--Gradient Checkbox Overlay Start-->
       <!--  <div class="hr block -mx-6 border-t border-gray-200">-->
         
          <div class="labelMain my-2 flex items-center relative w-full" aria-hidden="true" v-if="isOPenOverlayColor">
             <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                v-model="isGradient"
                @click="openGradientOverlay"
                class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <span class="txt text-base leading-6 font-bold text-gray-700 pl-2">
                   Gradient Overlay
                </span>
                
          </div> 
          <!--Gradient Checkbox Overlay End-->
         </div>
      <!--Design section end-->
 
      <!--Transcript section start-->
         <div v-if="TranscriptSection" class="flex flex-col relative transcript-sidebar" @dragover.prevent="(e) => onDragOver(e, currentDragHandleType)" @drop="onDrop" @dragleave="onDragLeave">
            <div v-for="(monologue, mIndex) in transcriptContents" :key="mIndex" class="pt-6 pl-6 gap-2 pr-5">
               <div class="flex justify-between items-start pb-2 speaker-div">
                  <div class="text-lg font-bold leading-6 text-gray-700">
                     {{getSpeakerNameRole(monologue.speaker_id)[0]}} 
                  </div>
                  <div class="text-lg font-regular leading-6 text-gray-500">
                     {{mainStore.formatTime(monologue.elements[0].start) }}
                  </div>
               </div>
               <div class="text-base font-regular leading-6 text-gray-700 transcript-monologue" >
                  <!-- Start Handle -->
                  <div v-if="startRect" 
                      class="start-handle cursor-grabbing" 
                      :style="{
                        position: 'absolute',
                        left: `${adjustedStart.left - 12}px`,
                        top: `${adjustedStart.top - 12}px`
                      }"
                      draggable="true"
                      @dragstart="(e) => {
                         onDragStart(e, 'start');
                         currentDragHandleType = 'start';
                      }"
                      @dragover.prevent="(e) => onDragOver(e, 'start')">
                      <SvgLeftGripper />
                   </div>
 
                   <!-- End Handle -->
                   <div v-if="endRect" 
                      class="end-handle cursor-grabbing" 
                      :style="{
                        position: 'absolute',
                        left: `${adjustedEnd.right - 8}px`,
                        top: `${adjustedEnd.top + 3}px`
                      }"
                      draggable="true"
                      @dragstart="(e) => {
                         onDragStart(e, 'end');
                         currentDragHandleType = 'end';
                      }"
                      @dragover.prevent="(e) => onDragOver(e, 'end')">
                      <SvgRightGripper />
                   </div>
                   <span v-for="(element, eIndex) in monologue.elements" :key="eIndex"
                  :data-eindex="eIndex"
                  :data-start="element.start"
                  :data-end="element.end"
                     :class="{
                        'text-black': element.start >= start && element.start < end,
                        'text-gray-400 font-regular': !(element.start >= start && element.start < end),
                        'text-gray-400': (provisionalStart && element.start < provisionalStart && element.start >= start) || (provisionalEnd && element.start < end && element.start > provisionalEnd),
                        'text-indigo-600': (provisionalStart && element.start >= provisionalStart && element.start < start) || (provisionalEnd && element.start >= end && element.start < provisionalEnd),
                        'bg-blue-50': (provisionalStart && element.start >= provisionalStart && element.start < end) || (provisionalEnd && element.start >= start && element.start < provisionalEnd),
                     }">
                     {{ element.value }}
                  </span>
               </div>
            </div>
         </div>
      <!--Transcript section end-->
 
      <!--Templates section start-->
      <div v-if="TemplatesSection" class="flex flex-col design-tab-clip overflow-x-hidden">
       <div class="flex flex-col w-full pt-6 px-6 gap-2 overflow-x-hidden">
          <button type="button" @click="saveCurrentStyleAsTemplate" class="btn btn-submit" >
             {{ t('+ Save current style as template') }}
          </button>
       </div>
       <div class="flex flex-col w-full pt-4 px-6 gap-2 overflow-x-hidden">
          <span class="text-base leading-6 font-bold text-gray-700" >{{ t(' Saved Templates') }}</span>
          <div v-for="(templatName) in Object.keys(template)" :key="templatName" @click="applySelectedTemplate(templatName)" class="flex flex-col w-full pt-2 gap-2 overflow-x-hidden">
             <div class="flex items-center p-2 gap-4 rounded-md cursor-pointer" :class="selectedTemplate === templatName ? 'bg-indigo-50 border border-indigo-400' : 'hover:bg-gray-50'">
               <div 
                 class="w-8 h-8 rounded-md" 
                 :style="{ backgroundColor: template[templatName].backgroundColor }"
               ></div>
               <div class="flex flex-col gap-2">
                 <span class="text-sm leading-6 font-regular text-gray-600">{{ templatName }}</span>
                 <button v-if="selectedTemplate === templatName" @click.stop="updateTemplate(templatName)" type="button" class="text-sm leading-6 font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 hover:bg-gray-50" >
                   {{ t('Update Template') }}
                </button>
               </div>
             </div>
          </div>
       </div>
      </div>
      <!--Templates section end-->
 
         <div class="mt-0 border-t border-l border-gray-200 fixed bottom-0 w-[393px] right-0 bg-white z-20" >
            <ClipPlaybar :key="clipId" :startFrom="start" :endTo="end" :noOfFrames="numberofFrames" :framePerSec="fps"/>
         </div>
      </div>
      </transition>
   <!-- </div> -->
   <ModalsFeatureImage
      :open="openFeatureImageModal"
      :clipsId="clipId"
      @close="closeFileUploadModal"  :srcUrl="fileDetails" :imagePath="srcOfFile" @submit="removeUploadedFile" />
   <ModalsColorPicker
      :open="openColorModal" :openMOdalSourceOverlayBackgroundClr="openMOdalSource"
      @close="openColorModal = false" @backGroundClr="getBackClr" :src="openMOdalSource" :selectedClr="defaultColor"/>
    <ModalsDelete  :open="isDelete" @close="closeDeleteModalAndRefreshIframeData" :isDelete="clipId" @submit="handleSubmit"  />
    <ModalsClipDownload :open="downloadModal"  @close="downloadModal = false" />
    <ModalsEditClipPrompt :open="mainStore.showEditPrompt" @close="closeEditPromptModal" />
    <!-- <ModalsSidebarDrawer :open="openTemplateDrawer" @close="closeTemplateDrawer" /> -->
 </template>
 
 <script setup>
   import { ref, onMounted, onUnmounted, watch, computed} from 'vue';
   import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
   import { ChevronDownIcon } from '@heroicons/vue/20/solid'
   import SquareIcon from '~/components/svg/SquareIcon.vue';
   import PortraitIcon from '~/components/svg/PortraitIcon.vue';
   import LandscapeIcon from '~/components/svg/LandscapeIcon.vue';
   import LeftAlign from '~/components/svg/LeftAlign.vue';
   import RightAlign from '~/components/svg/RightAlign.vue';
   import CenterAlign from '~/components/svg/CenterAlign.vue';
   import TopAlign from '~/components/svg/TopAlign.vue';
   import VideoLeftAlign from '~/components/svg/VideoLeftAlign.vue';
   import VideoCenterAlign from '~/components/svg/VideoCenterAlign.vue';
   import VideoRightAlign from '~/components/svg/VideoRightAlign.vue';
   import BottomAlign from '~/components/svg/BottomAlign.vue';
   import { useMainStore } from "~/store/main";
   import emitter from '@/plugins/eventBus';
   import languageStore from '@/store/LanguageStore';
   const mainStore = useMainStore()
   const runtimeConfig = useRuntimeConfig()
   const route = useRoute();
   const iframeSrc = runtimeConfig.public.videoEditorUrl
   // const iframeSrc = "http://localhost:3001"
   const icons = ref([
     { type: SquareIcon },
     { type: PortraitIcon },
     { type: LandscapeIcon }
   ]);
   const alignIcons = ref([
     { type: LeftAlign, align: 'left' },
     { type: CenterAlign, align: 'center' },
     { type: RightAlign, align: 'right' }
   ]);
   const videoAlignIcons = ref([
     { type: TopAlign, align: 'top' },
     { type: VideoLeftAlign, align: 'left' },
     { type: VideoCenterAlign, align: 'center' },
     { type: VideoRightAlign, align: 'right' },
     { type: BottomAlign, align: 'bottom' }
   ]);
   const isIframeLoading  = ref(true)
   const selectedIndex = ref(0);
   const selectedIcon = ref(0);
   const openFeatureImageModal = ref(false);
   const openColorModal = ref(false);
   const TitleSection = ref(false)
   const DesignSection =ref(true)
   const TranscriptSection =ref(false)
   const TemplatesSection =ref(false)
   const start = ref(0)
   const end = ref(0)
   const fps = 30
   const clipId  = ref(0)
   const videoUrl = ref('')
   const cornerRadius = ref(0)
   const numberofFrames  = ref(0)
   var transcriptStarts = []
   var transcriptWords = []
   const previousSrcOfFile = ref('')
   const downloadModal = ref(false)
   const fileDetails = ref([])
   const srcOfFile  = ref('')
   const backgroundText = ref(false)
   const opacity = ref(50)
   const videoOpacity = ref(100)
   const videoScale = ref(100)
   const selectedFont= ref('Inter')
   const selectedFill  = ref('fill')
   const selectedSpread = ref('Small')
   const spreadLists = ref(['Small','Medium','Large'])
   const fillLists = ref(['fill','fit'])
   const fontsLists = ref(['Oswald','Lora','CourierPrime','Poppins','ComicNeue','Inter'])
   const typographyText = ref('')
   const isDelete =ref(false)
   const emits = defineEmits(['updateClipLists'])
   const latestDropShadow = ref('')
   const fontLatestClr =ref('')
   const strokeLatestClr = ref('')
   const backgroundLatestClr = ref('')
   const designBackClrLatestClr = ref('')
   const overlayLatestClr = ref('')
   const openTemplateDrawer = ref(false)
   const sidebarAction = ref('')
   const openDeleteModal=()=>{
    isDelete.value = true
    
    
    
   }
   const transitionName = computed(() => isIframeLoading.value ? '' : 'slide-right');
   const fadeContainer = ref(null);
 
    watch(isIframeLoading, (newVal) => {
    if (!newVal && fadeContainer.value) {
       setTimeout(() => {
          if (fadeContainer.value) {
          fadeContainer.value.style.display = 'none';
          }
       }, 1000); // 2 seconds delay
    } else if (newVal && fadeContainer.value) {
       fadeContainer.value.style.display = 'flex'; // or 'block'
    }
    });
   const defaultColor = ref('')
   const openMOdalSource = ref('')
   const props = defineProps(['hideIntercom'])
   const heightLayout =ref(0)
   const widthLayout =ref(0)
   const xLayout =ref(0)
   const yLayout =ref(0)
   const paddingBackground = ref(1)
   const widthOutlineStroke = ref(1)
   const hideTypographyShowImageSettings =ref(false)
   const showVideoControls = ref(false)
   const intervalId = ref('')
   const status  = ref(true)
   const isContinueApi = ref('')
   const scaleFactor = ref(1)
   const inputProps = {
         'isEdit':true, 
         'scaleFactor': scaleFactor.value,
         'audioUrl': "",
         'imageUrl':'',
         'videoUrl': '',
         'isWatermark': true,
         'imageAspectRatio': 0,
         'backgroundColor': '#191970',
         'opacityPercent': 50,
         'overlayColor' : '#000000',
         'isGradient' : false,
         'showTitle': 'Show name initial value',
         'episodeTitle': 'Episode name initial value',
         'episodeTitleTopOffsetPixels': 50,
         'clipTitle': '',
         'clipTitleTopOffsetPixels': 30,
         'fps': fps,
         'start': start.value,
         'end': end.value,  
         "height": 400,
         "width": 400,       
         'transcriptStarts': transcriptStarts,
         'transcriptWords': transcriptWords,
         'transcriptTopOffsetPixels': 340,
         'font': 'Inter',
         'layout': 'portrait',
         'fontColor' : '#FFFFFF',
         'textBackgroundColor' : '',
         'showTitleTopOffsetPixels' : 10,
         'dropShadow': true,
          // Show Title Typography
          'showTitleFont': 'Inter',
          'showTitleFontColor': '#FFFFFF',
          'showTitleFontSize': '20',
          // Show Title layout
          'showTitleTopPixels': 10,
          'showTitleLeftPixels': 20,
          'showTitleHeight': '21',
          'showTitleWidth': '68',
          'showTitleOutlineStrokeColor': 'null',
          'showTitleOutlineStrokeWidth': 1,
          'showTitleDropShadowColor': 'null',
          'showTitleDropShadowSpread': 'Small',
          'showTitleBackgroundColor': 'null',
          'showTitlePadding': 1,
          'showTitleTextAlign' : 'left',
          'showTitleFontOpacity' : 100,
          // Episode Title Typography
          'episodeTitleFont': 'Inter',
          'episodeTitleFontColor': '#FFFFFF',
          'episodeTitleFontSize': 20,
          // Episode Title layout
          'episodeTitleTopPixels': 30,
          'episodeTitleLeftPixels': 20,
          'episodeTitleHeight': 52,
          'episodeTitleWidth': 293,
          'episodeTitleOutlineStrokeColor': 'null',
          'episodeTitleOutlineStrokeWidth': 1,
          'episodeTitleDropShadowColor': 'null',
          'episodeTitleDropShadowSpread': 'Small',
          'episodeTitleBackgroundColor': 'null',
          'episodeTitlePadding': 1,
          'episodeTitleTextAlign' : 'left',
          'episodeTitleFontOpacity' : 100,
          // Clip Title Typography
          'clipTitleFont': 'Inter',
          'clipTitleFontColor': '#FFFFFF',
          'clipTitleFontSize': 15,
          // Clip Title layout
          'clipTitleTopPixels': 180,
          'clipTitleLeftPixels': 16,
          'clipTitleHeight': 23,
          'clipTitleWidth': 199,
          'clipTitleOutlineStrokeColor': 'null',
          'clipTitleOutlineStrokeWidth': 1,
          'clipTitleDropShadowColor': 'null',
          'clipTitleDropShadowSpread': 'Small',
          'clipTitleBackgroundColor': 'null',
          'clipTitlePadding': 1,
          'clipTitleTextAlign': 'left',
          'clipTitleFontOpacity': 100,
          // Transcript Title Typography
          'transcriptTitleFont': 'Inter',
          'transcriptTitleFontColor': '#FFFFFF',
          'transcriptTitleFontSize': 30,
          // Transcript Title Layout 
          'transcriptTitleTopPixels': 210,
          'transcriptTitleLeftPixels': 15,
          'transcriptTitleHeight': 54,
          'transcriptTitleWidth': 250,
          'transcriptTitleOutlineStrokeColor': 'null',
          'transcriptTitleOutlineStrokeWidth': 1,
          'transcriptTitleDropShadowColor': 'null',
          'transcriptTitleDropShadowSpread': 'Small',
          'transcriptTitleBackgroundColor': 'null',
          'transcriptTitlePadding': 1,
          'transcriptTitleTextAlign': 'left',
          'transcriptTitleFontOpacity': 100,
          // Image Layout
          'imageTopPixels': 60,
          'imageLeftPixels': 60,
          'imageHeight': '50',
          'imageWidth': '300',
          'imageOutlineStrokeColor': 'null',
          'imageOutlineStrokeWidth': 1,
          'imageDropShadowColor': 'null',
          'imageDropShadowSpread': 'Small',
          'imageFillProperty' : 'fit',
          'imageCornerRadius' : 1,
          // Video Layout
          'isVideo': false,
          'videoAlignment': 'center',
          'videoOpacityPercent': 100,
          'videoScalePercent': 100,
          'videoLeftPixels': 60,
          'videoTopPixels': 70,
          'videoHeight': '100',
          'videoWidth': '100',
          'videoDropShadowSpread': 'Small',
          'videoOutlineStrokeColor': 'null',
          'videoOutlineStrokeWidth': 1,
          'videoDropShadowColor': 'null',
          'videoFillProperty': 'fit',
          'videoCornerRadius': 1,
       };
   const isVideo = ref(false)
   const videoContainer = ref(null);
   const iframeHeight = ref(400)
   const iframeWidth = ref(400)
   const iframeWidth2 = ref(iframeWidth.value*scaleFactor.value)
   const iframeHeight2 = ref(iframeHeight.value*scaleFactor.value)
   const iframeLayoutType= ref('Square')
   const timingOffset = 0.2
   let originalTranscriptStarts = []
   let originalTranscriptWords =[]
   const fontSize = ref(0)
   const textAlign = ref('left')
   const videoAlign = ref('center')
   const fontOpacity = ref(100)
   const whichTabClickedInIframe =ref('')
   const isHideShowtypographyText = ref(false)
   const transcript  = ref([])
   const transcriptContents = ref([])
   const isOpenDropShadow =ref(false)
   const isOpenOutLineStroke =ref(false)
   const isOpenBackground =ref(false)
   const isOPenOverlayColor =ref(false)
   const fileInput = ref(null);
   const isGradient = ref(true)
   const openGradientOverlay = ()=>{
         if(isGradient.value === true){
             inputProps.isGradient = false
             reRender()
             saveClipDetailsByClipId()
         }else{
             inputProps.isGradient = true
             reRender()
             saveClipDetailsByClipId()
         }
         isGradient.value = !isGradient.value
   }

   function computeScale() {
     if (!videoContainer.value) return;

     // const { offsetWidth: containerWidth, offsetHeight: containerHeight } = videoContainer.value;

     const availableWidth = window.innerWidth - 600
     const availableHeight = window.innerHeight - 280

     // Fit inside container without overflow
     const newScale = Math.min(
       availableWidth / iframeWidth.value,
       availableHeight / iframeHeight.value
     );

     scaleFactor.value = Math.max(0.8, Math.min(newScale, 2)); // Clamp if needed

     iframeWidth2.value = iframeWidth.value * scaleFactor.value;
     iframeHeight2.value = iframeHeight.value * scaleFactor.value;

     inputProps.scaleFactor = scaleFactor.value
     saveClipDetailsByClipId()
   }

   let resizeObserver;

//onMounted(() => {
//  computeScale();
//
//  resizeObserver = new ResizeObserver(() => {
//    computeScale();
//  });

//  if (videoContainer.value) {
//    resizeObserver.observe(videoContainer.value);
//  }

//  window.addEventListener('resize', computeScale);
//});

onUnmounted(() => {
  window.removeEventListener('resize', computeScale);
  if (resizeObserver && videoContainer.value) {
    resizeObserver.unobserve(videoContainer.value);
  }
});
 
   const videoFileUrl = ref('');
 
   function getVideoFileUrl() {
     const base_url = useRuntimeConfig().public.fathomWebApiURL;
     const token = mainStore.getUserPodiumToken();
     const id = route.params.jobId;
 
     return $fetch(`${base_url}/api/podium/clients/v1/media/${id}`, {
         method: 'GET',
         headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
         }
     })
     .then(data => {
         videoFileUrl.value = data.video_file_url; // Set the ref value
         // console.log('videoFileUrl', videoFileUrl.value);
         return videoFileUrl.value; // Return the URL
     })
     .catch(error => {
         // console.log('Error fetching video file URL:', error);
         return null; // Return null or handle the error as needed
     });
   }
 
 function getVideoDimensions(videoUrl) {
   return new Promise((resolve, reject) => {
     const video = document.createElement('video');
     
     video.onloadedmetadata = () => {
       // Add a small delay to ensure metadata is fully loaded
       setTimeout(() => {
         const width = video.videoWidth;
         const height = video.videoHeight;
         
         // console.log('Raw video dimensions:', { width, height }); // Debug log
         
         if (width === 0 || height === 0) {
           reject(new Error('Invalid video dimensions'));
         } else {
           resolve({ originalWidth: width, originalHeight: height });
         }
       }, 100);
     };
 
     video.onerror = (error) => {
       console.error('Video loading error:', error);
       reject(error);
     };
 
     video.src = videoUrl;
     video.load();
   });
 }
 
 const addVideoUrl = async () => {
   await getVideoFileUrl();
   // console.log('videoFileUrl', videoFileUrl.value);
   
   if (videoFileUrl.value) {
     inputProps.videoUrl = videoFileUrl.value;
     
     try {
      // console.log('Attempting to get video dimensions for:', videoFileUrl.value);
       const { originalWidth, originalHeight } = await getVideoDimensions(videoFileUrl.value);
       // console.log('Received dimensions:', { originalWidth, originalHeight });
       const maxSize = 360;
       const minSize = 200;
       let scaleFactor = 1;
       if (originalWidth > originalHeight) {
         scaleFactor = maxSize / originalWidth;
       } else {
         scaleFactor = maxSize / originalHeight;
       }
         // Ensure the image isn't smaller than the minimum size
       if (originalWidth * scaleFactor < minSize || originalHeight * scaleFactor < minSize) {
         scaleFactor = Math.max(minSize / originalWidth, minSize / originalHeight);
       }
       const newWidth = originalWidth * scaleFactor;
       const newHeight = originalHeight * scaleFactor;
 
       const portraitScaleFactor = 250/newWidth;
       const portraitHeight = newHeight * portraitScaleFactor;
       const portraitWidth = 250;
 
       const landscapeScaleFactor = 250/newHeight;
       const landscapeHeight = 250;
       const landscapeWidth = newWidth * landscapeScaleFactor;
 
       landscapeDetails.videoWidth = landscapeWidth;
       landscapeDetails.videoHeight = landscapeHeight;
 
       portraitDetails.videoWidth = portraitWidth;
       portraitDetails.videoHeight = portraitHeight;
 
 
       inputProps.videoWidth = squareDetails.videoWidth =  newWidth;
       inputProps.videoHeight = squareDetails.videoHeight = newHeight;
 
       const videoTopPadding = 200 - (newHeight / 2);
       const videoLeftPadding = 200 - (newWidth / 2);
       const portraitTopPadding = 240 - (portraitHeight / 2);
       const portraitLeftPadding = 135 - (portraitWidth / 2);
       const landscapeTopPadding = 135 - (landscapeHeight / 2);
       const landscapeLeftPadding = 240 - (landscapeWidth / 2);
 
       portraitDetails.videoTopPixels = portraitTopPadding;
       portraitDetails.videoLeftPixels = portraitLeftPadding;
       landscapeDetails.videoTopPixels = landscapeTopPadding;
       landscapeDetails.videoLeftPixels = landscapeLeftPadding;
 
       inputProps.videoTopPixels = squareDetails.videoTopPixels = videoTopPadding;
       inputProps.videoLeftPixels = squareDetails.videoLeftPixels = videoLeftPadding;
 
       
       // console.log('Video Dimensions:', { newWidth, newHeight });
     } catch (error) {
       console.error('Could not get video dimensions:', error);
     }
     
     toggleVideo();
   }
 }
 
 // Define reactive properties for start and end rectangles
 const startRect = ref(null);
 const endRect = ref(null);
 
 const templates = ref({})
 
 const saveCurrentStyleAsTemplate = () => {
     template[templateName] = {
       backgroundColor : inputProps.backgroundColor, 
       opacityPercent : inputProps.opacityPercent,
       overlayColor : inputProps.overlayColor,
       portrait : portraitDetails,
       square : squareDetails,
       landscape : landscapeDetails,
       isGradient : inputProps.isGradient
     }
     console.log('templates', template[templateName]);
 }
 
 const updateTemplate = (templateName) => {
     template[templateName] = {
       backgroundColor : inputProps.backgroundColor, 
       opacityPercent : inputProps.opacityPercent,
       overlayColor : inputProps.overlayColor,
       portrait : portraitDetails,
       square : squareDetails,
       landscape : landscapeDetails,
       isGradient : inputProps.isGradient
     }
     console.log('templates', template);
 }
 
 let template = {
   "Blue Template": {
     "backgroundColor": "#5050cc",
     "opacityPercent": 50,
     "overlayColor": "#111111",
     "isGradient": true,
     "portrait": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "left",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#ffffff",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "square": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#ffffff",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 0,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": null,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 0,
       "showTitleTextAlign": "left",
       "showTitleFontOpacity": 100,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#ffffff",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 0,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": null,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 0,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 100,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#ffffff",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 0,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": null,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 0,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 100,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#ffffff",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 0,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": null,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 0,
       "transcriptTitleTextAlign": "left",
       "transcriptTitleFontOpacity": 100,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": null,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 0,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "landscape": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     }
   },
   "Green Template": {
     "backgroundColor": "#50aa50",
     "opacityPercent": 50,
     "overlayColor": "#111111",
     "isGradient": true,
     "portrait": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "square": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "landscape": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     }
   },
   "Red Template": {
     "backgroundColor": "#cc5050",
     "opacityPercent": 50,
     "overlayColor": "#111111",
     "isGradient": true,
     "portrait": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "square": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     },
     "landscape": {
       "showTitle": "Sample Title",
       "showTitleFont": "Poppins",
       "showTitleFontColor": "#333333",
       "showTitleFontSize": 24,
       "showTitleTopPixels": 10,
       "showTitleLeftPixels": 20,
       "showTitleHeight": 40,
       "showTitleWidth": 200,
       "showTitleOutlineStrokeWidth": 2,
       "showTitleOutlineStrokeColor": "#000000",
       "showTitleDropShadowColor": "#888888",
       "showTitleDropShadowSpread": 3,
       "showTitleBackgroundColor": "#f0f0f0",
       "showTitlePadding": 8,
       "showTitleTextAlign": "center",
       "showTitleFontOpacity": 1,
       "clipTitle": "Clip Title",
       "clipTitleFont": "Poppins",
       "clipTitleFontColor": "#444444",
       "clipTitleFontSize": 20,
       "clipTitleTopPixels": 50,
       "clipTitleLeftPixels": 30,
       "clipTitleHeight": 30,
       "clipTitleWidth": 180,
       "clipTitleOutlineStrokeWidth": 1,
       "clipTitleOutlineStrokeColor": "#222222",
       "clipTitleDropShadowColor": "#bbbbbb",
       "clipTitleDropShadowSpread": 2,
       "clipTitleBackgroundColor": "#eeeeee",
       "clipTitlePadding": 6,
       "clipTitleTextAlign": "left",
       "clipTitleFontOpacity": 0.9,
       "episodeTitle": "Episode Name",
       "episodeTitleFont": "Poppins",
       "episodeTitleFontColor": "#555555",
       "episodeTitleFontSize": 18,
       "episodeTitleTopPixels": 90,
       "episodeTitleLeftPixels": 40,
       "episodeTitleHeight": 25,
       "episodeTitleWidth": 140,
       "episodeTitleOutlineStrokeWidth": 1,
       "episodeTitleOutlineStrokeColor": "#333333",
       "episodeTitleDropShadowColor": "#cccccc",
       "episodeTitleDropShadowSpread": 1,
       "episodeTitleBackgroundColor": "#dddddd",
       "episodeTitlePadding": 5,
       "episodeTitleTextAlign": "right",
       "episodeTitleFontOpacity": 0.8,
       "transcriptTitleFont": "Poppins",
       "transcriptTitleFontColor": "#666666",
       "transcriptTitleFontSize": 16,
       "transcriptTitleTopPixels": 120,
       "transcriptTitleLeftPixels": 50,
       "transcriptTitleHeight": 20,
       "transcriptTitleWidth": 120,
       "transcriptTitleOutlineStrokeWidth": 1,
       "transcriptTitleOutlineStrokeColor": "#444444",
       "transcriptTitleDropShadowColor": "#dddddd",
       "transcriptTitleDropShadowSpread": 1,
       "transcriptTitleBackgroundColor": "#cccccc",
       "transcriptTitlePadding": 4,
       "transcriptTitleTextAlign": "center",
       "transcriptTitleFontOpacity": 0.7,
       "imageLeftPixels": 60,
       "imageTopPixels": 70,
       "imageHeight": 100,
       "imageWidth": 100,
       "imageDropShadowSpread": 2,
       "imageOutlineStrokeColor": "#555555",
       "imageOutlineStrokeWidth": 1,
       "imageDropShadowColor": "#aaaaaa",
       "imageFillProperty": "fill",
       "imageCornerRadius": 10,
       "videoOpacityPercent": 90,
       "videoScalePercent": 100,
       "videoAlignment": "center"
     }
   }
 }
 
 const selectedTemplate = ref('')
 
 function applySelectedTemplate(templateName) {
    selectedTemplate.value = templateName
    if(template){
       isIframeLoading.value = true
                 
                 if(template[templateName].backgroundColor){
                   inputProps.backgroundColor =  designBackClrLatestClr.value = template[templateName].backgroundColor
                 }else{
                   designBackClrLatestClr.value  = inputProps.backgroundColor
                 }
                 if(template[templateName].opacityPercent){
                   inputProps.opacityPercent = opacity.value = template[templateName].opacityPercent
                 }else{
                   opacity.value = inputProps.opacityPercent
                 }
                 if(template[templateName].overlayColor){
                   inputProps.overlayColor = overlayLatestClr.value = template[templateName].overlayColor
                   isOPenOverlayColor.value = true
                 }else{
                   overlayLatestClr.value = inputProps.overlayColor
                   isOPenOverlayColor.value = false
                 }
                 inputProps.isGradient = template[templateName].isGradient
                 if(template[templateName].square){
                     if(template[templateName].square.showTitle ==''){
                      squareDetails.showTitle = ''
                     }else{
                      squareDetails.showTitle = template[templateName].square.showTitle
                     }
                     squareDetails.showTitleFont = template[templateName].square.showTitleFont
                     squareDetails.showTitleFontColor = template[templateName].square.showTitleFontColor
                     squareDetails.showTitleFontSize = template[templateName].square.showTitleFontSize
                     squareDetails.showTitleTopPixels = template[templateName].square.showTitleTopPixels
                     squareDetails.showTitleLeftPixels  =  template[templateName].square.showTitleLeftPixels
                     squareDetails.showTitleHeight=  template[templateName].square.showTitleHeight
                     squareDetails.showTitleWidth=  template[templateName].square.showTitleWidth
                     squareDetails.showTitleOutlineStrokeWidth =  template[templateName].square.showTitleOutlineStrokeWidth
                     squareDetails.showTitleOutlineStrokeColor =  template[templateName].square.showTitleOutlineStrokeColor
                     squareDetails.showTitleDropShadowColor =  template[templateName].square.showTitleDropShadowColor
                     squareDetails.showTitleDropShadowSpread =  template[templateName].square.showTitleDropShadowSpread
                     squareDetails.showTitleBackgroundColor =  template[templateName].square.showTitleBackgroundColor
                     squareDetails.showTitlePadding =  template[templateName].square.showTitlePadding
                     squareDetails.showTitleTextAlign =  template[templateName].square.showTitleTextAlign
                     squareDetails.showTitleFontOpacity =  template[templateName].square.showTitleFontOpacity
                     if(template[templateName].square.showTitleOutlineStrokeColor && template[templateName].square.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenOutLineStroke.value = true
                     }
                     if(template[templateName].square.showTitleDropShadowColor && template[templateName].square.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenDropShadow.value = true
                     }
                     if(template[templateName].square.showTitleBackgroundColor && template[templateName].square.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenBackground.value = true
                     }
                     squareDetails.clipTitle = template[templateName].square.clipTitle
                     squareDetails.clipTitleFont = template[templateName].square.clipTitleFont
                     squareDetails.clipTitleFontColor = template[templateName].square.clipTitleFontColor
                     squareDetails.clipTitleFontSize = template[templateName].square.clipTitleFontSize
                     squareDetails.clipTitleTopPixels = template[templateName].square.clipTitleTopPixels
                     squareDetails.clipTitleLeftPixels  =  template[templateName].square.clipTitleLeftPixels
                     squareDetails.clipTitleHeight=  template[templateName].square.clipTitleHeight
                     squareDetails.clipTitleWidth=  template[templateName].square.clipTitleWidth
                     squareDetails.clipTitleOutlineStrokeWidth =  template[templateName].square.clipTitleOutlineStrokeWidth
                     squareDetails.clipTitleOutlineStrokeColor =  template[templateName].square.clipTitleOutlineStrokeColor
                     squareDetails.clipTitleDropShadowColor =  template[templateName].square.clipTitleDropShadowColor
                     squareDetails.clipTitleDropShadowSpread =  template[templateName].square.clipTitleDropShadowSpread
                     squareDetails.clipTitleBackgroundColor =  template[templateName].square.clipTitleBackgroundColor
                     squareDetails.clipTitlePadding =  template[templateName].square.clipTitlePadding
                     squareDetails.clipTitleTextAlign =  template[templateName].square.clipTitleTextAlign
                     squareDetails.clipTitleFontOpacity =  template[templateName].square.clipTitleFontOpacity
                     if(template[templateName].square.episodeTitle == ''){
                      squareDetails.episodeTitle = ''
                     }else{
                     squareDetails.episodeTitle = template[templateName].square.episodeTitle
                     }
                     squareDetails.episodeTitleFont = template[templateName].square.episodeTitleFont
                     squareDetails.episodeTitleFontColor = template[templateName].square.episodeTitleFontColor
                     squareDetails.episodeTitleFontSize = template[templateName].square.episodeTitleFontSize
                     squareDetails.episodeTitleTopPixels = template[templateName].square.episodeTitleTopPixels
                     squareDetails.episodeTitleLeftPixels  =  template[templateName].square.episodeTitleLeftPixels
                     squareDetails.episodeTitleHeight=  template[templateName].square.episodeTitleHeight
                     squareDetails.episodeTitleWidth=  template[templateName].square.episodeTitleWidth
                     squareDetails.episodeTitleOutlineStrokeWidth =  template[templateName].square.episodeTitleOutlineStrokeWidth
                     squareDetails.episodeTitleOutlineStrokeColor =  template[templateName].square.episodeTitleOutlineStrokeColor
                     squareDetails.episodeTitleDropShadowColor =  template[templateName].square.episodeTitleDropShadowColor
                     squareDetails.episodeTitleDropShadowSpread =  template[templateName].square.episodeTitleDropShadowSpread
                     squareDetails.episodeTitleBackgroundColor =  template[templateName].square.episodeTitleBackgroundColor
                     squareDetails.episodeTitlePadding =  template[templateName].square.episodeTitlePadding
                     squareDetails.episodeTitleTextAlign =  template[templateName].square.episodeTitleTextAlign
                     squareDetails.episodeTitleFontOpacity =  template[templateName].square.episodeTitleFontOpacity
                     squareDetails.transcriptTitleFont = template[templateName].square.transcriptTitleFont
                     squareDetails.transcriptTitleFontColor = template[templateName].square.transcriptTitleFontColor
                     squareDetails.transcriptTitleFontSize = template[templateName].square.transcriptTitleFontSize
                     squareDetails.transcriptTitleTopPixels =  template[templateName].square.transcriptTitleTopPixels
                     squareDetails.transcriptTitleLeftPixels  =  template[templateName].square.transcriptTitleLeftPixels
                     squareDetails.transcriptTitleHeight=  template[templateName].square.transcriptTitleHeight
                     squareDetails.transcriptTitleWidth=  template[templateName].square.transcriptTitleWidth
                     squareDetails.transcriptTitleOutlineStrokeWidth =  template[templateName].square.transcriptTitleOutlineStrokeWidth
                     squareDetails.transcriptTitleOutlineStrokeColor =  template[templateName].square.transcriptTitleOutlineStrokeColor
                     squareDetails.transcriptTitleDropShadowColor =  template[templateName].square.transcriptTitleDropShadowColor
                     squareDetails.transcriptTitleDropShadowSpread =  template[templateName].square.transcriptTitleDropShadowSpread
                     squareDetails.transcriptTitleBackgroundColor =  template[templateName].square.transcriptTitleBackgroundColor
                     squareDetails.transcriptTitlePadding =  template[templateName].square.transcriptTitlePadding
                     squareDetails.transcriptTitleTextAlign =  template[templateName].square.transcriptTitleTextAlign
                     squareDetails.transcriptTitleFontOpacity =  template[templateName].square.transcriptTitleFontOpacity
                     console.log('transcriptTitleFontOpacity', template[templateName].square.transcriptTitleFontOpacity, squareDetails.transcriptTitleFontOpacity);
                     if(template[templateName].square.imageLeftPixels){
                      squareDetails.imageLeftPixels = template[templateName].square.imageLeftPixels
                     }
                     if(template[templateName].square.imageTopPixels){
                     squareDetails.imageTopPixels = template[templateName].square.imageTopPixels
                     }
                     if(template[templateName].square.imageHeight && template[templateName].square.imageHeight !=0){
                      squareDetails.imageHeight = template[templateName].square.imageHeight
                     }else{
                      squareDetails.imageHeight = inputProps.imageHeight
                     }
                     if(template[templateName].square.imageWidth && template[templateName].square.imageWidth != 0){
                     squareDetails.imageWidth = template[templateName].square.imageWidth
                     }else{
                      squareDetails.imageWidth = inputProps.imageWidth
                     }
                     squareDetails.imageDropShadowSpread = template[templateName].square.imageDropShadowSpread
                     squareDetails.imageOutlineStrokeColor = template[templateName].square.imageOutlineStrokeColor
                     squareDetails.imageOutlineStrokeWidth = template[templateName].square.imageOutlineStrokeWidth
                     squareDetails.imageDropShadowColor = template[templateName].square.imageDropShadowColor
                     squareDetails.imageFillProperty = template[templateName].square.imageFillProperty ? template[templateName].square.imageFillProperty : 'fill'
                     squareDetails.imageCornerRadius = template[templateName].square.imageCornerRadius
                     squareDetails.videoOpacityPercent = template[templateName].square.videoOpacityPercent
                     squareDetails.videoScalePercent = template[templateName].square.videoScalePercent
                     squareDetails.videoAlignment = template[templateName].square.videoAlignment
                 }
                if( template[templateName].portrait){
                     if(template[templateName].portrait.showTitle == ''){
                      portraitDetails.showTitle = ''
                      }else{
                       portraitDetails.showTitle = template[templateName].portrait.showTitle
                      }
                     portraitDetails.showTitleFont = template[templateName].portrait.showTitleFont
                     portraitDetails.showTitleFontColor = template[templateName].portrait.showTitleFontColor
                     portraitDetails.showTitleFontSize = template[templateName].portrait.showTitleFontSize
                     portraitDetails.showTitleTopPixels = template[templateName].portrait.showTitleTopPixels
                     portraitDetails.showTitleLeftPixels  =  template[templateName].portrait.showTitleLeftPixels
                     portraitDetails.showTitleHeight=  template[templateName].portrait.showTitleHeight
                     portraitDetails.showTitleWidth=  template[templateName].portrait.showTitleWidth
                     portraitDetails.showTitleOutlineStrokeWidth =  template[templateName].portrait.showTitleOutlineStrokeWidth
                     portraitDetails.showTitleOutlineStrokeColor =  template[templateName].portrait.showTitleOutlineStrokeColor
                     portraitDetails.showTitleDropShadowColor =  template[templateName].portrait.showTitleDropShadowColor
                     portraitDetails.showTitleDropShadowSpread =  template[templateName].portrait.showTitleDropShadowSpread
                     portraitDetails.showTitleBackgroundColor =  template[templateName].portrait.showTitleBackgroundColor
                     portraitDetails.showTitlePadding =  template[templateName].portrait.showTitlePadding
                     portraitDetails.showTitleTextAlign =  template[templateName].portrait.showTitleTextAlign
                     portraitDetails.showTitleFontOpacity =  template[templateName].portrait.showTitleFontOpacity
                     portraitDetails.clipTitle = template[templateName].portrait.clipTitle
                     portraitDetails.clipTitleFont = template[templateName].portrait.clipTitleFont
                     portraitDetails.clipTitleFontColor = template[templateName].portrait.clipTitleFontColor
                     portraitDetails.clipTitleFontSize = template[templateName].portrait.clipTitleFontSize
                     portraitDetails.clipTitleTopPixels = template[templateName].portrait.clipTitleTopPixels
                     portraitDetails.clipTitleLeftPixels  =  template[templateName].portrait.clipTitleLeftPixels
                     portraitDetails.clipTitleHeight=  template[templateName].portrait.clipTitleHeight
                     portraitDetails.clipTitleWidth=  template[templateName].portrait.clipTitleWidth
                     portraitDetails.clipTitleOutlineStrokeWidth =  template[templateName].portrait.clipTitleOutlineStrokeWidth
                     portraitDetails.clipTitleOutlineStrokeColor =  template[templateName].portrait.clipTitleOutlineStrokeColor
                     portraitDetails.clipTitleDropShadowColor =  template[templateName].portrait.clipTitleDropShadowColor
                     portraitDetails.clipTitleDropShadowSpread =  template[templateName].portrait.clipTitleDropShadowSpread
                     portraitDetails.clipTitleBackgroundColor =  template[templateName].portrait.clipTitleBackgroundColor
                     portraitDetails.clipTitlePadding =  template[templateName].portrait.clipTitlePadding
                     portraitDetails.clipTitleTextAlign =  template[templateName].portrait.clipTitleTextAlign
                     portraitDetails.clipTitleFontOpacity =  template[templateName].portrait.clipTitleFontOpacity
                     if(template[templateName].portrait.episodeTitle == ''){
                      portraitDetails.episodeTitle = ''
                      }else{
                         portraitDetails.episodeTitle = template[templateName].portrait.episodeTitle
                      }
                     portraitDetails.episodeTitleFont = template[templateName].portrait.episodeTitleFont
                     portraitDetails.episodeTitleFontColor = template[templateName].portrait.episodeTitleFontColor
                     portraitDetails.episodeTitleFontSize = template[templateName].portrait.episodeTitleFontSize
                     portraitDetails.episodeTitleTopPixels = template[templateName].portrait.episodeTitleTopPixels
                     portraitDetails.episodeTitleLeftPixels  =  template[templateName].portrait.episodeTitleLeftPixels
                     portraitDetails.episodeTitleHeight=  template[templateName].portrait.episodeTitleHeight
                     portraitDetails.episodeTitleWidth=  template[templateName].portrait.episodeTitleWidth
                     portraitDetails.episodeTitleOutlineStrokeWidth =  template[templateName].portrait.episodeTitleOutlineStrokeWidth
                     portraitDetails.episodeTitleOutlineStrokeColor =  template[templateName].portrait.episodeTitleOutlineStrokeColor
                     portraitDetails.episodeTitleDropShadowColor =  template[templateName].portrait.episodeTitleDropShadowColor
                     portraitDetails.episodeTitleDropShadowSpread =  template[templateName].portrait.episodeTitleDropShadowSpread
                     portraitDetails.episodeTitleBackgroundColor =  template[templateName].portrait.episodeTitleBackgroundColor
                     portraitDetails.episodeTitlePadding =  template[templateName].portrait.episodeTitlePadding
                     portraitDetails.episodeTitleTextAlign =  template[templateName].portrait.episodeTitleTextAlign
                     portraitDetails.episodeTitleFontOpacity =  template[templateName].portrait.episodeTitleFontOpacity
                     portraitDetails.transcriptTitleFont = template[templateName].portrait.transcriptTitleFont
                     portraitDetails.transcriptTitleFontColor = template[templateName].portrait.transcriptTitleFontColor
                     portraitDetails.transcriptTitleFontSize = template[templateName].portrait.transcriptTitleFontSize
                     portraitDetails.transcriptTitleTopPixels = template[templateName].portrait.transcriptTitleTopPixels
                     portraitDetails.transcriptTitleLeftPixels  =  template[templateName].portrait.transcriptTitleLeftPixels
                     portraitDetails.transcriptTitleHeight=  template[templateName].portrait.transcriptTitleHeight
                     portraitDetails.transcriptTitleWidth=  template[templateName].portrait.transcriptTitleWidth
                     portraitDetails.transcriptTitleOutlineStrokeWidth =  template[templateName].portrait.transcriptTitleOutlineStrokeWidth
                     portraitDetails.transcriptTitleOutlineStrokeColor =  template[templateName].portrait.transcriptTitleOutlineStrokeColor
                     portraitDetails.transcriptTitleDropShadowColor =  template[templateName].portrait.transcriptTitleDropShadowColor
                     portraitDetails.transcriptTitleDropShadowSpread =  template[templateName].portrait.transcriptTitleDropShadowSpread
                     portraitDetails.transcriptTitleBackgroundColor =  template[templateName].portrait.transcriptTitleBackgroundColor
                     portraitDetails.transcriptTitlePadding =  template[templateName].portrait.transcriptTitlePadding
                     portraitDetails.transcriptTitleTextAlign =  template[templateName].portrait.transcriptTitleTextAlign
                     portraitDetails.transcriptTitleFontOpacity =  template[templateName].portrait.transcriptTitleFontOpacity
                     if(template[templateName].portrait.imageLeftPixels){
                      portraitDetails.imageLeftPixels = template[templateName].portrait.imageLeftPixels
                     }
                     if(template[templateName].portrait?.imageTopPixels){
                      portraitDetails.imageTopPixels = template[templateName].portrait.imageTopPixels
                     }
                     if(template[templateName].portrait.imageHeight && template[templateName].portrait.imageHeight != 0){
                      portraitDetails.imageHeight = template[templateName].portrait.imageHeight
                     }else{
                      portraitDetails.imageHeight = inputProps.imageHeight
                     }
                     if(template[templateName].portrait.imageWidth && template[templateName].portrait.imageWidth != 0){
                      portraitDetails.imageWidth = template[templateName].portrait.imageWidth
                     }else{
                      portraitDetails.imageWidth = inputProps.imageWidth
                     }
                     portraitDetails.imageDropShadowSpread = template[templateName].portrait.imageDropShadowSpread
                     portraitDetails.imageOutlineStrokeColor = template[templateName].portrait.imageOutlineStrokeColor
                     portraitDetails.imageOutlineStrokeWidth = template[templateName].portrait.imageOutlineStrokeWidth
                     portraitDetails.imageDropShadowColor = template[templateName].portrait.imageDropShadowColor
                     portraitDetails.imageFillProperty = template[templateName].portrait.imageFillProperty ? template[templateName].portrait.imageFillProperty : 'fill'
                     portraitDetails.imageCornerRadius = template[templateName].portrait.imageCornerRadius
                     portraitDetails.videoOpacityPercent = template[templateName].portrait.videoOpacityPercent
                     portraitDetails.videoScalePercent = template[templateName].portrait.videoScalePercent
                     portraitDetails.videoAlignment = template[templateName].portrait.videoAlignment
                 }
                  if(template[templateName].landscape){
                   if(template[templateName].landscape.showTitle == ''){
                      landscapeDetails.showTitle = ''
                      }else{
                       landscapeDetails.showTitle = template[templateName].landscape.showTitle
                      }
                     landscapeDetails.showTitleFont = template[templateName].landscape.showTitleFont
                     landscapeDetails.showTitleFontColor = template[templateName].landscape.showTitleFontColor
                     landscapeDetails.showTitleFontSize = template[templateName].landscape.showTitleFontSize
                     landscapeDetails.showTitleTopPixels = template[templateName].landscape.showTitleTopPixels
                     landscapeDetails.showTitleLeftPixels  =  template[templateName].landscape.showTitleLeftPixels
                     landscapeDetails.showTitleHeight=  template[templateName].landscape.showTitleHeight
                     landscapeDetails.showTitleWidth=  template[templateName].landscape.showTitleWidth
                     landscapeDetails.showTitleOutlineStrokeWidth =  template[templateName].landscape.showTitleOutlineStrokeWidth
                     landscapeDetails.showTitleOutlineStrokeColor =  template[templateName].landscape.showTitleOutlineStrokeColor
                     landscapeDetails.showTitleDropShadowColor =  template[templateName].landscape.showTitleDropShadowColor
                     landscapeDetails.showTitleDropShadowSpread =  template[templateName].landscape.showTitleDropShadowSpread
                     landscapeDetails.showTitleBackgroundColor =  template[templateName].landscape.showTitleBackgroundColor
                     landscapeDetails.showTitlePadding =  template[templateName].landscape.showTitlePadding
                     landscapeDetails.showTitleTextAlign =  template[templateName].landscape.showTitleTextAlign
                     landscapeDetails.showTitleFontOpacity =  template[templateName].landscape.showTitleFontOpacity
                     landscapeDetails.clipTitle = template[templateName].landscape.clipTitle
                     landscapeDetails.clipTitleFont = template[templateName].landscape.clipTitleFont
                     landscapeDetails.clipTitleFontSize = template[templateName].landscape.clipTitleFontSize
                     landscapeDetails.clipTitleTopPixels = template[templateName].landscape.clipTitleTopPixels
                     landscapeDetails.clipTitleLeftPixels  =  template[templateName].landscape.clipTitleLeftPixels
                     landscapeDetails.clipTitleHeight=  template[templateName].landscape.clipTitleHeight
                     landscapeDetails.clipTitleWidth=  template[templateName].landscape.clipTitleWidth
                     landscapeDetails.clipTitleOutlineStrokeWidth =  template[templateName].landscape.clipTitleOutlineStrokeWidth
                     landscapeDetails.clipTitleOutlineStrokeColor =  template[templateName].landscape.clipTitleOutlineStrokeColor
                     landscapeDetails.clipTitleDropShadowColor =  template[templateName].landscape.clipTitleDropShadowColor
                     landscapeDetails.clipTitleDropShadowSpread =  template[templateName].landscape.clipTitleDropShadowSpread
                     landscapeDetails.clipTitleBackgroundColor =  template[templateName].landscape.clipTitleBackgroundColor
                     landscapeDetails.clipTitlePadding =  template[templateName].landscape.clipTitlePadding
                     landscapeDetails.clipTitleFontColor = template[templateName].landscape.clipTitleFontColor
                     landscapeDetails.clipTitleTextAlign =  template[templateName].landscape.clipTitleTextAlign
                     landscapeDetails.clipTitleFontOpacity =  template[templateName].landscape.clipTitleFontOpacity
                     if(template[templateName].landscape.episodeTitle == ''){
                      landscapeDetails.episodeTitle = ''
                      }else{
                         landscapeDetails.episodeTitle = template[templateName].landscape.episodeTitle
                      }
                     landscapeDetails.episodeTitleFont = template[templateName].landscape.episodeTitleFont
                     landscapeDetails.episodeTitleFontSize = template[templateName].landscape.episodeTitleFontSize
                     landscapeDetails.episodeTitleTopPixels = template[templateName].landscape.episodeTitleTopPixels
                     landscapeDetails.episodeTitleLeftPixels  =  template[templateName].landscape.episodeTitleLeftPixels
                     landscapeDetails.episodeTitleHeight=  template[templateName].landscape.episodeTitleHeight
                     landscapeDetails.episodeTitleWidth=  template[templateName].landscape.episodeTitleWidth
                     landscapeDetails.episodeTitleOutlineStrokeWidth =  template[templateName].landscape.episodeTitleOutlineStrokeWidth
                     landscapeDetails.episodeTitleOutlineStrokeColor =  template[templateName].landscape.episodeTitleOutlineStrokeColor
                     landscapeDetails.episodeTitleDropShadowColor =  template[templateName].landscape.episodeTitleDropShadowColor
                     landscapeDetails.episodeTitleDropShadowSpread =  template[templateName].landscape.episodeTitleDropShadowSpread
                     landscapeDetails.episodeTitleBackgroundColor =  template[templateName].landscape.episodeTitleBackgroundColor
                     landscapeDetails.episodeTitlePadding =  template[templateName].landscape.episodeTitlePadding
                     landscapeDetails.episodeTitleTextAlign =  template[templateName].landscape.episodeTitleTextAlign
                     landscapeDetails.episodeTitleFontOpacity =  template[templateName].landscape.episodeTitleFontOpacity
                     landscapeDetails.transcriptTitleFont = template[templateName].landscape.transcriptTitleFont
                     landscapeDetails.episodeTitleFontColor = template[templateName].landscape.episodeTitleFontColor
                     landscapeDetails.transcriptTitleFontColor = template[templateName].landscape.transcriptTitleFontColor
                     landscapeDetails.transcriptTitleFontSize = template[templateName].landscape.transcriptTitleFontSize
                     landscapeDetails.transcriptTitleTopPixels = template[templateName].landscape.transcriptTitleTopPixels
                     landscapeDetails.transcriptTitleLeftPixels  =  template[templateName].landscape.transcriptTitleLeftPixels
                     landscapeDetails.transcriptTitleHeight=  template[templateName].landscape.transcriptTitleHeight
                     landscapeDetails.transcriptTitleWidth=  template[templateName].landscape.transcriptTitleWidth
                     landscapeDetails.transcriptTitleOutlineStrokeWidth =  template[templateName].landscape.transcriptTitleOutlineStrokeWidth
                     landscapeDetails.transcriptTitleOutlineStrokeColor =  template[templateName].landscape.transcriptTitleOutlineStrokeColor
                     landscapeDetails.transcriptTitleDropShadowColor =  template[templateName].landscape.transcriptTitleDropShadowColor
                     landscapeDetails.transcriptTitleDropShadowSpread =  template[templateName].landscape.transcriptTitleDropShadowSpread
                     landscapeDetails.transcriptTitleBackgroundColor =  template[templateName].landscape.transcriptTitleBackgroundColor
                     landscapeDetails.transcriptTitlePadding =  template[templateName].landscape.transcriptTitlePadding
                     landscapeDetails.transcriptTitleTextAlign =  template[templateName].landscape.transcriptTitleTextAlign
                     landscapeDetails.transcriptTitleFontOpacity =  template[templateName].landscape.transcriptTitleFontOpacity
                     if(template[templateName].landscape.imageLeftPixels){
                      landscapeDetails.imageLeftPixels = template[templateName].landscape.imageLeftPixels
                     }
                     if(template[templateName].landscape.imageTopPixels){
                      landscapeDetails.imageTopPixels = template[templateName].landscape.imageTopPixels
                     }
                     if(template[templateName].landscape.imageHeight && template[templateName].landscape.imageHeight != 0){
                      landscapeDetails.imageHeight = template[templateName].landscape.imageHeight
                     }else{
                      landscapeDetails.imageHeight = inputProps.imageHeight
                     }
                     if(template[templateName].landscape.imageWidth && template[templateName].landscape.imageWidth != 0){
                      landscapeDetails.imageWidth = template[templateName].landscape.imageWidth
                     }else{
                      landscapeDetails.imageWidth = inputProps.imageWidth
                     }
                     landscapeDetails.imageDropShadowSpread = template[templateName].landscape.imageDropShadowSpread
                     landscapeDetails.imageOutlineStrokeColor = template[templateName].landscape.imageOutlineStrokeColor
                     landscapeDetails.imageOutlineStrokeWidth = template[templateName].landscape.imageOutlineStrokeWidth
                     landscapeDetails.imageDropShadowColor = template[templateName].landscape.imageDropShadowColor
                     landscapeDetails.imageCornerRadius = template[templateName].landscape.imageCornerRadius
                     landscapeDetails.videoOpacityPercent = template[templateName].landscape.videoOpacityPercent
                     landscapeDetails.videoScalePercent = template[templateName].landscape.videoScalePercent
                     landscapeDetails.videoAlignment = template[templateName].landscape.videoAlignment
                     landscapeDetails.imageFillProperty = template[templateName].landscape.imageFillProperty ? template[templateName].landscape.imageFillProperty : 'fill'
                 }
 
                 updateInputProps()
                 updateVmodels('showTitle')
                 document.getElementById('videoPlayer').src = runtimeConfig.public.videoEditorUrl
                 setTimeout(() => {reRender()}, 2000);
                 saveClipDetailsByClipId()
                 console.log('template applied', template[templateName]);
    }
 }
 
 /*const blueTemplate = {
       backgroundColor: '#ff00ff',
       opacityPercent: 40,
       overlayColor: '#111111',
       isGradient: true,
       episodeTitleTopOffsetPixels: 50,
       clipTitle: '',
       clipTitleTopOffsetPixels: 30,
       transcriptTopOffsetPixels: 340,
       font: 'Oswald',
       fontColor: '#FFFFFF',
       textBackgroundColor: '',
       showTitleTopOffsetPixels: 10,
       dropShadow: true,
       
       // Show Title Typography
       showTitleFont: 'Oswald',
       showTitleFontColor: '#FFFFFF',
       showTitleFontSize: '28',
       
       // Show Title layout
       showTitleTopPixels: 10,
       showTitleLeftPixels: 20,
       showTitleHeight: '21',
       showTitleWidth: '75',
       showTitleOutlineStrokeColor: 'null',
       showTitleOutlineStrokeWidth: 1,
       showTitleDropShadowColor: 'null',
       showTitleDropShadowSpread: 'Small',
       showTitleBackgroundColor: 'null',
       showTitlePadding: 1,
       
       // Episode Title Typography
       episodeTitleFont: 'Oswald',
       episodeTitleFontColor: '#FFFFFF',
       episodeTitleFontSize: 20,
       
       // Episode Title layout
       episodeTitleTopPixels: 30,
       episodeTitleLeftPixels: 20,
       episodeTitleHeight: 52,
       episodeTitleWidth: 293,
       episodeTitleOutlineStrokeColor: 'null',
       episodeTitleOutlineStrokeWidth: 1,
       episodeTitleDropShadowColor: 'null',
       episodeTitleDropShadowSpread: 'Small',
       episodeTitleBackgroundColor: 'null',
       episodeTitlePadding: 1,
       
       // Clip Title Typography
       clipTitleFont: 'Oswald',
       clipTitleFontColor: '#FFFFFF',
       clipTitleFontSize: 15,
       
       // Clip Title layout
       clipTitleTopPixels: 180,
       clipTitleLeftPixels: 16,
       clipTitleHeight: 23,
       clipTitleWidth: 199,
       clipTitleOutlineStrokeColor: 'null',
       clipTitleOutlineStrokeWidth: 1,
       clipTitleDropShadowColor: 'null',
       clipTitleDropShadowSpread: 'Small',
       clipTitleBackgroundColor: 'null',
       clipTitlePadding: 1,
       
       // Transcript Title Typography
       transcriptTitleFont: 'Oswald',
       transcriptTitleFontColor: '#FFFFFF',
       transcriptTitleFontSize: 30,
       
       // Transcript Title Layout 
       transcriptTitleTopPixels: 210,
       transcriptTitleLeftPixels: 15,
       transcriptTitleHeight: 54,
       transcriptTitleWidth: 250,
       transcriptTitleOutlineStrokeColor: 'null',
       transcriptTitleOutlineStrokeWidth: 1,
       transcriptTitleDropShadowColor: 'null',
       transcriptTitleDropShadowSpread: 'Small',
       transcriptTitleBackgroundColor: 'null',
       transcriptTitlePadding: 1,
       
       // Image Layout
       imageTopPixels: 60,
       imageLeftPixels: 60,
       imageHeight: '50',
       imageWidth: '300',
       imageOutlineStrokeColor: 'null',
       imageOutlineStrokeWidth: 1,
       imageDropShadowColor: 'null',
       imageDropShadowSpread: 'Small',
       imageFillProperty: 'fit',
       imageCornerRadius: 1
 }*/
   watch(()=>numberofFrames.value , (a,b)=>{
    numberofFrames.value
   })
   watch(()=>whichTabClickedInIframe.value,(a,b)=>{
    if(whichTabClickedInIframe.value == 'transcriptTitle' || whichTabClickedInIframe.value == 'clipTitle' || whichTabClickedInIframe.value==
       'showTitle' || whichTabClickedInIframe.value == 'episodeTitle' || whichTabClickedInIframe.value == 'image-overlay'
    ){
       TitleSection.value = true
       DesignSection.value = false
       TranscriptSection.value = false
       TemplatesSection.value = false
    }else{
       TitleSection.value = false
       DesignSection.value = true
       TranscriptSection.value = false
       TemplatesSection.value = false
    }
   })
   watch(()=>hideTypographyShowImageSettings.value,(a,b)=>{
    hideTypographyShowImageSettings.value
   })
   watch(()=>showVideoControls.value,(a,b)=>{
      showVideoControls.value
   })
 
   watch(()=>isHideShowtypographyText.value, (a,b)=>{
    isHideShowtypographyText.value
   })
   watch(()=>opacity.value , (a,b)=>{
    opacity.value
   })
   watch(()=>cornerRadius.value , (a,b)=>{
    cornerRadius.value
   })
   function reformatTranscript() {
       var lastStart = 0.0
       for (var i = 0; i < originalTranscriptStarts.length - 1; i++) {
         if (lastStart ==  originalTranscriptStarts[i] && i > 0) {
           if (transcriptWords[transcriptWords.length - 1].endsWith(" ") && 
           (
             originalTranscriptWords[i].includes(".") ||
             originalTranscriptWords[i].includes(",") ||
             originalTranscriptWords[i].includes("?") ||
             originalTranscriptWords[i].includes("!")
           ))
           {
             transcriptWords[transcriptWords.length - 1] = transcriptWords[transcriptWords.length - 1].slice(0, -1)
             transcriptWords[transcriptWords.length - 1] += originalTranscriptWords[i]
     
             if (!transcriptWords[transcriptWords.length - 1].endsWith(" ")) {
               transcriptWords[transcriptWords.length - 1] += " "
             }
           } else {
             transcriptWords[transcriptWords.length - 1] += originalTranscriptWords[i]
           }
           
         } else {
           transcriptStarts.push(originalTranscriptStarts[i] - timingOffset)
           lastStart = originalTranscriptStarts[i]
     
           if (originalTranscriptWords[i].endsWith(" ")) {
             transcriptWords.push(originalTranscriptWords[i])
           } else {
             transcriptWords.push(originalTranscriptWords[i] + " ")
           }
         }
       }
     }
   
     var squareDetails = {
          layout : 'square',
          showTitle: inputProps.showTitle,
          showTitleFontSize : inputProps.showTitleFontSize,
          showTitleTopPixels : inputProps.showTitleTopPixels,
          showTitleLeftPixels : inputProps.showTitleLeftPixels,
          showTitleHeight : inputProps.showTitleHeight,
          showTitleWidth : inputProps.showTitleWidth,
          showTitleOutlineStrokeColor : inputProps.showTitleOutlineStrokeColor,
          showTitleOutlineStrokeWidth : inputProps.showTitleOutlineStrokeWidth,
          showTitleDropShadowColor : inputProps.showTitleDropShadowColor,
          showTitleDropShadowSpread : inputProps.showTitleDropShadowSpread,
          showTitleBackgroundColor : inputProps.showTitleBackgroundColor,
          showTitlePadding : inputProps.showTitlePadding,
          showTitleFontColor : inputProps.showTitleFontColor,
          showTitleFont : inputProps.showTitleFont,
          showTitleTextAlign : inputProps.showTitleTextAlign,
          showTitleFontOpacity : inputProps.showTitleFontOpacity,
          clipTitle: inputProps.clipTitle,
          clipTitleFontSize : inputProps.clipTitleFontSize,
          clipTitleTopPixels : inputProps.clipTitleTopPixels,
          clipTitleLeftPixels : inputProps.clipTitleLeftPixels,
          clipTitleHeight : inputProps.clipTitleHeight,
          clipTitleWidth : inputProps.clipTitleWidth,
          clipTitleOutlineStrokeColor : inputProps.clipTitleOutlineStrokeColor,
          clipTitleOutlineStrokeWidth : inputProps.clipTitleOutlineStrokeWidth,
          clipTitleDropShadowColor : inputProps.clipTitleDropShadowColor,
          clipTitleDropShadowSpread : inputProps.clipTitleDropShadowSpread,
          clipTitleBackgroundColor : inputProps.clipTitleBackgroundColor,
          clipTitlePadding : inputProps.clipTitlePadding,
          clipTitleFontColor : inputProps.clipTitleFontColor,
          clipTitleFont : inputProps.clipTitleFont,
          clipTitleTextAlign : inputProps.clipTitleTextAlign,
          clipTitleFontOpacity : inputProps.clipTitleFontOpacity, 
          episodeTitle: inputProps.episodeTitle,
          episodeTitleFontSize : inputProps.episodeTitleFontSize,
          episodeTitleTopPixels : inputProps.episodeTitleTopPixels,
          episodeTitleLeftPixels : inputProps.episodeTitleLeftPixels,
          episodeTitleHeight : inputProps.episodeTitleHeight,
          episodeTitleWidth : inputProps.episodeTitleWidth,
          episodeTitleOutlineStrokeColor : inputProps.episodeTitleOutlineStrokeColor,
          episodeTitleOutlineStrokeWidth : inputProps.episodeTitleOutlineStrokeWidth,
          episodeTitleDropShadowColor : inputProps.episodeTitleDropShadowColor,
          episodeTitleDropShadowSpread : inputProps.episodeTitleDropShadowSpread,
          episodeTitleBackgroundColor : inputProps.episodeTitleBackgroundColor,
          episodeTitlePadding : inputProps.episodeTitlePadding,
          episodeTitleFontColor : inputProps.episodeTitleFontColor,
          episodeTitleFont : inputProps.episodeTitleFont,
          episodeTitleTextAlign : inputProps.episodeTitleTextAlign,
          episodeTitleFontOpacity : inputProps.episodeTitleFontOpacity, 
          transcriptTitleFont: inputProps.transcriptTitleFont,
          transcriptTitleTextAlign : inputProps.transcriptTitleTextAlign,
          transcriptTitleFontOpacity : inputProps.transcriptTitleFontOpacity,
          transcriptTitleFontColor: inputProps.transcriptTitleFontColor, 
          transcriptTitleFontSize : inputProps.transcriptTitleFontSize,
          transcriptTitleTopPixels : inputProps.transcriptTitleTopPixels,
          transcriptTitleLeftPixels : inputProps.transcriptTitleLeftPixels,
          transcriptTitleHeight : inputProps.transcriptTitleHeight,
          transcriptTitleWidth : inputProps.transcriptTitleWidth,
          transcriptTitleOutlineStrokeColor : inputProps.transcriptTitleOutlineStrokeColor,
          transcriptTitleOutlineStrokeWidth : inputProps.transcriptTitleOutlineStrokeWidth,
          transcriptTitleDropShadowColor : inputProps.transcriptTitleDropShadowColor,
          transcriptTitleDropShadowSpread : inputProps.transcriptTitleDropShadowSpread,
          transcriptTitleBackgroundColor : inputProps.transcriptTitleBackgroundColor,
          transcriptTitlePadding : inputProps.transcriptTitlePadding,
          imageTopPixels : inputProps.imageTopPixels,
          imageLeftPixels : inputProps.imageLeftPixels,
          imageHeight : inputProps.imageHeight,
          imageWidth : inputProps.imageWidth,
          imageDropShadowColor : inputProps.imageDropShadowColor,
          imageDropShadowSpread : inputProps.imageDropShadowSpread,
          imageOutlineStrokeColor : inputProps.imageOutlineStrokeColor,
          imageOutlineStrokeWidth : inputProps.imageOutlineStrokeWidth,
          imageFillProperty : inputProps.imageFillProperty,
          imageCornerRadius : inputProps.imageCornerRadius,
          videoOpacityPercent : inputProps.videoOpacityPercent,
          videoScalePercent : inputProps.videoScalePercent,
          videoAlignment : inputProps.videoAlignment,
          videoLeftPixels : inputProps.videoLeftPixels,
          videoTopPixels : inputProps.videoTopPixels,
          videoHeight : inputProps.videoHeight,
          videoWidth : inputProps.videoWidth,
          videoDropShadowSpread : inputProps.videoDropShadowSpread,
          videoOutlineStrokeColor : inputProps.videoOutlineStrokeColor,
          videoOutlineStrokeWidth : inputProps.videoOutlineStrokeWidth,
          videoDropShadowColor : inputProps.videoDropShadowColor,
          videoFillProperty : inputProps.videoFillProperty,
          videoCornerRadius : inputProps.videoCornerRadius
    }
 
       var portraitDetails = {
          layout : 'portrait',
          showTitle: inputProps.showTitle,
          showTitleFontSize : inputProps.showTitleFontSize,
          showTitleTopPixels : inputProps.showTitleTopPixels,
          showTitleLeftPixels : inputProps.showTitleLeftPixels,
          showTitleHeight : inputProps.showTitleHeight,
          showTitleWidth : inputProps.showTitleWidth,
          showTitleOutlineStrokeColor : inputProps.showTitleOutlineStrokeColor,
          showTitleOutlineStrokeWidth : inputProps.showTitleOutlineStrokeWidth,
          showTitleDropShadowColor : inputProps.showTitleDropShadowColor,
          showTitleDropShadowSpread : inputProps.showTitleDropShadowSpread,
          showTitleBackgroundColor : inputProps.showTitleBackgroundColor,
          showTitlePadding : inputProps.showTitlePadding,
          showTitleFontColor : inputProps.showTitleFontColor,
          showTitleFont : inputProps.showTitleFont,
          showTitleTextAlign : inputProps.showTitleTextAlign,
          showTitleFontOpacity : inputProps.showTitleFontOpacity,
          clipTitle: inputProps.clipTitle,
          clipTitleFontSize : inputProps.clipTitleFontSize,
          clipTitleTopPixels : inputProps.clipTitleTopPixels,
          clipTitleLeftPixels : inputProps.clipTitleLeftPixels,
          clipTitleHeight : inputProps.clipTitleHeight,
          clipTitleWidth : inputProps.clipTitleWidth,
          clipTitleOutlineStrokeColor : inputProps.clipTitleOutlineStrokeColor,
          clipTitleOutlineStrokeWidth : inputProps.clipTitleOutlineStrokeWidth,
          clipTitleDropShadowColor : inputProps.clipTitleDropShadowColor,
          clipTitleDropShadowSpread : inputProps.clipTitleDropShadowSpread,
          clipTitleBackgroundColor : inputProps.clipTitleBackgroundColor,
          clipTitlePadding : inputProps.clipTitlePadding,
          clipTitleFontColor : inputProps.clipTitleFontColor,
          clipTitleFont : inputProps.clipTitleFont,
          clipTitleTextAlign : inputProps.clipTitleTextAlign,
          clipTitleFontOpacity : inputProps.clipTitleFontOpacity,
          episodeTitle: inputProps.episodeTitle,
          episodeTitleFontSize : inputProps.episodeTitleFontSize,
          episodeTitleTopPixels : inputProps.episodeTitleTopPixels,
          episodeTitleLeftPixels : inputProps.episodeTitleLeftPixels,
          episodeTitleHeight : inputProps.episodeTitleHeight,
          episodeTitleWidth : inputProps.episodeTitleWidth,
          episodeTitleOutlineStrokeColor : inputProps.episodeTitleOutlineStrokeColor,
          episodeTitleOutlineStrokeWidth : inputProps.episodeTitleOutlineStrokeWidth,
          episodeTitleDropShadowColor : inputProps.episodeTitleDropShadowColor,
          episodeTitleDropShadowSpread : inputProps.episodeTitleDropShadowSpread,
          episodeTitleBackgroundColor : inputProps.episodeTitleBackgroundColor,
          episodeTitlePadding : inputProps.episodeTitlePadding,
          episodeTitleFontColor : inputProps.episodeTitleFontColor,
          episodeTitleFont : inputProps.episodeTitleFont,
          episodeTitleTextAlign : inputProps.episodeTitleTextAlign,
          episodeTitleFontOpacity : inputProps.episodeTitleFontOpacity,
          transcriptTitleFont: inputProps.transcriptTitleFont,
          transcriptTitleTextAlign : inputProps.transcriptTitleTextAlign,
          transcriptTitleFontOpacity : inputProps.transcriptTitleFontOpacity,
          transcriptTitleFontColor: inputProps.transcriptTitleFontColor,
          transcriptTitleFontSize : inputProps.transcriptTitleFontSize,
          transcriptTitleTopPixels : inputProps.transcriptTitleTopPixels,
          transcriptTitleLeftPixels : inputProps.transcriptTitleLeftPixels,
          transcriptTitleHeight : inputProps.transcriptTitleHeight,
          transcriptTitleWidth : inputProps.transcriptTitleWidth,
          transcriptTitleOutlineStrokeColor : inputProps.transcriptTitleOutlineStrokeColor,
          transcriptTitleOutlineStrokeWidth : inputProps.transcriptTitleOutlineStrokeWidth,
          transcriptTitleDropShadowColor : inputProps.transcriptTitleDropShadowColor,
          transcriptTitleDropShadowSpread : inputProps.transcriptTitleDropShadowSpread,
          transcriptTitleBackgroundColor : inputProps.transcriptTitleBackgroundColor,
          transcriptTitlePadding : inputProps.transcriptTitlePadding,
          imageTopPixels : inputProps.imageTopPixels,
          imageLeftPixels : inputProps.imageLeftPixels,
          imageHeight : inputProps.imageHeight,
          imageWidth : inputProps.imageWidth,
          imageDropShadowColor : inputProps.imageDropShadowColor,
          imageDropShadowSpread : inputProps.imageDropShadowSpread,
          imageOutlineStrokeColor : inputProps.imageOutlineStrokeColor,
          imageOutlineStrokeWidth : inputProps.imageOutlineStrokeWidth,
          imageFillProperty : inputProps.imageFillProperty,
          imageCornerRadius : inputProps.imageCornerRadius,
          videoOpacityPercent : inputProps.videoOpacityPercent,
          videoScalePercent : inputProps.videoScalePercent,
          videoAlignment : inputProps.videoAlignment,
          videoLeftPixels : inputProps.videoLeftPixels,
          videoTopPixels : inputProps.videoTopPixels,
          videoHeight : inputProps.videoHeight,
          videoWidth : inputProps.videoWidth,
          videoDropShadowSpread : inputProps.videoDropShadowSpread,
          videoOutlineStrokeColor : inputProps.videoOutlineStrokeColor,
          videoOutlineStrokeWidth : inputProps.videoOutlineStrokeWidth,
          videoDropShadowColor : inputProps.videoDropShadowColor,
          videoFillProperty : inputProps.videoFillProperty,
          videoCornerRadius : inputProps.videoCornerRadius
    }
 
    var landscapeDetails = {
          layout : 'landscape',
          showTitle: inputProps.showTitle,
          showTitleFontSize : inputProps.showTitleFontSize,
          showTitleTopPixels : inputProps.showTitleTopPixels,
          showTitleLeftPixels : inputProps.showTitleLeftPixels,
          showTitleHeight : inputProps.showTitleHeight,
          showTitleWidth : inputProps.showTitleWidth,
          showTitleOutlineStrokeColor : inputProps.showTitleOutlineStrokeColor,
          showTitleOutlineStrokeWidth : inputProps.showTitleOutlineStrokeWidth,
          showTitleDropShadowColor : inputProps.showTitleDropShadowColor,
          showTitleDropShadowSpread : inputProps.showTitleDropShadowSpread,
          showTitleBackgroundColor : inputProps.showTitleBackgroundColor,
          showTitlePadding : inputProps.showTitlePadding,
          showTitleFontColor : inputProps.showTitleFontColor,
          showTitleFont : inputProps.showTitleFont,
          showTitleTextAlign : inputProps.showTitleTextAlign,
          showTitleFontOpacity : inputProps.showTitleFontOpacity,
          clipTitle: inputProps.clipTitle,
          clipTitleFontSize : inputProps.clipTitleFontSize,
          clipTitleTopPixels : inputProps.clipTitleTopPixels,
          clipTitleLeftPixels : inputProps.clipTitleLeftPixels,
          clipTitleHeight : inputProps.clipTitleHeight,
          clipTitleWidth : inputProps.clipTitleWidth,
          clipTitleOutlineStrokeColor : inputProps.clipTitleOutlineStrokeColor,
          clipTitleOutlineStrokeWidth : inputProps.clipTitleOutlineStrokeWidth,
          clipTitleDropShadowColor : inputProps.clipTitleDropShadowColor,
          clipTitleDropShadowSpread : inputProps.clipTitleDropShadowSpread,
          clipTitleBackgroundColor : inputProps.clipTitleBackgroundColor,
          clipTitlePadding : inputProps.clipTitlePadding,
          clipTitleFontColor : inputProps.clipTitleFontColor,
          clipTitleFont : inputProps.clipTitleFont,
          clipTitleTextAlign : inputProps.clipTitleTextAlign,
          clipTitleFontOpacity : inputProps.clipTitleFontOpacity,
          episodeTitle: inputProps.episodeTitle,
          episodeTitleFontSize : inputProps.episodeTitleFontSize,
          episodeTitleTopPixels : inputProps.episodeTitleTopPixels,
          episodeTitleLeftPixels : inputProps.episodeTitleLeftPixels,
          episodeTitleHeight : inputProps.episodeTitleHeight,
          episodeTitleWidth : inputProps.episodeTitleWidth,
          episodeTitleOutlineStrokeColor : inputProps.episodeTitleOutlineStrokeColor,
          episodeTitleOutlineStrokeWidth : inputProps.episodeTitleOutlineStrokeWidth,
          episodeTitleDropShadowColor : inputProps.episodeTitleDropShadowColor,
          episodeTitleDropShadowSpread : inputProps.episodeTitleDropShadowSpread,
          episodeTitleBackgroundColor : inputProps.episodeTitleBackgroundColor,
          episodeTitlePadding : inputProps.episodeTitlePadding,
          episodeTitleFontColor : inputProps.episodeTitleFontColor,
          episodeTitleFont : inputProps.episodeTitleFont,
          episodeTitleTextAlign : inputProps.episodeTitleTextAlign,
          episodeTitleFontOpacity : inputProps.episodeTitleFontOpacity,
          transcriptTitleFont: inputProps.transcriptTitleFont,
          transcriptTitleTextAlign : inputProps.transcriptTitleTextAlign,
          transcriptTitleFontOpacity : inputProps.transcriptTitleFontOpacity,
          transcriptTitleFontColor: inputProps.transcriptTitleFontColor,
          transcriptTitleFontSize : inputProps.transcriptTitleFontSize,
          transcriptTitleTopPixels : inputProps.transcriptTitleTopPixels,
          transcriptTitleLeftPixels : inputProps.transcriptTitleLeftPixels,
          transcriptTitleHeight : inputProps.transcriptTitleHeight,
          transcriptTitleWidth : inputProps.transcriptTitleWidth,
          transcriptTitleOutlineStrokeColor : inputProps.transcriptTitleOutlineStrokeColor,
          transcriptTitleOutlineStrokeWidth : inputProps.transcriptTitleOutlineStrokeWidth,
          transcriptTitleDropShadowColor : inputProps.transcriptTitleDropShadowColor,
          transcriptTitleDropShadowSpread : inputProps.transcriptTitleDropShadowSpread,
          transcriptTitleBackgroundColor : inputProps.transcriptTitleBackgroundColor,
          transcriptTitlePadding : inputProps.transcriptTitlePadding,
          imageTopPixels : inputProps.imageTopPixels,
          imageLeftPixels : inputProps.imageLeftPixels,
          imageHeight : inputProps.imageHeight,
          imageWidth : inputProps.imageWidth,
          imageDropShadowColor : inputProps.imageDropShadowColor,
          imageDropShadowSpread : inputProps.imageDropShadowSpread,
          imageOutlineStrokeColor : inputProps.imageOutlineStrokeColor,
          imageOutlineStrokeWidth : inputProps.imageOutlineStrokeWidth,
          imageFillProperty : inputProps.imageFillProperty,
          imageCornerRadius : inputProps.imageCornerRadius,
          videoOpacityPercent : inputProps.videoOpacityPercent,
          videoScalePercent : inputProps.videoScalePercent,
          videoAlignment : inputProps.videoAlignment,
          videoLeftPixels : inputProps.videoLeftPixels,
          videoTopPixels : inputProps.videoTopPixels,
          videoHeight : inputProps.videoHeight,
          videoWidth : inputProps.videoWidth,
          videoDropShadowSpread : inputProps.videoDropShadowSpread,
          videoOutlineStrokeColor : inputProps.videoOutlineStrokeColor,
          videoOutlineStrokeWidth : inputProps.videoOutlineStrokeWidth,
          videoDropShadowColor : inputProps.videoDropShadowColor,
          videoFillProperty : inputProps.videoFillProperty,
          videoCornerRadius : inputProps.videoCornerRadius
    }
   const getSpeakerNameRole = (speakerId) => {
       const speaker = transcript.value.speakers.find((sp) => sp.id === speakerId)
       var name = ''
       var role = ''
       if (speaker) {
         if (speaker.set_name) {
           name = speaker.set_name
         } else {
           name = speaker.default_name
         }
         if (speaker.set_role) {
           role = speaker.set_role
         } else {
           role = speaker.default_role
         }
       }
       return [name, mainStore.capitalizeFirstLetter(role)]
   }
 
     function getElementsWithinRange(data, start, end) {
         let result = [];
         data.forEach(speaker => {
             let filteredElements = speaker.elements.filter(element => {
                 return element.start >= start && element.end <= end;
             });
             if (filteredElements.length > 0) {
                 result.push({
                     speaker_id: speaker.speaker_id,
                     elements: filteredElements
                 });
             }
         });
         return result;
       }
 
       const toggleVideo = () => {
          if(isVideo.value === false){
             inputProps.isVideo = isVideo.value = true;
             reRender();
             saveClipDetailsByClipId()
          }else{
             inputProps.isVideo = isVideo.value = false;
             reRender();
             saveClipDetailsByClipId()
          }
       }  
 
     const hideOverlay = ()=>{
       isGradient.value = isOPenOverlayColor.value =  false
       overlayLatestClr.value = inputProps.overlayColor = '#111111'
       opacity.value = inputProps.opacityPercent =  0
       reRender()
       saveClipDetailsByClipId()
     }
 
     const showOverlay = ()=>{
       isGradient.value = isOPenOverlayColor.value = true
       overlayLatestClr.value = inputProps.overlayColor = '#111111'
       opacity.value = inputProps.opacityPercent =  50
       reRender()
       saveClipDetailsByClipId()
     }
 
     const showDropShadow = ()=>{
      isOpenDropShadow.value = true
      if(selectedIndex.value === 0){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor =  squareDetails.showTitleDropShadowColor = '#111111'
          inputProps.showTitleDropShadowSpread =  squareDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
 
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor =  squareDetails.clipTitleDropShadowColor = '#111111'
          inputProps.clipTitleDropShadowSpread = squareDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor = squareDetails.episodeTitleDropShadowColor = '#111111'
          inputProps.episodeTitleDropShadowSpread = squareDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor =  squareDetails.transcriptTitleDropShadowColor = '#111111'
          inputProps.transcriptTitleDropShadowSpread = squareDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor =  squareDetails.imageDropShadowColor = '#111111'
          inputProps.imageDropShadowSpread = squareDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }else if(selectedIndex.value === 1){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor =  portraitDetails.showTitleDropShadowColor = '#111111'
          inputProps.showTitleDropShadowSpread = portraitDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
 
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor =  portraitDetails.clipTitleDropShadowColor = '#111111'
          inputProps.clipTitleDropShadowSpread = portraitDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
 
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor =  portraitDetails.episodeTitleDropShadowColor = '#111111'
          inputProps.episodeTitleDropShadowSpread =  portraitDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor = portraitDetails.transcriptTitleDropShadowColor = '#111111'
          inputProps.transcriptTitleDropShadowSpread = portraitDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor =  portraitDetails.imageDropShadowColor = '#111111'
          inputProps.imageDropShadowSpread = portraitDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }else if(selectedIndex.value===2){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor = landscapeDetails.showTitleDropShadowColor = '#111111'
          inputProps.showTitleDropShadowSpread = landscapeDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor = landscapeDetails.clipTitleDropShadowColor = '#111111'
          inputProps.clipTitleDropShadowSpread = landscapeDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor = landscapeDetails.episodeTitleDropShadowColor = '#111111'
          inputProps.episodeTitleDropShadowSpread =landscapeDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor = landscapeDetails.transcriptTitleDropShadowColor = '#111111'
          inputProps.transcriptTitleDropShadowSpread = landscapeDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor = landscapeDetails.imageDropShadowColor = '#111111'
          inputProps.imageDropShadowSpread =  landscapeDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }
       
       reRender()
       saveClipDetailsByClipId()
     }
     const hideDropShadow = ()=>{
       isOpenDropShadow.value = false
       if(selectedIndex.value === 0){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor = squareDetails.showTitleDropShadowColor =   null
          inputProps.showTitleDropShadowSpread = squareDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
 
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor =  squareDetails.clipTitleDropShadowColor = null
          inputProps.clipTitleDropShadowSpread =  squareDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor =  squareDetails.episodeTitleDropShadowColor = null
          inputProps.episodeTitleDropShadowSpread =  squareDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor = squareDetails.transcriptTitleDropShadowColor = null
          inputProps.transcriptTitleDropShadowSpread = squareDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor = squareDetails.imageDropShadowColor = null
          inputProps.imageDropShadowSpread =  squareDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }else if(selectedIndex.value === 1){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor = portraitDetails.showTitleDropShadowColor = null
          inputProps.showTitleDropShadowSpread =  portraitDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
 
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor = portraitDetails.clipTitleDropShadowColor = null
          inputProps.clipTitleDropShadowSpread = portraitDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
 
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor = portraitDetails.episodeTitleDropShadowColor = null
          inputProps.episodeTitleDropShadowSpread =  portraitDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor = portraitDetails.transcriptTitleDropShadowColor = null
          inputProps.transcriptTitleDropShadowSpread = portraitDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor = portraitDetails.imageDropShadowColor = null
          inputProps.imageDropShadowSpread =  portraitDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }else if(selectedIndex.value===2){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleDropShadowColor = landscapeDetails.showTitleDropShadowColor = null
          inputProps.showTitleDropShadowSpread =  landscapeDetails.showTitleDropShadowSpread = 'Small'
          updateVmodels('showTitle')
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleDropShadowColor = landscapeDetails.clipTitleDropShadowColor = null
          inputProps.clipTitleDropShadowSpread =  landscapeDetails.clipTitleDropShadowSpread = 'Small'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleDropShadowColor = landscapeDetails.episodeTitleDropShadowColor = null
          inputProps.episodeTitleDropShadowSpread = landscapeDetails.episodeTitleDropShadowSpread = 'Small'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleDropShadowColor = landscapeDetails.transcriptTitleDropShadowColor = null
          inputProps.transcriptTitleDropShadowSpread =  landscapeDetails.transcriptTitleDropShadowSpread = 'Small'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageDropShadowColor = landscapeDetails.imageDropShadowColor = null
          inputProps.imageDropShadowSpread =  landscapeDetails.imageDropShadowSpread = 'Small'
          updateVmodels('imageTitle')
 
       }
       }
       
       reRender()
       saveClipDetailsByClipId()
     }
     watch(()=>isOpenDropShadow.value,(a,b)=>{
       isOpenDropShadow.value
     })
 
     const showOutLineStroke = ()=>{
       isOpenOutLineStroke.value = true
       if(selectedIndex.value === 0){
          if( whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleOutlineStrokeWidth =  inputProps.showTitleOutlineStrokeWidth =  1
          squareDetails.showTitleOutlineStrokeColor =  inputProps.showTitleOutlineStrokeColor = '#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth =  squareDetails.clipTitleOutlineStrokeWidth = 1
          inputProps.clipTitleOutlineStrokeColor = squareDetails.clipTitleOutlineStrokeColor = '#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth = squareDetails.episodeTitleOutlineStrokeWidth = 1
          inputProps.episodeTitleOutlineStrokeColor = squareDetails.episodeTitleOutlineStrokeColor =  '#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth =squareDetails.transcriptTitleOutlineStrokeWidth = 1
          inputProps.transcriptTitleOutlineStrokeColor = squareDetails.transcriptTitleOutlineStrokeColor =  '#111111'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth =squareDetails.imageOutlineStrokeWidth = 1
          inputProps.imageOutlineStrokeColor =  squareDetails.imageOutlineStrokeColor ='#111111'
          updateVmodels('imageTitle')
 
       }
       }
       else if(selectedIndex.value === 1){
          if( whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleOutlineStrokeWidth = portraitDetails.showTitleOutlineStrokeWidth = 1
          inputProps.showTitleOutlineStrokeColor = portraitDetails.showTitleOutlineStrokeColor =   '#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth = portraitDetails.clipTitleOutlineStrokeWidth = 1
          inputProps.clipTitleOutlineStrokeColor =  portraitDetails.clipTitleOutlineStrokeColor = '#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth =portraitDetails.episodeTitleOutlineStrokeWidth =  1
          inputProps.episodeTitleOutlineStrokeColor = portraitDetails.episodeTitleOutlineStrokeColor = '#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth = portraitDetails.transcriptTitleOutlineStrokeWidth =  1
          inputProps.transcriptTitleOutlineStrokeColor = portraitDetails.transcriptTitleOutlineStrokeColor = '#111111'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth = portraitDetails.imageOutlineStrokeWidth = 1
          inputProps.imageOutlineStrokeColor =portraitDetails.imageOutlineStrokeColor =  '#111111'
          updateVmodels('imageTitle')
       }
       }
      else if(selectedIndex.value === 2){
          if( whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleOutlineStrokeWidth = landscapeDetails.showTitleOutlineStrokeWidth =1
          inputProps.showTitleOutlineStrokeColor = landscapeDetails.showTitleOutlineStrokeColor ='#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth =  landscapeDetails.clipTitleOutlineStrokeWidth = 1
          inputProps.clipTitleOutlineStrokeColor =landscapeDetails.clipTitleOutlineStrokeColor = '#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth = landscapeDetails.episodeTitleOutlineStrokeWidth =1
          inputProps.episodeTitleOutlineStrokeColor =  landscapeDetails.episodeTitleOutlineStrokeColor = '#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth =  landscapeDetails.transcriptTitleOutlineStrokeWidth =1
          inputProps.transcriptTitleOutlineStrokeColor = landscapeDetails.transcriptTitleOutlineStrokeColor = '#111111'
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth = landscapeDetails.imageOutlineStrokeWidth =1
          inputProps.imageOutlineStrokeColor =  landscapeDetails.imageOutlineStrokeColor = '#111111'
          updateVmodels('imageTitle')
       }
       }
       reRender()
       saveClipDetailsByClipId()
       
     }
    
     const hideOutLineStroke= ()=>{
       isOpenOutLineStroke.value = false
       if(selectedIndex.value === 0){
          if( whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleOutlineStrokeWidth =squareDetails.showTitleOutlineStrokeWidth =  1
          inputProps.showTitleOutlineStrokeColor = squareDetails.showTitleOutlineStrokeColor = null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth = squareDetails.clipTitleOutlineStrokeWidth =1
          inputProps.clipTitleOutlineStrokeColor =  squareDetails.clipTitleOutlineStrokeColor =null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth = squareDetails.episodeTitleOutlineStrokeWidth = 1
          inputProps.episodeTitleOutlineStrokeColor =  squareDetails.episodeTitleOutlineStrokeColor =  null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth = squareDetails.transcriptTitleOutlineStrokeWidth = 1
          inputProps.transcriptTitleOutlineStrokeColor =  squareDetails.transcriptTitleOutlineStrokeColor =null
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth = squareDetails.imageOutlineStrokeWidth = 1
          inputProps.imageOutlineStrokeColor = squareDetails.imageOutlineStrokeColor = null
          updateVmodels('imageTitle')
       }
       }
       else if(selectedIndex.value === 1){
          if( whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleOutlineStrokeWidth =  portraitDetails.showTitleOutlineStrokeWidth =1
          inputProps.showTitleOutlineStrokeColor =  portraitDetails.showTitleOutlineStrokeColor =  null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth =  portraitDetails.clipTitleOutlineStrokeWidth = 1
          inputProps.clipTitleOutlineStrokeColor =  portraitDetails.clipTitleOutlineStrokeColor = null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth =  portraitDetails.episodeTitleOutlineStrokeWidth = 1
          inputProps.episodeTitleOutlineStrokeColor =  portraitDetails.episodeTitleOutlineStrokeColor = null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth =  portraitDetails.transcriptTitleOutlineStrokeWidth =  1
          inputProps.transcriptTitleOutlineStrokeColor = portraitDetails.transcriptTitleOutlineStrokeColor = null
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth = portraitDetails.imageOutlineStrokeWidth = 1
          inputProps.imageOutlineStrokeColor =  portraitDetails.imageOutlineStrokeColor =  null
          updateVmodels('imageTitle')
       }
       }
      else if(selectedIndex.value === 2){
          if( whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitleOutlineStrokeWidth =  landscapeDetails.showTitleOutlineStrokeWidth = 1
          inputProps.showTitleOutlineStrokeColor = landscapeDetails.showTitleOutlineStrokeColor =  null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitleOutlineStrokeWidth = landscapeDetails.clipTitleOutlineStrokeWidth = 1
          inputProps.clipTitleOutlineStrokeColor =  landscapeDetails.clipTitleOutlineStrokeColor = null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitleOutlineStrokeWidth = landscapeDetails.episodeTitleOutlineStrokeWidth = 1
          inputProps.episodeTitleOutlineStrokeColor = landscapeDetails.episodeTitleOutlineStrokeColor =null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitleOutlineStrokeWidth = landscapeDetails.transcriptTitleOutlineStrokeWidth = 1
          inputProps.transcriptTitleOutlineStrokeColor = landscapeDetails.transcriptTitleOutlineStrokeColor = null
          updateVmodels('transcriptTitle')
       }else if( whichTabClickedInIframe.value == 'image-overlay'){
          inputProps.imageOutlineStrokeWidth = landscapeDetails.imageOutlineStrokeWidth =  1
          inputProps.imageOutlineStrokeColor =  landscapeDetails.imageOutlineStrokeColor = null
          updateVmodels('imageTitle')
       }
       }
       reRender()
       saveClipDetailsByClipId()
     }
 
     const hideBackground = ()=>{
       isOpenBackground.value = false
       if(selectedIndex.value === 0){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding =  squareDetails.showTitlePadding =1
          inputProps.showTitleBackgroundColor =  squareDetails.showTitleBackgroundColor =null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding = squareDetails.clipTitlePadding =1
          inputProps.clipTitleBackgroundColor = squareDetails.clipTitleBackgroundColor =  null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding = squareDetails.episodeTitlePadding =1
          inputProps.episodeTitleBackgroundColor = squareDetails.episodeTitleBackgroundColor =null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding = squareDetails.transcriptTitlePadding = 1
          inputProps.transcriptTitleBackgroundColor = squareDetails.transcriptTitleBackgroundColor =null
          updateVmodels('transcriptTitle')
       }
       }else if(selectedIndex.value === 1){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding =  portraitDetails.showTitlePadding =1
          inputProps.showTitleBackgroundColor = portraitDetails.showTitleBackgroundColor =null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding =  portraitDetails.clipTitlePadding = 1
          inputProps.clipTitleBackgroundColor = portraitDetails.clipTitleBackgroundColor = null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding = portraitDetails.episodeTitlePadding = 1
          inputProps.episodeTitleBackgroundColor =  portraitDetails.episodeTitleBackgroundColor =null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding =portraitDetails.transcriptTitlePadding =  1
          inputProps.transcriptTitleBackgroundColor =portraitDetails.transcriptTitleBackgroundColor = null
          updateVmodels('transcriptTitle')
       }
       }else if(selectedIndex.value === 2){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding =   landscapeDetails.showTitlePadding = 1
          inputProps.showTitleBackgroundColor = landscapeDetails.showTitleBackgroundColor =null
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding = landscapeDetails.clipTitlePadding =1
          inputProps.clipTitleBackgroundColor = landscapeDetails.clipTitleBackgroundColor = null
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding =  landscapeDetails.episodeTitlePadding =1
          inputProps.episodeTitleBackgroundColor = landscapeDetails.episodeTitleBackgroundColor =null
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding = landscapeDetails.transcriptTitlePadding =1
          inputProps.transcriptTitleBackgroundColor = landscapeDetails.transcriptTitleBackgroundColor =null
          updateVmodels('transcriptTitle')
       }
       }
       reRender()
       saveClipDetailsByClipId()
     }
     const showBackground = ()=>{
       isOpenBackground.value = true
       if(selectedIndex.value === 0){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding =  squareDetails.showTitlePadding = 2
          inputProps.showTitleBackgroundColor =squareDetails.showTitleBackgroundColor =  '#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding = squareDetails.clipTitlePadding = 2
          inputProps.clipTitleBackgroundColor = squareDetails.clipTitleBackgroundColor ='#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding = squareDetails.episodeTitlePadding = 2
          inputProps.episodeTitleBackgroundColor =  squareDetails.episodeTitleBackgroundColor ='#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding = squareDetails.transcriptTitlePadding = 2
          inputProps.transcriptTitleBackgroundColor =squareDetails.transcriptTitleBackgroundColor = '#111111'
          updateVmodels('transcriptTitle')
       }
       }else if(selectedIndex.value === 1){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding =portraitDetails.showTitlePadding = 2
          inputProps.showTitleBackgroundColor = portraitDetails.showTitleBackgroundColor = '#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding = portraitDetails.clipTitlePadding = 2
          inputProps.clipTitleBackgroundColor = portraitDetails.clipTitleBackgroundColor = '#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding =portraitDetails.episodeTitlePadding = 2
          inputProps.episodeTitleBackgroundColor =  portraitDetails.episodeTitleBackgroundColor = '#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding = portraitDetails.transcriptTitlePadding = 2
          inputProps.transcriptTitleBackgroundColor = portraitDetails.transcriptTitleBackgroundColor = '#111111'
          updateVmodels('transcriptTitle')
       }
       }else if(selectedIndex.value === 2){
          if(whichTabClickedInIframe.value == 'showTitle'){
          inputProps.showTitlePadding = landscapeDetails.showTitlePadding = 2
          inputProps.showTitleBackgroundColor = landscapeDetails.showTitleBackgroundColor ='#111111'
          updateVmodels('showTitle')
       }else if( whichTabClickedInIframe.value == 'clipTitle'){
          inputProps.clipTitlePadding =  landscapeDetails.clipTitlePadding = 2
          inputProps.clipTitleBackgroundColor = landscapeDetails.clipTitleBackgroundColor ='#111111'
          updateVmodels('clipTitle')
       }else if( whichTabClickedInIframe.value == 'episodeTitle'){
          inputProps.episodeTitlePadding = landscapeDetails.episodeTitlePadding = 2
          inputProps.episodeTitleBackgroundColor = landscapeDetails.episodeTitleBackgroundColor ='#111111'
          updateVmodels('episodeTitle')
       }else if( whichTabClickedInIframe.value == 'transcriptTitle'){
          inputProps.transcriptTitlePadding =landscapeDetails.transcriptTitlePadding = 2
          inputProps.transcriptTitleBackgroundColor =  landscapeDetails.transcriptTitleBackgroundColor = '#111111'
          updateVmodels('transcriptTitle')
       }
       }
       reRender()
       saveClipDetailsByClipId()
     }
 
  const dropShadowValidColorCode = computed(() => {
     return latestDropShadow.value ? latestDropShadow.value : 'null';
   });
 
   const fontValidColorCode = computed(() => {
     return fontLatestClr.value ? fontLatestClr.value : 'null';
   });
 
   const strokeValidColorCode = computed(() =>{
    return strokeLatestClr.value ? strokeLatestClr.value : 'null';
   })
   
   const backgroundValidColorCode = computed(() =>{
    return backgroundLatestClr.value ? backgroundLatestClr.value : 'null';
   })
 
   const designBackgroundvalidColorCode = computed(()=>{
    return designBackClrLatestClr.value ? designBackClrLatestClr.value : 'null';
   })
 
   const overlayValidColorCode = computed(() =>{
    return overlayLatestClr.value ? overlayLatestClr.value : 'null'
   })
 
   
   // manage sidebar click
   const sidebarDrawer = (action) => {
    sidebarAction.value = action
    openTemplateDrawer.value = true
   }
 
   const closeTemplateDrawer = () => {
    sidebarAction.value = ''
    openTemplateDrawer.value = false
   }
 
   const uploadFile =()=>{
     document.getElementById('file_input').click();
   } 
   const originalImageHeight = ref(0)
   const originalImageWidth = ref(0)
 
 const onBrowseComplete = (e) => {
   const file = e.target.files;
   if (file) {
     const reader = new FileReader();
     reader.onload = (e) => {
       // Create a new image element to load the file data
       const img = new Image();
       img.onload = () => {
         const originalWidth = img.width;
         const originalHeight = img.height;
         const aspectRatio = originalWidth / originalHeight;
         const maxSize = 250;
         const minSize = 150;
         let scaleFactor = 1;
         if (originalWidth > originalHeight) {
           scaleFactor = maxSize / originalWidth;
         } else {
           scaleFactor = maxSize / originalHeight;
         }
         // Ensure the image isn't smaller than the minimum size
         if (originalWidth * scaleFactor < minSize || originalHeight * scaleFactor < minSize) {
           scaleFactor = Math.max(minSize / originalWidth, minSize / originalHeight);
         }
         const newWidth = originalWidth * scaleFactor;
         const newHeight = originalHeight * scaleFactor;
         const canvas = document.createElement("canvas");
         canvas.width = newWidth;
         canvas.height = newHeight;
         const ctx = canvas.getContext("2d");
         // Draw the resized image on the canvas
         ctx.drawImage(img, 0, 0, newWidth, newHeight);
         // Get the resized image data URL
         const resizedImageUrl = canvas.toDataURL(file[0].type);
         // Set the original image dimensions and data URL
         originalImageWidth.value = newWidth;
         originalImageHeight.value = newHeight;
         srcOfFile.value = resizedImageUrl;
       //   inputProps.imageUrl = resizedImageUrl;
         inputProps.imageUrl = img.src;
         inputProps.imageAspectRatio = aspectRatio;
         fileDetails.value = file
         // Create a new file object for the resized image
         canvas.toBlob((blob) => {
           const resizedFile = new File([blob], file[0].name, { type: file[0].type });
          //  fileDetails.value = [resizedFile];
           reRender();
           openFeatureImageModal.value = true;
         });
       };
       img.src = e.target.result;
     };
     reader.readAsDataURL(file[0]);
   }
 };
 
 
 
  const closeFileUploadModal = ()=>{
    inputProps.imageWidth = portraitDetails.imageWidth =landscapeDetails.imageWidth = squareDetails.imageWidth =  originalImageWidth.value
    inputProps.imageHeight =  squareDetails.imageHeight = portraitDetails.imageHeight = landscapeDetails.imageHeight = originalImageHeight.value
    reRender()
    saveClipDetailsByClipId()
    openFeatureImageModal.value = false
    fileInput.value.value = ''; 
  }
 
  const closeDeleteModalAndRefreshIframeData=()=>{
    inputProps.imageDropShadowColor = squareDetails.imageDropShadowColor = portraitDetails.imageDropShadowColor =  landscapeDetails.imageDropShadowColor = inputProps.imageOutlineStrokeColor =  squareDetails.imageOutlineStrokeColor = portraitDetails.imageOutlineStrokeColor = landscapeDetails.imageOutlineStrokeColor = null
    inputProps.imageCornerRadius = squareDetails.imageCornerRadius = portraitDetails.imageCornerRadius =  landscapeDetails.imageCornerRadius = inputProps.imageDropShadowSpread = squareDetails.imageDropShadowSpread = portraitDetails.imageDropShadowSpread = landscapeDetails.imageDropShadowSpread =inputProps.imageOutlineStrokeWidth = squareDetails.imageOutlineStrokeWidth = portraitDetails.imageOutlineStrokeWidth = landscapeDetails.imageOutlineStrokeWidth = 1
    srcOfFile.value = inputProps.imageUrl = whichTabClickedInIframe.value=''
    inputProps.imageAspectRatio = 0
    inputProps.imageFillProperty = squareDetails.imageFillProperty =  portraitDetails.imageFillProperty =  landscapeDetails.imageFillProperty =  'fit'
    isOpenBackground.value =  isDelete.value= isOpenDropShadow.value = isOpenOutLineStroke.value = false
    updateInputProps()
    updateVmodels('imageTitle')
    reRender()
    saveClipDetailsByClipId()
   }
 
 
   const handleSubmit =()=>{
    inputProps.imageUrl = ''
   }
   function selectIcon(index) {
    whichTabClickedInIframe.value = ''
    hideTypographyShowImageSettings.value =  isOpenBackground.value =  isOpenDropShadow.value = isOpenOutLineStroke.value = false
    selectedIndex.value = index;
     if(selectedIndex.value === 0){
       inputProps.width =  iframeWidth.value = inputProps.height =  iframeHeight.value = 400
       inputProps.layout = iframeLayoutType.value = 'Square'
       if(squareDetails.showTitleOutlineStrokeColor && squareDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
       isOpenOutLineStroke.value = true
       }
       if(squareDetails.showTitleDropShadowColor && squareDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenDropShadow.value = true
       }
       if(squareDetails.showTitleBackgroundColor && squareDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenBackground.value = true
       }
       if(squareDetails.episodeTitleOutlineStrokeColor && squareDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
       isOpenOutLineStroke.value = true
       }
       if(squareDetails.episodeTitleDropShadowColor && squareDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenDropShadow.value = true
       }
       if(squareDetails.episodeTitleBackgroundColor && squareDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenBackground.value = true
       }
       if(squareDetails.clipTitleOutlineStrokeColor && squareDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenOutLineStroke.value = true
       }
       if(squareDetails.clipTitleDropShadowColor && squareDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenDropShadow.value = true
       }
       if(squareDetails.clipTitleBackgroundColor && squareDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenBackground.value = true
       }
       if(squareDetails.transcriptTitleOutlineStrokeColor && squareDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenOutLineStroke.value = true
       }
       if(squareDetails.transcriptTitleDropShadowColor && squareDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenDropShadow.value = true
       }
       if(squareDetails.transcriptTitleBackgroundColor && squareDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenBackground.value = true
       }
 
       if(squareDetails.imageCornerRadius && squareDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
          inputProps.imageCornerRadius = squareDetails.imageCornerRadius
          inputProps.imageFillProperty = squareDetails.imageFillProperty
       }
       if(squareDetails.imageLeftPixels){
          inputProps.imageLeftPixels = squareDetails.imageLeftPixels
          updateVmodels('imageTitle')
       }
       if(squareDetails.imageTopPixels){
          inputProps.imageTopPixels = squareDetails.imageTopPixels
          updateVmodels('imageTitle')
       }
       if(squareDetails.imageHeight){
          inputProps.imageHeight = squareDetails.imageHeight
          updateVmodels('imageTitle')
       }
       if(squareDetails.imageWidth){
          inputProps.imageWidth = squareDetails.imageWidth
          updateVmodels('imageTitle')
       }
       if(squareDetails.videoCornerRadius && squareDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='video-overlay'){
          inputProps.videoCornerRadius = squareDetails.videoCornerRadius
          inputProps.videoFillProperty = squareDetails.videoFillProperty
       }
       if(squareDetails.videoLeftPixels){
          inputProps.videoLeftPixels = squareDetails.videoLeftPixels
          updateVmodels('videoTitle')
       }
       if(squareDetails.videoTopPixels){
          inputProps.videoTopPixels = squareDetails.videoTopPixels
          updateVmodels('videoTitle')
       }
       if(squareDetails.videoHeight){
          inputProps.videoHeight = squareDetails.videoHeight
          updateVmodels('videoTitle')
       }
       if(squareDetails.videoWidth){
          inputProps.videoWidth = squareDetails.videoWidth
          updateVmodels('videoTitle')
       }
     }else if(selectedIndex.value === 1){
       inputProps.width =  iframeWidth.value = 270
       inputProps.height = iframeHeight.value = 480
       inputProps.layout='portrait'
       iframeLayoutType.value = 'Portrait'
       if(portraitDetails.showTitleOutlineStrokeColor && portraitDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
       isOpenOutLineStroke.value = true
       }
       if(portraitDetails.showTitleDropShadowColor && portraitDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenDropShadow.value = true
       }
       if(portraitDetails.showTitleBackgroundColor && portraitDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenBackground.value = true
       }
       if(portraitDetails.episodeTitleOutlineStrokeColor && portraitDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
       isOpenOutLineStroke.value = true
       }
       if(portraitDetails.episodeTitleDropShadowColor && portraitDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenDropShadow.value = true
       }
       if(portraitDetails.episodeTitleBackgroundColor && portraitDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenBackground.value = true
       }
       if(portraitDetails.clipTitleOutlineStrokeColor && portraitDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenOutLineStroke.value = true
       }
       if(portraitDetails.clipTitleDropShadowColor && portraitDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenDropShadow.value = true
       }
       if(portraitDetails.clipTitleBackgroundColor && portraitDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenBackground.value = true
       }
       if(portraitDetails.transcriptTitleOutlineStrokeColor && portraitDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenOutLineStroke.value = true
       }
       if(portraitDetails.transcriptTitleDropShadowColor && portraitDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenDropShadow.value = true
       }
       if(portraitDetails.transcriptTitleBackgroundColor && portraitDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenBackground.value = true
       }
       if(portraitDetails.imageCornerRadius && portraitDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
          inputProps.imageCornerRadius = portraitDetails.imageCornerRadius
          inputProps.imageFillProperty = portraitDetails.imageFillProperty
       }
       if(portraitDetails.imageLeftPixels){
          inputProps.imageLeftPixels = portraitDetails.imageLeftPixels
          updateVmodels('imageTitle')
       }
       if(portraitDetails.imageTopPixels){
          inputProps.imageTopPixels = portraitDetails.imageTopPixels
          updateVmodels('imageTitle')
 
       }
       if(portraitDetails.imageHeight){
          inputProps.imageHeight = portraitDetails.imageHeight
          updateVmodels('imageTitle')
       }
       if(portraitDetails.imageWidth){
          inputProps.imageWidth = portraitDetails.imageWidth
          updateVmodels('imageTitle')
       }
       if(portraitDetails.videoCornerRadius && portraitDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='video-overlay'){
          inputProps.videoCornerRadius = portraitDetails.videoCornerRadius
          inputProps.videoFillProperty = portraitDetails.videoFillProperty
       }
       if(portraitDetails.videoLeftPixels){
          inputProps.videoLeftPixels = portraitDetails.videoLeftPixels
          updateVmodels('videoTitle')
       }
       if(portraitDetails.videoTopPixels){
          inputProps.videoTopPixels = portraitDetails.videoTopPixels
          updateVmodels('videoTitle')
       }
       if(portraitDetails.videoHeight){
          inputProps.videoHeight = portraitDetails.videoHeight
          updateVmodels('videoTitle')
       }
       if(portraitDetails.videoWidth){
          inputProps.videoWidth = portraitDetails.videoWidth
          updateVmodels('videoTitle')
       }
     }else if(selectedIndex.value === 2){
       inputProps.width =  iframeWidth.value = 480
       inputProps.height = iframeHeight.value = 270
       inputProps.layout='landscape'
       iframeLayoutType.value = 'Landscape'
       if(landscapeDetails.showTitleOutlineStrokeColor && landscapeDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
       isOpenOutLineStroke.value = true
       }
       if(landscapeDetails.showTitleDropShadowColor && landscapeDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenDropShadow.value = true
       }
       if(landscapeDetails.showTitleBackgroundColor && landscapeDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
          isOpenBackground.value = true
       }
       if(landscapeDetails.episodeTitleOutlineStrokeColor && landscapeDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
       isOpenOutLineStroke.value = true
       }
       if(landscapeDetails.episodeTitleDropShadowColor && landscapeDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenDropShadow.value = true
       }
       if(landscapeDetails.episodeTitleBackgroundColor && landscapeDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
          isOpenBackground.value = true
       }
       if(landscapeDetails.clipTitleOutlineStrokeColor && landscapeDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenOutLineStroke.value = true
       }
       if(landscapeDetails.clipTitleDropShadowColor && landscapeDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenDropShadow.value = true
       }
       if(landscapeDetails.clipTitleBackgroundColor && landscapeDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
       isOpenBackground.value = true
       }
       if(landscapeDetails.transcriptTitleOutlineStrokeColor && landscapeDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenOutLineStroke.value = true
       }
       if(landscapeDetails.transcriptTitleDropShadowColor && landscapeDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenDropShadow.value = true
       }
       if(landscapeDetails.transcriptTitleBackgroundColor && landscapeDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
       isOpenBackground.value = true
       }
       if(landscapeDetails.imageCornerRadius && landscapeDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
          inputProps.imageCornerRadius = landscapeDetails.imageCornerRadius
          inputProps.imageFillProperty = landscapeDetails.imageFillProperty
       }
       if(landscapeDetails.imageLeftPixels){
          inputProps.imageLeftPixels = landscapeDetails.imageLeftPixels
          updateVmodels('imageTitle')
       }
       if(landscapeDetails.imageTopPixels){
          inputProps.imageTopPixels = landscapeDetails.imageTopPixels
          updateVmodels('imageTitle')
       }
       if(landscapeDetails.imageHeight){
          inputProps.imageHeight = landscapeDetails.imageHeight
          updateVmodels('imageTitle')
       }
       if(landscapeDetails.imageWidth){
          inputProps.imageWidth = landscapeDetails.imageWidth
          updateVmodels('imageTitle')
       }
       if(landscapeDetails.videoCornerRadius && landscapeDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='video-overlay'){
          inputProps.videoCornerRadius = landscapeDetails.videoCornerRadius
          inputProps.videoFillProperty = landscapeDetails.videoFillProperty
       }
       if(landscapeDetails.videoLeftPixels){
          inputProps.videoLeftPixels = landscapeDetails.videoLeftPixels
          updateVmodels('videoTitle')
       }
       if(landscapeDetails.videoTopPixels){
          inputProps.videoTopPixels = landscapeDetails.videoTopPixels
          updateVmodels('videoTitle')
       }
       if(landscapeDetails.videoHeight){
          inputProps.videoHeight = landscapeDetails.videoHeight
          updateVmodels('videoTitle')
       }
       if(landscapeDetails.videoWidth){
          inputProps.videoWidth = landscapeDetails.videoWidth
          updateVmodels('videoTitle')
       }
     }
 
     computeScale()
     updateVmodels(whichTabClickedInIframe.value)
     updateInputProps()
     reRender()
   }
 
   function selectAlignIcon(align) {
    textAlign.value = align
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleTextAlign = inputProps.showTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleTextAlign = inputProps.clipTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleTextAlign = inputProps.episodeTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleTextAlign = inputProps.transcriptTitleTextAlign = textAlign.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleTextAlign = inputProps.showTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleTextAlign = inputProps.clipTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleTextAlign = inputProps.episodeTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleTextAlign = inputProps.transcriptTitleTextAlign = textAlign.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleTextAlign = inputProps.showTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleTextAlign = inputProps.clipTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleTextAlign = inputProps.episodeTitleTextAlign = textAlign.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleTextAlign = inputProps.transcriptTitleTextAlign = textAlign.value
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
 
   function selectVideoAlign(align) {
    videoAlign.value = align
    if (selectedIndex.value === 0) {
       squareDetails.videoAlignment = inputProps.videoAlignment = videoAlign.value
    } else if (selectedIndex.value === 1) {
       portraitDetails.videoAlignment = inputProps.videoAlignment = videoAlign.value
    } else if (selectedIndex.value === 2) {
       landscapeDetails.videoAlignment = inputProps.videoAlignment = videoAlign.value
    }
    reRender()
    saveClipDetailsByClipId()
   }
 
   const updateTypographyText = ()=>{
       if( whichTabClickedInIframe.value == 'showTitle'){
           squareDetails.showTitle = portraitDetails.showTitle =  landscapeDetails.showTitle =  inputProps.showTitle = typographyText.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitle = portraitDetails.clipTitle = landscapeDetails.clipTitle =  inputProps.clipTitle = typographyText.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitle =  portraitDetails.episodeTitle =  landscapeDetails.episodeTitle =  inputProps.episodeTitle = typographyText.value
       }
     reRender()
     saveClipDetailsByClipId()
   }
 
   const updateFontSize = ()=>{
    if(selectedIndex.value === 0){
       if( whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleFontSize = inputProps.showTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleFontSize =  inputProps.clipTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleFontSize =   inputProps.episodeTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleFontSize =  inputProps.transcriptTitleFontSize = fontSize.value
       }
    }else if(selectedIndex.value === 1){
       if( whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleFontSize =   inputProps.showTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleFontSize =  inputProps.clipTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleFontSize = inputProps.episodeTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleFontSize =   inputProps.transcriptTitleFontSize = fontSize.value
       }
    }else if(selectedIndex.value === 2){
       if( whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleFontSize =  inputProps.showTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleFontSize =  inputProps.clipTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleFontSize = inputProps.episodeTitleFontSize = fontSize.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleFontSize = inputProps.transcriptTitleFontSize = fontSize.value
       }
    }
     reRender()
     saveClipDetailsByClipId()
   }
 
   const updateFontOpacity = ()=>{
    if(selectedIndex.value === 0){
       if( whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleFontOpacity = inputProps.showTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleFontOpacity =  inputProps.clipTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleFontOpacity =   inputProps.episodeTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleFontOpacity =  inputProps.transcriptTitleFontOpacity = fontOpacity.value
       }
    }else if(selectedIndex.value === 1){
       if( whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleFontOpacity =   inputProps.showTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleFontOpacity =  inputProps.clipTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleFontOpacity = inputProps.episodeTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleFontOpacity =   inputProps.transcriptTitleFontOpacity = fontOpacity.value
       }
    }else if(selectedIndex.value === 2){
       if( whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleFontOpacity =  inputProps.showTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleFontOpacity =  inputProps.clipTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleFontOpacity = inputProps.episodeTitleFontOpacity = fontOpacity.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleFontOpacity = inputProps.transcriptTitleFontOpacity = fontOpacity.value
       }
    }
     reRender()
     saveClipDetailsByClipId()
   }
 
 
 
   const updateXLayout =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleTopPixels = inputProps.showTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleTopPixels =  inputProps.clipTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleTopPixels =  inputProps.episodeTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleTopPixels =  inputProps.transcriptTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          squareDetails.imageTopPixels =  inputProps.imageTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          squareDetails.videoTopPixels = inputProps.videoTopPixels = xLayout.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleTopPixels =  inputProps.showTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleTopPixels = inputProps.clipTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleTopPixels = inputProps.episodeTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleTopPixels = inputProps.transcriptTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageTopPixels =  inputProps.imageTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoTopPixels = inputProps.videoTopPixels = xLayout.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleTopPixels =  inputProps.showTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleTopPixels =  inputProps.clipTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleTopPixels = inputProps.episodeTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleTopPixels =  inputProps.transcriptTitleTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageTopPixels =  inputProps.imageTopPixels = xLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoTopPixels = inputProps.videoTopPixels = xLayout.value
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
 
   const updateYLayout =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleLeftPixels =inputProps.showTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleLeftPixels =  inputProps.clipTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleLeftPixels = inputProps.episodeTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleLeftPixels =  inputProps.transcriptTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          squareDetails.imageLeftPixels = inputProps.imageLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          squareDetails.videoLeftPixels = inputProps.videoLeftPixels = yLayout.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleLeftPixels =  inputProps.showTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleLeftPixels =   inputProps.clipTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleLeftPixels =  inputProps.episodeTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleLeftPixels =  inputProps.transcriptTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageLeftPixels = inputProps.imageLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoLeftPixels = inputProps.videoLeftPixels = yLayout.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleLeftPixels = inputProps.showTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleLeftPixels =  inputProps.clipTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleLeftPixels =  inputProps.episodeTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleLeftPixels =  inputProps.transcriptTitleLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageLeftPixels = inputProps.imageLeftPixels = yLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoLeftPixels = inputProps.videoLeftPixels = yLayout.value
       }
    }
     reRender()
     saveClipDetailsByClipId()
   }
 
   const updateHeightLayout =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleHeight =  inputProps.showTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleHeight =  inputProps.clipTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleHeight =  inputProps.episodeTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleHeight = inputProps.transcriptTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          squareDetails.imageHeight =  inputProps.imageHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          squareDetails.videoHeight = inputProps.videoHeight = heightLayout.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleHeight =  inputProps.showTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleHeight = inputProps.clipTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleHeight = inputProps.episodeTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleHeight =  inputProps.transcriptTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageHeight = inputProps.imageHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoHeight = inputProps.videoHeight = heightLayout.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleHeight = inputProps.showTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleHeight = inputProps.clipTitleHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleHeight = inputProps.episodeTitleHeight = heightLayout.value
       } else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleHeight = inputProps.transcriptTitleHeight = heightLayout.value
       } else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageHeight =  inputProps.imageHeight = heightLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoHeight = inputProps.videoHeight = heightLayout.value
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
   
   const updateWidthLayout =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
       squareDetails.showTitleWidth = inputProps.showTitleWidth = widthLayout.value
    }else if(whichTabClickedInIframe.value == 'clipTitle'){
       squareDetails.clipTitleWidth =  inputProps.clipTitleWidth = widthLayout.value
    }else if(whichTabClickedInIframe.value == 'episodeTitle'){
       squareDetails.episodeTitleWidth =  inputProps.episodeTitleWidth = widthLayout.value
    }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
       squareDetails.transcriptTitleWidth =  inputProps.transcriptTitleWidth = widthLayout.value
    }else if(whichTabClickedInIframe.value == 'image-overlay'){
       squareDetails.imageWidth =  inputProps.imageWidth = widthLayout.value
    }else if(whichTabClickedInIframe.value == 'video-overlay'){
       squareDetails.videoWidth = inputProps.videoWidth = widthLayout.value
    }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleWidth =  inputProps.showTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleWidth =  inputProps.clipTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleWidth =  inputProps.episodeTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleWidth = inputProps.transcriptTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageWidth =   inputProps.imageWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoWidth = inputProps.videoWidth = widthLayout.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleWidth =  inputProps.showTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleWidth = inputProps.clipTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleWidth =  inputProps.episodeTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleWidth = inputProps.transcriptTitleWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageWidth =  inputProps.imageWidth = widthLayout.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoWidth = inputProps.videoWidth = widthLayout.value
       }
       }
       reRender()
       saveClipDetailsByClipId()
   }
 
   const updatePaddingBackground =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitlePadding =  inputProps.showTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitlePadding =   inputProps.clipTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitlePadding =  inputProps.episodeTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitlePadding =  inputProps.transcriptTitlePadding = paddingBackground.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitlePadding =  inputProps.showTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitlePadding =inputProps.clipTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitlePadding =   inputProps.episodeTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitlePadding =  inputProps.transcriptTitlePadding = paddingBackground.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitlePadding =  inputProps.showTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitlePadding =  inputProps.clipTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitlePadding = inputProps.episodeTitlePadding = paddingBackground.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitlePadding =  inputProps.transcriptTitlePadding = paddingBackground.value
       }
    }
       reRender()
       saveClipDetailsByClipId()
   }
 
   const updateselectedSpread =(spread)=>{
    selectedSpread.value = spread
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
          squareDetails.showTitleDropShadowSpread =  inputProps.showTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          squareDetails.clipTitleDropShadowSpread =  inputProps.clipTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          squareDetails.episodeTitleDropShadowSpread =  inputProps.episodeTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          squareDetails.transcriptTitleDropShadowSpread =   inputProps.transcriptTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          squareDetails.imageDropShadowSpread =  inputProps.imageDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          squareDetails.videoDropShadowSpread = inputProps.videoDropShadowSpread = selectedSpread.value
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleDropShadowSpread = inputProps.showTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleDropShadowSpread = inputProps.clipTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleDropShadowSpread =   inputProps.episodeTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleDropShadowSpread =  inputProps.transcriptTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageDropShadowSpread =  inputProps.imageDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoDropShadowSpread = inputProps.videoDropShadowSpread = selectedSpread.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleDropShadowSpread =  inputProps.showTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleDropShadowSpread =  inputProps.clipTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleDropShadowSpread =  inputProps.episodeTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleDropShadowSpread =  inputProps.transcriptTitleDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageDropShadowSpread =  inputProps.imageDropShadowSpread = selectedSpread.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoDropShadowSpread = inputProps.videoDropShadowSpread = selectedSpread.value
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
 
   const updateWidthOutlineStroke =()=>{
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
       squareDetails.showTitleOutlineStrokeWidth = inputProps.showTitleOutlineStrokeWidth = widthOutlineStroke.value
    }else if(whichTabClickedInIframe.value == 'clipTitle'){
       squareDetails.clipTitleOutlineStrokeWidth =  inputProps.clipTitleOutlineStrokeWidth = widthOutlineStroke.value
    }else if(whichTabClickedInIframe.value == 'episodeTitle'){
       squareDetails.episodeTitleOutlineStrokeWidth =   inputProps.episodeTitleOutlineStrokeWidth = widthOutlineStroke.value
    }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
       squareDetails.transcriptTitleOutlineStrokeWidth =  inputProps.transcriptTitleOutlineStrokeWidth = widthOutlineStroke.value
    }else if(whichTabClickedInIframe.value == 'image-overlay'){
       squareDetails.imageOutlineStrokeWidth =  inputProps.imageOutlineStrokeWidth = widthOutlineStroke.value
    }else if(whichTabClickedInIframe.value == 'video-overlay'){
       squareDetails.videoOutlineStrokeWidth = inputProps.videoOutlineStrokeWidth = widthOutlineStroke.value
    }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
          portraitDetails.showTitleOutlineStrokeWidth =  inputProps.showTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          portraitDetails.clipTitleOutlineStrokeWidth =  inputProps.clipTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          portraitDetails.episodeTitleOutlineStrokeWidth =  inputProps.episodeTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          portraitDetails.transcriptTitleOutlineStrokeWidth = inputProps.transcriptTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          portraitDetails.imageOutlineStrokeWidth = inputProps.imageOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          portraitDetails.videoOutlineStrokeWidth = inputProps.videoOutlineStrokeWidth = widthOutlineStroke.value
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
          landscapeDetails.showTitleOutlineStrokeWidth =inputProps.showTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
          landscapeDetails.clipTitleOutlineStrokeWidth =  inputProps.clipTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
          landscapeDetails.episodeTitleOutlineStrokeWidth =  inputProps.episodeTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
          landscapeDetails.transcriptTitleOutlineStrokeWidth =  inputProps.transcriptTitleOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'image-overlay'){
          landscapeDetails.imageOutlineStrokeWidth =  inputProps.imageOutlineStrokeWidth = widthOutlineStroke.value
       }else if(whichTabClickedInIframe.value == 'video-overlay'){
          landscapeDetails.videoOutlineStrokeWidth = inputProps.videoOutlineStrokeWidth = widthOutlineStroke.value
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
 
 const updateFont = (font) => {
    isIframeLoading.value = true
    selectedFont.value = font
    if(selectedIndex.value === 0){
       if(whichTabClickedInIframe.value == 'showTitle'){
             squareDetails.showTitleFont = inputProps.showTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('showTitle')
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
             squareDetails.clipTitleFont = inputProps.clipTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('clipTitle')
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             squareDetails.episodeTitleFont =  inputProps.episodeTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('episodeTitle')
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             squareDetails.transcriptTitleFont =  inputProps.transcriptTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('transcriptTitle')
       }
    }else if(selectedIndex.value === 1){
       if(whichTabClickedInIframe.value == 'showTitle'){
             portraitDetails.showTitleFont =  inputProps.showTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('showTitle')
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
             portraitDetails.clipTitleFont =   inputProps.clipTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('clipTitle')
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             portraitDetails.episodeTitleFont =  inputProps.episodeTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('episodeTitle')
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             portraitDetails.transcriptTitleFont =  inputProps.transcriptTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('transcriptTitle')
       }
    }else if(selectedIndex.value === 2){
       if(whichTabClickedInIframe.value == 'showTitle'){
             landscapeDetails.showTitleFont =   inputProps.showTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('showTitle')
       }else if(whichTabClickedInIframe.value == 'clipTitle'){
             landscapeDetails.clipTitleFont =  inputProps.clipTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('clipTitle')
       }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             landscapeDetails.episodeTitleFont = inputProps.episodeTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('episodeTitle')
       }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             landscapeDetails.transcriptTitleFont =  inputProps.transcriptTitleFont = selectedFont.value
             updateInputProps()
             updateVmodels('transcriptTitle')
       }
    }
     document.getElementById('videoPlayer').src = runtimeConfig.public.videoEditorUrl
     setTimeout(() => {reRender()}, 2000);
     saveClipDetailsByClipId()
   }
 
 /*const selectedTemplate = ref(null)
 
 const applyTemplate = (template) => {
    isIframeLoading.value = true
    selectedTemplate.value = template
 
    // Get the current canvas details based on selectedIndex
    const currentCanvasDetails = computed(() => {
      switch(selectedIndex.value) {
        case 0: return squareDetails
        case 1: return portraitDetails
        case 2: return landscapeDetails
        default: return squareDetails
      }
    })
 
    // Dynamically update all properties in the template
    Object.keys(template).forEach(key => {
      // Update canvas-specific details
      currentCanvasDetails.value[key] = template[key]
      
      // Update inputProps
      inputProps[key] = template[key]
    })
 
    updateInputProps()
    updateVmodels('showTitle')
    updateVmodels('episodeTitle')
    updateVmodels('clipTitle')
    updateVmodels('transcriptTitle')
    updateVmodels('imageTitle')
 
    document.getElementById('videoPlayer').src = iframeSrc.value
    setTimeout(() => {reRender()}, 2000)
    saveClipDetailsByClipId()
 }*/
 
   const updateFill=(fill)=>{
    selectedFill.value = fill
    if(whichTabClickedInIframe.value == 'image-overlay'){
       if(selectedIndex.value === 0){
          squareDetails.imageFillProperty =  inputProps.imageFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('imageTitle')
       }else if(selectedIndex.value === 1){
          portraitDetails.imageFillProperty =  inputProps.imageFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('imageTitle')
       }else if(selectedIndex.value === 2){
          landscapeDetails.imageFillProperty =  inputProps.imageFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('imageTitle')
       }
    }else if(whichTabClickedInIframe.value == 'video-overlay'){
       if(selectedIndex.value === 0){
          squareDetails.videoFillProperty =  inputProps.videoFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('videoTitle')
       }else if(selectedIndex.value === 1){
          portraitDetails.videoFillProperty =  inputProps.videoFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('videoTitle')
       }else if(selectedIndex.value === 2){
          landscapeDetails.videoFillProperty =  inputProps.videoFillProperty = selectedFill.value
          updateInputProps()
          updateVmodels('videoTitle')
       }
    }
    reRender()
    saveClipDetailsByClipId()
   }
  
   watch(()=>DesignSection.value, (a,b)=>{
    DesignSection.value
   })
   watch(()=>TranscriptSection.value, (a,b)=>{
    TranscriptSection.value
   })
   watch(()=>TemplatesSection.value, (a,b)=>{
    TemplatesSection.value
   })
   const showTitleSections= ()=>{
    if(whichTabClickedInIframe.value && whichTabClickedInIframe.value != undefined){
       TitleSection.value = true
       DesignSection.value= TranscriptSection.value = TemplatesSection.value = false
    }else{
       TitleSection.value = false
    }
     TranscriptSection.value = DesignSection.value = TemplatesSection.value = false
   }
   watch(()=>TitleSection.value, (a,b)=>{
    TitleSection.value
   })
   const showDesignSections= ()=>{
     DesignSection.value = true
     TitleSection.value = TranscriptSection.value = TemplatesSection.value = false
   }
   const showTranscriptSections= ()=>{
     TranscriptSection.value = true
     DesignSection.value= TitleSection.value = TemplatesSection.value = false
     fetchDataAndUpdate()
   }
   const showTemplatesSections= ()=>{
     TemplatesSection.value = true
     TranscriptSection.value = DesignSection.value = TitleSection.value = false
   }
   const reRender =()=>{
    // console.log(inputProps, '1111111111111111111111111')
       document.getElementById('videoPlayer').contentWindow.postMessage({ 
             channel: 'podium-video-editor',
             type: 'update',
             params: {
                width: inputProps.width,
                height: inputProps.height,
                scaleFactor: scaleFactor.value,
                fps: fps,
                numberofFrames: numberofFrames.value,
                inputProps: inputProps,
                showControls: false,
             }
          }, '*')
    isIframeLoading.value = false
   }
 
 const saveClipDetailsByClipId = ()=>{
    if(inputProps.layout == 'landscape' || inputProps.layout == 'portrait'){
       var width = inputProps.height
       var height = inputProps.width
    }else{
       var width = inputProps.width
       var height = inputProps.height
    }
    if(selectedIndex.value === 0){
       var layoutDynamic = 'square'
    }else if(selectedIndex.value === 1){
       var layoutDynamic = 'portait'
    }else if(selectedIndex.value === 2){
       var layoutDynamic = 'landscape'
    }
    var clipDetails = {
        renameTitle: null, 
        backgroundColor : inputProps.backgroundColor, 
        opacityPercent : inputProps.opacityPercent,
        overlayColor : inputProps.overlayColor,
        layout : layoutDynamic,
        fps : inputProps.fps,
        scaleFactor: scaleFactor.value,
        width : width,
        height : height,
        imageUrl : srcOfFile.value,
        videoUrl : videoFileUrl.value,
        isWatermark : inputProps.isWatermark,
        imageAspectRatio : inputProps.imageAspectRatio,
        portrait : portraitDetails,
        square : squareDetails,
        landscape : landscapeDetails,
        start : start.value,
        end : end.value,
        isGradient : inputProps.isGradient,
        isVideo : isVideo.value
    }
    mainStore.clipSavingSavedState = "Saving";
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${clipId.value}/update/`, {
       method: 'PUT',
       headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
       },
       body: JSON.stringify(clipDetails)
    })
    .then((response) => response.json())
    .then((data) => {
       mainStore.clipSavingSavedState = "Saved";
       if(data){
          console.log('Clip details added successfully.')
       }
    })
 .catch((error) => console.error(error));
 }
 
 const updateInputProps = ()=> {
    if(selectedIndex.value === 0){
             inputProps.showTitle = squareDetails.showTitle
             inputProps.showTitleFont = squareDetails.showTitleFont
             inputProps.showTitleFontSize = squareDetails.showTitleFontSize
             inputProps.showTitleTopPixels = squareDetails.showTitleTopPixels
             inputProps.showTitleLeftPixels = squareDetails.showTitleLeftPixels
             inputProps.showTitleFontColor = squareDetails.showTitleFontColor 
             inputProps.showTitleHeight =  squareDetails.showTitleHeight 
             inputProps.showTitleWidth =  squareDetails.showTitleWidth 
             inputProps.showTitleOutlineStrokeWidth = squareDetails.showTitleOutlineStrokeWidth 
             inputProps.showTitleOutlineStrokeColor =  squareDetails.showTitleOutlineStrokeColor 
             inputProps.showTitleDropShadowColor = squareDetails.showTitleDropShadowColor 
             inputProps.showTitleDropShadowSpread =  squareDetails.showTitleDropShadowSpread 
             inputProps.showTitleBackgroundColor =  squareDetails.showTitleBackgroundColor
             inputProps.showTitlePadding =  squareDetails.showTitlePadding 
             inputProps.showTitleFontOpacity = squareDetails.showTitleFontOpacity
             inputProps.showTitleTextAlign = squareDetails.showTitleTextAlign
             inputProps.episodeTitle = squareDetails.episodeTitle
             inputProps.episodeTitleFont = squareDetails.episodeTitleFont
             inputProps.episodeTitleFontSize = squareDetails.episodeTitleFontSize
             inputProps.episodeTitleTopPixels = squareDetails.episodeTitleTopPixels
             inputProps.episodeTitleLeftPixels = squareDetails.episodeTitleLeftPixels
             inputProps.episodeTitleFontColor  = squareDetails.episodeTitleFontColor 
             inputProps.episodeTitleHeight  =  squareDetails.episodeTitleHeight 
             inputProps.episodeTitleWidth =  squareDetails.episodeTitleWidth 
             inputProps.episodeTitleOutlineStrokeWidth  = squareDetails.episodeTitleOutlineStrokeWidth 
             inputProps.episodeTitleOutlineStrokeColor  =  squareDetails.episodeTitleOutlineStrokeColor 
             inputProps.episodeTitleDropShadowColor  = squareDetails.episodeTitleDropShadowColor 
             inputProps.episodeTitleDropShadowSpread  =  squareDetails.episodeTitleDropShadowSpread 
             inputProps.episodeTitleBackgroundColor =  squareDetails.episodeTitleBackgroundColor
             inputProps.episodeTitlePadding  =  squareDetails.episodeTitlePadding
             inputProps.episodeTitleFontOpacity = squareDetails.episodeTitleFontOpacity
             inputProps.episodeTitleTextAlign = squareDetails.episodeTitleTextAlign
             inputProps.clipTitle = squareDetails.clipTitle
             inputProps.clipTitleFont = squareDetails.clipTitleFont
             inputProps.clipTitleFontSize = squareDetails.clipTitleFontSize
             inputProps.clipTitleTopPixels = squareDetails.clipTitleTopPixels
             inputProps.clipTitleLeftPixels = squareDetails.clipTitleLeftPixels
             inputProps.clipTitleFontColor  = squareDetails.clipTitleFontColor 
             inputProps.clipTitleHeight  =  squareDetails.clipTitleHeight 
             inputProps.clipTitleWidth  =  squareDetails.clipTitleWidth 
             inputProps.clipTitleOutlineStrokeWidth  = squareDetails.clipTitleOutlineStrokeWidth 
             inputProps.clipTitleOutlineStrokeColor  =  squareDetails.clipTitleOutlineStrokeColor 
             inputProps.clipTitleDropShadowColor  = squareDetails.clipTitleDropShadowColor 
             inputProps.clipTitleDropShadowSpread  =  squareDetails.clipTitleDropShadowSpread 
             inputProps.clipTitleBackgroundColor =  squareDetails.clipTitleBackgroundColor
             inputProps.clipTitlePadding  =  squareDetails.clipTitlePadding 
             inputProps.clipTitleFontOpacity = squareDetails.clipTitleFontOpacity
             inputProps.clipTitleTextAlign = squareDetails.clipTitleTextAlign
             inputProps.transcriptTitleFont = squareDetails.transcriptTitleFont
             inputProps.transcriptTitleFontSize = squareDetails.transcriptTitleFontSize
             inputProps.transcriptTitleTopPixels = squareDetails.transcriptTitleTopPixels
             inputProps.transcriptTitleLeftPixels = squareDetails.transcriptTitleLeftPixels
             inputProps.transcriptTitleFontColor  = squareDetails.transcriptTitleFontColor 
             inputProps.transcriptTitleHeight  =  squareDetails.transcriptTitleHeight 
             inputProps.transcriptTitleWidth  =  squareDetails.transcriptTitleWidth 
             inputProps.transcriptTitleOutlineStrokeWidth  = squareDetails.transcriptTitleOutlineStrokeWidth 
             inputProps.transcriptTitleOutlineStrokeColor  =  squareDetails.transcriptTitleOutlineStrokeColor 
             inputProps.transcriptTitleDropShadowColor  = squareDetails.transcriptTitleDropShadowColor 
             inputProps.transcriptTitleDropShadowSpread  =  squareDetails.transcriptTitleDropShadowSpread 
             inputProps.transcriptTitleBackgroundColor =  squareDetails.transcriptTitleBackgroundColor
             inputProps.transcriptTitlePadding  =  squareDetails.transcriptTitlePadding
             inputProps.transcriptTitleFontOpacity = squareDetails.transcriptTitleFontOpacity
             inputProps.transcriptTitleTextAlign = squareDetails.transcriptTitleTextAlign
             inputProps.imageLeftPixels =  squareDetails.imageLeftPixels 
             inputProps.imageTopPixels =  squareDetails.imageTopPixels
             inputProps.imageHeight =  squareDetails.imageHeight 
             inputProps.imageWidth =  squareDetails.imageWidth 
             inputProps.imageOutlineStrokeWidth = squareDetails.imageOutlineStrokeWidth
             inputProps.imageOutlineStrokeColor =  squareDetails.imageOutlineStrokeColor 
             inputProps.imageDropShadowColor = squareDetails.imageDropShadowColor 
             inputProps.imageDropShadowSpread =  squareDetails.imageDropShadowSpread 
             inputProps.imageFillProperty = squareDetails.imageFillProperty
             inputProps.imageCornerRadius = squareDetails.imageCornerRadius
             inputProps.videoOpacityPercent = squareDetails.videoOpacityPercent
             inputProps.videoScalePercent = squareDetails.videoScalePercent
             inputProps.videoAlignment = squareDetails.videoAlignment
             inputProps.videoLeftPixels = squareDetails.videoLeftPixels
             inputProps.videoTopPixels = squareDetails.videoTopPixels
             inputProps.videoHeight = squareDetails.videoHeight
             inputProps.videoWidth = squareDetails.videoWidth
             inputProps.videoOutlineStrokeWidth = squareDetails.videoOutlineStrokeWidth
             inputProps.videoOutlineStrokeColor = squareDetails.videoOutlineStrokeColor
             inputProps.videoDropShadowColor = squareDetails.videoDropShadowColor
             inputProps.videoDropShadowSpread = squareDetails.videoDropShadowSpread
             inputProps.videoFillProperty = squareDetails.videoFillProperty
             inputProps.videoCornerRadius = squareDetails.videoCornerRadius
    }else if(selectedIndex.value === 1){
             inputProps.showTitle  = portraitDetails.showTitle
             inputProps.showTitleFont = portraitDetails.showTitleFont
             inputProps.showTitleFontSize  = portraitDetails.showTitleFontSize
             inputProps.showTitleTopPixels  = portraitDetails.showTitleTopPixels
             inputProps.showTitleLeftPixels = portraitDetails.showTitleLeftPixels
             inputProps.showTitleFontColor = portraitDetails.showTitleFontColor 
             inputProps.showTitleHeight =  portraitDetails.showTitleHeight 
             inputProps.showTitleWidth  =  portraitDetails.showTitleWidth 
             inputProps.showTitleOutlineStrokeWidth  = portraitDetails.showTitleOutlineStrokeWidth 
             inputProps.showTitleOutlineStrokeColor =  portraitDetails.showTitleOutlineStrokeColor 
             inputProps.showTitleDropShadowColor = portraitDetails.showTitleDropShadowColor 
             inputProps.showTitleDropShadowSpread =  portraitDetails.showTitleDropShadowSpread 
             inputProps.showTitleBackgroundColor  =  portraitDetails.showTitleBackgroundColor
             inputProps.showTitlePadding =  portraitDetails.showTitlePadding 
             inputProps.showTitleFontOpacity = portraitDetails.showTitleFontOpacity
             inputProps.showTitleTextAlign = portraitDetails.showTitleTextAlign
             inputProps.episodeTitle  = portraitDetails.episodeTitle
             inputProps.episodeTitleFont = portraitDetails.episodeTitleFont
             inputProps.episodeTitleFontSize  = portraitDetails.episodeTitleFontSize
             inputProps.episodeTitleTopPixels  = portraitDetails.episodeTitleTopPixels
             inputProps.episodeTitleLeftPixels  = portraitDetails.episodeTitleLeftPixels
             inputProps.episodeTitleFontColor  = portraitDetails.episodeTitleFontColor 
             inputProps.episodeTitleHeight  =  portraitDetails.episodeTitleHeight 
             inputProps.episodeTitleWidth =  portraitDetails.episodeTitleWidth 
             inputProps.episodeTitleOutlineStrokeWidth  = portraitDetails.episodeTitleOutlineStrokeWidth 
             inputProps.episodeTitleOutlineStrokeColor  =  portraitDetails.episodeTitleOutlineStrokeColor 
             inputProps.episodeTitleDropShadowColor  = portraitDetails.episodeTitleDropShadowColor 
             inputProps.episodeTitleDropShadowSpread  =  portraitDetails.episodeTitleDropShadowSpread 
             inputProps.episodeTitleBackgroundColor  =  portraitDetails.episodeTitleBackgroundColor
             inputProps.episodeTitlePadding  =  portraitDetails.episodeTitlePadding
             inputProps.episodeTitleFontOpacity = portraitDetails.episodeTitleFontOpacity
             inputProps.episodeTitleTextAlign = portraitDetails.episodeTitleTextAlign
             inputProps.clipTitle  = portraitDetails.clipTitle
             inputProps.clipTitleFont = portraitDetails.clipTitleFont
             inputProps.clipTitleFontSize  = portraitDetails.clipTitleFontSize
             inputProps.clipTitleTopPixels  = portraitDetails.clipTitleTopPixels
             inputProps.clipTitleLeftPixels  = portraitDetails.clipTitleLeftPixels
             inputProps.clipTitleFontColor  = portraitDetails.clipTitleFontColor 
             inputProps.clipTitleHeight  =  portraitDetails.clipTitleHeight 
             inputProps.clipTitleWidth  =  portraitDetails.clipTitleWidth 
             inputProps.clipTitleOutlineStrokeWidth  = portraitDetails.clipTitleOutlineStrokeWidth 
             inputProps.clipTitleOutlineStrokeColor  =  portraitDetails.clipTitleOutlineStrokeColor 
             inputProps.clipTitleDropShadowColor  = portraitDetails.clipTitleDropShadowColor 
             inputProps.clipTitleDropShadowSpread  =  portraitDetails.clipTitleDropShadowSpread 
             inputProps.clipTitleBackgroundColor  =  portraitDetails.clipTitleBackgroundColor
             inputProps.clipTitlePadding  =  portraitDetails.clipTitlePadding
             inputProps.clipTitleFontOpacity = portraitDetails.clipTitleFontOpacity
             inputProps.clipTitleTextAlign = portraitDetails.clipTitleTextAlign
             inputProps.transcriptTitleFont = portraitDetails.transcriptTitleFont
             inputProps.transcriptTitleFontSize  = portraitDetails.transcriptTitleFontSize
             inputProps.transcriptTitleTopPixels  = portraitDetails.transcriptTitleTopPixels
             inputProps.transcriptTitleLeftPixels  = portraitDetails.transcriptTitleLeftPixels
             inputProps.transcriptTitleFontColor  = portraitDetails.transcriptTitleFontColor 
             inputProps.transcriptTitleHeight  =  portraitDetails.transcriptTitleHeight 
             inputProps.transcriptTitleWidth  =  portraitDetails.transcriptTitleWidth 
             inputProps.transcriptTitleOutlineStrokeWidth  = portraitDetails.transcriptTitleOutlineStrokeWidth 
             inputProps.transcriptTitleOutlineStrokeColor  =  portraitDetails.transcriptTitleOutlineStrokeColor 
             inputProps.transcriptTitleDropShadowColor  = portraitDetails.transcriptTitleDropShadowColor 
             inputProps.transcriptTitleDropShadowSpread  =  portraitDetails.transcriptTitleDropShadowSpread 
             inputProps.transcriptTitleBackgroundColor  =  portraitDetails.transcriptTitleBackgroundColor
             inputProps.transcriptTitlePadding  =  portraitDetails.transcriptTitlePadding
             inputProps.transcriptTitleFontOpacity = portraitDetails.transcriptTitleFontOpacity
             inputProps.transcriptTitleTextAlign = portraitDetails.transcriptTitleTextAlign
             inputProps.imageLeftPixels =  portraitDetails.imageLeftPixels 
             inputProps.imageTopPixels =  portraitDetails.imageTopPixels
             inputProps.imageHeight =  portraitDetails.imageHeight 
             inputProps.imageWidth =  portraitDetails.imageWidth 
             inputProps.imageOutlineStrokeWidth = portraitDetails.imageOutlineStrokeWidth
             inputProps.imageOutlineStrokeColor =  portraitDetails.imageOutlineStrokeColor 
             inputProps.imageDropShadowColor = portraitDetails.imageDropShadowColor 
             inputProps.imageDropShadowSpread =  portraitDetails.imageDropShadowSpread 
             inputProps.imageFillProperty = portraitDetails.imageFillProperty
             inputProps.imageCornerRadius = portraitDetails.imageCornerRadius
             inputProps.videoOpacityPercent = portraitDetails.videoOpacityPercent
             inputProps.videoScalePercent = portraitDetails.videoScalePercent
             inputProps.videoAlignment = portraitDetails.videoAlignment
             inputProps.videoLeftPixels = portraitDetails.videoLeftPixels
             inputProps.videoTopPixels = portraitDetails.videoTopPixels
             inputProps.videoHeight = portraitDetails.videoHeight
             inputProps.videoWidth = portraitDetails.videoWidth
             inputProps.videoOutlineStrokeWidth = portraitDetails.videoOutlineStrokeWidth
             inputProps.videoOutlineStrokeColor = portraitDetails.videoOutlineStrokeColor
             inputProps.videoDropShadowColor = portraitDetails.videoDropShadowColor
             inputProps.videoDropShadowSpread = portraitDetails.videoDropShadowSpread
             inputProps.videoFillProperty = portraitDetails.videoFillProperty
             inputProps.videoCornerRadius = portraitDetails.videoCornerRadius
    }else if(selectedIndex.value === 2){
             inputProps.showTitle  = landscapeDetails.showTitle
             inputProps.showTitleFont  = landscapeDetails.showTitleFont
             inputProps.showTitleFontSize  = landscapeDetails.showTitleFontSize
             inputProps.showTitleTopPixels  = landscapeDetails.showTitleTopPixels
             inputProps.showTitleLeftPixels  = landscapeDetails.showTitleLeftPixels
             inputProps.showTitleFontColor  = landscapeDetails.showTitleFontColor 
             inputProps.showTitleHeight  =  landscapeDetails.showTitleHeight 
             inputProps.showTitleWidth  =  landscapeDetails.showTitleWidth 
             inputProps.showTitleOutlineStrokeWidth  = landscapeDetails.showTitleOutlineStrokeWidth 
             inputProps.showTitleOutlineStrokeColor  =  landscapeDetails.showTitleOutlineStrokeColor 
             inputProps.showTitleDropShadowColor  = landscapeDetails.showTitleDropShadowColor 
             inputProps.showTitleDropShadowSpread  =  landscapeDetails.showTitleDropShadowSpread 
             inputProps.showTitleBackgroundColor  =  landscapeDetails.showTitleBackgroundColor
             inputProps.showTitlePadding  =  landscapeDetails.showTitlePadding
             inputProps.showTitleFontOpacity = landscapeDetails.showTitleFontOpacity
             inputProps.showTitleTextAlign = landscapeDetails.showTitleTextAlign
             inputProps.episodeTitleFont = landscapeDetails.episodeTitleFont
             inputProps.episodeTitle = landscapeDetails.episodeTitle
             inputProps.episodeTitleFontSize = landscapeDetails.episodeTitleFontSize
             inputProps.episodeTitleTopPixels = landscapeDetails.episodeTitleTopPixels
             inputProps.episodeTitleLeftPixels = landscapeDetails.episodeTitleLeftPixels
             inputProps.episodeTitleFontColor = landscapeDetails.episodeTitleFontColor 
             inputProps.episodeTitleHeight =  landscapeDetails.episodeTitleHeight 
             inputProps.episodeTitleWidth =  landscapeDetails.episodeTitleWidth 
             inputProps.episodeTitleOutlineStrokeWidth = landscapeDetails.episodeTitleOutlineStrokeWidth 
             inputProps.episodeTitleOutlineStrokeColor =  landscapeDetails.episodeTitleOutlineStrokeColor 
             inputProps.episodeTitleDropShadowColor = landscapeDetails.episodeTitleDropShadowColor 
             inputProps.episodeTitleDropShadowSpread =  landscapeDetails.episodeTitleDropShadowSpread 
             inputProps.episodeTitleBackgroundColor =  landscapeDetails.episodeTitleBackgroundColor
             inputProps.episodeTitlePadding =  landscapeDetails.episodeTitlePadding 
             inputProps.episodeTitleFontOpacity = landscapeDetails.episodeTitleFontOpacity
             inputProps.episodeTitleTextAlign = landscapeDetails.episodeTitleTextAlign
             inputProps.clipTitle = landscapeDetails.clipTitle
             inputProps.clipTitleFont = landscapeDetails.clipTitleFont
             inputProps.clipTitleFontSize = landscapeDetails.clipTitleFontSize
             inputProps.clipTitleTopPixels = landscapeDetails.clipTitleTopPixels
             inputProps.clipTitleLeftPixels = landscapeDetails.clipTitleLeftPixels
             inputProps.clipTitleFontColor = landscapeDetails.clipTitleFontColor 
             inputProps.clipTitleHeight =  landscapeDetails.clipTitleHeight 
             inputProps.clipTitleWidth =  landscapeDetails.clipTitleWidth 
             inputProps.clipTitleOutlineStrokeWidth = landscapeDetails.clipTitleOutlineStrokeWidth 
             inputProps.clipTitleOutlineStrokeColor =  landscapeDetails.clipTitleOutlineStrokeColor 
             inputProps.clipTitleDropShadowColor = landscapeDetails.clipTitleDropShadowColor 
             inputProps.clipTitleDropShadowSpread =  landscapeDetails.clipTitleDropShadowSpread 
             inputProps.clipTitleBackgroundColor =  landscapeDetails.clipTitleBackgroundColor
             inputProps.clipTitlePadding =  landscapeDetails.clipTitlePadding 
             inputProps.clipTitleFontOpacity = landscapeDetails.clipTitleFontOpacity
             inputProps.clipTitleTextAlign = landscapeDetails.clipTitleTextAlign
             inputProps.transcriptTitleFont = landscapeDetails.transcriptTitleFont
             inputProps.transcriptTitleFontSize = landscapeDetails.transcriptTitleFontSize
             inputProps.transcriptTitleTopPixels = landscapeDetails.transcriptTitleTopPixels
             inputProps.transcriptTitleLeftPixels = landscapeDetails.transcriptTitleLeftPixels
             inputProps.transcriptTitleFontColor = landscapeDetails.transcriptTitleFontColor 
             inputProps.transcriptTitleHeight =  landscapeDetails.transcriptTitleHeight 
             inputProps.transcriptTitleWidth =  landscapeDetails.transcriptTitleWidth 
             inputProps.transcriptTitleOutlineStrokeWidth = landscapeDetails.transcriptTitleOutlineStrokeWidth 
             inputProps.transcriptTitleOutlineStrokeColor =  landscapeDetails.transcriptTitleOutlineStrokeColor 
             inputProps.transcriptTitleDropShadowColor = landscapeDetails.transcriptTitleDropShadowColor 
             inputProps.transcriptTitleDropShadowSpread =  landscapeDetails.transcriptTitleDropShadowSpread 
             inputProps.transcriptTitleBackgroundColor =  landscapeDetails.transcriptTitleBackgroundColor
             inputProps.transcriptTitlePadding =  landscapeDetails.transcriptTitlePadding
             inputProps.transcriptTitleFontOpacity = landscapeDetails.transcriptTitleFontOpacity
             inputProps.transcriptTitleTextAlign = landscapeDetails.transcriptTitleTextAlign
             inputProps.imageTopPixels = landscapeDetails.imageTopPixels 
             inputProps.imageLeftPixels = landscapeDetails.imageLeftPixels
             inputProps.imageHeight =  landscapeDetails.imageHeight 
             inputProps.imageWidth =  landscapeDetails.imageWidth 
             inputProps.imageOutlineStrokeWidth = landscapeDetails.imageOutlineStrokeWidth
             inputProps.imageOutlineStrokeColor =  landscapeDetails.imageOutlineStrokeColor 
             inputProps.imageDropShadowColor = landscapeDetails.imageDropShadowColor 
             inputProps.imageDropShadowSpread =  landscapeDetails.imageDropShadowSpread 
             inputProps.imageFillProperty = landscapeDetails.imageFillProperty
             inputProps.imageCornerRadius = landscapeDetails.imageCornerRadius
             inputProps.videoOpacityPercent = landscapeDetails.videoOpacityPercent
             inputProps.videoScalePercent = landscapeDetails.videoScalePercent
             inputProps.videoAlignment = landscapeDetails.videoAlignment
             inputProps.videoLeftPixels = landscapeDetails.videoLeftPixels
             inputProps.videoTopPixels = landscapeDetails.videoTopPixels
             inputProps.videoHeight = landscapeDetails.videoHeight
             inputProps.videoWidth = landscapeDetails.videoWidth
             inputProps.videoOutlineStrokeWidth = landscapeDetails.videoOutlineStrokeWidth
             inputProps.videoOutlineStrokeColor = landscapeDetails.videoOutlineStrokeColor
             inputProps.videoDropShadowColor = landscapeDetails.videoDropShadowColor
             inputProps.videoDropShadowSpread = landscapeDetails.videoDropShadowSpread
             inputProps.videoFillProperty = landscapeDetails.videoFillProperty
             inputProps.videoCornerRadius = landscapeDetails.videoCornerRadius
 
    }
 }
 
 const updateVmodels = (titleName)=> {
    if(selectedIndex.value === 0){
       if (titleName == 'showTitle' ){
             typographyText.value = squareDetails.showTitle
             selectedFont.value = squareDetails.showTitleFont
             fontSize.value = squareDetails.showTitleFontSize
             fontOpacity.value = squareDetails.showTitleFontOpacity
             textAlign.value = squareDetails.showTitleTextAlign
             xLayout.value = squareDetails.showTitleTopPixels
             yLayout.value = squareDetails.showTitleLeftPixels
             fontLatestClr.value = squareDetails.showTitleFontColor 
             heightLayout.value =  squareDetails.showTitleHeight 
             widthLayout.value =  squareDetails.showTitleWidth 
             widthOutlineStroke.value = squareDetails.showTitleOutlineStrokeWidth 
             strokeLatestClr.value =  squareDetails.showTitleOutlineStrokeColor 
             latestDropShadow.value = squareDetails.showTitleDropShadowColor 
             selectedSpread.value =  squareDetails.showTitleDropShadowSpread 
             backgroundLatestClr.value =  squareDetails.showTitleBackgroundColor
             paddingBackground.value =  squareDetails.showTitlePadding 
    }
    else if (titleName == 'episodeTitle'  ){
             selectedFont.value = squareDetails.episodeTitleFont
             typographyText.value = squareDetails.episodeTitle
             fontSize.value = squareDetails.episodeTitleFontSize
             fontOpacity.value = squareDetails.episodeTitleFontOpacity
             textAlign.value = squareDetails.episodeTitleTextAlign
             xLayout.value = squareDetails.episodeTitleTopPixels
             yLayout.value = squareDetails.episodeTitleLeftPixels
             fontLatestClr.value = squareDetails.episodeTitleFontColor 
             heightLayout.value =  squareDetails.episodeTitleHeight 
             widthLayout.value =  squareDetails.episodeTitleWidth 
             widthOutlineStroke.value = squareDetails.episodeTitleOutlineStrokeWidth 
             strokeLatestClr.value =  squareDetails.episodeTitleOutlineStrokeColor 
             latestDropShadow.value = squareDetails.episodeTitleDropShadowColor 
             selectedSpread.value =  squareDetails.episodeTitleDropShadowSpread 
             backgroundLatestClr.value =  squareDetails.episodeTitleBackgroundColor
             paddingBackground.value =  squareDetails.episodeTitlePadding 
    }
    else if (titleName == 'clipTitle'){
              typographyText.value = squareDetails.clipTitle
              selectedFont.value = squareDetails.clipTitleFont
             fontSize.value = squareDetails.clipTitleFontSize
             fontOpacity.value = squareDetails.clipTitleFontOpacity
             textAlign.value = squareDetails.clipTitleTextAlign
             xLayout.value = squareDetails.clipTitleTopPixels
             yLayout.value = squareDetails.clipTitleLeftPixels
             fontLatestClr.value = squareDetails.clipTitleFontColor 
             heightLayout.value =  squareDetails.clipTitleHeight 
             widthLayout.value =  squareDetails.clipTitleWidth 
             widthOutlineStroke.value = squareDetails.clipTitleOutlineStrokeWidth 
             strokeLatestClr.value =  squareDetails.clipTitleOutlineStrokeColor 
             latestDropShadow.value = squareDetails.clipTitleDropShadowColor 
             selectedSpread.value =  squareDetails.clipTitleDropShadowSpread 
             backgroundLatestClr.value =  squareDetails.clipTitleBackgroundColor
             paddingBackground.value =  squareDetails.clipTitlePadding 
    }else if (titleName == 'transcriptTitle'){
             selectedFont.value = squareDetails.transcriptTitleFont
             fontSize.value = squareDetails.transcriptTitleFontSize
             fontOpacity.value = squareDetails.transcriptTitleFontOpacity
             textAlign.value = squareDetails.transcriptTitleTextAlign
             xLayout.value = squareDetails.transcriptTitleTopPixels
             yLayout.value = squareDetails.transcriptTitleLeftPixels
             fontLatestClr.value = squareDetails.transcriptTitleFontColor 
             heightLayout.value =  squareDetails.transcriptTitleHeight 
             widthLayout.value =  squareDetails.transcriptTitleWidth 
             widthOutlineStroke.value = squareDetails.transcriptTitleOutlineStrokeWidth 
             strokeLatestClr.value =  squareDetails.transcriptTitleOutlineStrokeColor 
             latestDropShadow.value = squareDetails.transcriptTitleDropShadowColor 
             selectedSpread.value =  squareDetails.transcriptTitleDropShadowSpread 
             backgroundLatestClr.value =  squareDetails.transcriptTitleBackgroundColor
             paddingBackground.value =  squareDetails.transcriptTitlePadding 
    }else if(titleName == 'imageTitle'){
             heightLayout.value =  squareDetails.imageHeight 
             widthLayout.value =  squareDetails.imageWidth 
             widthOutlineStroke.value = squareDetails.imageOutlineStrokeWidth
             strokeLatestClr.value =  squareDetails.imageOutlineStrokeColor 
             latestDropShadow.value = squareDetails.imageDropShadowColor 
             selectedSpread.value =  squareDetails.imageDropShadowSpread 
             xLayout.value = squareDetails.imageTopPixels
             yLayout.value = squareDetails.imageLeftPixels
             selectedFill.value = squareDetails.imageFillProperty
             cornerRadius.value = squareDetails.imageCornerRadius
    }else if(titleName == 'videoTitle'){
      heightLayout.value =  squareDetails.videoHeight 
      widthLayout.value =  squareDetails.videoWidth 
      widthOutlineStroke.value = squareDetails.videoOutlineStrokeWidth
      strokeLatestClr.value =  squareDetails.videoOutlineStrokeColor 
      latestDropShadow.value = squareDetails.videoDropShadowColor 
      selectedSpread.value =  squareDetails.videoDropShadowSpread 
      xLayout.value = squareDetails.videoTopPixels
      yLayout.value = squareDetails.videoLeftPixels
      selectedFill.value = squareDetails.videoFillProperty
      cornerRadius.value = squareDetails.videoCornerRadius
      videoOpacity.value = squareDetails.videoOpacityPercent
      videoScale.value = squareDetails.videoScalePercent
      videoAlign.value = squareDetails.videoAlignment
    }
    }else if(selectedIndex.value === 1){
       if (titleName == 'showTitle' ){
             typographyText.value = portraitDetails.showTitle
             selectedFont.value = portraitDetails.showTitleFont
             fontSize.value = portraitDetails.showTitleFontSize
             fontOpacity.value = portraitDetails.showTitleFontOpacity
             textAlign.value = portraitDetails.showTitleTextAlign
             xLayout.value = portraitDetails.showTitleTopPixels
             yLayout.value = portraitDetails.showTitleLeftPixels
             fontLatestClr.value = portraitDetails.showTitleFontColor 
             heightLayout.value =  portraitDetails.showTitleHeight 
             widthLayout.value =  portraitDetails.showTitleWidth 
             widthOutlineStroke.value = portraitDetails.showTitleOutlineStrokeWidth 
             strokeLatestClr.value =  portraitDetails.showTitleOutlineStrokeColor 
             latestDropShadow.value = portraitDetails.showTitleDropShadowColor 
             selectedSpread.value =  portraitDetails.showTitleDropShadowSpread 
             backgroundLatestClr.value =  portraitDetails.showTitleBackgroundColor
             paddingBackground.value =  portraitDetails.showTitlePadding 
           
    }
    else if (titleName == 'episodeTitle'  ){
             selectedFont.value = portraitDetails.episodeTitleFont
             typographyText.value = portraitDetails.episodeTitle
             fontSize.value = portraitDetails.episodeTitleFontSize
             fontOpacity.value = portraitDetails.episodeTitleFontOpacity
             textAlign.value = portraitDetails.episodeTitleTextAlign
             xLayout.value = portraitDetails.episodeTitleTopPixels
             yLayout.value = portraitDetails.episodeTitleLeftPixels
             fontLatestClr.value = portraitDetails.episodeTitleFontColor 
             heightLayout.value =  portraitDetails.episodeTitleHeight 
             widthLayout.value =  portraitDetails.episodeTitleWidth 
             widthOutlineStroke.value = portraitDetails.episodeTitleOutlineStrokeWidth 
             strokeLatestClr.value =  portraitDetails.episodeTitleOutlineStrokeColor 
             latestDropShadow.value = portraitDetails.episodeTitleDropShadowColor 
             selectedSpread.value =  portraitDetails.episodeTitleDropShadowSpread 
             backgroundLatestClr.value =  portraitDetails.episodeTitleBackgroundColor
             paddingBackground.value =  portraitDetails.episodeTitlePadding 
    }
    else if (titleName == 'clipTitle'){
              typographyText.value = portraitDetails.clipTitle
              selectedFont.value = portraitDetails.clipTitleFont
             fontSize.value = portraitDetails.clipTitleFontSize
             fontOpacity.value = portraitDetails.clipTitleFontOpacity
             textAlign.value = portraitDetails.clipTitleTextAlign
             xLayout.value = portraitDetails.clipTitleTopPixels
             yLayout.value = portraitDetails.clipTitleLeftPixels
             fontLatestClr.value = portraitDetails.clipTitleFontColor 
             heightLayout.value =  portraitDetails.clipTitleHeight 
             widthLayout.value =  portraitDetails.clipTitleWidth 
             widthOutlineStroke.value = portraitDetails.clipTitleOutlineStrokeWidth 
             strokeLatestClr.value =  portraitDetails.clipTitleOutlineStrokeColor 
             latestDropShadow.value = portraitDetails.clipTitleDropShadowColor 
             selectedSpread.value =  portraitDetails.clipTitleDropShadowSpread 
             backgroundLatestClr.value =  portraitDetails.clipTitleBackgroundColor
             paddingBackground.value =  portraitDetails.clipTitlePadding 
    }  else if (titleName == 'transcriptTitle'){
             selectedFont.value = portraitDetails.transcriptTitleFont
             fontSize.value = portraitDetails.transcriptTitleFontSize
             fontOpacity.value = portraitDetails.transcriptTitleFontOpacity
             textAlign.value = portraitDetails.transcriptTitleTextAlign
             xLayout.value = portraitDetails.transcriptTitleTopPixels
             yLayout.value = portraitDetails.transcriptTitleLeftPixels
             fontLatestClr.value = portraitDetails.transcriptTitleFontColor 
             heightLayout.value =  portraitDetails.transcriptTitleHeight 
             widthLayout.value =  portraitDetails.transcriptTitleWidth 
             widthOutlineStroke.value = portraitDetails.transcriptTitleOutlineStrokeWidth 
             strokeLatestClr.value =  portraitDetails.transcriptTitleOutlineStrokeColor 
             latestDropShadow.value = portraitDetails.transcriptTitleDropShadowColor 
             selectedSpread.value =  portraitDetails.transcriptTitleDropShadowSpread 
             backgroundLatestClr.value =  portraitDetails.transcriptTitleBackgroundColor
             paddingBackground.value =  portraitDetails.transcriptTitlePadding 
    }else if(titleName == 'imageTitle'){
             heightLayout.value =  portraitDetails.imageHeight 
             widthLayout.value =  portraitDetails.imageWidth 
             widthOutlineStroke.value = portraitDetails.imageOutlineStrokeWidth
             strokeLatestClr.value =  portraitDetails.imageOutlineStrokeColor 
             latestDropShadow.value = portraitDetails.imageDropShadowColor 
             selectedSpread.value =  portraitDetails.imageDropShadowSpread 
             xLayout.value = portraitDetails.imageTopPixels
             yLayout.value = portraitDetails.imageLeftPixels
             selectedFill.value = portraitDetails.imageFillProperty
             cornerRadius.value = portraitDetails.imageCornerRadius
    }else if(titleName == 'videoTitle'){
      heightLayout.value =  portraitDetails.videoHeight 
      widthLayout.value =  portraitDetails.videoWidth 
      widthOutlineStroke.value = portraitDetails.videoOutlineStrokeWidth
      strokeLatestClr.value =  portraitDetails.videoOutlineStrokeColor 
      latestDropShadow.value = portraitDetails.videoDropShadowColor 
      selectedSpread.value =  portraitDetails.videoDropShadowSpread 
      xLayout.value = portraitDetails.videoTopPixels
      yLayout.value = portraitDetails.videoLeftPixels
      selectedFill.value = portraitDetails.videoFillProperty
      cornerRadius.value = portraitDetails.videoCornerRadius
      videoOpacity.value = portraitDetails.videoOpacityPercent
      videoScale.value = portraitDetails.videoScalePercent
      videoAlign.value = portraitDetails.videoAlignment
    }
    }else if(selectedIndex.value === 2){
       if (titleName == 'showTitle' ){
             typographyText.value = landscapeDetails.showTitle
             selectedFont.value = landscapeDetails.showTitleFont
             fontSize.value = landscapeDetails.showTitleFontSize
             fontOpacity.value = landscapeDetails.showTitleFontOpacity
             textAlign.value = landscapeDetails.showTitleTextAlign
             xLayout.value = landscapeDetails.showTitleTopPixels
             yLayout.value = landscapeDetails.showTitleLeftPixels
             fontLatestClr.value = landscapeDetails.showTitleFontColor 
             heightLayout.value =  landscapeDetails.showTitleHeight 
             widthLayout.value =  landscapeDetails.showTitleWidth 
             widthOutlineStroke.value = landscapeDetails.showTitleOutlineStrokeWidth 
             strokeLatestClr.value =  landscapeDetails.showTitleOutlineStrokeColor 
             latestDropShadow.value = landscapeDetails.showTitleDropShadowColor 
             selectedSpread.value =  landscapeDetails.showTitleDropShadowSpread 
             backgroundLatestClr.value =  landscapeDetails.showTitleBackgroundColor
             paddingBackground.value =  landscapeDetails.showTitlePadding 
    }
    else if (titleName == 'episodeTitle'  ){
             selectedFont.value = landscapeDetails.episodeTitleFont
             typographyText.value = landscapeDetails.episodeTitle
             fontSize.value = landscapeDetails.episodeTitleFontSize
             fontOpacity.value = landscapeDetails.episodeTitleFontOpacity
             textAlign.value = landscapeDetails.episodeTitleTextAlign
             xLayout.value = landscapeDetails.episodeTitleTopPixels
             yLayout.value = landscapeDetails.episodeTitleLeftPixels
             fontLatestClr.value = landscapeDetails.episodeTitleFontColor 
             heightLayout.value =  landscapeDetails.episodeTitleHeight 
             widthLayout.value =  landscapeDetails.episodeTitleWidth 
             widthOutlineStroke.value = landscapeDetails.episodeTitleOutlineStrokeWidth 
             strokeLatestClr.value =  landscapeDetails.episodeTitleOutlineStrokeColor 
             latestDropShadow.value = landscapeDetails.episodeTitleDropShadowColor 
             selectedSpread.value =  landscapeDetails.episodeTitleDropShadowSpread 
             backgroundLatestClr.value =  landscapeDetails.episodeTitleBackgroundColor
             paddingBackground.value =  landscapeDetails.episodeTitlePadding 
    }
    else if (titleName == 'clipTitle'){
             typographyText.value = landscapeDetails.clipTitle
             selectedFont.value = landscapeDetails.clipTitleFont
             fontOpacity.value = landscapeDetails.clipTitleFontOpacity
             textAlign.value = landscapeDetails.clipTitleTextAlign
             fontSize.value = landscapeDetails.clipTitleFontSize
             xLayout.value = landscapeDetails.clipTitleTopPixels
             yLayout.value = landscapeDetails.clipTitleLeftPixels
             fontLatestClr.value = landscapeDetails.clipTitleFontColor 
             heightLayout.value =  landscapeDetails.clipTitleHeight 
             widthLayout.value =  landscapeDetails.clipTitleWidth 
             widthOutlineStroke.value = landscapeDetails.clipTitleOutlineStrokeWidth 
             strokeLatestClr.value =  landscapeDetails.clipTitleOutlineStrokeColor 
             latestDropShadow.value = landscapeDetails.clipTitleDropShadowColor 
             selectedSpread.value =  landscapeDetails.clipTitleDropShadowSpread 
             backgroundLatestClr.value =  landscapeDetails.clipTitleBackgroundColor
             paddingBackground.value =  landscapeDetails.clipTitlePadding 
    } else if (titleName == 'transcriptTitle'){
             selectedFont.value = landscapeDetails.transcriptTitleFont
             fontOpacity.value = landscapeDetails.transcriptTitleFontOpacity
             textAlign.value = landscapeDetails.transcriptTitleTextAlign
             fontSize.value = landscapeDetails.transcriptTitleFontSize
             xLayout.value = landscapeDetails.transcriptTitleTopPixels
             yLayout.value = landscapeDetails.transcriptTitleLeftPixels
             fontLatestClr.value = landscapeDetails.transcriptTitleFontColor 
             heightLayout.value =  landscapeDetails.transcriptTitleHeight 
             widthLayout.value =  landscapeDetails.transcriptTitleWidth 
             widthOutlineStroke.value = landscapeDetails.transcriptTitleOutlineStrokeWidth 
             strokeLatestClr.value =  landscapeDetails.transcriptTitleOutlineStrokeColor 
             latestDropShadow.value = landscapeDetails.transcriptTitleDropShadowColor 
             selectedSpread.value =  landscapeDetails.transcriptTitleDropShadowSpread 
             backgroundLatestClr.value =  landscapeDetails.transcriptTitleBackgroundColor
             paddingBackground.value =  landscapeDetails.transcriptTitlePadding 
    }else if(titleName == 'imageTitle'){
             heightLayout.value =  landscapeDetails.imageHeight 
             widthLayout.value =  landscapeDetails.imageWidth 
             widthOutlineStroke.value = landscapeDetails.imageOutlineStrokeWidth
             strokeLatestClr.value =  landscapeDetails.imageOutlineStrokeColor 
             latestDropShadow.value = landscapeDetails.imageDropShadowColor 
             selectedSpread.value =  landscapeDetails.imageDropShadowSpread 
             xLayout.value = landscapeDetails.imageTopPixels
             yLayout.value = landscapeDetails.imageLeftPixels
             selectedFill.value = landscapeDetails.imageFillProperty
             cornerRadius.value = landscapeDetails.imageCornerRadius
    }else if(titleName == 'videoTitle'){
      heightLayout.value =  landscapeDetails.videoHeight 
      widthLayout.value =  landscapeDetails.videoWidth 
      widthOutlineStroke.value = landscapeDetails.videoOutlineStrokeWidth
      strokeLatestClr.value =  landscapeDetails.videoOutlineStrokeColor 
      latestDropShadow.value = landscapeDetails.videoDropShadowColor 
      selectedSpread.value =  landscapeDetails.videoDropShadowSpread 
      xLayout.value = landscapeDetails.videoTopPixels
      yLayout.value = landscapeDetails.videoLeftPixels
      selectedFill.value = landscapeDetails.videoFillProperty
      cornerRadius.value = landscapeDetails.videoCornerRadius
      videoOpacity.value = landscapeDetails.videoOpacityPercent
      videoScale.value = landscapeDetails.videoScalePercent
      videoAlign.value = landscapeDetails.videoAlignment
    }
    }
    isVideo.value = inputProps.isVideo
 }
 
 const removeUploadedFile =()=>{
    srcOfFile.value =inputProps.imageUrl = previousSrcOfFile.value
    inputProps.imageAspectRatio = 0
    openFeatureImageModal.value = false
    reRender()
   }
  
   if(process.client){
    window.addEventListener('message', (event) => {
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'slectedDiv'){
       hideTypographyShowImageSettings.value = false
       if (event.data.params.props==''){
          whichTabClickedInIframe.value = event.data.params.props
          TitleSection.value =TranscriptSection.value = TemplatesSection.value = false
          DesignSection.value = true
        }
       else if (event.data.params.props=='showTitle'){
          whichTabClickedInIframe.value = event.data.params.props
          TitleSection.value = true
          DesignSection.value = TranscriptSection.value = TemplatesSection.value = isHideShowtypographyText.value =  isOpenDropShadow.value =  isOpenBackground.value =  isOpenOutLineStroke.value = false
          if(selectedIndex.value === 0){
             if(squareDetails.showTitleOutlineStrokeColor && squareDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
             isOpenOutLineStroke.value = true
             }
             if(squareDetails.showTitleDropShadowColor && squareDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenDropShadow.value = true
             }
             if(squareDetails.showTitleBackgroundColor && squareDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('showTitle')
           
          }else  if(selectedIndex.value === 1){
             if(portraitDetails.showTitleOutlineStrokeColor && portraitDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
             isOpenOutLineStroke.value = true
             }
             if(portraitDetails.showTitleDropShadowColor && portraitDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenDropShadow.value = true
             }
             if(portraitDetails.showTitleBackgroundColor && portraitDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('showTitle')
          }else  if(selectedIndex.value ===2){
             if(landscapeDetails.showTitleOutlineStrokeColor && landscapeDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
             isOpenOutLineStroke.value = true
             }
             if(landscapeDetails.showTitleDropShadowColor && landscapeDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenDropShadow.value = true
             }
             if(landscapeDetails.showTitleBackgroundColor && landscapeDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('showTitle')
          }
       }else if(event.data.params.props=='episodeTitle'){
          whichTabClickedInIframe.value = event.data.params.props
          TitleSection.value = true
          DesignSection.value = TranscriptSection.value = TemplatesSection.value = isHideShowtypographyText.value =  isOpenDropShadow.value =  isOpenBackground.value =  isOpenOutLineStroke.value = false
          if(selectedIndex.value === 0){
             if(squareDetails.episodeTitleOutlineStrokeColor && squareDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
             isOpenOutLineStroke.value = true
             }
             if(squareDetails.episodeTitleDropShadowColor && squareDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenDropShadow.value = true
             }
             if(squareDetails.episodeTitleBackgroundColor && squareDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('episodeTitle')
          }else  if(selectedIndex.value === 1){
             if(portraitDetails.episodeTitleOutlineStrokeColor && portraitDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
             isOpenOutLineStroke.value = true
             }
             if(portraitDetails.episodeTitleDropShadowColor && portraitDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenDropShadow.value = true
             }
             if(portraitDetails.episodeTitleBackgroundColor && portraitDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('episodeTitle')
          }else  if(selectedIndex.value === 2){
             if(landscapeDetails.episodeTitleOutlineStrokeColor && landscapeDetails.episodeTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
             isOpenOutLineStroke.value = true
             }
             if(landscapeDetails.episodeTitleDropShadowColor && landscapeDetails.episodeTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenDropShadow.value = true
             }
             if(landscapeDetails.episodeTitleBackgroundColor && landscapeDetails.episodeTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='episodeTitle'){
                isOpenBackground.value = true
             }
             updateVmodels('episodeTitle')
          }
       }else if(event.data.params.props=='clipTitle' ){
          whichTabClickedInIframe.value = event.data.params.props
          TitleSection.value = true
          DesignSection.value =  TranscriptSection.value = TemplatesSection.value = isHideShowtypographyText.value =   isOpenDropShadow.value =  isOpenBackground.value =  isOpenOutLineStroke.value = false
          if(selectedIndex.value === 0){
             if(squareDetails.clipTitleOutlineStrokeColor && squareDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenOutLineStroke.value = true
             }
             if(squareDetails.clipTitleDropShadowColor && squareDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenDropShadow.value = true
             }
             if(squareDetails.clipTitleBackgroundColor && squareDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('clipTitle')
          }else  if(selectedIndex.value === 1){
             if(portraitDetails.clipTitleOutlineStrokeColor && portraitDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenOutLineStroke.value = true
             }
             if(portraitDetails.clipTitleDropShadowColor && portraitDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenDropShadow.value = true
             }
             if(portraitDetails.clipTitleBackgroundColor && portraitDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('clipTitle')
          }else  if(selectedIndex.value === 2){
             if(landscapeDetails.clipTitleOutlineStrokeColor && landscapeDetails.clipTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenOutLineStroke.value = true
             }
             if(landscapeDetails.clipTitleDropShadowColor && landscapeDetails.clipTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenDropShadow.value = true
             }
             if(landscapeDetails.clipTitleBackgroundColor && landscapeDetails.clipTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='clipTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('clipTitle')
          }
       }else if(event.data.params.props == "transcriptTitle"){
          whichTabClickedInIframe.value = event.data.params.props
          TitleSection.value = isHideShowtypographyText.value =  true
          DesignSection.value =  TranscriptSection.value = TemplatesSection.value = isOpenDropShadow.value =  isOpenBackground.value =  isOpenOutLineStroke.value = false
          if(selectedIndex.value === 0){
             if(squareDetails.transcriptTitleOutlineStrokeColor && squareDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenOutLineStroke.value = true
             }
             if(squareDetails.transcriptTitleDropShadowColor && squareDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenDropShadow.value = true
             }
             if(squareDetails.transcriptTitleBackgroundColor && squareDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('transcriptTitle')
          }else  if(selectedIndex.value === 1){
             if(portraitDetails.transcriptTitleOutlineStrokeColor && portraitDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenOutLineStroke.value = true
             }
             if(portraitDetails.transcriptTitleDropShadowColor && portraitDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenDropShadow.value = true
             }
             if(portraitDetails.transcriptTitleBackgroundColor && portraitDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('transcriptTitle')
          }else  if(selectedIndex.value === 2){
             if(landscapeDetails.transcriptTitleOutlineStrokeColor && landscapeDetails.transcriptTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenOutLineStroke.value = true
             }
             if(landscapeDetails.transcriptTitleDropShadowColor && landscapeDetails.transcriptTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenDropShadow.value = true
             }
             if(landscapeDetails.transcriptTitleBackgroundColor && landscapeDetails.transcriptTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='transcriptTitle'){
             isOpenBackground.value = true
             }
             updateVmodels('transcriptTitle')
          }
       }else if(event.data.params.props == "imageOverlay"){
          whichTabClickedInIframe.value =  'image-overlay'
          TitleSection.value = hideTypographyShowImageSettings.value = true
          DesignSection.value = TranscriptSection.value = TemplatesSection.value = isHideShowtypographyText.value =   isOpenDropShadow.value =  isOpenBackground.value = isOpenOutLineStroke.value = showVideoControls.value = false
          if(selectedIndex.value === 0){
          if(squareDetails.imageOutlineStrokeColor && squareDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(squareDetails.imageDropShadowColor && squareDetails.imageDropShadowColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenDropShadow.value = true
             latestDropShadow.value = squareDetails.imageDropShadowColor 
          }
          if(squareDetails.imageCornerRadius && squareDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
             selectedFill.value = squareDetails.imageFillProperty
             cornerRadius.value = squareDetails.imageCornerRadius
          }
          updateVmodels('imageTitle')            
       }else if(selectedIndex.value === 1){
          if(portraitDetails.imageOutlineStrokeColor && portraitDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(portraitDetails.imageDropShadowColor && portraitDetails.imageDropShadowColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenDropShadow.value = true
          }
          if(portraitDetails.imageCornerRadius && portraitDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
             selectedFill.value = portraitDetails.imageFillProperty
             cornerRadius.value = portraitDetails.imageCornerRadius
          }
          updateVmodels('imageTitle')
       }else if(selectedIndex.value ===2){
          if(landscapeDetails.imageOutlineStrokeColor && landscapeDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(landscapeDetails.imageDropShadowColor && landscapeDetails.imageDropShadowColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
            isOpenDropShadow.value = true
          }
          if(landscapeDetails.imageCornerRadius && landscapeDetails.imageCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
                selectedFill.value = landscapeDetails.imageFillProperty
                cornerRadius.value = landscapeDetails.imageCornerRadius
          }
          updateVmodels('imageTitle')
       }
       } else if(event.data.params.props == "videoOverlay"){
          whichTabClickedInIframe.value =  'video-overlay'
          TitleSection.value = hideTypographyShowImageSettings.value = showVideoControls.value = true
          DesignSection.value = TranscriptSection.value = TemplatesSection.value = isHideShowtypographyText.value =   isOpenDropShadow.value =  isOpenBackground.value = isOpenOutLineStroke.value = false
          if(selectedIndex.value === 0){
          if(squareDetails.imageOutlineStrokeColor && squareDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(squareDetails.videoDropShadowColor && squareDetails.videoDropShadowColor != 'null' && whichTabClickedInIframe.value =='video-overlay'){
             isOpenDropShadow.value = true
             latestDropShadow.value = squareDetails.videoDropShadowColor 
          }
          if(squareDetails.videoCornerRadius && squareDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
             selectedFill.value = squareDetails.videoFillProperty
             cornerRadius.value = squareDetails.videoCornerRadius
          }
          updateVmodels('videoTitle')
       }else if(selectedIndex.value === 1){
          if(portraitDetails.imageOutlineStrokeColor && portraitDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(portraitDetails.imageDropShadowColor && portraitDetails.imageDropShadowColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenDropShadow.value = true
          }
          if(portraitDetails.videoCornerRadius && portraitDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
             selectedFill.value = portraitDetails.videoFillProperty
             cornerRadius.value = portraitDetails.videoCornerRadius
          }
          updateVmodels('videoTitle')
       }else if(selectedIndex.value ===2){
          if(landscapeDetails.imageOutlineStrokeColor && landscapeDetails.imageOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
             isOpenOutLineStroke.value = true
          }
          if(landscapeDetails.imageDropShadowColor && landscapeDetails.imageDropShadowColor != 'null' && whichTabClickedInIframe.value =='image-overlay'){
            isOpenDropShadow.value = true
          }
          if(landscapeDetails.videoCornerRadius && landscapeDetails.videoCornerRadius != 0 && whichTabClickedInIframe.value =='image-overlay'){
                selectedFill.value = landscapeDetails.videoFillProperty
                cornerRadius.value = landscapeDetails.videoCornerRadius
          }
          updateVmodels('videoTitle')
       }
       }
      }
      if (event.data.channel === 'podium-video-editor' && event.data.type === 'contentChanged' ){
        if (event.data.params.props=='showTitle'){
             squareDetails.showTitle =  landscapeDetails.showTitle =  portraitDetails.showTitle =  inputProps.showTitle = event.data.params.content
             updateInputProps()
             updateVmodels('showTitle')
             saveClipDetailsByClipId()
             
        }
       else if (event.data.params.props=='episodeTitle'){
             squareDetails.episodeTitle =   portraitDetails.episodeTitle =  landscapeDetails.episodeTitle =   inputProps.episodeTitle = event.data.params.content
             updateInputProps()
             updateVmodels('episodeTitle')
             saveClipDetailsByClipId()
         
        }
       else if (event.data.params.props=='clipTitle'){
             squareDetails.clipTitle =  portraitDetails.clipTitle =   landscapeDetails.clipTitle =   inputProps.clipTitle = event.data.params.content
             updateInputProps()
             updateVmodels('clipTitle')
             saveClipDetailsByClipId() 
        }
       else if (event.data.params.props=='image-overlay'){
          if(srcOfFile.value){
             fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${clipId.value}/image/delete`, {
                   method: 'DELETE',
                   headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                   },
                   body: JSON.stringify({})
                })
                .then(response => response.json())
                .then(data => {
                   inputProps.imageDropShadowColor =   squareDetails.imageDropShadowColor =  portraitDetails.imageDropShadowColor =   landscapeDetails.imageDropShadowColor =   inputProps.imageOutlineStrokeColor =  squareDetails.imageOutlineStrokeColor =   portraitDetails.imageOutlineStrokeColor = landscapeDetails.imageOutlineStrokeColor = null
                   inputProps.imageCornerRadius = squareDetails.imageCornerRadius = portraitDetails.imageCornerRadius = landscapeDetails.imageCornerRadius =  inputProps.imageDropShadowSpread =  squareDetails.imageDropShadowSpread = portraitDetails.imageDropShadowSpread = landscapeDetails.imageDropShadowSpread =   inputProps.imageOutlineStrokeWidth =  squareDetails.imageOutlineStrokeWidth =  portraitDetails.imageOutlineStrokeWidth =  landscapeDetails.imageOutlineStrokeWidth = 1
                   srcOfFile.value = inputProps.imageUrl =''
                   inputProps.imageAspectRatio = 0
                   inputProps.imageFillProperty =  squareDetails.imageFillProperty =  portraitDetails.imageFillProperty =  landscapeDetails.imageFillProperty =  'fit'
                   isOpenBackground.value =  isOpenDropShadow.value =  isOpenOutLineStroke.value = false
                   updateInputProps()
                   updateVmodels('imageTitle')
                   reRender()
                   saveClipDetailsByClipId()
                })
          }
       }
      }
      if (event.data.channel === 'podium-video-editor' && event.data.type === 'deleteTitlesInfo' ){
        if (event.data.params.props=='show-title'){
             isOpenDropShadow.value = isOpenBackground.value =  isOpenOutLineStroke.value = false
             portraitDetails.showTitleFont = 'Inter'
             inputProps.showTitlePadding =   squareDetails.showTitlePadding =   inputProps.showTitleOutlineStrokeWidth =  squareDetails.showTitleOutlineStrokeWidth =    portraitDetails.showTitleOutlineStrokeWidth =  landscapeDetails.showTitlePadding =  portraitDetails.showTitlePadding =  landscapeDetails.showTitleOutlineStrokeWidth =  1
             landscapeDetails.showTitle =   portraitDetails.showTitle =  squareDetails.showTitle =  inputProps.showTitle =''
             inputProps.showTitleDropShadowSpread =  landscapeDetails.showTitleDropShadowSpread =   portraitDetails.showTitleDropShadowSpread =  squareDetails.showTitleDropShadowSpread =  'Small'
             inputProps.showTitleOutlineStrokeColor = inputProps.showTitleDropShadowColor = inputProps.showTitleBackgroundColor =  squareDetails.showTitleOutlineStrokeColor =   squareDetails.showTitleDropShadowColor =  squareDetails.showTitleBackgroundColor =    landscapeDetails.showTitleOutlineStrokeColor =  landscapeDetails.showTitleDropShadowColor =  landscapeDetails.showTitleBackgroundColor =  portraitDetails.showTitleOutlineStrokeColor =   portraitDetails.showTitleDropShadowColor =   portraitDetails.showTitleBackgroundColor =  null
             updateInputProps()
             updateVmodels('showTitle')
             saveClipDetailsByClipId()
        }
       else if (event.data.params.props=='episode-title'){
             inputProps.episodeTitleOutlineStrokeWidth =   landscapeDetails.episodeTitlePadding =squareDetails.episodeTitleOutlineStrokeWidth =    portraitDetails.episodeTitleOutlineStrokeWidth =  landscapeDetails.episodeTitleOutlineStrokeWidth =    squareDetails.episodeTitlePadding =  portraitDetails.episodeTitlePadding = inputProps.episodeTitlePadding = 1
             isOpenDropShadow.value = isOpenBackground.value =  isOpenOutLineStroke.value = false
             squareDetails.episodeTitleFont = 'Inter'
             squareDetails.episodeTitleFontColor = '#FFFFFF'
             squareDetails.episodeTitleFontSize = 20
             squareDetails.episodeTitleTopPixels = 40
             squareDetails.episodeTitleLeftPixels  =  19
             squareDetails.episodeTitleHeight=  38
             squareDetails.episodeTitleWidth=  295
             inputProps.episodeTitle = portraitDetails.episodeTitle =  landscapeDetails.episodeTitle = squareDetails.episodeTitle = ''
             portraitDetails.episodeTitleFont = 'Inter'
             portraitDetails.episodeTitleDropShadowSpread = landscapeDetails.episodeTitleDropShadowSpread =    squareDetails.episodeTitleDropShadowSpread =  inputProps.episodeTitleDropShadowSpread =  'Small'
             portraitDetails.episodeTitleBackgroundColor =  landscapeDetails.episodeTitleOutlineStrokeColor =   landscapeDetails.episodeTitleDropShadowColor =   landscapeDetails.episodeTitleBackgroundColor =   inputProps.episodeTitleOutlineStrokeColor =    inputProps.episodeTitleDropShadowColor =  inputProps.episodeTitleBackgroundColor = portraitDetails.episodeTitleOutlineStrokeColor =   portraitDetails.episodeTitleDropShadowColor =  squareDetails.episodeTitleOutlineStrokeColor =   squareDetails.episodeTitleDropShadowColor =  squareDetails.episodeTitleBackgroundColor =  null
             updateInputProps()
             updateVmodels('episodeTitle')
             saveClipDetailsByClipId()
             
        }
       else if (event.data.params.props=='clip-title'){
             isOpenDropShadow.value =   isOpenBackground.value = isOpenOutLineStroke.value = false
             squareDetails.clipTitle =  landscapeDetails.clipTitle =  portraitDetails.clipTitle =  inputProps.clipTitle = ''
             inputProps.clipTitleOutlineStrokeWidth =  inputProps.clipTitlePadding = squareDetails.clipTitleOutlineStrokeWidth =  portraitDetails.clipTitleOutlineStrokeWidth =  squareDetails.clipTitlePadding =portraitDetails.clipTitlePadding =  landscapeDetails.clipTitleOutlineStrokeWidth =  landscapeDetails.clipTitlePadding = 1
             squareDetails.clipTitleOutlineStrokeColor =   squareDetails.clipTitleDropShadowColor =   squareDetails.clipTitleBackgroundColor =   portraitDetails.clipTitleOutlineStrokeColor =   portraitDetails.clipTitleDropShadowColor =    portraitDetails.clipTitleBackgroundColor =   landscapeDetails.clipTitleOutlineStrokeColor =  landscapeDetails.clipTitleDropShadowColor =   landscapeDetails.clipTitleBackgroundColor =   inputProps.clipTitleOutlineStrokeColor =  inputProps.clipTitleDropShadowColor =    inputProps.clipTitleBackgroundColor =  null
             portraitDetails.clipTitleDropShadowSpread =   landscapeDetails.clipTitleDropShadowSpread =    squareDetails.clipTitleDropShadowSpread =   inputProps.clipTitleDropShadowSpread =  'Small'
             updateInputProps()
             updateVmodels('clipTitle')
             saveClipDetailsByClipId()
        }
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'positionChanged'){
       hideTypographyShowImageSettings.value = false
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else  if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }else if(event.data.params.props == 'transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }else if(event.data.params.props == 'image-overlay'){
           whichTabClickedInIframe.value = 'image-overlay'
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }  else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }
        }else if(event.data.params.props == 'video-overlay'){
           whichTabClickedInIframe.value = 'video-overlay'
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }  else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }
        }
 
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'dragPositionChanged'){
       hideTypographyShowImageSettings.value = false
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.showTitleLeftPixels = inputProps.showTitleLeftPixels = event.data.params.content.x
             squareDetails.showTitleTopPixels =inputProps.showTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('showTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.showTitleLeftPixels =  inputProps.showTitleLeftPixels = event.data.params.content.x
             portraitDetails.showTitleTopPixels = inputProps.showTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('showTitle')
          }else  if(selectedIndex.value === 2){
             landscapeDetails.showTitleLeftPixels =   inputProps.showTitleLeftPixels = event.data.params.content.x
             landscapeDetails.showTitleTopPixels =  inputProps.showTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('showTitle')
          }
        }
       else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.episodeTitleLeftPixels =  inputProps.episodeTitleLeftPixels = event.data.params.content.x
             squareDetails.episodeTitleTopPixels = inputProps.episodeTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('episodeTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.episodeTitleLeftPixels =  inputProps.episodeTitleLeftPixels = event.data.params.content.x
             portraitDetails.episodeTitleTopPixels =  inputProps.episodeTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('episodeTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.episodeTitleLeftPixels = inputProps.episodeTitleLeftPixels = event.data.params.content.x
             landscapeDetails.episodeTitleTopPixels =   inputProps.episodeTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('episodeTitle')
          }
        }
       else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.clipTitleLeftPixels = inputProps.clipTitleLeftPixels = event.data.params.content.x
             squareDetails.clipTitleTopPixels = inputProps.clipTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('clipTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.clipTitleLeftPixels =   inputProps.clipTitleLeftPixels = event.data.params.content.x
             portraitDetails.clipTitleTopPixels =  inputProps.clipTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('clipTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.clipTitleLeftPixels = inputProps.clipTitleLeftPixels = event.data.params.content.x
             landscapeDetails.clipTitleTopPixels =  inputProps.clipTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('clipTitle')
          }
        }else if(event.data.params.props == 'transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             squareDetails.transcriptTitleLeftPixels =inputProps.transcriptTitleLeftPixels = event.data.params.content.x
             squareDetails.transcriptTitleTopPixels = inputProps.transcriptTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('transcriptTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.transcriptTitleLeftPixels =inputProps.transcriptTitleLeftPixels = event.data.params.content.x
             portraitDetails.transcriptTitleTopPixels =   inputProps.transcriptTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('transcriptTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.transcriptTitleLeftPixels =  inputProps.transcriptTitleLeftPixels = event.data.params.content.x
             landscapeDetails.transcriptTitleTopPixels = inputProps.transcriptTitleTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('transcriptTitle')
          }
        }else if(event.data.params.props == 'image-overlay'){
           whichTabClickedInIframe.value = 'image-overlay'
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             squareDetails.imageLeftPixels =  inputProps.imageLeftPixels = event.data.params.content.x
             squareDetails.imageTopPixels = inputProps.imageTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('imageTitle')
          }  else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             portraitDetails.imageLeftPixels =inputProps.imageLeftPixels = event.data.params.content.x
             portraitDetails.imageTopPixels = inputProps.imageTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('imageTitle')
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             landscapeDetails.imageLeftPixels = inputProps.imageLeftPixels = event.data.params.content.x
             landscapeDetails.imageTopPixels = inputProps.imageTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('imageTitle')
          }
        }else if(event.data.params.props == 'video-overlay'){
          whichTabClickedInIframe.value = 'video-overlay'
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             squareDetails.videoLeftPixels =  inputProps.videoLeftPixels = event.data.params.content.x
             squareDetails.videoTopPixels = inputProps.videoTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('videoTitle')
          }  else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             portraitDetails.videoLeftPixels =inputProps.videoLeftPixels = event.data.params.content.x
             portraitDetails.videoTopPixels = inputProps.videoTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('videoTitle')
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             landscapeDetails.videoLeftPixels = inputProps.videoLeftPixels = event.data.params.content.x
             landscapeDetails.videoTopPixels = inputProps.videoTopPixels = event.data.params.content.y
             updateInputProps()
             updateVmodels('videoTitle')
          }
        }
 
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'fontChanged'){
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else  if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }else if (event.data.params.props=='transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type == 'resizeFontChanged'){
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.showTitleFontSize =inputProps.showTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('showTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.showTitleFontSize =  inputProps.showTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('showTitle')
          }else  if(selectedIndex.value === 2){
             landscapeDetails.showTitleFontSize =  inputProps.showTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('showTitle')
          }
        } else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.episodeTitleFontSize =  inputProps.episodeTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('episodeTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.episodeTitleFontSize = inputProps.episodeTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('episodeTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.episodeTitleFontSize =  inputProps.episodeTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('episodeTitle')
          }
        }else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             squareDetails.clipTitleFontSize =  inputProps.clipTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('clipTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.clipTitleFontSize = inputProps.clipTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('clipTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.clipTitleFontSize =  inputProps.clipTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('clipTitle')
          }
        }else if (event.data.params.props=='transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             squareDetails.transcriptTitleFontSize = inputProps.transcriptTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('transcriptTitle')
          }else if(selectedIndex.value === 1){
             portraitDetails.transcriptTitleFontSize = inputProps.transcriptTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('transcriptTitle')
          }else if(selectedIndex.value === 2){
             landscapeDetails.transcriptTitleFontSize = inputProps.transcriptTitleFontSize = event.data.params.content
             updateInputProps()
             updateVmodels('transcriptTitle')
          }
        }
 
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'dimensionsChanged'){
       hideTypographyShowImageSettings.value = false
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else  if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        }
       else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             saveClipDetailsByClipId()
          }
        } 
       else if (event.data.params.props=='transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             if(event.data.params.content.width || event.data.params.content.height){
                saveClipDetailsByClipId()
             }
          }else if(selectedIndex.value === 1){
             if(event.data.params.content.width || event.data.params.content.height){
                saveClipDetailsByClipId()
             }
          }else if(selectedIndex.value === 2){
             if(event.data.params.content.width || event.data.params.content.height){
                saveClipDetailsByClipId()
             }
          }
        }else if(event.data.params.props == 'image-overlay'){
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }
        }else if(event.data.params.props == 'video-overlay'){
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             saveClipDetailsByClipId()
          }
        }
      }
      if(event.data.channel === 'podium-video-editor' && event.data.type === 'resizeDimensionsChanged'){
       hideTypographyShowImageSettings.value = false
       if (event.data.params.props=='show-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             if(event.data.params.content.width || event.data.params.content.height ){
             squareDetails.showTitleWidth = inputProps.showTitleWidth = event.data.params.content.width
             squareDetails.showTitleHeight =inputProps.showTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('showTitle')}
          }else if(selectedIndex.value === 1){
             if(event.data.params.content.width || event.data.params.content.height ){
             portraitDetails.showTitleWidth = inputProps.showTitleWidth = event.data.params.content.width
             portraitDetails.showTitleHeight =   inputProps.showTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('showTitle')}
          }else  if(selectedIndex.value === 2){
             if(event.data.params.content.width || event.data.params.content.height ){
             landscapeDetails.showTitleWidth =  inputProps.showTitleWidth = event.data.params.content.width
             landscapeDetails.showTitleHeight =  inputProps.showTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('showTitle')}
          }
        }
       else if (event.data.params.props=='episode-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             if(event.data.params.content.width || event.data.params.content.height ){
             squareDetails.episodeTitleWidth = inputProps.episodeTitleWidth = event.data.params.content.width
             squareDetails.episodeTitleHeight =  inputProps.episodeTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('episodeTitle')}
          }else if(selectedIndex.value === 1){
             if(event.data.params.content.width || event.data.params.content.height ){
             portraitDetails.episodeTitleWidth = inputProps.episodeTitleWidth = event.data.params.content.width
             portraitDetails.episodeTitleHeight = inputProps.episodeTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('episodeTitle')}
          }else if(selectedIndex.value === 2){
             if(event.data.params.content.width || event.data.params.content.height ){
             landscapeDetails.episodeTitleWidth =  inputProps.episodeTitleWidth = event.data.params.content.width
             landscapeDetails.episodeTitleHeight = inputProps.episodeTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('episodeTitle')}
          }
        }
       else if (event.data.params.props=='clip-title'){
          isHideShowtypographyText.value = false
          if(selectedIndex.value === 0){
             if(event.data.params.content.width || event.data.params.content.height ){
             squareDetails.clipTitleWidth = inputProps.clipTitleWidth = event.data.params.content.width
             squareDetails.clipTitleHeight =   inputProps.clipTitleHeight = event.data.params.content.height
             updateInputProps()
             updateVmodels('clipTitle') 
          }
          }else if(selectedIndex.value === 1){
             if(event.data.params.content.width || event.data.params.content.height ){
                portraitDetails.clipTitleWidth =  inputProps.clipTitleWidth = event.data.params.content.width
                portraitDetails.clipTitleHeight =  inputProps.clipTitleHeight = event.data.params.content.height
                updateInputProps()
                updateVmodels('clipTitle')
             }
          }else if(selectedIndex.value === 2){
             if(event.data.params.content.width || event.data.params.content.height ){
                landscapeDetails.clipTitleWidth = inputProps.clipTitleWidth = event.data.params.content.width
                landscapeDetails.clipTitleHeight = inputProps.clipTitleHeight = event.data.params.content.height
                updateInputProps()
                updateVmodels('clipTitle')
             }
             
          }
        } 
       else if (event.data.params.props=='transcript-box'){
          isHideShowtypographyText.value = true
          if(selectedIndex.value === 0){
             if(event.data.params.content.width || event.data.params.content.height ){
                squareDetails.transcriptTitleWidth =  inputProps.transcriptTitleWidth = event.data.params.content.width
                squareDetails.transcriptTitleHeight = inputProps.transcriptTitleHeight = event.data.params.content.height
                updateInputProps()
                updateVmodels('transcriptTitle')
             }
          }else if(selectedIndex.value === 1){
             if(event.data.params.content.width || event.data.params.content.height ){
                portraitDetails.transcriptTitleWidth =  inputProps.transcriptTitleWidth = event.data.params.content.width
                portraitDetails.transcriptTitleHeight = inputProps.transcriptTitleHeight = event.data.params.content.height
                updateInputProps()
                updateVmodels('transcriptTitle')
             }
          }else if(selectedIndex.value === 2){
             if(event.data.params.content.width || event.data.params.content.height  ){
                landscapeDetails.transcriptTitleWidth =  inputProps.transcriptTitleWidth = event.data.params.content.width
                landscapeDetails.transcriptTitleHeight = inputProps.transcriptTitleHeight = event.data.params.content.height
                updateInputProps()
                updateVmodels('transcriptTitle')
             }
          }
        }
       else if(event.data.params.props == 'image-overlay'){
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                squareDetails.imageWidth =  inputProps.imageWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                squareDetails.imageHeight =  inputProps.imageHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('imageTitle')
          }else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                portraitDetails.imageWidth = inputProps.imageWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                portraitDetails.imageHeight = inputProps.imageHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('imageTitle')
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                landscapeDetails.imageWidth =  inputProps.imageWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                landscapeDetails.imageHeight =  inputProps.imageHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('imageTitle')
          }
        }else if(event.data.params.props == 'video-overlay'){
          if(selectedIndex.value === 0){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                squareDetails.videoWidth =  inputProps.videoWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                squareDetails.videoHeight =  inputProps.videoHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('imageTitle')
          }else if(selectedIndex.value === 1){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                portraitDetails.videoWidth = inputProps.videoWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                portraitDetails.videoHeight = inputProps.videoHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('imageTitle')
          }else if(selectedIndex.value === 2){
             hideTypographyShowImageSettings.value = true
             if(event.data.params.content.width && event.data.params.content.width !=0){
                landscapeDetails.videoWidth =  inputProps.videoWidth = event.data.params.content.width
             }
             if(event.data.params.content.height && event.data.params.content.height !=0){
                landscapeDetails.videoHeight =  inputProps.videoHeight = event.data.params.content.height
             }
             updateInputProps()
             updateVmodels('videoTitle')
          }
        }
      }
    });
   }
 
 watch(()=>typographyText.value,(a,b)=>{
    typographyText.value
 })
 watch(()=>fontSize.value , (a,b)=>{
    fontSize.value
 })
 watch(()=>fontOpacity.value, (a,b)=>{
    fontOpacity.value
 })
 watch(()=>textAlign.value, (a,b)=>{
    textAlign.value
 })
 watch(()=>videoAlign.value, (a,b)=>{
    videoAlign.value
 })
 watch(()=>selectedFill.value, (a,b)=>{
    selectedFill.value
 })
 watch(()=>selectedSpread.value, (a,b)=>{
    selectedSpread.value
 })
 watch(()=>selectedFont.value, (a,b)=>{
    selectedFont.value
 })
 watch(()=>fontLatestClr.value,(a,b)=>{
    fontLatestClr.value
    fontValidColorCode.value = fontLatestClr.value
 })
 watch(()=>xLayout.value , (a,b)=>{
    xLayout.value
 })
 watch(()=>yLayout.value, (a,b)=>{
    yLayout.value
 })
 watch(()=>heightLayout.value,(a,b)=>{
    heightLayout.value
 })
 watch(()=>widthLayout.value , (a,b)=>{
    widthLayout.value
 })
 watch(()=>strokeLatestClr.value, (a,b)=>{
    strokeLatestClr.value
    strokeValidColorCode.value = strokeLatestClr.value
 })
 watch(()=>latestDropShadow.value , (a,b)=>{
    latestDropShadow.value
    dropShadowValidColorCode.value = latestDropShadow.value
 })
 watch(()=>widthOutlineStroke.value, (a,b)=>{
    widthOutlineStroke.value
    strokeValidColorCode.value = widthOutlineStroke.value
 })
 watch(()=>paddingBackground.value, (a,b)=>{
    paddingBackground.value
    backgroundValidColorCode.value = paddingBackground.value
 })
 watch(()=>backgroundLatestClr.value, (a,b)=>{
    backgroundLatestClr.value
    backgroundValidColorCode.value = backgroundLatestClr.value
 })
 watch(()=>overlayLatestClr.value, (a,b)=>{
    overlayLatestClr.value
    overlayValidColorCode.value = overlayLatestClr.value
 })
 
 
 
 onBeforeUnmount(() => {
   Intercom('update', {
     "vertical_padding": 20,
     "horizontal_padding": 20,
   })
 })
 watch(()=>isIframeLoading.value, (a,b)=>{
    isIframeLoading.value
 })
 
 watch(()=>isGradient.value, (a,b)=>{
    isGradient.value
 })
 
 watch(()=>isVideo.value, (a,b)=>{
    isVideo.value
 })
   const getClipDetailsByClipId = async()=>{
    isIframeLoading.value = true
    await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${clipId.value}/details/`, {
          method: 'GET',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
          },
       })
       .then((response) => response.json())
       .then((data) => {
         if(data){
                 originalTranscriptWords = data.transcriptWords
                 originalTranscriptStarts = data.transcriptStarts
                 reformatTranscript()
                 if(data.backgroundColor){
                   inputProps.backgroundColor =  designBackClrLatestClr.value = data.backgroundColor
                 }else{
                   designBackClrLatestClr.value  = inputProps.backgroundColor
                 }
                 if(data.opacityPercent){
                   inputProps.opacityPercent = opacity.value = data.opacityPercent
                 }else{
                   opacity.value = inputProps.opacityPercent
                 }
                 if(data.overlayColor){
                   inputProps.overlayColor = overlayLatestClr.value = data.overlayColor
                   isOPenOverlayColor.value = true
                 }else{
                   overlayLatestClr.value = inputProps.overlayColor
                   isOPenOverlayColor.value = false
                 }
                 inputProps.isGradient = data.isGradient
                 inputProps.isVideo = data.isVideo
                 inputProps.imageUrl = previousSrcOfFile.value =  data.imageUrl
                 inputProps.imageAspectRatio = data.imageAspectRatio
                 srcOfFile.value  = inputProps.imageUrl
                 inputProps.videoUrl = videoFileUrl.value = data.videoUrl
                 inputProps.audioUrl = data.audioUrl
                 inputProps.start =  start.value = data.start
                 inputProps.end =  end.value = data.end
                 numberofFrames.value = Math.round((end.value - start.value) * fps)
                 inputProps.font = data.font
                 inputProps.layout = data.layout
                 if(data.square){
                     if(data.square.showTitle ==''){
                      squareDetails.showTitle = ''
                     }else{
                      squareDetails.showTitle = data.square.showTitle
                     }
                     squareDetails.showTitleFont = data.square.showTitleFont
                     squareDetails.showTitleFontColor = data.square.showTitleFontColor
                     squareDetails.showTitleFontSize = data.square.showTitleFontSize
                     squareDetails.showTitleTopPixels = data.square.showTitleTopPixels
                     squareDetails.showTitleLeftPixels  =  data.square.showTitleLeftPixels
                     squareDetails.showTitleHeight=  data.square.showTitleHeight
                     squareDetails.showTitleWidth=  data.square.showTitleWidth
                     squareDetails.showTitleOutlineStrokeWidth =  data.square.showTitleOutlineStrokeWidth
                     squareDetails.showTitleOutlineStrokeColor =  data.square.showTitleOutlineStrokeColor
                     squareDetails.showTitleDropShadowColor =  data.square.showTitleDropShadowColor
                     squareDetails.showTitleDropShadowSpread =  data.square.showTitleDropShadowSpread
                     squareDetails.showTitleBackgroundColor =  data.square.showTitleBackgroundColor
                     squareDetails.showTitlePadding =  data.square.showTitlePadding
                     squareDetails.showTitleTextAlign =  data.square.showTitleTextAlign
                     squareDetails.showTitleFontOpacity =  data.square.showTitleFontOpacity
                     if(squareDetails.showTitleOutlineStrokeColor && squareDetails.showTitleOutlineStrokeColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenOutLineStroke.value = true
                     }
                     if(squareDetails.showTitleDropShadowColor && squareDetails.showTitleDropShadowColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenDropShadow.value = true
                     }
                     if(squareDetails.showTitleBackgroundColor && squareDetails.showTitleBackgroundColor != 'null' && whichTabClickedInIframe.value =='showTitle'){
                      isOpenBackground.value = true
                     }
                     squareDetails.clipTitle = data.square.clipTitle
                     squareDetails.clipTitleFont = data.square.clipTitleFont
                     squareDetails.clipTitleFontColor = data.square.clipTitleFontColor
                     squareDetails.clipTitleFontSize = data.square.clipTitleFontSize
                     squareDetails.clipTitleTopPixels = data.square.clipTitleTopPixels
                     squareDetails.clipTitleLeftPixels  =  data.square.clipTitleLeftPixels
                     squareDetails.clipTitleHeight=  data.square.clipTitleHeight
                     squareDetails.clipTitleWidth=  data.square.clipTitleWidth
                     squareDetails.clipTitleOutlineStrokeWidth =  data.square.clipTitleOutlineStrokeWidth
                     squareDetails.clipTitleOutlineStrokeColor =  data.square.clipTitleOutlineStrokeColor
                     squareDetails.clipTitleDropShadowColor =  data.square.clipTitleDropShadowColor
                     squareDetails.clipTitleDropShadowSpread =  data.square.clipTitleDropShadowSpread
                     squareDetails.clipTitleBackgroundColor =  data.square.clipTitleBackgroundColor
                     squareDetails.clipTitlePadding =  data.square.clipTitlePadding
                     squareDetails.clipTitleTextAlign =  data.square.clipTitleTextAlign
                     squareDetails.clipTitleFontOpacity =  data.square.clipTitleFontOpacity
                     if(data.square.episodeTitle == ''){
                      squareDetails.episodeTitle = ''
                     }else{
                     squareDetails.episodeTitle = data.square.episodeTitle
                     }
                     squareDetails.episodeTitleFont = data.square.episodeTitleFont
                     squareDetails.episodeTitleFontColor = data.square.episodeTitleFontColor
                     squareDetails.episodeTitleFontSize = data.square.episodeTitleFontSize
                     squareDetails.episodeTitleTopPixels = data.square.episodeTitleTopPixels
                     squareDetails.episodeTitleLeftPixels  =  data.square.episodeTitleLeftPixels
                     squareDetails.episodeTitleHeight=  data.square.episodeTitleHeight
                     squareDetails.episodeTitleWidth=  data.square.episodeTitleWidth
                     squareDetails.episodeTitleOutlineStrokeWidth =  data.square.episodeTitleOutlineStrokeWidth
                     squareDetails.episodeTitleOutlineStrokeColor =  data.square.episodeTitleOutlineStrokeColor
                     squareDetails.episodeTitleDropShadowColor =  data.square.episodeTitleDropShadowColor
                     squareDetails.episodeTitleDropShadowSpread =  data.square.episodeTitleDropShadowSpread
                     squareDetails.episodeTitleBackgroundColor =  data.square.episodeTitleBackgroundColor
                     squareDetails.episodeTitlePadding =  data.square.episodeTitlePadding
                     squareDetails.episodeTitleTextAlign =  data.square.episodeTitleTextAlign
                     squareDetails.episodeTitleFontOpacity =  data.square.episodeTitleFontOpacity
                     squareDetails.transcriptTitleFont = data.square.transcriptTitleFont
                     squareDetails.transcriptTitleFontColor = data.square.transcriptTitleFontColor
                     squareDetails.transcriptTitleFontSize = data.square.transcriptTitleFontSize
                     squareDetails.transcriptTitleTopPixels = data.square.transcriptTitleTopPixels
                     squareDetails.transcriptTitleLeftPixels  =  data.square.transcriptTitleLeftPixels
                     squareDetails.transcriptTitleHeight=  data.square.transcriptTitleHeight
                     squareDetails.transcriptTitleWidth=  data.square.transcriptTitleWidth
                     squareDetails.transcriptTitleOutlineStrokeWidth =  data.square.transcriptTitleOutlineStrokeWidth
                     squareDetails.transcriptTitleOutlineStrokeColor =  data.square.transcriptTitleOutlineStrokeColor
                     squareDetails.transcriptTitleDropShadowColor =  data.square.transcriptTitleDropShadowColor
                     squareDetails.transcriptTitleDropShadowSpread =  data.square.transcriptTitleDropShadowSpread
                     squareDetails.transcriptTitleBackgroundColor =  data.square.transcriptTitleBackgroundColor
                     squareDetails.transcriptTitlePadding =  data.square.transcriptTitlePadding
                     squareDetails.transcriptTitleTextAlign =  data.square.transcriptTitleTextAlign
                     squareDetails.transcriptTitleFontOpacity =  data.square.transcriptTitleFontOpacity
                     squareDetails.imageLeftPixels = data.square.imageLeftPixels
                     squareDetails.imageTopPixels = data.square.imageTopPixels
                     if(data.square.imageHeight && data.square.imageHeight !=0){
                      squareDetails.imageHeight = data.square.imageHeight
                     }else{
                      squareDetails.imageHeight = inputProps.imageHeight
                     }
                     if(data.square.imageWidth && data.square.imageWidth != 0){
                     squareDetails.imageWidth = data.square.imageWidth
                     }else{
                      squareDetails.imageWidth = inputProps.imageWidth
                     }
                     squareDetails.imageDropShadowSpread = data.square.imageDropShadowSpread
                     squareDetails.imageOutlineStrokeColor = data.square.imageOutlineStrokeColor
                     squareDetails.imageOutlineStrokeWidth = data.square.imageOutlineStrokeWidth
                     squareDetails.imageDropShadowColor = data.square.imageDropShadowColor
                     squareDetails.imageFillProperty = data.square.imageFillProperty ? data.square.imageFillProperty : 'fill'
                     squareDetails.imageCornerRadius = data.square.imageCornerRadius
                     squareDetails.videoOpacityPercent = data.square.videoOpacityPercent
                     squareDetails.videoScalePercent = data.square.videoScalePercent
                     squareDetails.videoAlignment = data.square.videoAlignment
                     squareDetails.videoLeftPixels = data.square.videoLeftPixels
                     squareDetails.videoTopPixels = data.square.videoTopPixels
                     if(data.square.videoWidth && data.square.videoWidth != 0){
                      squareDetails.videoWidth = data.square.videoWidth
                     }else{
                      squareDetails.videoWidth = inputProps.videoWidth
                     }
                     if(data.square.videoHeight && data.square.videoHeight != 0){
                      squareDetails.videoHeight = data.square.videoHeight
                     }else{
                      squareDetails.videoHeight = inputProps.videoHeight
                     }
                     squareDetails.videoDropShadowSpread = data.square.videoDropShadowSpread
                     squareDetails.videoOutlineStrokeColor = data.square.videoOutlineStrokeColor
                     squareDetails.videoOutlineStrokeWidth = data.square.videoOutlineStrokeWidth
                     squareDetails.videoDropShadowColor = data.square.videoDropShadowColor
                     squareDetails.videoFillProperty = data.square.videoFillProperty ? data.square.videoFillProperty : 'fill'
                     squareDetails.videoCornerRadius = data.square.videoCornerRadius
                 }
                if( data.portrait){
                     if(data.portrait.showTitle == ''){
                      portraitDetails.showTitle = ''
                      }else{
                       portraitDetails.showTitle = data.portrait.showTitle
                      }
                     portraitDetails.showTitleFont = data.portrait.showTitleFont
                     portraitDetails.showTitleFontColor = data.portrait.showTitleFontColor
                     portraitDetails.showTitleFontSize = data.portrait.showTitleFontSize
                     portraitDetails.showTitleTopPixels = data.portrait.showTitleTopPixels
                     portraitDetails.showTitleLeftPixels  =  data.portrait.showTitleLeftPixels
                     portraitDetails.showTitleHeight=  data.portrait.showTitleHeight
                     portraitDetails.showTitleWidth=  data.portrait.showTitleWidth
                     portraitDetails.showTitleOutlineStrokeWidth =  data.portrait.showTitleOutlineStrokeWidth
                     portraitDetails.showTitleOutlineStrokeColor =  data.portrait.showTitleOutlineStrokeColor
                     portraitDetails.showTitleDropShadowColor =  data.portrait.showTitleDropShadowColor
                     portraitDetails.showTitleDropShadowSpread =  data.portrait.showTitleDropShadowSpread
                     portraitDetails.showTitleBackgroundColor =  data.portrait.showTitleBackgroundColor
                     portraitDetails.showTitlePadding =  data.portrait.showTitlePadding
                     portraitDetails.showTitleTextAlign =  data.portrait.showTitleTextAlign
                     portraitDetails.showTitleFontOpacity =  data.portrait.showTitleFontOpacity
                     portraitDetails.clipTitle = data.portrait.clipTitle
                     portraitDetails.clipTitleFont = data.portrait.clipTitleFont
                     portraitDetails.clipTitleFontColor = data.portrait.clipTitleFontColor
                     portraitDetails.clipTitleFontSize = data.portrait.clipTitleFontSize
                     portraitDetails.clipTitleTopPixels = data.portrait.clipTitleTopPixels
                     portraitDetails.clipTitleLeftPixels  =  data.portrait.clipTitleLeftPixels
                     portraitDetails.clipTitleHeight=  data.portrait.clipTitleHeight
                     portraitDetails.clipTitleWidth=  data.portrait.clipTitleWidth
                     portraitDetails.clipTitleOutlineStrokeWidth =  data.portrait.clipTitleOutlineStrokeWidth
                     portraitDetails.clipTitleOutlineStrokeColor =  data.portrait.clipTitleOutlineStrokeColor
                     portraitDetails.clipTitleDropShadowColor =  data.portrait.clipTitleDropShadowColor
                     portraitDetails.clipTitleDropShadowSpread =  data.portrait.clipTitleDropShadowSpread
                     portraitDetails.clipTitleBackgroundColor =  data.portrait.clipTitleBackgroundColor
                     portraitDetails.clipTitlePadding =  data.portrait.clipTitlePadding
                     portraitDetails.clipTitleTextAlign =  data.portrait.clipTitleTextAlign
                     portraitDetails.clipTitleFontOpacity =  data.portrait.clipTitleFontOpacity
                     if(data.portrait.episodeTitle == ''){
                      portraitDetails.episodeTitle = ''
                      }else{
                         portraitDetails.episodeTitle = data.portrait.episodeTitle
                      }
                     portraitDetails.episodeTitleFont = data.portrait.episodeTitleFont
                     portraitDetails.episodeTitleFontColor = data.portrait.episodeTitleFontColor
                     portraitDetails.episodeTitleFontSize = data.portrait.episodeTitleFontSize
                     portraitDetails.episodeTitleTopPixels = data.portrait.episodeTitleTopPixels
                     portraitDetails.episodeTitleLeftPixels  =  data.portrait.episodeTitleLeftPixels
                     portraitDetails.episodeTitleHeight=  data.portrait.episodeTitleHeight
                     portraitDetails.episodeTitleWidth=  data.portrait.episodeTitleWidth
                     portraitDetails.episodeTitleOutlineStrokeWidth =  data.portrait.episodeTitleOutlineStrokeWidth
                     portraitDetails.episodeTitleOutlineStrokeColor =  data.portrait.episodeTitleOutlineStrokeColor
                     portraitDetails.episodeTitleDropShadowColor =  data.portrait.episodeTitleDropShadowColor
                     portraitDetails.episodeTitleDropShadowSpread =  data.portrait.episodeTitleDropShadowSpread
                     portraitDetails.episodeTitleBackgroundColor =  data.portrait.episodeTitleBackgroundColor
                     portraitDetails.episodeTitlePadding =  data.portrait.episodeTitlePadding
                     portraitDetails.episodeTitleTextAlign =  data.portrait.episodeTitleTextAlign
                     portraitDetails.episodeTitleFontOpacity =  data.portrait.episodeTitleFontOpacity
                     portraitDetails.transcriptTitleFont = data.portrait.transcriptTitleFont
                     portraitDetails.transcriptTitleFontColor = data.portrait.transcriptTitleFontColor
                     portraitDetails.transcriptTitleFontSize = data.portrait.transcriptTitleFontSize
                     portraitDetails.transcriptTitleTopPixels = data.portrait.transcriptTitleTopPixels
                     portraitDetails.transcriptTitleLeftPixels  =  data.portrait.transcriptTitleLeftPixels
                     portraitDetails.transcriptTitleHeight=  data.portrait.transcriptTitleHeight
                     portraitDetails.transcriptTitleWidth=  data.portrait.transcriptTitleWidth
                     portraitDetails.transcriptTitleOutlineStrokeWidth =  data.portrait.transcriptTitleOutlineStrokeWidth
                     portraitDetails.transcriptTitleOutlineStrokeColor =  data.portrait.transcriptTitleOutlineStrokeColor
                     portraitDetails.transcriptTitleDropShadowColor =  data.portrait.transcriptTitleDropShadowColor
                     portraitDetails.transcriptTitleDropShadowSpread =  data.portrait.transcriptTitleDropShadowSpread
                     portraitDetails.transcriptTitleBackgroundColor =  data.portrait.transcriptTitleBackgroundColor
                     portraitDetails.transcriptTitlePadding =  data.portrait.transcriptTitlePadding
                     portraitDetails.transcriptTitleTextAlign =  data.portrait.transcriptTitleTextAlign
                     portraitDetails.transcriptTitleFontOpacity =  data.portrait.transcriptTitleFontOpacity
                     portraitDetails.imageLeftPixels = data.portrait.imageLeftPixels
                     portraitDetails.imageTopPixels = data.portrait.imageTopPixels
                     if(data.portrait.imageHeight && data.portrait.imageHeight != 0){
                      portraitDetails.imageHeight = data.portrait.imageHeight
                     }else{
                      portraitDetails.imageHeight = inputProps.imageHeight
                     }
                     if(data.portrait.imageWidth && data.portrait.imageWidth != 0){
                      portraitDetails.imageWidth = data.portrait.imageWidth
                     }else{
                      portraitDetails.imageWidth = inputProps.imageWidth
                     }
                     portraitDetails.imageDropShadowSpread = data.portrait.imageDropShadowSpread
                     portraitDetails.imageOutlineStrokeColor = data.portrait.imageOutlineStrokeColor
                     portraitDetails.imageOutlineStrokeWidth = data.portrait.imageOutlineStrokeWidth
                     portraitDetails.imageDropShadowColor = data.portrait.imageDropShadowColor
                     portraitDetails.imageFillProperty = data.portrait.imageFillProperty ? data.portrait.imageFillProperty : 'fill'
                     portraitDetails.imageCornerRadius = data.portrait.imageCornerRadius
                     portraitDetails.videoOpacityPercent = data.portrait.videoOpacityPercent
                     portraitDetails.videoScalePercent = data.portrait.videoScalePercent
                     portraitDetails.videoAlignment = data.portrait.videoAlignment
                     portraitDetails.videoLeftPixels = data.portrait.videoLeftPixels
                     portraitDetails.videoTopPixels = data.portrait.videoTopPixels
                     if(data.portrait.videoHeight && data.portrait.videoHeight != 0){
                      portraitDetails.videoHeight = data.portrait.videoHeight
                     }else{
                      portraitDetails.videoHeight = inputProps.videoHeight
                     }
                     if(data.portrait.videoWidth && data.portrait.videoWidth != 0){
                      portraitDetails.videoWidth = data.portrait.videoWidth
                     }else{
                      portraitDetails.videoWidth = inputProps.videoWidth
                     }
                     portraitDetails.videoDropShadowSpread = data.portrait.videoDropShadowSpread
                     portraitDetails.videoOutlineStrokeColor = data.portrait.videoOutlineStrokeColor
                     portraitDetails.videoOutlineStrokeWidth = data.portrait.videoOutlineStrokeWidth
                     portraitDetails.videoDropShadowColor = data.portrait.videoDropShadowColor
                     portraitDetails.videoFillProperty = data.portrait.videoFillProperty ? data.portrait.videoFillProperty : 'fill'
                     portraitDetails.videoCornerRadius = data.portrait.videoCornerRadius
                 }
                  if(data.landscape){
                   if(data.landscape.showTitle == ''){
                      landscapeDetails.showTitle = ''
                      }else{
                       landscapeDetails.showTitle = data.landscape.showTitle
                      }
                     landscapeDetails.showTitleFont = data.landscape.showTitleFont
                     landscapeDetails.showTitleFontColor = data.landscape.showTitleFontColor
                     landscapeDetails.showTitleFontSize = data.landscape.showTitleFontSize
                     landscapeDetails.showTitleTopPixels = data.landscape.showTitleTopPixels
                     landscapeDetails.showTitleLeftPixels  =  data.landscape.showTitleLeftPixels
                     landscapeDetails.showTitleHeight=  data.landscape.showTitleHeight
                     landscapeDetails.showTitleWidth=  data.landscape.showTitleWidth
                     landscapeDetails.showTitleOutlineStrokeWidth =  data.landscape.showTitleOutlineStrokeWidth
                     landscapeDetails.showTitleOutlineStrokeColor =  data.landscape.showTitleOutlineStrokeColor
                     landscapeDetails.showTitleDropShadowColor =  data.landscape.showTitleDropShadowColor
                     landscapeDetails.showTitleDropShadowSpread =  data.landscape.showTitleDropShadowSpread
                     landscapeDetails.showTitleBackgroundColor =  data.landscape.showTitleBackgroundColor
                     landscapeDetails.showTitlePadding =  data.landscape.showTitlePadding
                     landscapeDetails.showTitleTextAlign =  data.landscape.showTitleTextAlign
                     landscapeDetails.showTitleFontOpacity =  data.landscape.showTitleFontOpacity
                     landscapeDetails.clipTitle = data.landscape.clipTitle
                     landscapeDetails.clipTitleFont = data.landscape.clipTitleFont
                     landscapeDetails.clipTitleFontSize = data.landscape.clipTitleFontSize
                     landscapeDetails.clipTitleTopPixels = data.landscape.clipTitleTopPixels
                     landscapeDetails.clipTitleLeftPixels  =  data.landscape.clipTitleLeftPixels
                     landscapeDetails.clipTitleHeight=  data.landscape.clipTitleHeight
                     landscapeDetails.clipTitleWidth=  data.landscape.clipTitleWidth
                     landscapeDetails.clipTitleOutlineStrokeWidth =  data.landscape.clipTitleOutlineStrokeWidth
                     landscapeDetails.clipTitleOutlineStrokeColor =  data.landscape.clipTitleOutlineStrokeColor
                     landscapeDetails.clipTitleDropShadowColor =  data.landscape.clipTitleDropShadowColor
                     landscapeDetails.clipTitleDropShadowSpread =  data.landscape.clipTitleDropShadowSpread
                     landscapeDetails.clipTitleBackgroundColor =  data.landscape.clipTitleBackgroundColor
                     landscapeDetails.clipTitlePadding =  data.landscape.clipTitlePadding
                     landscapeDetails.clipTitleFontColor = data.landscape.clipTitleFontColor
                     landscapeDetails.clipTitleTextAlign =  data.landscape.clipTitleTextAlign
                     landscapeDetails.clipTitleFontOpacity =  data.landscape.clipTitleFontOpacity
                     if(data.landscape.episodeTitle == ''){
                      landscapeDetails.episodeTitle = ''
                      }else{
                         landscapeDetails.episodeTitle = data.landscape.episodeTitle
                      }
                     landscapeDetails.episodeTitleFont = data.landscape.episodeTitleFont
                     landscapeDetails.episodeTitleFontSize = data.landscape.episodeTitleFontSize
                     landscapeDetails.episodeTitleTopPixels = data.landscape.episodeTitleTopPixels
                     landscapeDetails.episodeTitleLeftPixels  =  data.landscape.episodeTitleLeftPixels
                     landscapeDetails.episodeTitleHeight=  data.landscape.episodeTitleHeight
                     landscapeDetails.episodeTitleWidth=  data.landscape.episodeTitleWidth
                     landscapeDetails.episodeTitleOutlineStrokeWidth =  data.landscape.episodeTitleOutlineStrokeWidth
                     landscapeDetails.episodeTitleOutlineStrokeColor =  data.landscape.episodeTitleOutlineStrokeColor
                     landscapeDetails.episodeTitleDropShadowColor =  data.landscape.episodeTitleDropShadowColor
                     landscapeDetails.episodeTitleDropShadowSpread =  data.landscape.episodeTitleDropShadowSpread
                     landscapeDetails.episodeTitleBackgroundColor =  data.landscape.episodeTitleBackgroundColor
                     landscapeDetails.episodeTitlePadding =  data.landscape.episodeTitlePadding
                     landscapeDetails.episodeTitleTextAlign =  data.landscape.episodeTitleTextAlign
                     landscapeDetails.episodeTitleFontOpacity =  data.landscape.episodeTitleFontOpacity
                     landscapeDetails.transcriptTitleFont = data.landscape.transcriptTitleFont
                     landscapeDetails.episodeTitleFontColor = data.landscape.episodeTitleFontColor
                     landscapeDetails.transcriptTitleFontColor = data.landscape.transcriptTitleFontColor
                     landscapeDetails.transcriptTitleFontSize = data.landscape.transcriptTitleFontSize
                     landscapeDetails.transcriptTitleTopPixels = data.landscape.transcriptTitleTopPixels
                     landscapeDetails.transcriptTitleLeftPixels  =  data.landscape.transcriptTitleLeftPixels
                     landscapeDetails.transcriptTitleHeight=  data.landscape.transcriptTitleHeight
                     landscapeDetails.transcriptTitleWidth=  data.landscape.transcriptTitleWidth
                     landscapeDetails.transcriptTitleOutlineStrokeWidth =  data.landscape.transcriptTitleOutlineStrokeWidth
                     landscapeDetails.transcriptTitleOutlineStrokeColor =  data.landscape.transcriptTitleOutlineStrokeColor
                     landscapeDetails.transcriptTitleDropShadowColor =  data.landscape.transcriptTitleDropShadowColor
                     landscapeDetails.transcriptTitleDropShadowSpread =  data.landscape.transcriptTitleDropShadowSpread
                     landscapeDetails.transcriptTitleBackgroundColor =  data.landscape.transcriptTitleBackgroundColor
                     landscapeDetails.transcriptTitlePadding =  data.landscape.transcriptTitlePadding
                     landscapeDetails.transcriptTitleTextAlign =  data.landscape.transcriptTitleTextAlign
                     landscapeDetails.transcriptTitleFontOpacity =  data.landscape.transcriptTitleFontOpacity
                     landscapeDetails.imageLeftPixels = data.landscape.imageLeftPixels
                     landscapeDetails.imageTopPixels = data.landscape.imageTopPixels
                     if(data.landscape.imageHeight && data.landscape.imageHeight != 0){
                      landscapeDetails.imageHeight = data.landscape.imageHeight
                     }else{
                      landscapeDetails.imageHeight = inputProps.imageHeight
                     }
                     if(data.landscape.imageWidth && data.landscape.imageWidth != 0){
                      landscapeDetails.imageWidth = data.landscape.imageWidth
                     }else{
                      landscapeDetails.imageWidth = inputProps.imageWidth
                     }
                     landscapeDetails.imageDropShadowSpread = data.landscape.imageDropShadowSpread
                     landscapeDetails.imageOutlineStrokeColor = data.landscape.imageOutlineStrokeColor
                     landscapeDetails.imageOutlineStrokeWidth = data.landscape.imageOutlineStrokeWidth
                     landscapeDetails.imageDropShadowColor = data.landscape.imageDropShadowColor
                     landscapeDetails.imageCornerRadius = data.landscape.imageCornerRadius
                     landscapeDetails.videoOpacityPercent = data.landscape.videoOpacityPercent
                     landscapeDetails.videoScalePercent = data.landscape.videoScalePercent
                     landscapeDetails.videoAlignment = data.landscape.videoAlignment
                     landscapeDetails.imageFillProperty = data.landscape.imageFillProperty ? data.landscape.imageFillProperty : 'fill'
                     landscapeDetails.videoLeftPixels = data.landscape.videoLeftPixels
                     landscapeDetails.videoTopPixels = data.landscape.videoTopPixels
                     if(data.landscape.videoHeight && data.landscape.videoHeight != 0){
                      landscapeDetails.videoHeight = data.landscape.videoHeight
                     }else{
                      landscapeDetails.videoHeight = inputProps.videoHeight
                     }
                     if(data.landscape.videoWidth && data.landscape.videoWidth != 0){
                      landscapeDetails.videoWidth = data.landscape.videoWidth
                     }else{
                      landscapeDetails.videoWidth = inputProps.videoWidth
                     }
                     landscapeDetails.videoDropShadowSpread = data.landscape.videoDropShadowSpread
                     landscapeDetails.videoOutlineStrokeColor = data.landscape.videoOutlineStrokeColor
                     landscapeDetails.videoOutlineStrokeWidth = data.landscape.videoOutlineStrokeWidth
                     landscapeDetails.videoFillProperty = data.landscape.videoFillProperty ? data.landscape.videoFillProperty : 'fill'
                     landscapeDetails.videoDropShadowColor = data.landscape.videoDropShadowColor
                     landscapeDetails.videoCornerRadius = data.landscape.videoCornerRadius
                 }
 
                 updateInputProps()
                 updateVmodels('showTitle')
                 setTimeout(() => {reRender()}, 8000);
    }
   })
   .catch((error) => console.error(error));
   }
    watch(()=>isOpenOutLineStroke.value, (a,b)=>{
       isOpenOutLineStroke.value
    })  
    watch(()=>isOpenBackground.value, (a,b)=>{
       isOpenBackground.value
    })                
    watch(()=>isOpenDropShadow.value, (a,b)=>{
       isOpenDropShadow.value
    }) 
    watch(()=>isOPenOverlayColor.value,(a,b)=>{
       isOPenOverlayColor.value
    })
 
   const getTranscript = async()=>{
     isIframeLoading.value = true
    await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.jobId}/transcript`, {
             method: 'GET',
             headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
          },
          })
          .then((response) => response.json())
          .then((data) => {
             transcript.value = data
           })
   }
   const openColorPicker = (source)=>{
     if(source == 'dropshadow'){
       defaultColor.value = dropShadowValidColorCode.value
     }else if(source == 'font'){
       defaultColor.value = fontValidColorCode.value
     }else if(source == 'stroke'){
       defaultColor.value = strokeValidColorCode.value
     }else if(source == 'background'){
       defaultColor.value = backgroundValidColorCode.value
     } else if(source == 'overlay'){
       defaultColor.value = overlayValidColorCode.value
     }else if(source == 'designBackground'){
       defaultColor.value = designBackgroundvalidColorCode.value
     }
     openColorModal.value = true
     openMOdalSource.value = source
   }
  
   const getBackClr = (data)=>{
       if(data.source =='dropshadow'){
          if(selectedIndex.value === 0){
             if(whichTabClickedInIframe.value == 'showTitle'){
             latestDropShadow.value =  squareDetails.showTitleDropShadowColor = inputProps.showTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             latestDropShadow.value =  squareDetails.clipTitleDropShadowColor =  inputProps.clipTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             latestDropShadow.value = squareDetails.episodeTitleDropShadowColor =  inputProps.episodeTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             latestDropShadow.value = squareDetails.transcriptTitleDropShadowColor = inputProps.transcriptTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             latestDropShadow.value =  squareDetails.imageDropShadowColor = inputProps.imageDropShadowColor = data.color
          }
 
          }else if(selectedIndex.value === 1){
             if(whichTabClickedInIframe.value == 'showTitle'){
             latestDropShadow.value =   portraitDetails.showTitleDropShadowColor =  inputProps.showTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             latestDropShadow.value =  portraitDetails.clipTitleDropShadowColor =  inputProps.clipTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             latestDropShadow.value =   portraitDetails.episodeTitleDropShadowColor = inputProps.episodeTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             latestDropShadow.value =  squareDetails.transcriptTitleDropShadowColor = inputProps.transcriptTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             latestDropShadow.value =  portraitDetails.imageDropShadowColor = inputProps.imageDropShadowColor = data.color
          }
          }else if(selectedIndex.value ===2){
             if(whichTabClickedInIframe.value == 'showTitle'){
             latestDropShadow.value = landscapeDetails.showTitleDropShadowColor = inputProps.showTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             latestDropShadow.value =  landscapeDetails.clipTitleDropShadowColor = inputProps.clipTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             latestDropShadow.value = landscapeDetails.episodeTitleDropShadowColor =  inputProps.episodeTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             latestDropShadow.value =  landscapeDetails.transcriptTitleDropShadowColor =  inputProps.transcriptTitleDropShadowColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             latestDropShadow.value =  landscapeDetails.imageDropShadowColor = inputProps.imageDropShadowColor = data.color
          }
          }
       }else if(data.source=='font'){
          if(selectedIndex.value === 0){
             if(whichTabClickedInIframe.value == 'showTitle'){
             fontLatestClr.value = squareDetails.showTitleFontColor = inputProps.showTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             fontLatestClr.value = squareDetails.clipTitleFontColor =inputProps.clipTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             fontLatestClr.value =  squareDetails.episodeTitleFontColor = inputProps.episodeTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             fontLatestClr.value = squareDetails.transcriptTitleFontColor = inputProps.transcriptTitleFontColor = data.color
          }
          }else if(selectedIndex.value === 1){
             if(whichTabClickedInIframe.value == 'showTitle'){
             fontLatestClr.value =  portraitDetails.showTitleFontColor =  inputProps.showTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             fontLatestClr.value = portraitDetails.clipTitleFontColor =  inputProps.clipTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             fontLatestClr.value =portraitDetails.episodeTitleFontColor = inputProps.episodeTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             fontLatestClr.value =   portraitDetails.transcriptTitleFontColor =  inputProps.transcriptTitleFontColor = data.color
          }
          }else if(selectedIndex.value === 2){
             if(whichTabClickedInIframe.value == 'showTitle'){
             fontLatestClr.value = landscapeDetails.showTitleFontColor = inputProps.showTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             fontLatestClr.value =  landscapeDetails.clipTitleFontColor =  inputProps.clipTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             fontLatestClr.value =  landscapeDetails.episodeTitleFontColor = inputProps.episodeTitleFontColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             fontLatestClr.value = landscapeDetails.transcriptTitleFontColor = inputProps.transcriptTitleFontColor = data.color
          }
          }
        
       } else if(data.source=='stroke'){
          if(selectedIndex.value === 0){
             if(whichTabClickedInIframe.value == 'showTitle'){
             strokeLatestClr.value =  squareDetails.showTitleOutlineStrokeColor =  inputProps.showTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             strokeLatestClr.value = squareDetails.clipTitleOutlineStrokeColor = inputProps.clipTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             strokeLatestClr.value = squareDetails.episodeTitleOutlineStrokeColor =inputProps.episodeTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             strokeLatestClr.value =  squareDetails.transcriptTitleOutlineStrokeColor =  inputProps.transcriptTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             strokeLatestClr.value =  squareDetails.imageOutlineStrokeColor = inputProps.imageOutlineStrokeColor = data.color
          }
          }else if(selectedIndex.value === 1){
             if(whichTabClickedInIframe.value == 'showTitle'){
             strokeLatestClr.value =portraitDetails.showTitleOutlineStrokeColor = inputProps.showTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             strokeLatestClr.value = portraitDetails.clipTitleOutlineStrokeColor =  inputProps.clipTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             strokeLatestClr.value = portraitDetails.episodeTitleOutlineStrokeColor = inputProps.episodeTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             strokeLatestClr.value = portraitDetails.transcriptTitleOutlineStrokeColor =  inputProps.transcriptTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             strokeLatestClr.value =  portraitDetails.imageOutlineStrokeColor = inputProps.imageOutlineStrokeColor = data.color
          }
          }else if(selectedIndex.value === 2){
             if(whichTabClickedInIframe.value == 'showTitle'){
             strokeLatestClr.value =  landscapeDetails.showTitleOutlineStrokeColor =  inputProps.showTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             strokeLatestClr.value =  landscapeDetails.clipTitleOutlineStrokeColor =inputProps.clipTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             strokeLatestClr.value =  landscapeDetails.episodeTitleOutlineStrokeColor = inputProps.episodeTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             strokeLatestClr.value =  landscapeDetails.transcriptTitleOutlineStrokeColor = inputProps.transcriptTitleOutlineStrokeColor = data.color
          }else if(whichTabClickedInIframe.value == 'image-overlay'){
             strokeLatestClr.value = landscapeDetails.imageOutlineStrokeColor =  inputProps.imageOutlineStrokeColor = data.color
          }
          }
       }else if(data.source=='background'){
          if(selectedIndex.value === 0){
             if(whichTabClickedInIframe.value == 'showTitle'){
             backgroundLatestClr.value =  squareDetails.showTitleBackgroundColor =inputProps.showTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             backgroundLatestClr.value =  squareDetails.clipTitleBackgroundColor =  inputProps.clipTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             backgroundLatestClr.value =squareDetails.episodeTitleBackgroundColor =inputProps.episodeTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             backgroundLatestClr.value =  squareDetails.transcriptTitleBackgroundColor = inputProps.transcriptTitleBackgroundColor = data.color
          }
          }else if(selectedIndex.value === 1){
             if(whichTabClickedInIframe.value == 'showTitle'){
             backgroundLatestClr.value =   portraitDetails.showTitleBackgroundColor = inputProps.showTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             backgroundLatestClr.value =  portraitDetails.clipTitleBackgroundColor =  inputProps.clipTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             backgroundLatestClr.value =  portraitDetails.episodeTitleBackgroundColor =  inputProps.episodeTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             backgroundLatestClr.value =  portraitDetails.transcriptTitleBackgroundColor =  inputProps.transcriptTitleBackgroundColor = data.color
          }
          }else if(selectedIndex.value === 2){
             if(whichTabClickedInIframe.value == 'showTitle'){
             backgroundLatestClr.value = landscapeDetails.showTitleBackgroundColor = inputProps.showTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'clipTitle'){
             backgroundLatestClr.value = landscapeDetails.clipTitleBackgroundColor = inputProps.clipTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'episodeTitle'){
             backgroundLatestClr.value =   landscapeDetails.episodeTitleBackgroundColor =  inputProps.episodeTitleBackgroundColor = data.color
          }else if(whichTabClickedInIframe.value == 'transcriptTitle'){
             backgroundLatestClr.value = landscapeDetails.transcriptTitleBackgroundColor =  inputProps.transcriptTitleBackgroundColor = data.color
          }
          }
       }else if(data.source =='overlay'){
          overlayLatestClr.value =  inputProps.overlayColor = data.color
       } 
       else if(data.source =='designBackground'){
          designBackClrLatestClr.value = inputProps.backgroundColor = data.color
       }
       reRender()
       saveClipDetailsByClipId()
   }
   const isValidColorCode = ref(true)
   const validateAndUpdateFontColor = () => {
   // console.log('Input value:', fontLatestClr.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(fontLatestClr.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'font',
     //   color: fontLatestClr.value
     // })
     getBackClr({
       source: 'font',
       color: fontLatestClr.value
     })
   }
 }
 
 const validateAndUpdateStrokeColor = () => {
   // console.log('Input value:', fontLatestClr.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(strokeLatestClr.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'stroke',
     //   color: strokeLatestClr.value
     // })
     getBackClr({
       source: 'stroke',
       color: strokeLatestClr.value
     })
   }
 }
 const validateAndUpdateShadowColor = () => {
   // console.log('Input value:', latestDropShadow.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(latestDropShadow.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'dropshadow',
     //   color: latestDropShadow.value
     // })
     getBackClr({
       source: 'dropshadow',
       color: latestDropShadow.value
     })
   }
 }
 const validateAndUpdateTextBgColor = () => {
   // console.log('Input value:', backgroundLatestClr.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(backgroundLatestClr.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'background',
     //   color: backgroundLatestClr.value
     // })
     getBackClr({
       source: 'background',
       color: backgroundLatestClr.value
     })
   }
 }
 const validateAndUpdateBackgroundColor = () => {
   // console.log('Input value:', designBackClrLatestClr.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(designBackClrLatestClr.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'designBackground',
     //   color: designBackClrLatestClr.value
     // })
     getBackClr({
       source: 'designBackground',
       color: designBackClrLatestClr.value
     })
   }
 }
 const validateAndUpdateOverlayColor = () => {
   // console.log('Input value:', overlayLatestClr.value)
   
   // Basic color validation (hex color format)
   const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/
   isValidColorCode.value = hexColorRegex.test(overlayLatestClr.value)
   
   // console.log('Is valid color:', isValidColorCode.value)
   
   // If valid, call getBackClr with the appropriate parameters
   if (isValidColorCode.value) {
     // console.log('Calling getBackClr with:', {
     //   source: 'overlay',
     //   color: overlayLatestClr.value
     // })
     getBackClr({
       source: 'overlay',
       color: overlayLatestClr.value
     })
   }
 }
 
   const updateOpacity = ()=>{
     inputProps.opacityPercent = opacity.value
     reRender()
   } 
 
   const updateVideoOpacity = ()=>{
    if(selectedIndex.value === 0){
       squareDetails.videoOpacityPercent = inputProps.videoOpacityPercent = videoOpacity.value
     }else if(selectedIndex.value === 1){
       portraitDetails.videoOpacityPercent = inputProps.videoOpacityPercent = videoOpacity.value
     }else if(selectedIndex.value === 2){
       landscapeDetails.videoOpacityPercent = inputProps.videoOpacityPercent = videoOpacity.value
     }
     reRender()
   }
 
   const updateVideoScale = ()=>{
    if(selectedIndex.value === 0){
       squareDetails.videoScalePercent = inputProps.videoScalePercent = videoScale.value
     }else if(selectedIndex.value === 1){
       portraitDetails.videoScalePercent = inputProps.videoScalePercent = videoScale.value
     }else if(selectedIndex.value === 2){
       landscapeDetails.videoScalePercent = inputProps.videoScalePercent = videoScale.value
     }
     reRender()
   }
 
   const updateCornerRadius  = ()=>{
      if(whichTabClickedInIframe.value =='image-overlay'){
         if(selectedIndex.value === 0){
          inputProps.imageCornerRadius = squareDetails.imageCornerRadius = cornerRadius.value
        }else   if(selectedIndex.value === 1){
          inputProps.imageCornerRadius =  portraitDetails.imageCornerRadius = cornerRadius.value
        }else   if(selectedIndex.value === 2){
          inputProps.imageCornerRadius =  landscapeDetails.imageCornerRadius = cornerRadius.value
        }
      }else if(whichTabClickedInIframe.value =='video-overlay'){
       if(selectedIndex.value === 0){
          inputProps.videoCornerRadius = squareDetails.videoCornerRadius = cornerRadius.value
        }else   if(selectedIndex.value === 1){
          inputProps.videoCornerRadius =  portraitDetails.videoCornerRadius = cornerRadius.value
        }else   if(selectedIndex.value === 2){
          inputProps.videoCornerRadius =  landscapeDetails.videoCornerRadius = cornerRadius.value
        }
      }
     reRender()
   }
 
   watch(()=>transcriptContents.value , (a,b)=>{
    transcriptContents.value
   })
   watch(()=>isContinueApi.value , (a,b)=>{
    isContinueApi.value 
   })
   const checkProgress = () => {
     if(isContinueApi.value !='stop execution'){
       if(selectedIndex.value === 0){
          var layout = 'square'
       }else if(selectedIndex.value === 1){
          var layout = 'portrait'
       }else  if(selectedIndex.value === 2){
          var layout = 'landscape'
       } 
         fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${clipId.value}/progress/?layout=${layout}`, {
             method: 'GET',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
             }
         })
         .then(response => response.json())
         .then(val => {
             if (val) {
                if(val.message =='Fatal error encountered during rendering.'){
                   isContinueApi.value = 'stop execution'
                }else{
                   mainStore.clipProgress = Math.round(val.progress);
                   status.value = val.status
                   if (status.value === val.status && val.progress === 100 ) {
                      // Stop further checks if progress is 100 or status matches
                      mainStore.clipVideoUrl = val.url
                      emitter.emit('videoUrl', val.url);
                      isContinueApi.value = 'stop execution'
                      clearInterval(intervalId.value);
                   } else {
                      // Retry after 5 seconds if progress is not 100 and statuses are not equal
                      setTimeout(() => checkProgress(), 5000);
                   }
                   return val;
                }
                
             } 
             mainStore.clipProgress = 0;
             downloadModal.value = false;
         })
         .catch(error => {
             console.error('Error checking progress:', error);
         });
     }
 };
 
   const downloadVideoByLayout  = async ()=>{
    try {
       if(selectedIndex.value === 0){
          var layout = 'square'
       }else if(selectedIndex.value === 1){
          var layout = 'portrait'
       }else  if(selectedIndex.value === 2){
          var layout = 'landscape'
       }    
 
             isContinueApi.value=''
             status.value = true
             downloadModal.value = true;
             const response = await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${clipId.value}/process/?layout=${layout}`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                 }
             });
 
             const data = await response.json();
             if (data.success) {
                     intervalId.value = setInterval(() => {
                     if (!status.value){
                           clearInterval(intervalId.value);
                     } else{
                            checkProgress();
                         }
                 }, 5000);
             }
         } catch (error) {
             console.error('Error processing clip:', error);
         }
   }
   onMounted(async () => {
     if (localStorage.getItem('showClipPrompt') === 'true') {
       mainStore.handleEditClipState(true);
     } else {
       mainStore.handleEditClipState(false);
     }
     if (mainStore.user.current_subscription_renews_on !== null) {
       inputProps.isWatermark = false;
     }
     emitter.on('stopApi', handleExecutionApi);
     clipId.value = route.params.id;
     await getTranscript();
     await getClipDetailsByClipId();
     if (!videoFileUrl.value) {
       addVideoUrl();
     }
     const adjustedStart = start.value - 60;
     const adjustedEnd = end.value + 60;
     transcriptContents.value = getElementsWithinRange(
       transcript.value.monologues,
       adjustedStart,
       adjustedEnd - 1
     );
     if (props.hideIntercom) {
       Intercom('update', {
         hide_default_launcher: true,
       });
     } else {
       Intercom('update', {
         alignment: 'left',
       });
     }
     computeScale(); // initial scale based on container

     resizeObserver = new ResizeObserver(() => {
       computeScale();
       reRender(); // ← only now is everything initialized
     });

     if (videoContainer.value) {
       resizeObserver.observe(videoContainer.value);
     }

     window.addEventListener('resize', () => {
       computeScale();
       reRender(); // ← safe here too
     });
   });

   const handleExecutionApi = (data) => {
     isContinueApi.value = data;
     status.value = false
   };
   
   onUnmounted(() => {
     emitter.off('stopApi', handleExecutionApi);
   });
 
 const closeEditPromptModal = () => {
    mainStore.handleEditClipState(false)
 }
 
 const t = computed(() => {
   return key => {
     const translation = languageStore.state.translations[key];
     return translation || key;  // Fallback to key if translation not found
   };
 });
 
 async function fetchDataAndUpdate() {
   await nextTick();
   getStartAndEndElements();
 }
 
 const adjustedStart = ref('')
 const adjustedEnd = ref('')
 
 function getStartAndEndElements() {
   let startElement = null;
   let endElement = null;
 
   // Find the first element whose start value is greater than 'start'
   for (let monologue of transcriptContents.value) {
     for (let chunk of monologue.elements) {
       if (chunk.start >= start.value) {
         startElement = chunk;
         break; // Exit the loop after finding the first match
       }
     }
     if (startElement) break; // Exit the outer loop if startElement is found
   }
 
   // Find the last element whose start value is less than 'end'
   for (let monologue of [...transcriptContents.value].reverse()) {
     for (let chunk of [...monologue.elements].reverse()) {
       if (chunk.start < end.value) {
         endElement = chunk;
         break; // Exit the loop after finding the first match
       }
     }
     if (endElement) break; // Exit the outer loop if endElement is found
   }
 
   // Check if startElement and endElement are not null before accessing properties
   if (startElement && endElement) {
 
     // Use the data-start attribute to select the corresponding DOM elements
     const startDomElement = document.querySelector(`[data-start="${startElement.start}"]`);
     const endDomElement = document.querySelector(`[data-start="${endElement.start}"]`);
 
     const transcriptContainer = document.querySelector('.transcript-sidebar');
     const containerRect = transcriptContainer.getBoundingClientRect();
 
     startRect.value = startDomElement ? startDomElement.getBoundingClientRect() : null;
     endRect.value = endDomElement ? endDomElement.getBoundingClientRect() : null;
 
     adjustedStart.value = {
       left: startRect.value.left - containerRect.left,
       top: startRect.value.top - containerRect.top,
       right: startRect.value.right - containerRect.left,
       height: startRect.value.height
     };
     adjustedEnd.value = {
       left: endRect.value.left - containerRect.left,
       top: endRect.value.top - containerRect.top,
       right: endRect.value.right - containerRect.left,
       height: endRect.value.height
     };
   } else {
     console.warn('Start or End element not found:', { startElement, endElement });
   }
 }
 
 const currentDragHandleType = ref(null);
 
 function onDragStart(event, handleType) {
   // Store the type of handle and its current value
   const handleValue = handleType === 'start' ? start.value : end.value;
   event.dataTransfer.setData('text/plain', JSON.stringify({ 
     type: handleType, 
     value: handleValue 
   }));
 }
 
 function onDragLeave(event) {
   // Remove preview classes from all spans
   const spans = document.querySelectorAll('.transcript-monologue span', '.speaker-div');
   spans.forEach(span => {
     span.classList.remove('preview-start');
     span.classList.remove('preview-end');
     span.classList.remove('pointer-events-none');
   });
   provisionalStart.value = null;
   provisionalEnd.value = null;
 }
 
 function throttle(fn, delay) {
   let lastCall = 0;
   return function (...args) {
     const now = Date.now();
     if (now - lastCall >= delay) {
       lastCall = now;
       fn.apply(this, args);
     }
   };
 }
 
 function smoothScroll(container, targetScrollTop, duration = 300) {
   const startScrollTop = container.scrollTop;
   const change = targetScrollTop - startScrollTop;
   const startTime = performance.now();
 
   function animateScroll(currentTime) {
     const elapsed = currentTime - startTime;
     const progress = Math.min(elapsed / duration, 1);
     
     // Easing function (ease out quad)
     const easeProgress = progress * (2 - progress);
     
     container.scrollTop = startScrollTop + change * easeProgress;
 
     if (elapsed < duration) {
       requestAnimationFrame(animateScroll);
     }
   }
 
   requestAnimationFrame(animateScroll);
 }
 
 // Modify your throttledScroll function to use this
 const throttledScroll = throttle((event, handleType) => {
   let dropPosition = event.clientY;
 
   const container = document.querySelector('.overscroll-contain');
   const spans = document.querySelectorAll('.transcript-monologue span', '.speaker-div');
   const containerRect = container.getBoundingClientRect();
   const scrollSpeed = 100;
 
   if (dropPosition < containerRect.top + 100) {
     const distanceFromTop = containerRect.top + 100 - dropPosition;
     const acceleratedScroll = Math.min(Math.ceil(distanceFromTop), scrollSpeed);
     
     spans.forEach(span => {
       span.classList.add('pointer-events-none');
     });
 
     // Use smooth scroll instead of direct scrollTop modification
     smoothScroll(container, container.scrollTop - acceleratedScroll, 200); // 200ms duration
     // console.log('Scrolling up', acceleratedScroll);
   } else if (dropPosition > containerRect.bottom - 100) {
     const distanceFromBottom = dropPosition - (containerRect.bottom - 100);
     const acceleratedScroll = Math.min(Math.ceil(distanceFromBottom), scrollSpeed);
     
     spans.forEach(span => {
       span.classList.add('pointer-events-none');
     });
 
     // Use smooth scroll instead of direct scrollTop modification
     smoothScroll(container, container.scrollTop + acceleratedScroll, 200); // 200ms duration
     // console.log('Scrolling down', acceleratedScroll);
   } else {
     spans.forEach(span => {
       span.classList.remove('pointer-events-none');
     });
   }
 }, 100);
 
 function onDragOver(event, handleType) {
 
   event.preventDefault();
   event.stopPropagation();
 
   throttledScroll(event, handleType);
   dropPreview(event, handleType);
 }
 
 const provisionalStart = ref(null);
 const provisionalEnd = ref(null);
 
 function dropPreview (event, handleType) {
 
   let dropPosition = null;
   if (handleType === 'start') {
     dropPosition = { x: event.clientX + 10, y: event.clientY + 10 };
   } else if (handleType === 'end') {
     dropPosition = { x: event.clientX - 10, y: event.clientY - 10 };
   }
 
    // Find the closest span element
   const spans = document.querySelectorAll('.transcript-monologue span');
   const validSpans = Array.from(spans).filter(span => {
     const text = span.textContent.trim();
     // Exclude spans that are empty or contain only punctuation
     return text.length > 0 && !/^[.,;:!?]+$/.test(text);
   });
   let closestSpan = null;
   let closestDistance = Infinity;
 
   validSpans.forEach(span => {
     const spanRect = span.getBoundingClientRect();
     const spanCenter = {
       x: spanRect.left + spanRect.width / 2,
       y: spanRect.top + spanRect.height / 2
     };
 
     const distance = Math.sqrt(
       Math.pow(dropPosition.x - spanCenter.x, 2) +
       Math.pow(dropPosition.y - spanCenter.y, 2)
     );
 
     if (distance < closestDistance) {
       closestDistance = distance;
       closestSpan = span;
     }
   });
 
   // Preview potential new position
   if (closestSpan) {
     let previewValue = null;
     if (handleType === 'start') {
       previewValue = Number(closestSpan.getAttribute('data-start'));
       if (previewValue + 10 < end.value) {
         // Optionally highlight or show preview
         closestSpan.classList.add('preview-start');
         provisionalStart.value = previewValue;
       }
     } else if (handleType === 'end') {
       previewValue = Number(closestSpan.getAttribute('data-end'));
       if (previewValue - 10 > start.value) {
         // Optionally highlight or show preview
         closestSpan.classList.add('preview-end');
         provisionalEnd.value = previewValue;
       }
     }
   }
 }
 
 async function onDrop(event) {
   event.preventDefault();
   // Parse the dragged handle information
   const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
   const { type: handleType, value: originalValue } = dragData;
 
   provisionalStart.value = null;
   provisionalEnd.value = null;
   
   // Get the position where the handle is dropped
   let dropPosition = null;
   if (handleType === 'start') {
     dropPosition = { x: event.clientX + 10, y: event.clientY + 10 };
   } else if (handleType === 'end') {
     dropPosition = { x: event.clientX - 10, y: event.clientY - 10 };
   }
 
   // Find the closest span element
   const speakerDiv = document.querySelectorAll('.speaker-div');
   speakerDiv.forEach(div => {
     div.classList.remove('pointer-events-none');
   });
   const spans = document.querySelectorAll('.transcript-monologue span');
   const validSpans = Array.from(spans).filter(span => {
     const text = span.textContent.trim();
     // Exclude spans that are empty or contain only punctuation
     return text.length > 0 && !/^[.,;:!?]+$/.test(text);
   });
   let closestSpan = null;
   let closestDistance = Infinity;
   validSpans.forEach(span => {
     const spanRect = span.getBoundingClientRect();
     const spanCenter = {
       x: spanRect.left + spanRect.width / 2,
       y: spanRect.top + spanRect.height / 2
     };
 
     const distance = Math.sqrt(
       Math.pow(dropPosition.x - spanCenter.x, 2) +
       Math.pow(dropPosition.y - spanCenter.y, 2)
     );
 
     if (distance < closestDistance) {
       closestDistance = distance;
       closestSpan = span;
     }
 
 
     span.classList.remove('preview-start');
     span.classList.remove('preview-end');
     span.classList.remove('pointer-events-none');
   });
 
   // If a closest span is found, get its data-start value
   if (closestSpan) {
    let dataStartValue = null;
    let dataEndValue = null;
     // Get the data-start value of the closest span
     if (handleType === 'start') {
     dataStartValue = Number(closestSpan.getAttribute('data-start'));
     // console.log('Dropped next to span with data-start:', dataStartValue);
     }
     if (handleType === 'end') {
     dataEndValue = Number(closestSpan.getAttribute('data-end'));
     // console.log('Dropped next to span with data-end:', dataEndValue);
     }
     // console.log('handleType:', handleType);
     // Update either start or end based on the dragged handle type
     if (handleType === 'start') {
       if (dataStartValue + 10 < end.value) {
         start.value = Number(dataStartValue);
       } else {
          return;
       }
     } else if (handleType === 'end') {
       if (dataEndValue - 10 > start.value) {
         end.value = Number(dataEndValue);
       } else {
          return;
       }
     }
 
     const adjustedStart = Number(start.value) - 60;
     const adjustedEnd = Number(end.value) + 60;
    await resetTranscript(adjustedStart, adjustedEnd);
    fetchDataAndUpdate();
   }
 }
 
 function resetTranscript(newStart, newEnd) {
    inputProps.start = Number(start.value);
    inputProps.end = Number(end.value);
    numberofFrames.value = Math.round((end.value - start.value) * fps)
    transcriptContents.value = getElementsWithinRange(transcript.value.monologues, newStart, newEnd);
    reRender();
    saveClipDetailsByClipId()
 }
 
 watch([start, end], (newValues) => {
   // console.log('Start/End changed:', newValues);
 })

 const scrollToActiveElement = async () => {
  if (!TranscriptSection.value) return;
  // console.log('scrolling');
  
  await nextTick();
  
  try {
    const elements = document.querySelectorAll('[data-start]');
    if (!elements.length) return;

    const sortedElements = Array.from(elements)
      .map(el => ({
        el,
        start: parseFloat(el.getAttribute('data-start'))
      }))
      .sort((a, b) => a.start - b.start);

    const currentStart = start.value;
    const targetElement = sortedElements.find(item => item.start >= currentStart)?.el;
    if (targetElement) {

      targetElement.scrollIntoView({
        behavior: 'auto',
        block: 'center'
      });

//      const elementRect = targetElement.getBoundingClientRect();
//      const containerRect = container.getBoundingClientRect();
//      const scrollTop = container.scrollTop;
//      const elementTop = elementRect.top + scrollTop - containerRect.top;
//      const middleOffset = (containerRect.height - elementRect.height) / 2;

//      container.scrollTo({
//        top: elementTop - middleOffset,
//        behavior: 'auto' // or 'smooth' for animated scrolling
//      });
    }
  } catch (error) {
    console.error('Error scrolling to element:', error);
  }
};

// Watch for TranscriptSection changes
watch(() => TranscriptSection.value, (isVisible) => {
  if (isVisible) {
    scrollToActiveElement();
  }
}, { immediate: false });

watch(() => start.value, () => {
  scrollToActiveElement();
});


 
 </script>
 <style scoped>
   .not-allowed-cursor {
   cursor: not-allowed;
   }
   .user-dropdown {
   @apply flex relative z-20;
   &__simple {
   @apply items-center;
   }
   &__full {
   @apply items-start;
   }
   &__image-wrapper {
   @apply relative;
   img, svg {
   @apply rounded-full max-w-none w-9 h-9;
   &.full {
   }
   }
   }
   &__user {
   @apply mr-auto ml-3 mr-3 overflow-hidden;
   &-name {
   @apply font-medium leading-5 text-sm text-left text-gray-700 mb-2 whitespace-nowrap overflow-hidden truncate;
   }
   &-credits-badge {
   @apply text-center p-1 rounded-2xl w-auto px-2 w-fit text-xs font-medium leading-4;
   &.success {
   @apply text-teal-500 bg-teal-100;
   }
   &.warning {
   @apply text-yellow-500 bg-yellow-100;
   }
   &.danger {
   @apply text-red-500 bg-red-100;
   }
   }
   }
   &__dropdown {
   @apply absolute top-12 bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 py-2 z-20;
   &.simple {
   @apply right-0;
   }    on    
   &.full {
   @apply z-30;
   right: -180px;
   }
   &-item {
   @apply relative cursor-auto flex items-center px-4 py-3 font-inter text-sm text-gray-900;
   &:not(.no-hover) {
   @apply hover:bg-gray-100 cursor-pointer;
   }
   &-icon {
   @apply mr-3;
   }
   &-text {
   @apply text-sm;
   }
   }
   &.dropdown-open {
   @apply opacity-100 visible h-auto;
   }
   &.dropdown-shut {
   @apply opacity-0 invisible h-0;
   }
   }
   }
   .dropBtn {
   top: 50%;
   transform: translateY(-50%);
   }
   .btn {
   @apply
   mt-3
   inline-flex
   justify-center
   rounded-lg
   px-3 py-2.5
   text-sm
   font-medium
   shadow-sm
   ring-1
   ring-inset
   sm:col-start-1
   sm:mt-0;
   &-submit {
   @apply
   bg-indigo-700
   text-white
   hover:bg-indigo-600
   ring-indigo-700
   hover:bg-indigo-600
   hover:ring-indigo-600
   focus-visible:outline
   focus-visible:outline-2
   focus-visible:outline-offset-2
   focus-visible:outline-indigo-700 sm:col-start-2;
   }
   }
   .w-400px {
   width: 400px; 
   }
   .h-400px {
   height: 400px; 
   }
   .project-combobox {
   @apply
   inline-flex w-full justify-between items-center
   gap-x-1.5 rounded-md bg-white
   px-3 py-2
   text-base leading-6 font-normal text-gray-900
   shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
   }
   .btn {
   @apply mt-3 inline-flex justify-center rounded-md px-3 py-2.5 text-sm leading-5 font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;
   &-submit {
   @apply bg-indigo-700 text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
   }
   &-cancel {
   @apply bg-white text-gray-900 ring-gray-300 hover:bg-gray-50;
   }
   }
   .slider {
   -webkit-appearance: none;
   width: 100%;
   height: 4px;
   border-radius: 5px;
   background: #e5e7eb;
   outline: none;
   opacity: 1;
   -webkit-transition: .2s;
   transition: opacity .2s;
   
   }
   .slider:hover {
   opacity: 1;
   }
 
   .iframeloader{
   width: 20px; 
   height: 20px;
   padding: 3px;       
   background: #4f46e5;
   aspect-ratio: 1;
   border-radius: 50%;
   --_m:
       conic-gradient(#0000,#4f46e5),
       linear-gradient(#4f46e5 0 0) content-box;
   -webkit-mask: var(--_m);
   mask: var(--_m);
   -webkit-mask-composite: source-out;
   mask-composite: subtract;
   box-sizing: border-box;
   animation: load 1s linear infinite;
   
 }
 .fade-in {
   animation: fadeIn ease 2s;
   -webkit-animation: fadeIn ease 2s;
   -moz-animation: fadeIn ease 2s;
   -o-animation: fadeIn ease 2s;
   -ms-animation: fadeIn ease 2s;
 }
 
 
 @keyframes fadeIn{
   0% {
     opacity:0;
   }
   100% {
     opacity:1;
   }
 }
 
 @-moz-keyframes fadeIn {
   0% {
     opacity:0;
   }
   100% {
     opacity:1;
   }
 }
 
 @-webkit-keyframes fadeIn {
   0% {
     opacity:0;
   }
   100% {
     opacity:1;
   }
 }
 
 @-o-keyframes fadeIn {
   0% {
     opacity:0;
   }
   100% {
     opacity:1;
   }
 }
 
 @-ms-keyframes fadeIn {
   0% {
     opacity:0;
   }
   100% {
     opacity:1;
   }
 }
 
 .slide-right-enter-active, .slide-right-leave-active {
   transition: transform 0.5s ease;
 }
 
 /* Start state: transform moves the div off-screen to the right */
 .slide-right-enter-from, .slide-right-leave-to {
   transform: translateX(100%);
 }
 
 /* End state: the div is in its final position (fully visible) */
 .slide-right-enter-to, .slide-right-leave-from {
   transform: translateX(0);
 }
 
 .fade-enter-active, .fade-leave-active {
   transition: opacity 0.75s ease-in-out;
 }
 
 .fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
   opacity: 0;
 }
 
 
 .fade-container {
   display: flex;
   align-items: center;
   justify-content: center;
   position: absolute;
   left: 0;
   top: 0;
   bottom: 0;
   right: 0;
   background-color: #f9fafb;
   z-index: 19;
   opacity: 1; /* Default opacity when visible */
   transition: opacity 0.5s ease-out; /* Duration of the fade-out effect */
 }
 
 .fade-container.hidden {
   opacity: 0; /* Fade-out opacity */
 }
 
 .drawer.hidden.flex {
     display: flex !important;
 }
 .drawer .drawer-body {
     scrollbar-width: none;
     max-height: calc(100vh - 69px - 59px);
     overscroll-behavior: auto;
 }
 .cursor-pointor {
     cursor: pointer;
 }
 
 .start-handle, .end-handle {
   width: auto; /* Width of the indicator */
   height: auto; /* Height of the indicator */
   z-index: 4;
 }
 
 .handle-indicator {
   display: flex;
   align-items: center;
   justify-content: center;
   color: white; /* Text color */
   font-size: 12px; /* Font size */
   z-index: 4;
 }
 
 .preview-start {
   background-color: rgba(0, 120, 255, 0.2);
   transition: background-color 0.2s ease;
 }
 
 .preview-end {
   background-color: rgba(0, 120, 255, 0.2);
   transition: background-color 0.2s ease;
 }
 
 </style>