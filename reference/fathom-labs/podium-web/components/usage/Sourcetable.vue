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
      <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-gray-600 sm:pl-6 w-full">Import Sources</th>
                    <th scope="col" class="relative text-right py-3.5 pl-3 pr-4 sm:pr-6 w-auto">
                      <span class="sr-only">Connect</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="loc in sources" :key="loc.name">
                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 w-full">{{ loc.name }}</td>
                    <td class="relative whitespace-nowrap text-right py-4 pl-3 pr-4 sm:pr-6">
                      <div class="flex justify-end items-center space-x-2 w-full"> <!-- Added flex and spacing utilities -->
                        <div class="user-credits-badge"
                          :class="{
                            'connected': loc.status === 'Connected',
                            'notconnected': loc.status === 'Connect'
                          }">
                          <!--{{ loc.status }}-->
                          <a href="#" class="hover:text-indigo-900"> {{ loc.status }} </a>
                        </div>
                        <div>
                          <a href="#" class="text-sm text-indigo-600 font-normal hover:text-indigo-900"> {{ loc.action }} </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    <!--</div>-->
</template>
  
<script setup>
  const sources = [
    { name: 'Dropbox', status: 'Connect', action: ''},
    { name: 'Google Drive', status: 'Connect', action: '' },
    { name: 'iCloud', status: 'Connected', action: 'Edit' },
    { name: 'OneDrive', status: 'Connected', action: 'Edit' },
    { name: 'Buzzsprout', status: 'Connect', action: '' },
    // More people...
  ]
</script>

<style lang='scss' scoped>
.user-credits-badge {
            @apply text-right p-1 rounded-2xl w-auto px-2 w-fit text-sm font-normal leading-4 ;
            &.connected {
                @apply text-teal-500 bg-teal-100 ;
            }
            &.notconnected {
                @apply text-indigo-600 ;
            }
}
</style>