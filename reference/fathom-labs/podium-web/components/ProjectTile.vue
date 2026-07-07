<template>
  <div class="upload-file-cards flex flex-wrap my-4 gap-[18px]">
    <div 
    :class="['upload-file-card transition-color duration-300 ease-in-out hover:bg-gray-50 cursor-pointer overflow-hidden group ' ]" 
      @mouseenter="highlightProject(i)"
      @mouseleave="unhighlightProject(i)" 
      v-for="(project, i) in sortedProjects" 
      :key="i"
    >
      <div class="flex flex-row justify-between mb-4 relative" >
      <NuxtLink  :to="`/projects/${project.id}`" :class="['upload-file-card__podcast-image-wrapper transition-color duration-300 ease-in-out', highlightedProject === i ? 'bg-indigo-100' : 'bg-indigo-50']">
        <svg v-if="!project.image_url || project.image_url == 'null'" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      <img :class="['w-full h-full object-cover transition-all duration-300 ease-in-out', highlightedProject === i ? 'bg-gray-800 opacity-80' : '']" v-if="project.image_url && project.image_url != 'null'" :src="project.image_url">
      </NuxtLink>
      <div class="upload-file-card__project-actions absolute top-4 right-4 z-10">
        <Menu as="div" class="relative inline-block text-left">
          <div>
            <MenuButton class="flex items-center rounded-full bg-white text-gray-400 hover:text-gray-600 focus:outline-none">
              <span class="sr-only">{{ t('Open options') }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>


            </MenuButton>
          </div>

          <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
            <MenuItems class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div class="py-1 border-b">
                <MenuItem v-slot="{ active }">
                  <span @click="handleViewProject(project.id)" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'block px-4 py-2 text-sm']">
                    {{ t('View Project') }}
                  </span>
                </MenuItem>
              </div>  
              <div class="py-1  border-b">
                <MenuItem v-slot="{ active }">
                  <span  @click="selectedProject = project; openSettingsModal = true"  :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'block px-4 py-2 text-sm']">
                    {{ t('Settings') }}
                  </span>
                </MenuItem>
              </div>            
              <div class="py-1">
                <MenuItem v-slot="{ active }">
                  <span @click="selectedProject = project; openDeleteModal = true;" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'block px-4 py-2 text-sm']">
                    {{ t('Delete') }}
                  </span>
                </MenuItem>
              </div>
            </MenuItems>
          </transition>
        </Menu>
      </div>
      </div>
      
      <div @click="handleViewProject(project.id)" class="upload-file-card__project-information">
        <NuxtLink :to="`/projects/${project.id}`" class="upload-file-card__project-name truncate-two-lines">{{ project.name }}</NuxtLink>
        <p class="upload-file-card__quick-actions">
          <span v-show="project.latest_media_uploaded_at != null">{{ t('Last upload') }} {{ formattedDate(project.latest_media_uploaded_at) }}</span>
        </p>
      </div>
    </div>
    <ModalsDelete :open="openDeleteModal" @close="openDeleteModal = false" type="project" :project="selectedProject" />
    <ModalsProject 
          :open="openSettingsModal" 
          type="edit"
          :project="selectedProject"
          @close="closeSettingsModal"
          @submit="handleSubmit($event)" />
  </div>
</template>

<script setup>
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ref, computed } from 'vue';
import moment from 'moment';
import { useMainStore } from "~/store/main";
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
return key => {
  const translation = languageStore.state.translations[key];
  return translation || key;  // Fallback to key if translation not found
};
});

const props = defineProps(['sort'])    
const mainStore = useMainStore();
const openDeleteModal = ref(false);
const selectedProject = ref(null);
const highlightedProject = ref(null);
const openSettingsModal = ref(false);
const highlightProject = (index) => {
  highlightedProject.value = index;
}

const unhighlightProject = (index) => {
  highlightedProject.value = null;
}

const sortedProjects = computed(() => {
  if (props.sort == 'Last Upload') {
    return [...mainStore.projects].sort((a, b) => {
      //sort by latest_media_uploaded_at, nulls last
      if (a.latest_media_uploaded_at == null) {
        return 1;
      } else if (b.latest_media_uploaded_at == null) {
        return -1;
      } else {
        return b.latest_media_uploaded_at.localeCompare(a.latest_media_uploaded_at);
      }
    });
  } else {
    return [...mainStore.projects].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }
});

const formattedDate = (date) => {
    const localDate = moment(date).local()
    const today = moment().startOf('day')
    const yesterday = moment().add(-1, 'day').startOf('day')

    if (date > today) return 'today'
    if (date > yesterday) return 'yesterday'
    return localDate.format('MMM DD YYYY');
};

const handleViewProject = (id) => {
  navigateTo(`/projects/${id}`)
}

const closeSettingsModal = () => {
console.log("Parent close")
openSettingsModal.value = false
}

const handleSubmit = (data) => {
  console.log(data)
}
</script>
<style lang="scss" scoped>
.upload-file-card {
  @apply flex flex-col border border-gray-200 rounded-lg shadow-sm w-[245px] min-h-[245px];

  &__podcast-image-wrapper {
    @apply flex items-center justify-center w-full h-[111px] ;
  }
  &__project {
    &-information {
      @apply mr-auto flex-1 px-6 pb-4;
    }
    &-name {
      @apply text-gray-900 text-lg leading-5 font-semibold mb-2 mt-0;
    }
    &-actions {

    }
  }
  &__file-name {
    @apply text-sm text-gray-900 font-medium ;
  }
  &__quick-actions {
    @apply text-xs leading-5 font-normal;
    span {
      @apply text-gray-500;
    }
    .action {
      @apply text-indigo-600 hover:text-indigo-500 hover:underline;
    }
  }
}
.truncate-two-lines {
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
text-overflow: ellipsis;
height: 4.5rem; /* Adjust based on your line-height and font-size */
line-height: 1.5rem; /* Example line height */
}


</style>
