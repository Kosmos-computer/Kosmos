<template>
    <SwitchGroup as="div" class="flex items-center" v-if="mainStore.user.current_subscription_renews_on ==null">
      <Switch
        :modelValue="enabled"
        :class="['bg-gray-200', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ']"
      >
        <span
          aria-hidden="true"
          :class="['translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"
        />
      </Switch>
      <SwitchLabel as="span" class="ml-3 text-sm">
        <span class="font-medium text-gray-900">{{ t('Disabled') }}</span>
      </SwitchLabel>
    </SwitchGroup>
    <SwitchGroup as="div" class="flex items-center" v-else>
      <Switch
        :modelValue="enabled"
        @update:modelValue="toggle"
        :class="[enabled ? 'bg-indigo-600' : 'bg-gray-200', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2']"
      >
        <span
          aria-hidden="true"
          :class="[enabled  ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"
        />
      </Switch>
      <SwitchLabel as="span" class="ml-3 text-sm">
        <span class="font-medium text-gray-900">{{ enabled  ? t('Enabled') : t('Disabled') }}</span>
      </SwitchLabel>
    </SwitchGroup>
</template>
  
  <script setup>
  import { ref, watch, computed } from 'vue'
  import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue'
  import { storeToRefs } from 'pinia'
  import {useMainStore} from "~/store/main"
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

  const mainStore = useMainStore()
  const mainStoreState = storeToRefs(mainStore)
  const { params, query } = useRoute();
  const runtimeConfig = useRuntimeConfig()
  const props = defineProps({
    modelValue: Boolean,
  })
  const emit = defineEmits(['update:modelValue'])
  const enabled = ref(props.modelValue)
  watch(enabled, (newValue) => {
    emit('update:modelValue', newValue)
  })
  const toggle = (value) => {
    enabled.value = value
    saveApiAccess()
  }
  const saveApiAccess =()=>{
    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/settings/set/api_access`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                  },
                  body: JSON.stringify({
                    value: enabled.value.toString(),
                  })
      })
      .then((response) => {
        if (response.ok) {
            mainStore.retrieveUser(null)
            return response.json()
        } else {
            return response.text().then(text => { throw new Error(text) })
        }
      })
  }
  </script>
  