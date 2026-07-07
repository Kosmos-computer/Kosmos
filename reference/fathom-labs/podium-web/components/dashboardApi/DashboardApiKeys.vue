<template>
  <div v-if="(mainStore.stringToBoolean(mainStore.user?.settings.api_access) && mainStore.user?.current_subscription_renews_on != null) || mainStore.user.email ==='mw@vast.faith' || mainStore.user.email ==='kevin@higherpixels.com'  ">
 <div v-if="loadApiKeyList" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
<SvgLoadingMd />

  </div>
  <div v-if="!loadApiKeyList">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold leading-6 text-gray-900">API Keys</h1>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-medium text-gray-500">NAME</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-medium text-gray-500 " style="min-width:550px">KEY</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-medium text-gray-500">CREATED</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-medium text-gray-500">UPDATED</th>
                  <th scope="col" class="px-3 py-3.5 text-center text-sm font-medium text-gray-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="lists,index in apiLists" :key="lists.id" class="max-w-xs break-words">
                  <td class=" px-3 py-4 text-sm font-medium text-gray-900 break-all " style="max-width: 200px;"   >{{ lists.name ? lists.name :'API Key' }}</td>
                  <td class="Whitespace-nowrap px-3 py-4 text-sm text-gray-600" >
                      <div class="flex items-center space-x-2">
                          <span class="inline-flex" style="min-width: calc(100% - 120px);">
                              <span :id="'show'+index"  class="hidden" >{{ lists.api_key }}</span>
                              <span ref="textToCopy" :id="'hide'+index">{{ maskString(lists.api_key) }}</span>
                          </span>
                          <span class="icnContainer inline-flex" >
                            <span @click="showAllAPIKey(index)" class="inline-flex px-2">
                              <svg  :id="'showIcon'+index"   class="hidden min-w-[20px] cursor-pointer" fill="#6a727f" width="20" height="20" enable-background="new 0 0 128 128"  viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                              <path id="Hide" d="m79.891 65.078 7.27-7.27c.529 1.979.839 4.048.839 6.192 0 13.234-10.766 24-24 24-2.144 0-4.213-.31-6.192-.839l7.27-7.27c7.949-.542 14.271-6.864 14.813-14.813zm47.605-3.021c-.492-.885-7.47-13.112-21.11-23.474l-5.821 5.821c9.946 7.313 16.248 15.842 18.729 19.602-4.741 7.219-23.339 31.994-55.294 31.994-4.792 0-9.248-.613-13.441-1.591l-6.573 6.573c6.043 1.853 12.685 3.018 20.014 3.018 41.873 0 62.633-36.504 63.496-38.057.672-1.209.672-2.677 0-3.886zm-16.668-39.229-88 88c-.781.781-1.805 1.172-2.828 1.172s-2.047-.391-2.828-1.172c-1.563-1.563-1.563-4.094 0-5.656l11.196-11.196c-18.1-10.927-27.297-27.012-27.864-28.033-.672-1.209-.672-2.678 0-3.887.863-1.552 21.623-38.056 63.496-38.056 10.827 0 20.205 2.47 28.222 6.122l12.95-12.95c1.563-1.563 4.094-1.563 5.656 0s1.563 4.094 0 5.656zm-76.495 65.183 10.127-10.127c-2.797-3.924-4.46-8.709-4.46-13.884 0-13.234 10.766-24 24-24 5.175 0 9.96 1.663 13.884 4.459l8.189-8.189c-6.47-2.591-13.822-4.27-22.073-4.27-31.955 0-50.553 24.775-55.293 31.994 3.01 4.562 11.662 16.11 25.626 24.017zm15.934-15.935 21.809-21.809c-2.379-1.405-5.118-2.267-8.076-2.267-8.822 0-16 7.178-16 16 0 2.958.862 5.697 2.267 8.076z"/>
                            </svg>
                            <svg  :id="'hideIcon'+index" version="1.1" class="min-w-[20px] cursor-pointer" fill="#6a727f" width="20" height="20" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 511.999 511.999" style="enable-background:new 0 0 511.999 511.999;" xml:space="preserve">
                            <g>
                              <g>
                                <path d="M508.745,246.041c-4.574-6.257-113.557-153.206-252.748-153.206S7.818,239.784,3.249,246.035
                                  c-4.332,5.936-4.332,13.987,0,19.923c4.569,6.257,113.557,153.206,252.748,153.206s248.174-146.95,252.748-153.201
                                  C513.083,260.028,513.083,251.971,508.745,246.041z M255.997,385.406c-102.529,0-191.33-97.533-217.617-129.418
                                  c26.253-31.913,114.868-129.395,217.617-129.395c102.524,0,191.319,97.516,217.617,129.418
                                  C447.361,287.923,358.746,385.406,255.997,385.406z"/>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="M255.997,154.725c-55.842,0-101.275,45.433-101.275,101.275s45.433,101.275,101.275,101.275
                                  s101.275-45.433,101.275-101.275S311.839,154.725,255.997,154.725z M255.997,323.516c-37.23,0-67.516-30.287-67.516-67.516
                                  s30.287-67.516,67.516-67.516s67.516,30.287,67.516,67.516S293.227,323.516,255.997,323.516z"/>
                              </g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g>
                            </svg>
                            </span>
                            <svg @click="copyToClipboard(lists.api_key,lists.id)" class="min-w-[20px] cursor-pointer" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z"
                                  fill="#6B7280" />
                                <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z"
                                  fill="#6B7280" />
                            </svg>
                          </span>
                         
                          <span v-if="lists.id ===copiedKey">Copied!</span>
                      </div>
                  </td>
                  <td class="Whitespace-nowrap px-3 py-4 text-sm text-gray-600">{{  moment(lists.created_at).format('MM-DD-YYYY') }}</td>
                  <td class="Whitespace-nowrap px-3 py-4 text-sm text-gray-600">{{  moment(lists.updated_at).format('MM-DD-YYYY') }}</td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6">
                      <a @click="openViewEditApiModal(lists.name,lists.id)" class="text-indigo-600 hover:text-indigo-900 px-2 cursor-pointer">Edit
                      </a>
                      <a @click="openDeleteApiKeyModal(lists.id)" class="text-red-600 hover:text-red-900 cursor-pointer px-2">Delete
                      </a>
                  </td>
                </tr>
              </tbody>
        </table>
      </div>
    </div>
    <div class="sm:flex sm:items-left py-5">
      <button @click="generateApiKeys()" type="button" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Generate New Key</button>
    </div>
