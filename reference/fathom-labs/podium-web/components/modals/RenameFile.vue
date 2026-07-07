<template>
    <ModalsTemplate :open="open" @close="handleClose">
        <FormsRenameFile :name="$props.name" :media-id="$props.mediaId" @close="handleClose" @submit="handleSubmit($event)" :source="$props.src" />
    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
  
    withDefaults(defineProps<{
        mediaId: String,
        open: boolean,
        file?: Object | null
        name?: String
        src? : string
    }>(), {
        open: false,
        file: null
    })

    const emit = defineEmits(['close', 'submit'])

    const handleClose = () => {
        emit('close')
    }
    
    const handleSubmit = (e) => {
        emit('submit', e)
    }

  </script>