<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'md'">
        <ClipImage :clipId="props.clipsId" :urlImage="props.srcUrl" :urlPath="props.imagePath"
        @close="handleClose" @submit="handleSubmit"  />

        <FormsClipImage   />
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