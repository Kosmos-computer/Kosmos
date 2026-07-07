<template>
  <div v-if="loadershow" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
   style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
   <SvgLoadingMd />
     </div>
   <div class="fixed top-0 bottom-0 right-0 left-0 bg-black opacity-50 z-50 "> </div>
   <div v-if="!openChangeAllSpeakersModal" id="speakersModal"
     class="fixed  top-0 left-0 right-0 bottom-0 overflow-y-auto flex items-start justify-center px-4 sm:px-0 z-60 text-gray-900 min-w-fit">
     <Transition name="bounce" appear>
       <div class="min-w-[500px] p-6 flex flex-col bg-white rounded-lg bg-white relative top-28">
         <div class="text-xl leading-6 font-medium pb-6">
           {{ props.editSpeakerInfo?.spkId ? t('Edit Speaker Name') : t('Add New Speaker Name') }}
         </div>
         <div class="set-speakers-form">
           <div class="pb-0">
             <div class="flex flex-row items-center">
               <div class="set-speakers-form__input-wrapper mr-3 relative flex-1">
                 <input type="text" name="projectName" id="projectName" class="set-speakers-form__input w-full font-normal"
                   autocomplete="off"  v-model="speakerName"  
                   :placeholder="props.editSpeakerInfo?.spkName ? t(props.editSpeakerInfo?.spkName) : t('Speaker Name')" />
               </div>
               <Menu as="div" class="relative text-left w-36 mr-0">
                 <div>
                   <MenuButton class="set-speakers-form__combobox">
                     {{ t(speakerRole) }}
                     <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                   </MenuButton>
                 </div>
                 <transition enter-active-class="transition ease-out duration-100"
                   enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                   leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                   leave-to-class="transform opacity-0 scale-95">
                   <MenuItems
                     class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                     <div class="py-1" v-for="role in roleList">
                       <MenuItem v-slot="{ active }">
                       <span @click="speakerRole = roleList[0] = role"
                         :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-2 py-2 text-xs cursor-pointer']">
                         {{ t(role) }}
                       </span>
                       </MenuItem>
                     </div>
                   </MenuItems>
                 </transition>
               </Menu>
 
             </div>
           </div>
           <div class="flex flex-row gap-3 pt-6">
             <button type="button" class="btn btn-submit"
               @click="openChangeAllSpeakersNameModalAddNewSpeakerName(props.currentSpeakerId,props.currentSpeakersmIndex)">{{ props.editSpeakerInfo.spkId ?  t('Save')  : t('Change') }}</button>
             <button type="button" class="btn btn-cancel" @click="handleClose()" ref="cancelButtonRef">{{ t('Cancel') }}</button>
           </div>
 
         </div>
       </div>
     </Transition>
   </div>
   <ChangeAllSpeakerModal v-if="openChangeAllSpeakersModal" @close="closeChangModal"  :updatedSpeakerName="speakerName"
     :currentSpeakerId="props.currentSpeakerId" :currentSpeakerNames="props.currentSpeakerNames" :newSpeakerId="newSpeakersId" 
     @latestSpeakerNames="getLatestData" 
      />
 </template>
 
 <script setup>
 import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
 import { ChevronDownIcon } from '@heroicons/vue/20/solid'
 import { useMainStore } from "~/store/main";
 import { storeToRefs } from 'pinia'
 import languageStore from '@/store/LanguageStore';

 const props = defineProps(['editSpeakerInfo','transcript','transcriptData', 'modalVisible', 'cancelButtonText', 'currentSpeakerId','currentSpeakersmIndex','currentSpeakerNames','from','firstChildMindex','lastChildEindex'])
 const emits = defineEmits(['update:transcript', 'update:modalVisible', 'close','latestSpeakersName',])
 const roleList = ref([
   'Host', 'Guest', 'Co-host', 'Ad', 'Announcement', 'Caller', 'Interviewer', 'Interviewee', 'None'
 ])
 const mainStore = useMainStore()
 const { updateMediaTranscript } = storeToRefs(mainStore)
 const runtimeConfig = useRuntimeConfig()
 const route = useRoute()
 const speakerName = ref('')
 const openChangeAllSpeakersModal = ref(false)
 const speakerRole = ref('None')
 const newSpeakersId = ref('')
 

 const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

 const resetValues = () => {
     speakerName.value = '';
     speakerRole.value = 'None';
   };
   
 watch(() => props.editSpeakerInfo,
   (newVal) => {
     if (newVal && Object.keys(newVal).length > 0) {
       speakerName.value = props.editSpeakerInfo?.spkName|| ''
       speakerRole.value = props.editSpeakerInfo?.spkRole || 'None'
     } else {
       resetValues()
     }
   }, {immediate : true})
  
 const handleClose = () => {
   resetValues()
   updateMediaTranscript.value = false
   emits('close')
 }
 const loadershow=ref(false)
 
 const getLatestData=(data)=>{
   emits('latestSpeakersName',data)
 }
 
 const getContinuesSpeakerMonologues = (speakerId,monologueId) => {
   var monologues = []
   for (var i = monologueId; i < props.transcriptData.monologues.length; i++) {
     if (props.transcriptData.monologues[i].speaker_id == speakerId) {
       monologues.push(i)
     }
     else {
       break
     }
   }
   return monologues
 }
 
 function updateSpeaker(id, newSetName, newDefaultName, newSetRole) {
     const index = mainStore.currentMediaTranscript.speakers.findIndex(speaker => speaker.id === id);
     // If the object is found, update its properties
     if (index !== -1) {
       mainStore.currentMediaTranscript.speakers[index].set_name = newSetName;
      //  mainStore.currentMediaTranscript.speakers[index].default_name = newDefaultName;
       mainStore.currentMediaTranscript.speakers[index].set_role = newSetRole;
     } 
 }
 
 const openChangeAllSpeakersNameModalAddNewSpeakerName = (currentSpeakerId,mIndex) => {
   if(props.editSpeakerInfo?.spkId ){
    const textInput = document.getElementById('projectName');
    if (textInput.value.trim() === '') {
     textInput.focus();
     textInput.classList.add('red-border');
     return }
    mainStore.transcriptSavingSavedState = "Saving..."
     // here call api for update spk
     var speakersToSave = [{
       id: props.editSpeakerInfo?.spkId,
       set_name:  speakerName.value,
       set_role:  speakerRole.value
     }]
       fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
         },
         body: JSON.stringify(speakersToSave)
       })
     .then(response => response.json())
     .then(data => {
       if(data){
          mainStore.transcriptSavingSavedState = "Saved"
          updateSpeaker(props.editSpeakerInfo?.spkId, speakerName.value, speakerName.value, speakerRole.value);
          speakerRole.value = ''
          speakerName.value = ''
          emits('latestSpeakersName',mainStore.currentMediaTranscript)
          emits('close')
       }else {
         alert('There was an error saving the speakers. Please try again.')
       } 
     })
 
   }else{
     const textInput = document.getElementById('projectName');
     mainStore.transcriptSavingSavedState = "Saving..."
   if (textInput.value.trim() === '') {
     textInput.focus();
     textInput.classList.add('red-border');
   }else{
   loadershow.value=true
     var data = {
     set_name: speakerName.value,
     set_role: speakerRole.value
   }
   fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id }/transcript/speakers/add`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
     },
     body: JSON.stringify(data)
   })
     .then(response => response.json())
     .then(data => {
          mainStore.transcriptSavingSavedState = "Saved"
           if(data && updateMediaTranscript.value){
             mainStore.transcriptSavingSavedState = "Saving..."
             newSpeakersId.value = data.id
             loadershow.value = true
               var data={
                 speaker_id: data.id,
                 monologue_index: mIndex,
                 start:props.firstChildMindex,
                 end:props.lastChildEindex
               }
               fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id }/transcript/speakers/split`, {
                 method: 'POST',
                 headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                 },
                 body: JSON.stringify(data)
               })
               .then(response => response.json())
               .then(data => {
                mainStore.transcriptSavingSavedState = "Saved"
                 loadershow.value = false
                 emits('latestSpeakersName',data)
                 handleClose()
                   if (!data) {
                     alert('There was an error saving the speakers. Please try again.')
                   } 
                 })
           }else{
             mainStore.transcriptSavingSavedState = "Saving..."
             loadershow.value = true
             newSpeakersId.value = data.id
             var data=[]
             var monologues = getContinuesSpeakerMonologues(currentSpeakerId,mIndex)
               for (var i = 0; i < monologues.length; i++) {
                 data.push({
                 speaker_id: currentSpeakerId,
                 new_speaker_id:  newSpeakersId.value,
                 monologue_index: monologues[i]
                 })
               }
             fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/change`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
               },
               body: JSON.stringify(data)
             })
                   .then(response => response.json())
                   .then(datas=>{
                     if(datas){
                        mainStore.transcriptSavingSavedState = "Saved"
                       loadershow.value=false
                       emits('latestSpeakersName',datas)
                       openChangeAllSpeakersModal.value = true
                     }
                   })
           }
       if (!data) {
         alert('There was an error saving the speakers. Please try again.')
       } else {
         emits('update:modalVisible', false)
       }
     })
   }
   }
   
 }
 
 const closeChangModal = () => {
   openChangeAllSpeakersModal.value = false
   handleClose()
 }
 onMounted(()=>{
  // console.log(tra)
 })
 
  
 </script>
 
 <style lang="scss" scoped>
 .bounce-enter-active {
   animation: bounce-in .5s;
 }
 
 .bounce-leave-active {
   animation: bounce-in .5s linear;
 }
 
 @keyframes bounce-in {
   0% {
     transform: scale(0);
   }
 
   100% {
     transform: scale(1);
   }
 }
 
 .set-speakers-form {
   &__input {
     @apply block flex-1 border-0 bg-transparent py-2 pl-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 text-sm leading-6 rounded-md outline-0;
 
     &-before {
       @apply bg-gray-50 text-gray-300 border border-gray-300 rounded-tl-md rounded-bl-md flex select-none items-center pl-3 sm:text-base pr-2;
       margin-left: .5px;
       margin-top: .5px;
       margin-bottom: .6px;
     }
 
     &-row {
       @apply mt-2;
     }
 
     &-wrapper {
       @apply block rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-1 focus-within:ring-inset focus-within:ring-indigo-600;
     }
   }
 
   &__combobox {
     @apply inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm leading-6 font-normal text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
   }
 }
 
 .btn {
   @apply mt-3 inline-flex w-full justify-center rounded-md px-3 py-2.5 text-sm leading-5 font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;
 
   &-submit {
     @apply bg-indigo-700 text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
   }
 
   &-cancel {
     @apply bg-white text-gray-900 ring-gray-300 hover:bg-gray-50;
   }
 
   &-change {
     @apply w-auto bg-white text-gray-900 ring-gray-300 hover:bg-gray-50;
   }
 }
 .red-border {
       border: 1px solid red;
     }
 </style>
