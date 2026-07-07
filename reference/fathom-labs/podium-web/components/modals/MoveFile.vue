<template>
    <ModalsTemplate :open="open" @close="handleClose">
        <FormsMoveFile :media-id="$props.mediaId" @close="handleClose" @submit="handleSubmit($event)" />
    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
  
    withDefaults(defineProps<{
        mediaId: String,
        open: boolean,
        file?: Object | null
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