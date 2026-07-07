<template>
    <div>
        <div class="h-full flex flex-col">

            <CreditsHeader/>
            <NavigationHeader/>
            <div
                id="scrollingBody" 
                class="h-full bg-gray-50"
                style="overflow-y: auto;"
            >
                <slot />
                <!-- <NavigationFooter/> -->
            </div>
        </div>
        <NavigationMobileMenu/>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const props = defineProps<{
    hideFooter: boolean;
}>();

const showFooter = computed(() => route.fullPath !== '/dashboard' || props.hideFooter);

</script>