<template>
    <ModalsTemplate :open="open">
        <form class="new-project-form">
            <h2 class="new-project-form__title pt-1">{{ t('Save Summary Template') }}</h2>
            <div class="new-project-form__row">
                <label for="nameText" class="new-project-form__label">
                    {{ t('This template will apply to all future shownotes in this project. Any text outside a defined block will not be saved in the template.') }}
                    <span class="new-project-form__span">{{ t('Saving will override any previous template settings.') }}</span>
                </label>
            </div>
            <div class="flex flex-col gap-2.5">
                <div v-for="(preset, key) in currentTemplatesList" :key="key" 
                     draggable="true" 
                     @dragstart="onDragStart(key)" 
                     @dragover.prevent 
                     @drop="onDrop(key)" 
                     class="flex cursor-pointer bg-gray-50 hover:bg-indigo-50 shadow px-5 py-4 rounded-lg">
                    <div class="flex gap-4 items-center w-full text-sm font-medium leading-5 mb-1">
                        <SvgShowNotesMenu />
                        <span class="flex-1 font-bold text-md text-gray-700">{{ t(preset) }}</span>
                        <span @click.stop="deletePreset(preset)">
                            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2C5 0.895431 5.89543 0 7 0H11C12.1046 0 13 0.895431 13 2V4H15.9897C15.9959 3.99994 16.0021 3.99994 16.0083 4H17C17.5523 4 18 4.44772 18 5C18 5.55228 17.5523 6 17 6H16.9311L16.1301 17.2137C16.018 18.7837 14.7117 20 13.1378 20H4.86224C3.28832 20 1.982 18.7837 1.86986 17.2137L1.06888 6H1C0.447715 6 0 5.55228 0 5C0 4.44772 0.447715 4 1 4H1.99174C1.99795 3.99994 2.00414 3.99994 2.01032 4H5V2ZM3.07398 6L3.86478 17.0712C3.90216 17.5946 4.3376 18 4.86224 18H13.1378C13.6624 18 14.0978 17.5946 14.1352 17.0712L14.926 6H3.07398ZM11 4H7V2H11V4ZM7 8C7.55228 8 8 8.44772 8 9V15C8 15.5523 7.55228 16 7 16C6.44772 16 6 15.5523 6 15V9C6 8.44772 6.44772 8 7 8ZM11 8C11.5523 8 12 8.44772 12 9V15C12 15.5523 11.5523 16 11 16C10.4477 16 10 15.5523 10 15V9C10 8.44772 10.4477 8 11 8Z" fill="#9CA3AF"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2C5 0.895431 5.89543 0 7 0H11C12.1046 0 13 0.895431 13 2V4H15.9897C15.9959 3.99994 16.0021 3.99994 16.0083 4H17C17.5523 4 18 4.44772 18 5C18 5.55228 17.5523 6 17 6H16.9311L16.1301 17.2137C16.018 18.7837 14.7117 20 13.1378 20H4.86224C3.28832 20 1.982 18.7837 1.86986 17.2137L1.06888 6H1C0.447715 6 0 5.55228 0 5C0 4.44772 0.447715 4 1 4H1.99174C1.99795 3.99994 2.00414 3.99994 2.01032 4H5V2ZM3.07398 6L3.86478 17.0712C3.90216 17.5946 4.3376 18 4.86224 18H13.1378C13.6624 18 14.0978 17.5946 14.1352 17.0712L14.926 6H3.07398ZM11 4H7V2H11V4ZM7 8C7.55228 8 8 8.44772 8 9V15C8 15.5523 7.55228 16 7 16C6.44772 16 6 15.5523 6 15V9C6 8.44772 6.44772 8 7 8ZM11 8C11.5523 8 12 8.44772 12 9V15C12 15.5523 11.5523 16 11 16C10.4477 16 10 15.5523 10 15V9C10 8.44772 10.4477 8 11 8Z" fill="black" fill-opacity="0.2"/>
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
            <div class="new-project-form__actions">
                <button type="button" class="btn btn-submit" @click="updateShowNotesCustomTemplate()">{{ t('Save Template') }}</button>
                <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
            </div>
        </form>
    </ModalsTemplate>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMainStore } from "~/store/main";
import languageStore from '@/store/LanguageStore';
const runtimeConfig = useRuntimeConfig();

const t = computed(() => {
    return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
    };
});

const mainStore = useMainStore();
const props = defineProps(['open', 'showNotesCustomId', 'title', 'content', 'type', 'templatesList']);
const emit = defineEmits(['close', 'submit']);

function removeLastColon(text) {
    // Check if the last character is a colon
    if (text.endsWith(':')) {
        // Remove the last character (the colon) and return the modified string
        return text.slice(0, -1);
    }
    // If no colon at the end, return the original string
    return text;
}
// State to track the drag and drop
const dragIndex = ref(null);
const originalTemplatesList = ref([]); // Stores original order
const currentTemplatesList = ref([]);

const updateShowNotesCustomTemplate = () => {
    // console.log(props.templatesList, 'props.templatesList')
    // return
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/v1/show-notes-template/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
        },
        body: JSON.stringify({ templates: currentTemplatesList.value })
    })
    .then(response => response.json())
    .then(data => {
        if (data) {
            // presets.value = data.templates;
            originalTemplatesList.value = [...currentTemplatesList.value];
            mainStore.getTemplateForamt()
            emit('close');
        }
    })
    .catch(error => {
        console.error('Error checking progress:', error);
    });
};

const deletePreset = (deletedData) => {
    currentTemplatesList.value = currentTemplatesList.value.filter(item => item !== deletedData);
};

const handleClose = () => {
    currentTemplatesList.value = [...originalTemplatesList.value];
    props.open = false;
    emit('close');
};

const onDragStart = (index) => {
    dragIndex.value = index;
};

const onDrop = (index) => {
    if (dragIndex.value !== null) {
        const draggedPreset = currentTemplatesList.value[dragIndex.value];
        currentTemplatesList.value.splice(dragIndex.value, 1);
        currentTemplatesList.value.splice(index, 0, draggedPreset);
        dragIndex.value = null; // Reset drag index
    }
};

watch(()=>props.open, (a,b)=>{
    originalTemplatesList.value = [...props.templatesList];
    currentTemplatesList.value = [...props.templatesList];
})
onMounted(() => {
    // Initialize both original and current list
    originalTemplatesList.value = [...props.templatesList];
    currentTemplatesList.value = [...props.templatesList];
    console.log(currentTemplatesList.value, '2222222222222222')
});
</script>

<style lang="scss" scoped>
.new-project-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }
    &__label {
        @apply text-sm leading-5 font-medium mb-1 text-gray-500;
    }
    &__span {
               @apply text-sm leading-5 font-medium mb-1 text-gray-900;
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
</style>