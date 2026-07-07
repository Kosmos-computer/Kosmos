<template>
    <ModalsTemplate :open="open" size="sm" @close="handleClose">
        <div>

                <DialogTitle as="h3" class="text-lg	font-medium leading-6 text-gray-900">{{ t('Add the name of your episode') }}</DialogTitle>
                <div class="set-speakers-form mt-5">
                <div class="set-speakers-form__input-wrapper ">
                    <input
                        type="text"
                        name="episodeName"
                        id="episodeName"
                        v-model="episodeName"
                        class="set-speakers-form__input w-72"
                        autocomplete="on"
                        :placeholder="t('Episode Name')" />
                        <div class="mt-2">
                </div>
                </div>
                <p v-if="title!= ''" class="text-sm text-text-indigo-500 text-center">
                  {{ title }}
                </p>

            <div class="flex flex-row gap-3 pt-6">
              <button type="button" :disabled="episodeName === ''" :class="episodeName === '' ? grayClasses : indigoClasses" @click="handleSave()">
                <span v-if="!mainStoreState.titleLoading.value">{{ t("Save") }}</span>
                <div v-if="mainStoreState.titleLoading.value" class="loader-white">
                </div>
              </button>
              <button type="button" class="btn btn-cancel" @click="handleClose()" ref="cancelButtonRef">{{ t('Cancel') }}</button>
            </div>
  
          </div>
        </div>

    </ModalsTemplate>
</template>
<script setup lang="ts">
    import { withDefaults } from 'vue'
    import { DialogTitle } from '@headlessui/vue'
    import { useMainStore } from "~/store/main";
    import { storeToRefs } from 'pinia'
    import { computed } from 'vue'
    import languageStore from '@/store/LanguageStore';
    const t = computed(() => {
    return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
    };
    });
    const mainStore = useMainStore();
    const { titleLoading } = storeToRefs(mainStore)
    const mainStoreState = storeToRefs(mainStore)
    const episodeName = ref('')
    const indigoClasses = ref('btn btn-submit btn_save-blue h-[38px] px-[17px] bg-indigo-600 text-white hover:bg-indigo-500 ring-indigo-600 hover:ring-indigo-500  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2')
    const grayClasses = ref('btn btn-submit btn_save-gray h-[38px] px-[17px] bg-gray-400 text-white hover:bg-gray-600 ring-gray-400 hover:ring-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 sm:col-start-2') 

    const props = withDefaults(defineProps<{
        open: boolean,
        title: string
    }>(), {
        open: false,
        title: ''
    })

    const emit = defineEmits(['close', 'save'])

    const handleClose = () => {
        emit('close')
    }
    
    const handleSave = () => {
        emit('save',episodeName.value)
    }

  </script>

<style lang="scss" scoped>
.bounce-enter-active {
  animation: bounce-in .5s;
}

.bounce-leave-active {
  animation: bounce-in .5s linear;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}

.set-speakers-form {
  &__input {
      @apply
      block
      flex-1
      border-0
      bg-transparent
      py-2 pl-3
      text-gray-900
      placeholder:text-gray-400
      focus:ring-0
      text-sm
      leading-6
      rounded-md
      outline-0;
      &-before {
          @apply
          bg-gray-50
          text-gray-300
          border
          border-gray-300
          rounded-tl-md
          rounded-bl-md
          flex
          select-none
          items-center
          pl-3
          sm:text-base
          pr-2;
          margin-left:.5px;
          margin-top: .5px;
          margin-bottom: .6px;
      }
      &-row {
          @apply mt-2;
      }
      &-wrapper {
          @apply
          block
          rounded-md
          shadow-sm
          ring-1
          ring-inset
          ring-gray-300
          focus-within:ring-1
          focus-within:ring-inset
          focus-within:ring-indigo-600;
      }
  }
  
  &__combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md bg-white
    px-3 py-2
    text-sm leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
  }
}

.btn {
    @apply
    mt-3
    inline-flex
    w-full
    justify-center
    rounded-md
    px-3 py-2.5
    text-sm
    leading-5
    font-medium
    shadow-sm
    ring-1
    ring-inset
    sm:col-start-1
    sm:mt-0;
    &-submit {
        @apply
        bg-indigo-700
        text-white
        hover:bg-indigo-600
        focus-visible:outline
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-indigo-700 sm:col-start-2;
    }
    &-cancel {
        @apply
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
    &-change {
        @apply
        w-auto
        bg-white
        text-gray-900
        ring-gray-300
        hover:bg-gray-50;
    }
}
</style>