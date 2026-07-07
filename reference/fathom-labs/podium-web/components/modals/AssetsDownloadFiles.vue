<template>
    <ModalsTemplate :open="open" size="md" @close="handleClose">
        <div>
            <Transition name="bounce" appear>
      <div class="share-modal flex flex-col items-center bg-white rounded-3xl text-center">
        <div class="flex items-center gap-6 mb-5 pt-2">
            <div class="icon-logo relative">
                <div class="border border-[#CED0D3]	rounded-xl p-2 w-24 h-24 flex items-center justify-center">
                    <svg width="43" height="51" viewBox="0 0 43 51" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M23 12.5C23 18.8513 17.8513 24 11.5 24C5.14873 24 0 18.8513 0 12.5C0 6.14873 5.14873 1 11.5 1C17.8513 1 23 6.14873 23 12.5Z" fill="#231F20"/>
<path d="M25.5 35C30.1413 35 34.5925 33.1563 37.8744 29.8744C41.1563 26.5925 43 22.1413 43 17.5C43 12.8587 41.1563 8.40752 37.8744 5.12563C34.5925 1.84375 30.1413 9.03692e-07 25.5 0L25.5 35Z" fill="#231F20"/>
<path d="M0 27H23V51H0V27Z" fill="#231F20"/>
</svg>

                </div>
                <div class="share-icon absolute top-[35%] right-[-40%]">
                    <svg width="49" height="45" viewBox="0 0 49 45" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M29.3958 9.5C16.1942 10.1875 4.39577 23.5 1.39577 34C-0.437744 40.5 0.0622766 44.2599 0.0622766 44.2599C0.0622766 44.2599 -0.104228 42.3869 6.39577 34.9435C12.8958 27.5 20.6746 25.4634 29.3958 25V34.9435L48.3958 17.5L29.3958 0V9.5Z" fill="#4F46E5"/>
</svg>

            </div>
            </div>
            <div class="icon-x">
                <div class="border border-black bg-black rounded-xl p-2 w-24 h-24 flex items-center justify-center">
                    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M26.7876 19.4779L43.5439 0H39.5732L25.0237 16.9124L13.403 0H0L17.5727 25.5745L0 46H3.97094L19.3356 28.14L31.6078 46H45.0109L26.7866 19.4779H26.7876ZM21.3489 25.7998L19.5684 23.2532L5.40172 2.98925H11.5008L22.9335 19.3429L24.714 21.8895L39.5751 43.1467H33.4759L21.3489 25.8008V25.7998Z" fill="white"/>
</svg>
                </div>
            </div>
          
        </div>
        <div class="font-medium mb-2 sm:mb-2">
         {{ t('Get Free Credits!') }}
        </div>
        <div class="text-gray-500 text-sm font-normal mb-5 sm:mb-5 text-left">
          <p>{{ t("Podcasters LOVE Podium's AI generated show notes.") }}</p> 
          <p>{{ t("Spread the word about Podium to help your fellow podcasters. We'll give you 60 free credit minutes! it's easy, here's how:") }}</p>
          <p>{{ t('1- Follow us on Twitter') }}  <a href="https://x.com/podiumdotpage" class="text-indigo-600">@PodiumDotPage</a></p>
          <p>{{ t('2- Click on share button below') }} </p>
          <p>{{ t('3- Tag at least 2 podcasters in you tweet') }} </p></div>
        <div class="w-full">
            <h5 class="text-left text-sm font-medium leading-6 text-gray-900">{{ t('Share Link') }}</h5>
            <h6 class="text-left truncate pl-2 pr-7 block w-full rounded-md border-0 py-1.5 text-primary text-sm relative bg-[#F3F4F6] h-[32px] ">
                {{ twitterLink }}                 
