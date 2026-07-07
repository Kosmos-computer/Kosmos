<template>
    <div>
    <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Name</label>
    <div class="mt-2">
      <input type="email" name="email" id="email" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Name this file source" />
    </div>
    </div>
    <div class="mt-8">
    <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Google Folder</label>
    <div class="mt-2 flex rounded-md shadow-sm">
      <div class="relative flex flex-grow items-stretch focus-within:z-10">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <UsersIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input type="name" name="folder_name" id="folder_name" class="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="" />
      </div>
      <button type="button" class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 bg-gray-50 hover:bg-gray-100">
        Select Folder
      </button>
    </div>
    </div>
    <div class="mt-8">
        <button type="button" class="rounded-md bg-red-100 px-3 py-2 text-sm font-normal text-red-600 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Disconnect</button>
  
    </div>
</template>