<template>
  <div v-if="!isRouteDashboard" class="nav__wrapper">
    <nav class="nav">
      <div class="nav__container">
        <NavigationLogo class="cursor-pointer" 
          @click="navigateToHome()" />
        <NavigationBackToDashboard v-if="!isRouteDashboard && !isRouteOnboarding && isUserLoggedIn && isRouteClip" />
        <NavigationLinks v-if="!isUserLoggedIn" />
        <!--<NavigationSearch v-if="isUserLoggedIn && isRouteDashboard" />-->
        <div class="flex flex-row space-x-4 items-center">
          <NavigationLangSelect v-if="isRouteOnboarding" />
          <NavigationUserDropdown simplified v-if="isUserLoggedIn && !isRouteClip" />
        </div>
        <NavigationDefaultActions v-if="!isUserLoggedIn && !isRouteClip" />
        <NavigationClipHeader v-if="isRouteClip" />
      </div>
    </nav>
  </div>
</template>

<script setup>
const { status } = useSession()
const route = useRoute()

const isRouteDashboard = computed(() => {
  return route.name == 'dashboard' || route.fullPath.includes('projects') || route.fullPath.includes('api')
})

const isRouteOnboarding = computed(() => {
  return route.name == 'upload' || route.name == 'new-user-info'
})

const isRouteClip = computed(()=>{
  return route.name =='job-jobId-clip-id'
})

const navigateToHome = async () => {
  if (status.value == 'authenticated' ) {
    await navigateTo('/dashboard')
  } else {
    await navigateTo('https://hello.podium.page', {external: true})
  }
};

const isUserLoggedIn = computed(() => {
  return status.value == 'authenticated';
})

</script>

<style lang="scss" scoped>
.nav {
  @apply bg-white py-2 border-b border-gray-200 fixed inset-0 bottom-auto z-20 h-[69px] flex items-center;
  &__container {
    @apply px-5 mx-auto flex items-center justify-between flex-1;
  }
  &__wrapper {
    min-height: 69px;
  }
}
</style>
