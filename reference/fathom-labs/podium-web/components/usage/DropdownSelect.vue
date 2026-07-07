<template>
 <div class="new-file-form__row">
                   <VueDatePicker  v-model="date" :model-value="date" 
                     @update:model-value="handleSelect"  :defaultContentType="null" 
                    :range="{ fixedStart: false }" :clearable="false" :enable-time-picker="false"
                     />
        </div>
</template>
  
<script setup>
  import { ref } from 'vue'
  import moment from 'moment';
  const emits = defineEmits(['updateChartToSelectedDate'])
  import VueDatePicker from '@vuepic/vue-datepicker';
  import '@vuepic/vue-datepicker/dist/main.css';
  const date = ref();
  
  const handleSelect = (date)=>{
    if(date){
        var dateRange = ref({
                dateFrom :  moment(date[0]).format('YYYY-MM-DD'),
                dateTo :  moment(date[1]).format('YYYY-MM-DD')
            })
        emits('updateChartToSelectedDate',dateRange.value)
    }
  }

  onMounted(()=>{
    const today = ref(new Date());
    const firstDayOfMonth = new Date(today.value.getFullYear(), today.value.getMonth(), 1);
    const lastDayOfMonth = new Date(today.value.getFullYear(), today.value.getMonth() + 1, 0);
    date.value = [moment(firstDayOfMonth).format('YYYY-MM-DD'), moment(lastDayOfMonth).format('YYYY-MM-DD')]
    var dateRange = ref({
        dateFrom : date.value[0],
        dateTo : date.value[1]
    })
    emits('updateChartToSelectedDate',dateRange.value)
    handleSelect()
  })
  watch(()=>{
    handleSelect()
  })
</script>
<style scoped>
.project-combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md bg-white
    px-3 py-2
    text-sm leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
}

</style>