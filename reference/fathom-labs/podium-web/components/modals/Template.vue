<template>
    <TransitionRoot as="template" :show="open">
        <Dialog as="div" class="relative z-50" @close="handleClose">
            <TransitionChild 
                as="template" 
                enter="ease-out duration-300" 
                enter-from="opacity-0" 
                enter-to="opacity-100" 
                leave="ease-in duration-200" 
                leave-from="opacity-100" 
                leave-to="opacity-0">
                <div class="screen" />
            </TransitionChild>

            <div class="modal__wrapper" :class="{' block_modal__wrapper':  props.size === 'max'}">
                <div class="modal__placement">
                    <TransitionChild 
                        as="template" 
                        enter="ease-out duration-300" 
                        enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" 
                        enter-to="opacity-100 translate-y-0 sm:scale-100" 
                        leave="ease-in duration-200" 
                        leave-from="opacity-100 translate-y-0 sm:scale-100" 
                        leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        <DialogPanel class="modal__body"
                            :class="{
                                'sm': props.size === 'sm',
                                'lg': props.size === 'lg',
                                'xl': props.size === 'xl',
                                'xxl': props.size === 'xxl',
                            }">
                            <slot />
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
  
<script setup lang="ts">
    import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
    import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
  
    const props = defineProps({
        open: { type: Boolean, required: true },
        size: { type: String, required: false, default: 'md' },
    });
    
    //withDefaults(defineProps<{
    //    open: boolean,
    //    size: 'sm' | 'md' | 'lg',
    //}>(), {
    //    open: false,
    //    size: 'md'
    //})

    const emit = defineEmits(['close'])

    const handleClose = () => {
        emit('close')
    }
    
</script>
<style lang="scss" scoped>
.screen {
    @apply fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity;
}
.modal {
    &__wrapper {
        @apply fixed inset-0 z-10 overflow-y-auto;
    }
    &__placement {
        @apply flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0;
    }
    &__body {
        @apply 
        relative 
        transform 
        rounded-lg 
        bg-white 
        p-6 pt-5 
        text-left 
        shadow-xl 
        transition-all 
        my-8 w-full max-w-lg;
        &.sm {
            @apply my-8 w-full;
            max-width: 330px;
        }
        &.lg {
            @apply my-8 w-full max-w-xl;
        }
        &.xl {
            @apply my-8 w-full max-w-2xl; // Change the width here as needed
        }
        &.xxl {
            @apply my-8 w-full max-w-4xl; // Change the width here as needed
        }
    }
}
</style>