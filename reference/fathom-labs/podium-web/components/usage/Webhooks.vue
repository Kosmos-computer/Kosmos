<template>
    <div>
    <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Name</label>
    <div class="mt-2">
      <input type="email" name="email" id="email" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="" />
    </div>
    </div>
    <div class="mt-8">
    <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Endpoint URL</label>
    <div class="mt-2 flex w-full rounded-md shadow-sm">
        <div class="flex w-full rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 ">
            <span class="flex select-none items-center pl-3 text-gray-500 sm:text-sm">http://</span>
            <input type="text" name="website" id="website" class="block flex w-full border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-300 focus:ring-0 sm:text-sm sm:leading-6" placeholder="www.example.com" />
        </div>
    </div>
    </div>
    <!--<div class="mt-8">
        <button type="button" class="rounded-md bg-red-100 px-3 py-2 text-sm font-normal text-red-600 shadow-sm hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Disconnect</button>
  
    </div>-->
</template>