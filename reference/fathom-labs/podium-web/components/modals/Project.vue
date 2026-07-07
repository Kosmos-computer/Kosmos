<template>
    <ModalsTemplate :open="open" @close="handleClose">
        <FormsNewProject 
            v-if="type === 'create'" 
            @close="handleClose" 
            @submit="handleSubmit($event)" />
        <FormsEditProject
            v-if="type === 'edit'" 
            :project="props.project"
            @close="handleClose" 
            @submit="handleSubmit($event)" />
    </ModalsTemplate>
</template>
  
<script setup lang="ts">
  
    const props = withDefaults(defineProps<{
        open: boolean,
        type: 'create' | 'edit',
        project?: object | null
        }>(), {
        open: false,
        type: 'create',
        project: null
    })

    const open = computed(() => props.open)
    const type = computed(() => props.type)
    const data = computed(() => props.data)

    const emit = defineEmits(['close', 'submit'])

    const handleClose = () => {
        emit('close')
    }
    
    const handleSubmit = (e) => {
        emit('submit', e)
    }

  </script>