<template>
<RadioGroup v-model="selected">
  <RadioGroupLabel class="sr-only">API Metric</RadioGroupLabel>
  <div class="flex flex-wrap space-x-4">
    <RadioGroupOption class="flex-1" v-for="value in apidata" :key="value.counter" :value="value"  v-slot="{ active, checked }">
        <div  @click="openChart(value.type)"  :class="[active? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300', 'relative block cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none flex-1 flex']">
        <span class="flex items-center">
          <span class="flex flex-col text-sm" >
            <RadioGroupLabel as="span" class="font-medium text-gray-900">{{ value.counter }}</RadioGroupLabel>
            <RadioGroupDescription as="span" class="text-gray-500">
              <span class="block">{{ value.type }}</span>
            </RadioGroupDescription>
          </span>
        </span>
        <span  :class="[active ? 'border' : 'border-2', checked ? 'border-indigo-600' : 'border-transparent', 'pointer-events-none absolute -inset-px rounded-lg']" aria-hidden="true" />
      </div>
    </RadioGroupOption>
  </div>
</RadioGroup>
</template>
  
<script setup>
  import { ref } from 'vue'
  import { RadioGroup, RadioGroupDescription, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
  const emits = defineEmits(['selectedRadioType'])

  const props = defineProps(['creditConsumed','hoursProcessed','apiCallsMade'])

  function convertMinutesToHoursAndMinutes(minutes) {
    var hours = Math.floor(minutes / 60);
    var remainingMinutes = minutes % 60;
    return hours + " hours and " + remainingMinutes + " minutes";
}

  const apidata = ref([
    { counter: props.creditConsumed, type: 'Credits Consumed' },
    { counter: convertMinutesToHoursAndMinutes(props.creditConsumed), type: 'Hours Processed' },
    { counter: props.apiCallsMade , type: 'API Calls Made' },
  ])

  const selected = ref(apidata.value[0]) 

  const openChart =(type)=>{
    emits('selectedRadioType',type)
  }
</script>

  