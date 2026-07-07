<template>
    <div class="nav-action">
        <NavigationLangSelect />
        <NuxtLink to="/login" class="nav-action__login">
            {{ t('Log in') }}
        </NuxtLink>
        <NuxtLink
            v-if="displayUploadButton"
            to="/upload">
            <BaseButton color="black-outline">
                {{ t('Try it now') }}
            </BaseButton>
        </NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const route = useRoute()
const { status } = useSession()

const isUserLoggedIn = computed(() => {
  return status.value == 'authenticated';
})

const displayUploadButton = computed(() => {
  return route.name !== 'upload' && !isUserLoggedIn.value;
});
</script>
<style lang="scss" scoped>
.nav-action {
    @apply flex items-center flex-row space-x-4;
    
    &__login {
        @apply text-primary hover:text-black font-medium mr-6;

    }
}
</style>