<template>
    <ModalsTemplate :open="open" @close="handleClose" :size="'xl'">
        <IntroducingShownotes  
            @close="handleClose" />
    </ModalsTemplate>
</template>

<script setup lang="ts">
import IntroducingClips from '../IntroducingClips.vue';

  
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