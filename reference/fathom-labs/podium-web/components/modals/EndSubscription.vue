<template>
    <ModalsTemplate :open="open" size="md" @close="handleCancel">
        <div>
            <div class="">
                <div v-if="mainStore.mainUserLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
                    style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
                    <SvgLoadingMd />

        </div>
                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mt-1">{{ t('Cancel Subscription') }}</DialogTitle>
                <div class="mt-1">
                  <p class="text-sm text-gray-500 mt-0 font-medium">
                    {{ t('Please confirm your cancellation request by entering in your password below. Once you have cancelled your subscription') }} 
                    {{ t('you can continue to use any credits until the end of the last month paid.') }}</p>
                </div>
            </div>
            <div class="new-file-form__row mt-5">
            <Menu as="div" class="relative text-left w-full mr-0">
                <div>
                    <label class="block text-sm font-medium leading-6 text-gray-700 "  ></label>
                    <MenuButton class="project-combobox set-speakers-form__combobox font-medium" 
                    id="showError"
                    >
                        {{ t(cancellationRsn) }} 
                    <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                    </MenuButton>
                </div>
                    <MenuItems
                    class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div class="py-0 border-none" v-for="cancelRsns in cancellationReasonLists">
                        <MenuItem v-slot="{ active  }" 
                        >
                        <span  @click="updateOptions(cancelRsns)"
                        :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer relative',
                        ]">
                        {{ t(cancelRsns) }}  
                        <span v-if="cancelRsns==cancellationRsn" class="slectedIcon absolute right-6 ">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                            </svg>
                        </span>
                        </span>
                    
                        </MenuItem>
                    </div>
                    </MenuItems>
                    <p v-if="selectRsn" class="text-xs text-red-600 font-medium">{{ t('Please select cancellation reason.') }}</p>
                </Menu>
       </div>
       <div class="new-project-form__row  mt-5" style="padding: 0;">
            <label for="nameText" class="new-project-form__label">{{ t('Feedback') }}</label>
            <div class="new-project-form__input-row w-full m-0">
                <div class="new-project-form__input-wrapper m-0">
                    <input 
                        type="text" 
                        name="nameText" 
                        id="feedbackText"
                        v-model="feedback"
                        @input="removeClass('feedback')" 
                        autocomplete="off"
                        class="new-project-form__input" />
                </div>
            </div>
        </div>
        <div class="new-project-form__row  mt-5" style="padding: 0;">
            <label for="nameText" class="new-project-form__label">{{ t('Confirm Password') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper relative">
                    <input 
                        type="text" 
                        name="nameText" 
                        id="passwordText"
                        v-model="confirmPassword"
                        @input="removeClass('')" 
                        class="new-project-form__input"
                        autocomplete="off" />
                        <p class="absolute -bottom-5 left-0 text-xs text-red-600 font-medium" v-if="correctPassword">{{ t('Please enter correct password.') }}</p>
                        <p class="absolute -bottom-5 left-0 text-xs text-red-600 font-medium" v-if="errorMsg">{{errorMsg}}</p>
                </div>
            </div>
        </div>
        </div>
        <div class="mt-8 sm:flex sm:space-x-1 sm:grid-cols-2 sm:gap-2">
            <button type="button"
                class="btn btn-end" 
                @click="endSubscription()" ref="endButtonRef"> {{ t('End Subscription') }} </button>
              <button type="button" class="btn btn-cancel" @click="handleCancel()"  ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </ModalsTemplate>
  </template>
  <script setup lang="ts">
    import { DialogTitle } from '@headlessui/vue'
    import { useMainStore } from "~/store/main";
    import { storeToRefs } from 'pinia'
    import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
    import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

    const cancellationRsn =ref('Cancellation reason') 
    const cancellationReasonLists = ref([
    'Found another product that fits my need better','It is too expensive','Not podcasting anymore',"Did'nt find value for my workflow",
    'Missing features','Other'
    ])
    const feedback =ref('')
    const confirmPassword = ref('')
    const mainStore = useMainStore();
    const mainStoreState = storeToRefs(mainStore)
    const runtimeConfig = useRuntimeConfig()
    const props = defineProps(['open'])
    const emit = defineEmits(['close'])
    const { mainUserLoader } = storeToRefs(mainStore)
    const correctPassword =ref(false)
    const selectRsn =ref(false)
    const passwordInput = ref('')
    const dropdown = ref('')
    const errorMsg = ref('')
    const endSubscription = () => {
        const showErrorId= document.getElementById('showError')
        const feedbackId = document.getElementById('feedbackText')
        const passwordId = document.getElementById('passwordText')
        dropdown.value = showErrorId
        passwordInput.value = passwordId
        if(cancellationRsn.value ==='Cancellation reason' && dropdown.value){
          dropdown.value.focus();
          dropdown.value.classList.add('red-border')
          selectRsn.value = true
        }else if(feedback.value === ''){
            feedbackId.focus();
            feedbackId.classList.add('red-border')
        }else if(confirmPassword.value ===''){
            passwordId.focus();
            passwordId.classList.add('red-border')
        }else{
            var data = {
            reason : cancellationRsn.value,
            feedback : feedback.value,
            password : confirmPassword.value
            }
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/cancel_subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
                    body: JSON.stringify(data)
                })
                .then(response => {
                if (response.ok) {
                    return response.json()
                } else if(response.status === 400) {
                response.json().then(data => {
                errorMsg.value = data.detail
                });
                }else if(response.status === 500){
                    errorMsg.value = 'Something went wrong!'
                }
               })
                .then(data => {
                    if(data.detail ==='Invalid password'){
                        correctPassword.value = true
                    }else{
                        mainStore.retrieveUser(null)
                        resetFormFields()
                        emit('close')
                    }
                })
        }
        
    }
    //common function for clear the form values when user click on cancel or end subscription
    const resetFormFields = ()=>{
        errorMsg.value = ''
        correctPassword.value = false
        feedback.value = ''
        confirmPassword.value = ''
        cancellationRsn.value = 'Cancellation reason'
    }
    //common function for removing error border when user inputs feedback and password
    const removeClass = (source)=>{
        if(source === 'feedback'){
            document.getElementById('feedbackText').classList.remove('red-border')
        }else{
            document.getElementById('passwordText').classList.remove('red-border')
        }
    }
    const updateOptions = (cancelRsns) => {
        if(dropdown.value){
            dropdown.value.classList.remove('red-border')
            selectRsn.value = false
        }
        cancellationRsn.value = cancelRsns
    }
    const handleCancel = ()=>{
        resetFormFields()
        selectRsn.value = false
        emit('close')
    }
  </script>
  <style scoped>
  .btn {
    @apply mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm leading-5 font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;
  
    &-submit {
      @apply bg-indigo-700 text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
    }
  
    &-end {
      @apply bg-red-100 text-red-700 ring-transparent border-none hover:bg-red-50;
    }
    
    &-cancel {
        @apply bg-white text-gray-700 ring-gray-300 hover:bg-gray-50;
    }
   
  }
  .project-combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md bg-white
    px-3 py-2
    text-base leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
}
.cstSelect-holder {
  display: block;
  width: 100%;
  position: relative;
  z-index: 20;
}
.new-project-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }
    &__label {
        @apply text-sm leading-5 font-medium mb-1 text-gray-700;

    }
    &__row {
        @apply col-span-full pb-1;
        &:not(.last){
            @apply pb-6;
        }
    }
    &__input {
        @apply 
        block 
        flex-1 
        border-0 
        bg-transparent 
        py-2 
        pl-2 
        text-gray-500
        placeholder:text-gray-400 
        focus:ring-0 
        text-sm
        leading-6 
        rounded-md;
        &-before {
            @apply 
            bg-gray-50 
            my-[1px] 
            ml-[1px]
            py-[1px] 
            pl-[10px]
            rounded-tl-md
            rounded-bl-md
            border-r-[1px]
            border-r-gray-300
            text-gray-400  
            flex 
            select-none 
            items-center 
            pl-3 
            sm:text-base
            pr-2;
        }
        &-row {
            @apply mt-0;
        }
        &-wrapper {
            @apply 
            flex 
            rounded-md 
            ring-1 
            ring-inset 
            ring-gray-300 
            focus-within:ring-2 
            focus-within:ring-inset 
            focus-within:ring-indigo-600;
            &:focus-within {
                span {
                    @apply 
                    my-[2px]
                    ml-[2px]
                    py-[0px] 
                    pl-[11px]
                }
            }
        }
    }
 
}
.red-border {
      border: 1px solid red;
    }
  </style>