<button @click="copyLink" class="copy-link absolute top-1.5 right-2 outline-0	"><svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.30477 3.92726C4.44542 3.78657 4.63622 3.70752 4.83517 3.70752H8.84693C10.3122 3.70752 11.4998 4.89565 11.4998 6.36086V14.8467C11.4998 16.3119 10.3122 17.5 8.84693 17.5H2.65282C1.18753 17.5 0 16.3119 0 14.8467V8.5438C0 8.34492 0.0789896 8.15419 0.219598 8.01354L4.30477 3.92726ZM4.08519 6.2685L4.0852 6.64046C4.0852 6.64046 4.0852 6.64046 4.0852 6.64046C4.08519 7.27762 3.56886 7.7938 2.93238 7.7938H2.56031L4.08519 6.2685ZM1.5 9.2938L2.93238 9.2938C4.39767 9.2938 5.5852 8.10567 5.5852 6.64046L5.58518 5.20752H8.84693C9.48342 5.20752 9.99975 5.72369 9.99975 6.36086V14.8467C9.99975 15.4838 9.48342 16 8.84693 16H2.65282C2.01633 16 1.5 15.4838 1.5 14.8467V9.2938Z" fill="#6366F1"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.7441 11C15.1584 11 15.4941 11.3358 15.4941 11.75V11.7551C15.4941 12.4484 15.2895 13.1062 14.9215 13.6088C14.554 14.1108 13.9838 14.5 13.2836 14.5H12.7441C12.3299 14.5 11.9941 14.1642 11.9941 13.75C11.9941 13.3358 12.3299 13 12.7441 13H13.2836C13.3901 13 13.5502 12.9426 13.7112 12.7227C13.8719 12.5032 13.9941 12.1636 13.9941 11.7551V11.75C13.9941 11.3358 14.3299 11 14.7441 11Z" fill="#6366F1"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M6.76873 0.442685C7.17446 0.166256 7.70324 0 8.26637 0H13.2248C14.502 0 15.4956 1.063 15.4956 2.32179L15.494 12.0001L13.994 11.9999L13.9956 2.32179V2.32179C13.9955 1.84447 13.6273 1.5 13.2248 1.5H8.26637C7.98959 1.5 7.75799 1.58374 7.61331 1.68232C7.53909 1.73288 7.50766 1.77078 7.49561 1.78881V2.92821H5.99561V1.75C5.99561 1.15454 6.38481 0.704257 6.76873 0.442685ZM7.48895 1.80047L7.48938 1.79944Z" fill="#6366F1"/>
</svg>
</button>
</h6>
        </div>
        <div class="new-file-form__actions w-full">
            <button @click="retunToTwitter" type="button" class="btn btn-submit btn-share" > <svg class="mr-2" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M26.7876 19.4779L43.5439 0H39.5732L25.0237 16.9124L13.403 0H0L17.5727 25.5745L0 46H3.97094L19.3356 28.14L31.6078 46H45.0109L26.7866 19.4779H26.7876ZM21.3489 25.7998L19.5684 23.2532L5.40172 2.98925H11.5008L22.9335 19.3429L24.714 21.8895L39.5751 43.1467H33.4759L21.3489 25.8008V25.7998Z" fill="white"/>
</svg>{{ t('Share now') }}</button>
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Close') }}</button>
        </div>
        <div class="grow text-left pt-4 w-full">
            <input
              id="remember_me"
              name="remember_me"
              type="checkbox"
              v-model="doNotShow"
              class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <span class=" text-sm leading-6 text-gray-900 pl-1">
                {{ t("Don't show this notification again") }}
            </span>
          </div>
      </div>
    </Transition>
        </div>
  
    </ModalsTemplate>
  </template>
  <script setup>
  import { DialogTitle } from '@headlessui/vue'
  import { useMainStore } from "~/store/main";
  import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

  const mainStore = useMainStore();
  const mainStoreState = storeToRefs(mainStore)
  const runtimeConfig = useRuntimeConfig()
  const props = defineProps({
          open: { type: Boolean, required: true },
      })
  const doNotShow = ref(false)
  const emit = defineEmits(['close'])
  
  const handleClose = () => {
      emit('close')
      doNotShowNotiAgain()
  }
 const twitterLink = ref(null) 
 twitterLink.value ='https://hello.podium.page/?utm_source=twitter&utm_medium=share&utm_campaign=referral'
const retunToTwitter =()=>{
    localStorage.setItem('doNotShowNoti',true)
    doNotShow.value=true
    emit('close')
    return window.open(`https://twitter.com/intent/tweet?text=Just%20found%20my%20new%20favorite%20tool%20for%20AI%20show%20notes%20-%20Podium!%20@PodiumDotPage&url=${twitterLink.value}`, '_blank');
}

const doNotShowNotiAgain=()=>{
    localStorage.setItem('doNotShowNoti',doNotShow.value)
}
const copyLink=()=>{
  var content = ''
  content += twitterLink.value
  navigator.clipboard.writeText(content);
  try { heap.track('podium-share-link-clicked', {'type': 'copy-link'});} catch {}
}
  </script>
  <style lang="scss" scoped>
  .new-file-form {
      &__title {
          @apply text-lg leading-6 font-medium mb-8 text-gray-900;
  
      }
      &__row {
          @apply col-span-full pb-6;
      }
      &__actions {
          @apply
          mt-4
          sm:mt-4
          sm:flex
          sm:gap-x-3;
      }
  }
  .project-combobox {
      @apply
      inline-flex w-full justify-between items-center
      gap-x-1.5 rounded-md bg-white
      px-3 py-2
      text-sm leading-6 font-normal text-gray-900
      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
  }
  .btn {
      @apply
      mt-3
      inline-flex
      w-full
      justify-center
      rounded-md
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
          ring-indigo-700
          text-white
          hover:bg-indigo-600
          hover:ring-indigo-600
      }
      &-cancel {
          @apply
          bg-white
          text-gray-900
          ring-gray-300
          hover:bg-gray-50;
      }
      &-change {
          @apply
          w-auto
          bg-white
          text-gray-900
          ring-gray-300
          hover:bg-gray-50;
      }
  }
  .btn-share{
    svg{
    width: 16px;
    height: auto;
  }
  }
  
  </style>