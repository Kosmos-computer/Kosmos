<template>
    <form class="new-project-form">
        <h2 class="new-project-form__title">{{ t('Edit Project') }}</h2>
        <div class="new-project-form__row">
            <label class="new-project-form__label">Artwork Image</label>
            <div class="flex items-center "  >
                <div class="w-12 h-12 rounded-md mr-4" v-if="!base64Image || base64Image == 'null'" >
                    <svg width="48" height="49" viewBox="0 0 48 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect y="0.5" width="48" height="48" rx="8" fill="#F3F4F6"/>
                        <path d="M15 19.5V29.5C15 30.6046 15.8954 31.5 17 31.5H31C32.1046 31.5 33 30.6046 33 29.5V21.5C33 20.3954 32.1046 19.5 31 19.5H25L23 17.5H17C15.8954 17.5 15 18.3954 15 19.5Z" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="w-12 h-12 rounded-lg flex items-center justify-center mr-4" v-if="base64Image && base64Image != 'null'">
                  <img class="rounded-lg w-full h-full object-cover " :src="base64Image" id="uploaded-image" alt="Uploaded Image"  >
                </div>
                <label for="fileInput" type="button" class="btn btn-change cursor-pointer">{{ base64Image && base64Image != 'null' ? 'Change' : 'Add' }}</label>
                <input type="file" ref="fileInput" id="fileInput" name="fileInput" class="hidden" @change="uploadImage($event)" accept="image/*"/>
                <div v-if="base64Image && base64Image != 'null'" class="ml-4 cursor-pointer" @click="deleteImage">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.6666 4.66667L12.0884 12.7617C12.0386 13.4594 11.458 14 10.7585 14H5.24145C4.54193 14 3.96135 13.4594 3.91151 12.7617L3.33329 4.66667M6.66663 7.33333V11.3333M9.33329 7.33333V11.3333M9.99996 4.66667V2.66667C9.99996 2.29848 9.70148 2 9.33329 2H6.66663C6.29844 2 5.99996 2.29848 5.99996 2.66667V4.66667M2.66663 4.66667H13.3333" stroke="#9CA3AF" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12.6666 4.66667L12.0884 12.7617C12.0386 13.4594 11.458 14 10.7585 14H5.24145C4.54193 14 3.96135 13.4594 3.91151 12.7617L3.33329 4.66667M6.66663 7.33333V11.3333M9.33329 7.33333V11.3333M9.99996 4.66667V2.66667C9.99996 2.29848 9.70148 2 9.33329 2H6.66663C6.29844 2 5.99996 2.29848 5.99996 2.66667V4.66667M2.66663 4.66667H13.3333" stroke="black" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
        <div class="new-project-form__row">
            <label for="projectName" class="new-project-form__label">{{ t('Project Name') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <input 
                        type="text" 
                        name="projectName" 
                        id="projectName"
                        v-model="projectName"
                        @input="removeClass"
                        autocomplete="projectName" 
                        class="new-project-form__input" 
                        placeholder="" />
                </div>
            </div>
        </div>
        <div class="new-project-form__row">
            <Menu as="div" class="relative text-left w-full mr-0">
                <div>
                  <label class="new-project-form__label">Default Content Type</label>
                  <MenuButton class="project-combobox">
                    <span class="flex flex-row items-center">
                        <img v-if="selectAnOption == 'Podcast' ||  selectAnOption == 'podcast'" :src="PodcastSvg" alt="prodcast" class="mr-4"/>
                        <img v-else-if="selectAnOption == 'Video' || selectAnOption == 'video'" :src="VideoSvg" alt="Video" class="mr-4"/>
                        <img v-if="selectAnOption == 'Educational' || selectAnOption == 'educational'" :src="EducationalSvg" alt="Educational" class="mr-4"/>
                        <img v-if="selectAnOption == 'Religious' || selectAnOption == 'religious'" :src="ReligiousSvg" alt="Religious" class="mr-4"/>
                        <img v-if="selectAnOption == 'Customer Call' || selectAnOption == 'customer_call'" :src="CustomerCallSvg" alt="Customer Call" class="mr-4"/>
                        <img v-if="selectAnOption == 'Meeting' || selectAnOption == 'meeting'" :src="MeetingSvg" alt="Meeting" class="mr-4"/>
                        {{ selectAnOption }} 
                    </span>
                    <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                  </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
                  <MenuItems
                    class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div class="py-0 border-none" v-for="content in contentTypeDefault">
                      <MenuItem v-slot="{ active  }">
                      <span  @click="updateOptions(content)"
                        :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer relative',
                        ]">
                        <img v-if="content == 'Podcast' || content == 'podcast'" :src="PodcastSvg" alt="prodcast" class="mr-4"/>
                        <img v-else-if="content == 'Video' || content == 'video'" :src="VideoSvg" alt="Video" class="mr-4"/>
                        <img v-else-if="content == 'Educational' || content == 'educational'" :src="EducationalSvg" alt="Educational" class="mr-4"/>
                        <img v-else-if="content == 'Spiritual' || content == 'spiritual'" :src="ReligiousSvg" alt="Religious" class="mr-4"/>
                        <img v-else-if="content == 'Customer Call' || content == 'customer_call'" :src="CustomerCallSvg" alt="Customer Call" class="mr-4"/>
                        <img v-else-if="content == 'Meeting' || content == 'meeting'" :src="MeetingSvg" alt="Meeting" class="mr-4"/>
                        {{ content?.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') }}
                        <span v-if="content==selectAnOption" class="slectedIcon absolute right-6 ">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                          </svg>
                        </span>
                      </span>
                    
                      </MenuItem>
                    </div>
                  </MenuItems>
                </transition>
            </Menu>
        </div>
        <!-- <div class="new-project-form__row">
            <label for="RSS" class="new-project-form__label">Podcast RSS URL</label>
            <label for="RSS" class="new-project-form__label">{{ t('Podcast RSS URL') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <span class="new-project-form__input-before">https://</span>
                    <input 
                        type="text" 
                        name="RSS" 
                        id="RSS" 
                        autocomplete="props.project.podcast_rss_url" 
                        v-model="podcastUrl"
                        class="new-project-form__input" 
                        placeholder="" />
                </div>
            </div>
        </div>
        <div class="new-project-form__row">
            <label for="YouTube" class="new-project-form__label">{{ t('YouTube Channel URL') }}</label>
            <div class="new-project-form__input-row">
                <div class="new-project-form__input-wrapper">
                    <span class="new-project-form__input-before">https://</span>
                    <input 
                        type="text"
                        name="YouTube" 
                        id="YouTube" 
                        autocomplete="YouTube" 
                        v-model="youtubeUrl"
                        class="new-project-form__input" 
                        placeholder="" />
                </div>
            </div>
        </div> -->

        <div class="new-project-form__row">
            <label for="about" class="new-project-form__label">{{ t('About') }}</label>
            <div class="new-project-form__input-row">
                <textarea 
                    id="about" 
                    name="about" 
                    rows="4" 
                    v-model="description"
                    :placeholder="t('Add the description of your project here.')"
                    class="new-project-form__textarea" />
            </div>
        </div>
        <button type="button" class="mb-4 inline-flex text-sm font-sm text-red-600" @click="handleDelete">{{ t('Delete Project') }}</button>

  
        <div class="new-project-form__actions">
            <button type="button" class="btn btn-submit" @click="handleSave">{{ t('Save') }}</button>
            <button type="button" class="btn btn-cancel" @click="handleCancel" ref="cancelButtonRef">{{ t('Cancel') }}</button>
        </div>
    </form>
</template>
  
<script setup>
import {computed } from 'vue'
import { useMainStore } from "~/store/main"
import { storeToRefs } from 'pinia'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import languageStore from '@/store/LanguageStore';
import PodcastSvg from '@/assets/icons/podcast.svg';
import VideoSvg from '@/assets/icons/video.svg';
import EducationalSvg from '@/assets/icons/educational.svg';
import ReligiousSvg from '@/assets/icons/religious.svg';
import MeetingSvg from '@/assets/icons/meeting.svg';
import CustomerCallSvg from '@/assets/icons/customercall.svg';



    const mainStore = useMainStore()
    const mainStoreState = storeToRefs(mainStore)
    const runtimeConfig = useRuntimeConfig()
    const base64Image =ref('')
    const emit = defineEmits(['close', 'submit'])
    const props = defineProps(['project'])
    const fileDetails = ref([])
    const fileInput = ref(null);
    const projectCopy = JSON.parse(JSON.stringify(props.project))   // create a copy of project
    const podcastUrl = ref(projectCopy.podcast_rss_url && projectCopy.podcast_rss_url != 'null' && projectCopy.podcast_rss_url != 'undefined' ? projectCopy.podcast_rss_url :'')
    const youtubeUrl = ref(projectCopy.youtube_channel_url && projectCopy.youtube_channel_url != 'null' && projectCopy.youtube_channel_url != 'undefined' ? projectCopy.youtube_channel_url :'')
    const description = ref(projectCopy.description && projectCopy.description !='null' && projectCopy.description != 'undefined' ? projectCopy.description : '')
    const projectName = ref(projectCopy.name)
    console.log('projectCopy', projectCopy)
    const selectAnOption =ref(projectCopy.content_type && projectCopy.content_type != null? projectCopy.content_type : 'podcast') 
    const contentTypeDefault = ref([
    'Podcast','Video','Educational','Spiritual','Customer Call', 'Meeting'
    ])
    const updateOptions = (content) => {
        selectAnOption.value = content
    }
    base64Image.value = projectCopy.image_url

    const t = computed(() => {
      return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
      };
    });

    const handleCancel = () => {
        emit('close')
    }

    const handleSave = () => {
        const projectNameInput = document.getElementById('projectName');
        if(projectNameInput.value.trim() === ''){
            projectNameInput.focus();
            projectNameInput.classList.add('red-border');
        }else{
            const formData = new FormData();
            formData.append('name', projectName.value);
            formData.append('description', description.value);
            if(fileDetails.value.length != 0){
            formData.append('image', fileDetails.value);
            }else{
            formData.append('image_url', base64Image.value);
            }
            // formData.append('podcast_rss_url', podcastUrl.value);
            // formData.append('youtube_channel_url', youtubeUrl.value);
            formData.append('content_type', selectAnOption.value);
            fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/project/${projectCopy.id}/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: formData
            })
            .then((response) => {
                if (response.ok) {
                    return response.json()
                } else {
                    return response.text().then(text => { throw new Error(text) })
                }
            })
            .then(data => {
                // replace project in store
                mainStoreState.projects.value = mainStoreState.projects.value.map(project => {
                    if (project.id == data.id) {
                        return data
                    }
                    return project
                })
                emit('close')
            })
            .catch((error) => {
                alert(error)
            })
        }
    }

    const uploadImage = (e) => {
        const file = e.target.files[0];
        fileDetails.value = file;
        if (!file) return;
        const fileURL = URL.createObjectURL(file);
        const imageElement = document.getElementById('uploaded-image');
        if (imageElement) {
            imageElement.src = fileURL;
        }
        base64Image.value = fileURL;
        if (fileInput) {
            fileInput.value = null;
        }
    }

    const deleteImage =()=>{
        base64Image.value = ''
    }

    const handleDelete = () => {
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/project/${props.project.id}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                //delete project from mainStore.projects
                const deletedProjectId = props.project.id
                mainStoreState.projects.value = mainStoreState.projects.value.filter(project => project.id != deletedProjectId)
                mainStoreState.media.value = mainStoreState.media.value.filter(media => media.project_id != deletedProjectId)
                navigateTo('/projects')
            })
    }

    const removeClass = (source)=>{
            document.getElementById('projectName').classList.remove('red-border')
    }
    onMounted(() => {

    })
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
        @apply col-span-full pb-6;
    }
    &__input {
        @apply 
        block 
        flex-1 
        border-0 
        bg-transparent 
        py-2 
        pl-2 
        text-gray-900
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
            text-sm
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
        sm:mt-2 
        sm:grid 
        sm:grid-flow-row-dense 
        sm:grid-cols-2 
        sm:gap-3;
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
        focus-visible:outline-indigo-700;
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
.project-combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md mt-2 bg-white
    px-3 py-2
    text-sm leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
}
.red-border {
      border: 1px solid red;
    }
</style>