export default defineNuxtPlugin((nuxtApp) => {
	const podiumTokenCookie = useCookie('podium_token')

	nuxtApp.hook('apollo:error', (error) => {
		console.error(error)
		// Handle different error cases
	})

	//nuxtApp.hook('apollo:auth', ({ client, token }) => {
  //  // `client` can be used to differentiate logic on a per client basis.
  //  // apply apollo client token
  //  token.value = podiumTokenCookie.value
  //})
})
