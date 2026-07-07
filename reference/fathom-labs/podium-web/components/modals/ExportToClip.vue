<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'md'">

        <Export  
            @close="handleClose" :clipId="props.id"/>
    </ModalsTemplate>
</template>

<script setup lang="ts">
    const props = withDefaults(defineProps<{
        open: boolean,
        id : number
        }>(), {
        open: false
        })

    const emit = defineEmits(['close'])

    const handleClose = () => {
        emit('close')
    }
    
    

</script>