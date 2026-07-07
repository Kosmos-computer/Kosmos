<template>
    <ModalsTemplate :open="open">
    <form class="new-project-form">
        <h2  class="new-project-form__title pt-1">{{ t('Save Prompt As Template') }} </h2>
        <div class="new-project-form__row">
            <label for="nameText" class="new-project-form__label">{{ t('Name Prompt') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <input 
                        type="text" 
                        name="nameText" 
                        id="titleText"
                        autocomplete="nameText" 
                        v-model="title"
                        @input="removeClass('namePrompt')" 
                        class="new-project-form__input" 
                        :placeholder="titleGptDoc ? t('New Prompt') : t('Add Name')" />
                </div>
            </div>
        </div>
        <div  class="new-project-form__row" style="padding: 0;">
            <label for="nameText" class="new-project-form__label">{{ t('Prompt') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <textarea
                        type="text" 
                        name="nameText" 
                        id="contentText"
                        v-model="content"
                        @input="removeClass('')" 
                        rows="4"
                        autocomplete="nameText" 
                        class="new-project-form__input" 
                        :placeholder="t('Add your prompt')" />
                </div>
            </div>
        </div>
        <div  class="new-project-form__actions">
            <button type="button" class="btn btn-submit" @click="saveCustomTemplate">{{ t('Save') }}</button>
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
const props= defineProps(['open','titleGptDoc'])
const emit = defineEmits(['close','submit'])
const openDeleteModal=ref(false)
const title = ref('')
const content =ref(props.titleGptDoc)
watch(()=>props.titleGptDoc,(val)=>{
    content.value = val
})
const saveCustomTemplate=()=>{
    const titleInput = document.getElementById('titleText');
    const contentInput = document.getElementById('contentText')
    if(titleInput.value.trim() === ''){
       titleInput.focus();
       titleInput.classList.add('red-border');
    }else if(contentInput.value.trim() === ''){
        contentInput.focus();
       contentInput.classList.add('red-border');
    }else{
    var data = {
        title: title.value,
        content: content.value
    }
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/custom-prompt/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
    .then (data => {
        if(data){
            title.value = ''
            if(!props.titleGptDoc){
                content.value = ''
            }
            mainStore.refreshCustomPrompts()
            emit('submit','close')
        }
        if (!data) {
            alert('There was an error saving the custom templates. Please try again.')
        } 
    })
  }
    
}
 //common function for removing error border when user inputs name prompt and prompt description
 const removeClass = (source)=>{
        if(source === 'namePrompt'){
            document.getElementById('titleText').classList.remove('red-border')
        }else{
            document.getElementById('contentText').classList.remove('red-border')
        }
    }

    const handleClose = ()=>{
    title.value = ''
    emit('close')
    if(!props.titleGptDoc){
      content.value = ''
    }else{
        content.value = props.titleGptDoc
    }
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
}
.red-border {
      border: 1px solid red;
    }
</style>