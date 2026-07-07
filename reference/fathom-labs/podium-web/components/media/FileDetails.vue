<template>
   <div  class="flex w-full justify-center min-h-screen min-w-[730px]">
    <div class="flex flex-col w-full pt-5 pr-8 mx-auto max-w-6xl">
   <form class="new-project-form">
    <div class="shadow bg-white p-6 rounded-lg file-detail-form">
    <h1 class="text-2xl text-gray-900 font-semibold leading-8 mb-4">{{ t('File Settings') }}</h1>
    <div class="new-project-form__row">
            <label class="new-project-form__label">{{ t('Artwork Image') }}</label>
            <div class="flex items-center">
                <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mr-5" v-if="!base64Image">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="w-12 h-12 rounded-lg flex items-center justify-center mr-5" v-if="base64Image">
                  <img class="rounded-lg w-full h-full object-cover" id="uploaded-image" alt="Uploaded Image"  :src="base64Image">
                </div>
                <label for="fileInput" type="button" class="btn btn-change cursor-pointer">{{ base64Image ? t('Change') : t('Upload') }}</label>
                <input type="file" ref="fileInput" id="fileInput" name="fileInput" class="hidden" @change="uploadFile($event)" accept="image/*"/>
                <div v-if="base64Image" class="ml-5 cursor-pointer" @click="deleteFile">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.6666 4.66667L12.0884 12.7617C12.0386 13.4594 11.458 14 10.7585 14H5.24145C4.54193 14 3.96135 13.4594 3.91151 12.7617L3.33329 4.66667M6.66663 7.33333V11.3333M9.33329 7.33333V11.3333M9.99996 4.66667V2.66667C9.99996 2.29848 9.70148 2 9.33329 2H6.66663C6.29844 2 5.99996 2.29848 5.99996 2.66667V4.66667M2.66663 4.66667H13.3333" stroke="#9CA3AF" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12.6666 4.66667L12.0884 12.7617C12.0386 13.4594 11.458 14 10.7585 14H5.24145C4.54193 14 3.96135 13.4594 3.91151 12.7617L3.33329 4.66667M6.66663 7.33333V11.3333M9.33329 7.33333V11.3333M9.99996 4.66667V2.66667C9.99996 2.29848 9.70148 2 9.33329 2H6.66663C6.29844 2 5.99996 2.29848 5.99996 2.66667V4.66667M2.66663 4.66667H13.3333" stroke="black" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
  <div class="new-project-form__row">
            <label for="fileName" class="new-project-form__label">{{ t('Filename') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <input
                        type="text"
                        name="fileName"
                        id="fileName"
                        v-model="fileName"
                        autocomplete="fileName"
                        class="new-project-form__input"
                        placeholder="" />
                </div>
            </div>
    </div>
    <div class="new-project-form__row">
            <label for="showName" class="new-project-form__label">{{ t('Show Name') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <input
                        type="text"
                        name="showName"
                        id="showName"
                        v-model="showName"
                        autocomplete="showName"
                        class="new-project-form__input"
                        placeholder="" />
                </div>
            </div>
    </div>
    <div class="new-project-form__row">
            <label for="episodeName" class="new-project-form__label">{{ t('Episode Name') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <input
                        type="text"
                        name="episodeName"
                        id="episodeName"
                        v-model="episodeName"
                        autocomplete="episodeName"
                        class="new-project-form__input"
                        placeholder="" />
                </div>
            </div>
    </div>
    <div class="new-project-form__actions">
            <button type="button" 
            :class="classes"
            @click="saveFileDetails"
            :disabled="!isChanged"
            >{{ t(btnText) }}</button>
        
        </div>
    </div>
   </form>
    </div>  
   </div>
<div class="min-w-[293px] max-w-[293px] sticky h-[calc(100vh-69px)] top-0"></div>
</template>

<script setup>
import languageStore from '@/store/LanguageStore';
import { computed } from 'vue'
import { useMainStore } from "~/store/main";
const mainStore = useMainStore()
const runtimeConfig = useRuntimeConfig()
const fileName =ref(mainStore.currentMedia?.name || 'Untitled')
const showName = ref(mainStore.currentMedia?.show_title && mainStore.currentMedia?.show_title != 'null' ? mainStore.currentMedia?.show_title :'' )
const episodeName = ref(mainStore.currentMedia?.episode_title && mainStore.currentMedia?.episode_title != 'null' ? mainStore.currentMedia?.episode_title :'' )
const base64Image = ref(mainStore.currentMedia?.image_url && mainStore.currentMedia?.image_url != null ? mainStore.currentMedia?.image_url :'')
const fileInput = ref(null);
const fileDetails = ref([])
const route = useRoute();
const btnText = ref('Save')
const isChanged = ref(false);

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const indigoClasses = ref('btn btn-submit btn_save-blue h-[38px] px-[17px] bg-indigo-600 text-white hover:bg-indigo-500 ring-indigo-600 hover:ring-indigo-500  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2')
const grayClasses = ref('btn btn-submit btn_save-gray h-[38px] px-[17px] bg-gray-400 text-white hover:bg-gray-600 ring-gray-400 hover:ring-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 sm:col-start-2') 
const classes = ref(grayClasses.value)

const isDelete = ref(false)
watch([showName, episodeName, fileName,base64Image], ([newShowName, newEpisodeName, newFileName,newBase64Image]) => {
      if (newShowName || newEpisodeName || newFileName || newBase64Image) {
        classes.value = indigoClasses.value;
        isChanged.value = true;
      } else {
        classes.value = grayClasses.value;
        isChanged.value = false; 
      }
    });


const uploadFile=(e)=>{
    const file = e.target.files[0];
    if (!file) return;
    fileDetails.value = file;
    const fileURL = URL.createObjectURL(file);
        const imageElement = document.getElementById('uploaded-image');
        if (imageElement) {
            imageElement.src = fileURL;
        }
        if(file){
            base64Image.value = fileURL;
        }
        if (fileInput.value) {
           fileInput.value.value = null;
        }
}

function removeBeforeDotCom(url) {
    const index = url.indexOf('.com');
    if (index !== -1) {
        return url.substring(index + 5);
    }
    return url;
}

const saveFileDetails =()=>{
    btnText.value = 'Saved!'
    const formData = new FormData();
    if(isDelete.value){
        formData.append('s3_path', '');
    }else{
        formData.append('s3_path', mainStore.currentMedia?.image_url && mainStore.currentMedia?.image_url != null ? removeBeforeDotCom(mainStore.currentMedia?.image_url) : '');
    }
    formData.append('show_title', showName.value);
    formData.append('episode_title', episodeName.value);
    formData.append('original_filename', fileName.value);
    formData.append('image', fileDetails.value);
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/update`, {
				method: 'PUT',
				headers: {
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: formData
			})
         .then((response) => response.json())
         .then((data) => {
            if(data){
                mainStore.currentMedia.image_url = '';
                mainStore.retrieveUserMedia()
                mainStore.retrieveCurrentMedia(route.params.id)
                base64Image.value = ''
                isChanged.value = false; 
            }
        })
}

const deleteFile = ()=>{
    isDelete.value = true
    base64Image.value = ''
}

</script>

<style scoped>
.new-project-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }
    &__label {
        @apply text-sm leading-5 font-medium mb-1 inline-block text-gray-700;

    }
    &__row {
        @apply col-span-full pb-1;
        &:not(.last){
            @apply pb-4;
        }
    }
    &__input {
        @apply 
        block 
        flex-1 
        border-0 
        bg-transparent 
        py-2 
        px-3 
        text-gray-500
        placeholder:text-gray-300 
        focus:ring-0 
        text-sm
        leading-6 
        rounded-md
        shadow-sm	
        h-[38px];
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
    
        sm:flex
        sm:gap-x-3;
    }
}
.btn {
    @apply
    mt-3
    inline-flex
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
 
    &-change {
        @apply
        w-auto
        h-[34px]
        bg-white
        text-gray-700
        ring-gray-300
        px-[13px]
        py-2
        hover:bg-gray-50;
        
    }
}
</style>