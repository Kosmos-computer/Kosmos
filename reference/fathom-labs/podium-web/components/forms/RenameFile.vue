<template>
    <form class="new-project-form">
        <h2 class="new-project-form__title pt-1">{{ t('Rename File') }}</h2>
        
        <div class="new-project-form__row" style="padding: 0;">
            <label for="nameText" class="new-project-form__label">{{ t('File name') }}</label>
            <div class="new-project-form__input-row w-full">
                <div class="new-project-form__input-wrapper">
                    <input 
                        type="text" 
                        name="nameText" 
                        id="nameText"
                        v-model="nameText"
                        autocomplete="nameText" 
                        class="new-project-form__input" 
                        placeholder="File Name" />
                </div>
            </div>
        </div>

        <div class="new-project-form__actions">
            <button type="button" class="btn btn-submit" @click="handleSubmit(data)">{{ t('Save') }}</button>
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </form>
</template>

<script setup>
    const props = defineProps({
        mediaId: {
            type: String,
            required: true,
        },
        open: {
            type: Boolean,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        source : {
            type : String
        }
    })
    import { useMainStore } from "~/store/main"
    import { storeToRefs } from 'pinia'
    import { computed } from 'vue'
    import languageStore from '@/store/LanguageStore';

    const t = computed(() => {
      return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
      };
    });
import emitter from "~/plugins/eventBus";
    
    const mainStore = useMainStore()
    const runtimeConfig = useRuntimeConfig()

    const emit = defineEmits(['close', 'submit'])

    const nameText = ref(props.name)    

    const update = (project) => {
        selectedProject.value = project
    }

    const handleClose = () => {
        emit('close')
    }

    const handleSubmit = (data) => {
        if(props.source =='clipTitle'){
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${props.mediaId}/update/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
            body: JSON.stringify({'renameTitle': nameText.value})
            })
                .then(response => response.json())
                .then(data => {
                    emitter.emit('updatedClipTitle', nameText.value)
                    emit('close')
                })
        }else{
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.mediaId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
            body: JSON.stringify({'name': nameText.value})
            })
                .then(response => response.json())
                .then(data => {
                    mainStore.retrieveUserMedia()
                    mainStore.retrieveUserProjectMedia()
                    emit('close')
                })
        }
        emit('submit')
        
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
            @apply mt-2;
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
    &-change {
        @apply
        w-auto
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
}
</style>