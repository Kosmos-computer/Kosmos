<template>
    <div>
      <div v-if="chartLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
  style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
  <SvgLoadingMd />

    </div>
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <div class="sm:flex sm:items-center">
            <p class="mt-0 text-base text-gray-900">Showing results for: </p>
            <div class="mx-2">
                <UsageDropdownSelect @updateChartToSelectedDate="getSelectedDateRange"/>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!chartLoader" class="mt-8">
        <UsageRadioCards  :creditConsumed="creditConsume"  :apiCallsMade="apiCallMade" @selectedRadioType="getRadioType"/>
      </div>
      <div class="mt-20 w-full text-center">
        <client-only>
        <VueApexCharts v-if="!chartLoader"  :options="chartOptions" :series="series" type="line" height="350" />
        </client-only>
      </div>
    </div>
</template>
  
<script setup>
  import { ref } from 'vue'
  import moment from 'moment'
  import VueApexCharts from 'vue3-apexcharts';
  import {useMainStore} from "~/store/main"
  const runtimeConfig = useRuntimeConfig()
  const mainStore = useMainStore()
  const creditConsume = ref(0)
  const apiCallMade = ref(0)
  const creditsOfArray = ref([])
  const emits = defineEmits(['updateChartToSelectedDate','selectedRadioType'])
  const updatedDateOfArray = ref([])
  const dateRangeFrom =ref()
  const dateRangeTo = ref()
  const chartLoader = ref(false)
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});



function roundUp(num) {
    return Math.ceil(num);
}
function roundUpArray(array) {
  return array.map(Math.ceil);
}

  function processData(data) {
    // Initialize objects to store results
    let dateCreditsSum = {};
    let dateApiCalls = {};

    // Process the data
    data.forEach(entry => {
        let updatedAt = entry.updated_at;
        let credits = entry.credits;
        // Extract date from ISO format datetime string
        let date = new Date(updatedAt).toISOString().split('T')[0];

        // Sum credits for each date
        if (dateCreditsSum[date]) {
            dateCreditsSum[date] += credits;
        } else {
            dateCreditsSum[date] = credits;
        }

        // Count API calls for each date
        if (dateApiCalls[date]) {
            dateApiCalls[date] += 1;
        } else {
            dateApiCalls[date] = 1;
        }
    });

    // Convert objects to arrays for output
    let dates = Object.keys(dateCreditsSum).sort();
    let creditsSum = dates.map(date => dateCreditsSum[date]);
    let creditsPerMinute = creditsSum.map(credits => credits / 60);
    let apiCalls = dates.map(date => dateApiCalls[date]);

    // Return the arrays
    return {
        dates: dates,
        creditsSum: creditsSum,
        creditsPerMinute: creditsPerMinute,
        apiCalls: apiCalls
    };
}


  const getSelectedDateRange=(data)=>{
    if(data && data !=undefined){
        dateRangeFrom.value = data.dateFrom
        dateRangeTo.value = data.dateTo 
        dashboardData()
    }
  }
const getRadioType =(val)=>{
    if(val === 'API Calls Made'){
      series.value = []
      series.value.push(
        {name: 'API Calls',data: apicall.value})
    } else if(val === 'Credits Consumed'){
      series.value = []
      series.value.push(
        {name: 'Credits',data: roundUpArray(creditsOfArray.value)})
    }else if(val === 'Hours Processed'){
      series.value = []
      series.value.push(
        {name: 'Hours',data: apihours.value})
    }
}


const apihours = ref([])
const apicall = ref([])
const dashboardData = async()=>{
      chartLoader.value = true
      updatedDateOfArray.value = new Array();
      creditsOfArray.value  = new Array();
      apihours.value  = new Array();
      apicall.value  = new Array();
      await fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/user/credits_usage?from_date=${dateRangeFrom.value}&to_date=${dateRangeTo.value}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
					}
				})
        .then(response => response.json())
        .then(data => {
          creditConsume.value = roundUp(data.creditsConsumed)
          apiCallMade.value = data.apiCallsMade
            const getLatestResult = processData(data.data)
            creditsOfArray.value.push(...getLatestResult.creditsSum);
            updatedDateOfArray.value.push(...getLatestResult.dates);
            apihours.value.push(...getLatestResult.creditsSum);
            apicall.value.push(...getLatestResult.apiCalls)
          })
          series.value =[{
                  name: 'Credits',
                  data: roundUpArray(creditsOfArray.value)
            },
          ],
             chartOptions.value = ({
              chart: {
                  id: 'basic-line',
                  type: 'area',
                  stacked: false,
                  zoom: {
                    type: 'x',
                    enabled: true,
                    autoScaleYaxis: true
                  },
                  toolbar: {
                    autoSelected: 'zoom'
                  },
                  

             },
        dataLabels: {
          enabled: false
        },
        markers: {
          size: 0,
        },
        xaxis: {
          type: 'datetime',
          categories:updatedDateOfArray.value
        },
        colors: ["#4f46e5", "#4f46e5"],
        yaxis: {
        labels: {
          formatter: function (value) {
            return parseFloat(value); // Format to two decimal places
          }
        },
      }
            })

          chartLoader.value = false
          
  }

 const chartOptions = ref(null)

 const series = ref([])
 
onMounted(()=>{
  getSelectedDateRange()
})
</script>
<style lang='scss' scoped>
</style>