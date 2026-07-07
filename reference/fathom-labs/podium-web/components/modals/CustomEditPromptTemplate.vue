<template>
    <ModalsTemplate :open="open">
    <form class="new-project-form">
        <h2  class="new-project-form__title pt-1">{{ t('Edit Prompt Template') }}</h2>
        <div class="new-project-form__row" >
            <label for="nameText" class="new-project-form__label">{{ t('Name Prompt') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <input 
                        type="text" 
                        name="nameText" 
                        id="titleText"
                        autocomplete="nameText" 
                        v-model="promptTitle"
                        class="new-project-form__input" 
                        :placeholder="t('Add Name')" />
                </div>
            </div>
        </div>
        <div class="new-project-form__row" style="padding: 0;">
            <label for="nameText" class="new-project-form__label">{{ t('Prompt') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <textarea
                        type="text" 
                        name="nameText" 
                        id="contentText"
                        rows="4"
                        v-model="promptContent"
                        autocomplete="nameText" 
                        class="new-project-form__input" 
                        :placeholder="t('Add your prompt')" />
                </div>
            </div>
        </div>
        <div  class="new-project-form__actions">
            <button type="button" class="btn btn-submit"  @click="updateCustomTemplateById(props.customId)">{{ t('Save') }}</button>
            <button type="button" class="btn btn-delete"  @click="openDeleteModal = true" >{{ t('Delete') }}</button>
            <button type="button" class="btn btn-cancel"  @click="handleClose"  ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </form>
</ModalsTemplate>
    <ModalsDelete :open="openDeleteModal" :assestId="props.customId"  @close="openDeleteModal=false"  @submit="handleSubmit()"   from="customTemplate"  />
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
const props= defineProps(['open','customId','title','content'])
const emit = defineEmits(['close','submit'])
const openDeleteModal=ref(false)
const promptTitle = ref(props.title)
const promptContent = ref(props.content)
watch(()=>props.title,(val)=>{
    promptTitle.value = val
})
watch(()=>props.content,(val)=>{
    promptContent.value = val
})
const handleSubmit = ()=>{
    openDeleteModal.value = false


     emit('submit','close')
}
const updateCustomTemplateById=(id)=>{
    const titleInput = document.getElementById('titleText');
    const contentInput = document.getElementById('contentText')
    if(titleInput.value.trim()===''){
        titleInput.focus();
        titleInput.classList.add('red-border');
    }else if( contentInput.value.trim()===''){
        contentInput.focus();
        contentInput.classList.add('red-border');
    }
    else{
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/custom-prompt/${id}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify({'title': promptTitle.value,'content': promptContent.value})
  })
  .then(response => response.json())
    .then (data => {
        mainStore.refreshCustomPrompts()
        emit('submit','close')
        if (!data) {
            alert('There was an error saving the custom templates. Please try again.')
        } 
    })
    }
}
const handleClose = ()=>{
    if(!props.title){
        promptTitle.value = ''
    }
    if(!props.content){
        promptContent.value = ''
    }
    promptTitle.value = props.title
    promptContent.value = props.content
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
    &__textarea {
        @apply
        block
        w-full
        rounded-md
        border-0
        text-gray-900
        shadow-sm
        ring-1
        ring-inset
        ring-gray-300
        placeholder:text-gray-400
        focus:ring-2
        focus:ring-inset
        focus:ring-indigo-600
        py-1.5
        text-sm
        leading-6;
    }
    &__actions {
        @apply
        mt-5
        sm:mt-6
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
    &-delete {
        @apply
        bg-red-100
        text-red-700
        ring-gray-300
        ring-0
        hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2
    }
}
.red-border {
      border: 1px solid red;
    }
</style>