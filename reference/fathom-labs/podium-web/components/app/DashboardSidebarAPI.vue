<template>
    <div class="relative h-full">
        <div class="py-2 px-4 mb-2">
            <NavigationLogo />
        </div>
        <AppDashboardLinksApi />
        <NavigationUserDropdownDash class="sidebar-dropdown" />
    </div>
</template> 
<style lang="scss" scoped>
    .sidebar-dropdown {
        @apply absolute w-full bottom-0 right-0 border-t p-4;
    }
</style>