<template>
    <ModalsTemplate :open="open" :size="'lg'" >
        <FormsAddFile :project-id="$props.projectId" :languageCode="$props.languageCode" @close="handleClose" @submit="handleSubmit($event)" @selectedLanguageCode="selectedLanguageCode($event)" @setType="setType($event)"/>
    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
  
    withDefaults(defineProps<{
        open: boolean,
        projectId?: String | null,
        file?: Object | null
    }>(), {
        open: false,
        projectId: null,
        file: null
    })
    const languageCode=ref(null)
    const contentType=ref('Podcast')
    const emit = defineEmits(['close', 'submit'])
    const handleClose = () => {
        emit('close')
    }
    function selectedLanguageCode(e){
        return  languageCode.value=e
    }
    function setType(e){
        return  contentType.value=e
    }
    const handleSubmit = (e) => {
        emit('submit', e,languageCode.value,contentType.value)
    }
 

  </script>