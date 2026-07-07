<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'xxl'">
        <DashboardTour  
            @close="handleClose" />
    </ModalsTemplate>
</template>

<script setup lang="ts">
  
    const props = withDefaults(defineProps<{
        open: boolean,
        clipsId : number,
        srcUrl : string[],
        imagePath : string
        }>(), {
        open: false
        })

    const emit = defineEmits(['close','submit'])

    const handleClose = () => {
        emit('close')
    }

    const handleSubmit = (data) => {
        emit('submit', data )
    }
    

</script>