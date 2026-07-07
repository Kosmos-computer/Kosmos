<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'lg'">
        <FormsLanguage
            @close="handleClose" />
    </ModalsTemplate>
</template>

<script setup lang="ts">
  
    const props = withDefaults(defineProps<{
        open: boolean
        }>(), {
        open: false
        })

    const emit = defineEmits(['close'])

    const handleClose = () => {
        emit('close')
    }
    

</script>