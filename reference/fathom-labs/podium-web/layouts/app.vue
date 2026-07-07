<template>
  <div>
    <div class="h-screen flex flex-col">
      <NavigationHeader v-if="!isRouteJob && !isRouteDashboard"/>
      <NavigationJobHeader v-if="isRouteJob"/>
      <div 
        id="scrollingBody"
        class="h-full bg-gray-50"
        style="overflow-y: auto;"
      >
        <slot />
      </div>
    </div>
    <NavigationMobileMenu/>
  </div>
</template>
<script setup>
const route = useRoute()

const isRouteDashboard = computed(() => {
  route.fullPath.includes('dashboard') || route.fullPath.includes('projects') ;
})

const isRouteJob = computed(() => {
  return route.name == 'job' || route.fullPath.includes('job') ;
})

</script>