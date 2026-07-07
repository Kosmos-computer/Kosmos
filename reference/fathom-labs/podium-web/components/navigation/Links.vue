<template>
    <div class="nav-links">
        <!--
        <NuxtLink to="https://hello.podium.page/#what-you-get" 
            class="nav-links--link">
            What you get
        </NuxtLink>
        <NuxtLink to="https://hello.podium.page/pricing" class="nav-links--link">
            Pricing
        </NuxtLink>
        <NuxtLink to="https://hello.podium.page/api" class="nav-links--link">
            API
        </NuxtLink>
        <NuxtLink to="https://hello.podium.page/affiliates" class="nav-links--link">
            Affiliate Program
        </NuxtLink>
        <NuxtLink to="https://hello.podium.page/blog" class="nav-links--link">
            Resources
        </NuxtLink>
        -->
    </div>
</template>
<style lang="scss" scoped>
.nav-links {
    @apply flex items-center justify-center h-full;
    &--link {
        @apply hover:text-black font-medium text-primary font-inter text-lg tracking-tight h-full px-5;
    }
}
</style>