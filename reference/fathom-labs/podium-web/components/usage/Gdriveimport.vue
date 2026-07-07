<template>
    <!--<div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold leading-6 text-gray-900">Users</h1>
          <p class="mt-2 text-sm text-gray-700">A list of all the users in your account including their name, title, email and role.</p>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button type="button" class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Add user</button>
        </div>
      </div>-->
      <div class="mt-8 flow-root w-full">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-gray-600 sm:pl-6">Filename</th>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-gray-600 sm:pl-6">Duration</th>
                    <th scope="col" class="relative py-3.5 pl-4 pr-3 text-left text-sm font-medium text-gray-600 sm:pl-6">Select</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="loc in sources" :key="loc.name">
                    <td class="whitespace-nowrap w-full py-4 pl-6 pr-4 text-sm font-normal text-gray-500 sm:pl-6">{{ loc.name }}</td>
                    <td class="whitespace-nowrap py-4 pl-6 pr-4 text-sm font-normal text-gray-500 sm:pl-6">{{ loc.duration }}</td>
                    <td class="relative whitespace-nowrap py-4 pl-6 pr-4 text-right text-sm font-medium sm:pr-6">
                        <input type="checkbox" v-model="loc.checked" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="sm:flex sm:items-center py-5 w-full">
        <div class="sm:flex-auto">
          <p class="mt-2 text-sm text-gray-700">Showing 1 - 5 of 13 files</p>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button type="button" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Next</button>
        </div>
      </div>
    <!--</div>-->
</template>
  
<script setup>
  const sources = [
    { name: 'Episode 1', duration: '01:43:32', checked: true },
    { name: 'Episode 2', duration: '00:24:19', checked: true },
    { name: 'Episode 3', duration: '00:58:55', checked: true },
    { name: 'Episode 1', duration: '01:43:32', checked: true },
    { name: 'Episode 2', duration: '00:24:19', checked: true },
  ]
</script>