<template>
  <div>
    <div class="h-screen flex flex-col">
        <CreditsHeader/>
        <NavigationHeader/>
        <div 
          class="h-full bg-white"
          style="overflow-y: auto;"
        >
          <slot/>
        </div>
    </div>
    <NavigationMobileMenu/>

  </div>
</template>