<template>
      <div v-if="updateMediaTranscriptLoading" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

        </div>
    <ModalsTemplate :open="open">
    <form class="new-project-form">
        <h2  class="new-project-form__title pt-1">{{props.apiId ? t('Update API Key') : t('Generate API Key')}}</h2>
        <div class="new-project-form__row">
            <label for="nameText" class="new-project-form__label">API {{ t('Name') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <input 
                        type="text" 
                        name="apiName" 
                        id="apiName"
                        autocomplete="off" 
                        @input="removeClass()" 
                        v-model="generateApiName"
                        @keypress="handleKeys($event)"
                        class="new-project-form__input" 
                        :placeholder="props.apisName ? props.apisName : t('Add Name')" />
                </div>
            </div>
        </div>
        <div  class="new-project-form__actions">
            <button type="button" class="btn btn-submit" @click="generateApiKey(props.apiId)">{{props.apiId ? t('Update'):t('Generate')}}</button>
            <button type="button" class="btn btn-cancel"  @click="handleClose"   ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </form>
</ModalsTemplate>
</template>
<script setup>

const runtimeConfig = useRuntimeConfig()
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

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const route = useRoute()
const props= defineProps(['open','apisName','apiId'])
const emit = defineEmits(['close'])
const openDeleteModal=ref(false)
const { updateMediaTranscriptLoading } = storeToRefs(mainStore)
const generateApiName = ref(props.apisName)
watch(()=>props.apisName,(val)=>{
    generateApiName.value = val
})
const removeClass = ()=>{
    document.getElementById('apiName').classList.remove('red-border')
}
const handleKeys = (event)=>{
  if (event && (event.key === 'Enter' || event.keyCode === 13)) {
    event.preventDefault()
    generateApiKey()
  }
}
const generateApiKey=(id)=>{
    const nameInput = document.getElementById('apiName');
    if(nameInput.value.trim() === ''){
        nameInput.focus();
        nameInput.classList.add('red-border');
    }else{
    updateMediaTranscriptLoading.value = true
    if(props.apisName){
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/api_keys/update/${id}`, {
        method: 'PUT',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        },
        body: JSON.stringify({name: generateApiName.value,})
    })
    .then(response => response.json())
        .then (data => {
            if(data){
                mainStore.refreshAPIKeyLists()
                if(!props.apisName){
                    generateApiName.value = ''
                }
                emit('close')
                updateMediaTranscriptLoading.value = false
            }
            if (!data) {
                alert('There was an error saving the custom templates. Please try again.')
            } 
        })
    } else{
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/api_keys/generate`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        },
        body: JSON.stringify({name: generateApiName.value,})
    })
    .then(response => response.json())
        .then (data => {
            if(data){
                mainStore.refreshAPIKeyLists()
                if(!props.apisName){
                    generateApiName.value = ''
                }
                emit('close')
                updateMediaTranscriptLoading.value = false
            }
            if (!data) {
                alert('There was an error saving the custom templates. Please try again.')
            } 
        })
    }   
  }
}
const handleClose = ()=>{
    props.apiId = null
    props.apisName = null
    if(props.apisName){
        generateApiName.value = props.apisName
    }else{
        generateApiName.value = null
    }
    emit('close')
}

</script>
<style lang="scss" scoped>
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

    &__actions {
        @apply
        mt-5
        sm:mt-2
        sm:flex
        sm:gap-x-3;
    }
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
    &-cancel {
        @apply
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
}
.red-border {
      border: 1px solid red;
    }
</style>