</div>
</div>
<div v-else><p v-if="mainStore.user?.current_subscription_renews_on == null ">Please purchase or resume your subscription plan.</p><p  v-else>Please enable your API aceess keys from
<NuxtLink to="/account-settings" class="text-indigo-600">account-setting.</NuxtLink>
</p>
</div> 
  <ModalsGenerateAPIKeyName :open="openGenerateApiName" @close="openGenerateApiName = false" :apisName="apiName" :apiId="apiKeyId" />
  <ModalsDelete :open="openDeleteKeyModal" :apisKeyId="apiKeyId" @close="openDeleteKeyModal = false" />

</template>

<script setup>
import { ref } from 'vue';
import {useMainStore} from "~/store/main"
import moment from 'moment';
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const { params, query } = useRoute();
const runtimeConfig = useRuntimeConfig()
const emit = defineEmits(['close'])
const copiedKey = ref('')
const copyApiKey  = ref(false)
const openGenerateApiName =ref(false)
const openViewEditApi =ref(false)
const openDeleteKeyModal = ref(false)
const apiKeyId = ref(0)
const apiName = ref('')
watch(mainStoreState.apisKeyLists, (newVal) => {
  if (newVal) {
    apiLists.value = mainStore.apisKeyLists
  }
})

const showAllAPIKey = (index)=>{
  var showSpan = document.getElementById('show'+index)
  var hideSpan = document.getElementById('hide'+index)
  var showSpanIcon = document.getElementById('showIcon'+index)
  var hideSpanIcon = document.getElementById('hideIcon'+index)
  if(showSpan?.classList.contains('hidden') && showSpanIcon?.classList.contains('hidden')){
    showSpan.classList.remove('hidden')
    hideSpan?.classList.add('hidden')
    showSpanIcon.classList.remove('hidden')
    hideSpanIcon?.classList.add('hidden')
  }else{
    showSpan?.classList.add('hidden')
    hideSpan?.classList.remove('hidden')
    showSpanIcon?.classList.add('hidden')
    hideSpanIcon?.classList.remove('hidden')
  }
}
const openDeleteApiKeyModal =(id)=>{
  apiKeyId.value = id
  openDeleteKeyModal.value = true
}
const openViewEditApiModal =(name,id)=>{
  apiKeyId.value = id
  apiName.value = name ? name : 'API Key'
  openGenerateApiName.value = true
}
const apiLists = ref([])
const loadApiKeyList =ref(false)
const getApiKeys = async()=>{
  loadApiKeyList.value = true
    await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/api_keys`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        }
      })
      .then(response => response.json())
      .then(data => {
        apiLists.value = data
        loadApiKeyList.value = false
        apiLists.value.sort((a, b) => a.id - b.id);
        })
}
const maskString=(str)=> {
  if (str.length <= 6) {
      return str; // Return the original string if it is too short
  }
  let maskLength = str.length - 6;
  let maskedPart = '*'.repeat(maskLength+6);
  let lastSix = str.slice(-6);
  return maskedPart + lastSix;
}

const copyToClipboard = (textToCopy,key) => {
navigator.clipboard.writeText(textToCopy)
  .then(() => {
    copiedKey.value = key
    setTimeout(() => {
      copiedKey.value = ''
    }, 2500);
  })
  .catch(err => {
    console.error('Failed to copy text: ', err);
  });
};
const generateApiKeys =()=>{
  apiKeyId.value = null
  apiName.value = null
  openGenerateApiName.value = true
}
onMounted(() => {
  localStorage.setItem('stayClipCards', 'false')
  localStorage.setItem('stayShowNotes', 'false')
  getApiKeys()
})

</script>

<style lang='scss' scoped>
</style>