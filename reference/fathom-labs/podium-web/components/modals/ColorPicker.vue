<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'md'">
        <ColorPick  
            @close="handleClose" @backgroundColor="getColor" :source="props.src" :selectedColorCode="props.selectedClr"/>
    </ModalsTemplate>
</template>

<script setup lang="ts">
  
    const props = withDefaults(defineProps<{
        open: boolean,
        src : string,
        selectedClr : string
        }>(), {
        open: false
        })

    const emit = defineEmits(['close','backGroundClr'])

    const handleClose = () => {
        emit('close')
    }
    const getColor = (data)=>{
        console.log('in colorpick compo',data)
        emit('backGroundClr',data)
        emit('close')
    }
    

</script>