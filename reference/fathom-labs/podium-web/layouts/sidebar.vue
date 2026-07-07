<template>
    <div>
        <div class="h-full flex flex-col">
            <CreditsHeader/>
            <NavigationHeader />
            <slot/>
        </div>
        <NavigationMobileMenu />
    </div>
</template>