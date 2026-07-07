<template>
     <ModalsTemplate :open="open"> 
    <form class="creditInsModal">
        <div class="flex mb-4 place-items-center justify-center">
            <div class="flex items-center justify-center w-12 h-12 rounded-lg">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path fill-rule="evenodd" clip-rule="evenodd" d="M20 38.5C30.2173 38.5 38.5 30.2173 38.5 20C38.5 9.78273 30.2173 1.5 20 1.5C9.78273 1.5 1.5 9.78273 1.5 20C1.5 30.2173 9.78273 38.5 20 38.5ZM20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#EF4444"/>
                   <path d="M21 11H19V21H21V11Z" fill="#EF4444"/>
                   <path d="M21 27H19V28.5H21V27Z" fill="#EF4444"/>
                </svg>
            </div>
        </div>
        <h2 style="margin-bottom: 0;" class="new-file-form__title text-center">{{ t('Error: Insufficient Credits') }}</h2>
        <p class="leading-6 font-medium align-middle text-center text-gray-500 text-sm" v-if="mainStore.files.length === 1">{{ mainStore.files[0].file.name }}</p>
        <!-- <p class="leading-6 font-medium align-middle text-center text-gray-500 text-sm" v-else>{{ mainStore.files.length }} files</p> -->
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on != null && mainStore.files.length === 1">{{ t('You do not have enough credits to process this file. Your monthly credits will renew on') }}  {{ subsRenewOn ? subsRenewOn : '---' }}.</p>
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on != null && mainStore.files.length > 1">{{ t('You do not have enough credits to process these files. Your monthly credits will renew on') }}  {{ subsRenewOn ? subsRenewOn : '---' }}.</p>
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on == null && mainStore.files.length === 1">{{ t('You do not have enough credits to process this file. Your remaining free trial credits are insufficient. You will need to subscribe to a plan or pruchase credits to process this file!') }}</p>
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on == null && mainStore.files.length > 1">{{ t('You do not have enough credits to process these files. Your remaining free trial credits are insufficient. You will need to subscribe to a plan or pruchase credits to process these files!') }}</p>
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on != null && mainStore.files.length === 1 ">{{ t('You will need to upgrade or purchase more credits to process this file!') }}</p>
        <p class="text-center text-gray-500 font-normal text-sm" v-if="mainStore.user.current_subscription_renews_on != null && mainStore.files.length > 1">{{ t('You will need to upgrade or purchase more credits to process these files!') }}</p>

        <div class="new-file-form__actions">
            <button type="button" class="btn btn-submit" @click="handleStartUpload">{{ t('Get Credits') }}</button>
            <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Later') }}</button>
        </div>
    </form>
</ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
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

    const mainStore = useMainStore()
    const mainStoreState = storeToRefs(mainStore)
    withDefaults(defineProps<{
        open: boolean,
        fileName:string,
        subsRenewOn : string,
        currentSubscTitle: string,
    }>(), {
        open: false,
    })
    const emit = defineEmits(['close', 'submit'])

const handleClose = () => {
    emit('close')
}
function navigateToPricing() {
  window.location.href = 'https://hello.podium.page/pricing?logged_in=true';
}
const handleStartUpload = () => {
    navigateToPricing()
    emit('close')
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
</style>