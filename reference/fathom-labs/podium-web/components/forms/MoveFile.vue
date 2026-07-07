<template>
    <form class="new-file-form">
        <h2 class="new-file-form__title">{{ t('Select Project to Move File') }}</h2>
        <div class="new-file-form__row last">
            <Menu as="div" class="relative inline-block text-left w-full">
                <div>
                    <MenuButton class="project-combobox">
                        {{ selectedProject.name }}
                        <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                    </MenuButton>
                </div>

                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                    <MenuItems class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div class="py-1" v-for="project in mainStoreState.projects.value" :key="project.id">
                            <MenuItem v-slot="{ active }">
                                <span @click="update(project)" :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer']">
                                    {{project.name}}
                                </span>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </transition>
            </Menu>
        </div>


        <div class="new-file-form__actions">
            <button type="button" class="btn btn-submit" @click="handleSubmit(data)">{{ t('Move File') }}</button>
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
    })
    import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
    import { ChevronDownIcon } from '@heroicons/vue/20/solid'
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
    const runtimeConfig = useRuntimeConfig()

    const emit = defineEmits(['close', 'submit'])
    
    onMounted(async () => {
        console.log(props)    
    })
    

    const selectedProject = ref({'name': 'Select Project'})

    const update = (project) => {
        selectedProject.value = project
    }

    const handleClose = () => {
        emit('close')
    }

    const handleSubmit = (data) => {
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${props.mediaId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
            body: JSON.stringify({'name': null, 'project_id': selectedProject.value.id})
        })
        .then(response => response.json())
        .then(data => {
            mainStore.retrieveUserMedia()
            mainStore.retrieveUserProjectMedia()
            emit('close')
        })
    }
</script>
<style lang="scss" scoped>
.new-file-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }
    &__row {
        @apply col-span-full pb-1;
        &:not(.last){
            @apply pb-6;
        }
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