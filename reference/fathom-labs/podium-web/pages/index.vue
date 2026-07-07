<template>
</template>
  
<script setup>
definePageMeta({
  layout: "empty",
  auth: false
});

const { data, status, getCsrfToken, getProviders } = useSession()
const providers = await getProviders()
const csrfToken = await getCsrfToken()

// redirect to hello.podium.page if user is not authenticated
const podiumToken = useCookie('podium_token')

if (status.value == 'authenticated') {
    navigateTo('/dashboard')
} else {
    navigateTo('https://hello.podium.page', {external: true, redirectCode: 302})
}

onMounted(() => {
});
</script>
  
<style lang="scss" scoped>
</style>