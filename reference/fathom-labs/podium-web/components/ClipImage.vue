<template>
    <div>
      <div class="block text-lg leading-6 font-medium text-gray-900">
          {{ t('Feature Image') }}
      </div>
      <div class="my-16">
      <div v-if="loadershow" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
        style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
        <SvgLoadingMd />

     </div>
        <div  class="flex justify-center space-x-4 mt-4"> 
        <div class="flex space-x-4 justify-center">
            <div
                 class="flex flex-col items-center space-y-4 h-auto w-auto cursor-pointer rounded-lg">
                    <img class="w-full h-full object-cover rounded-lg" :src="props.urlPath"  alt="Selected Image"  />
            </div>
        </div>
      </div>
      </div>
      <div class="form__actions">
              <button type="button" class="btn btn-submit" @click="updateImage(props.urlImage)">{{ t('Upload') }}</button>
              <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useMainStore } from "~/store/main";
  import { computed } from 'vue'
  import languageStore from '@/store/LanguageStore';

  const t = computed(() => {
    return key => {
      const translation = languageStore.state.translations[key];
      return translation || key;  // Fallback to key if translation not found
    };
  });
  const mainStore = useMainStore()
  const runtimeConfig = useRuntimeConfig()
  const emit = defineEmits(['close'])
  const props = defineProps(['clipId','urlImage','urlPath'])
  const loadershow = ref(false)
  const clipUploadedImage = ref('')

    const handleClose = () => {
        emit('close')
        emit('submit', props.urlPath)
    }

    const updateImage = (file) => {
    loadershow.value = true;
    var data = { original_filename: file[0].name };

    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${props.clipId}/image_upload/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data) {
            mainStore.currentMediaClip = {
                imageName: data.url + data.key,
            };
            clipUploadedImage.value = data.url + data.key;

            const formData = new FormData();
            formData.append("acl", 'public-read');
            formData.append("key", data.key);
            formData.append("signature", data.signature);
            formData.append("policy", data.policy);
            formData.append("AWSAccessKeyId", data.AWSAccessKeyId);
            formData.append("file", file[0]);
            const requestOptions = {
                method: "POST",
                body: formData,
                redirect: "follow"
            };

            fetch(data.url, requestOptions)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(result => {
                    loadershow.value = false;
                    emit('close');
                })
                .catch(error => {
                    loadershow.value = false;
                });
        } else {
            loadershow.value = false;
        }
    })
    .catch(error => {
        loadershow.value = false;
    });
};

//     const updateImage=(file)=>{
//         loadershow.value = true
//         var data = { original_filename : file[0].name }
//         fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/clip/${props.clipId}/image_upload/`, {
//             method: 'POST',
//                 headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
//                 },
//             body: JSON.stringify(data)
//         })
//         .then(response => response.json())
//         .then(data => {
//             if(data){
//                 mainStore.currentMediaClip = {
//                     imageName : data.url+data.key,
//                 }
//                 clipUploadedImage.value = data.url+data.key
//                 const formdata = new FormData();
//                 formdata.append("key", data.key);
//                 formdata.append("signature", data.signature);
//                 formdata.append("policy", data.policy);
//                 formdata.append("AWSAccessKeyId", data.AWSAccessKeyId);
//                 formdata.append("file", file[0]);
//                 formdata.append("acl",'public-read')
//                 const requestOptions = {
//                                 method: "POST",
//                                 body: formdata,
//                                 redirect: "follow"
//                         };
//                     fetch(data.url, requestOptions)
//                         .then((response) => response.text())
//                         .then((result) =>{
//                             loadershow.value = false, 
//                             emit('close') })
//                         .catch((error) => console.error(error));
//             }
//             if (!data) {
//                 alert('There was an error.')
//             } 
//         })
//    }  


  </script>
  
  <style lang="scss" scoped>
  .form {
      &__actions {
          @apply
          mt-0
          sm:mt-0
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
  }
  </style>