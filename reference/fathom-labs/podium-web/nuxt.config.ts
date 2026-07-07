// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
	modules: [
		'@nuxtjs/tailwindcss',
		'@pinia/nuxt',
		'@nuxtjs/apollo',
		'@sidebase/nuxt-auth',
		'nuxt-gtag',
	],
	runtimeConfig: {
		BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
		openaiApiKey: process.env.OPENAI_API_KEY,
		public: {
				baseUrl: process.env.BASE_URL,
				fathomWebApiURL: process.env.FATHOM_WEB_API_URL,
				heapId: process.env.HEAP_ID,
				videoEditorUrl : process.env.REMOTION_BASE_URL,
				BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY
			}
	},
	loading: {
		color: 'blue',
		height: '5px'
	},
	pinia: {
		autoImports: [
		// automatically imports `defineStore`
		'defineStore', // import { defineStore } from 'pinia'
		],
	},
  gtag: {
    id: 'G-VCR0QWVBJD'
  },
	css: [
		'@/assets/css/main.scss'
	],
	app: {
		head: {
			title: 'Podium',
			htmlAttrs: {
			  lang: 'en'
			},
			meta: [
			  { charset: 'utf-8' },
			  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
			  { hid: 'description',property: 'description', name: 'description', content: 'Automatically generate show notes, chapters, transcripts, clips, and more for your podcast using AI.' },
			  { hid: 'og:description',property: 'og:description', name: 'og:description', content: 'Automatically generate show notes, chapters, transcripts, clips, and more for your podcast using AI.' },
			  { hid: 'og:image:width', property: 'og:image:width', name: 'og:image:width', content: "1200" },
			  { hid: 'og:image:height', property: 'og:image:height', name: 'og:image:height', content: "630" },
			  { hid: 'og:type', property: 'og:type', name: 'og:type', content: 'website' },
			  { hid: 'og:url', property: 'og:url', name: 'og:url', content: 'https://podium.page' },
			  { hid: 'og:title', property: 'og:title', name: 'og:title', content: 'Podium.page - Try for FREE' },
			  { hid: 'og:image', property: 'og:image', name: 'og:image', content: 'https://framerusercontent.com/modules/xMpatu9LyObhrj4vXWua/BqgpaBhhNysLBpoG5ZFd/assets/nf3BSUqGe8fSWN2dUF1oTq2p4yQ.png' },
			  { hid: 'og:site_name', property: 'og:site_name', name: 'og:site_name', content: 'Podium' },
			  { hid: 'twitter:site', property: 'twitter:site', name: 'twitter:site', content: '@PodiumDotPage' }
			],
			link: [
			  { key: 'favicon', rel: 'icon', type: 'image/png', href: 'https://framerusercontent.com/modules/xMpatu9LyObhrj4vXWua/BqgpaBhhNysLBpoG5ZFd/assets/oBJZ45rWi64Ua2RNQXS4FQwNTLw.svg' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
			],
			script: [
			]
		  }
	},
	auth: {
		// The module is enabled. Change this to disable the module
		isEnabled: true,
		// The origin is set to the development origin. Change this when deploying to production by setting `origin` in this config before build-time or by exporting `AUTH_ORIGIN` by running `export AUTH_ORIGIN=...`
		origin: process.env.BASE_URL,
		// The base path to the authentication endpoints. Change this if you want to add your auth-endpoints at a non-default location
		basePath: '/api/auth',
		// Whether to periodically refresh the session. Change this to `true` for a refresh every seconds or set this to a number like `5000` for a refresh every 5000 milliseconds (aka: 5 seconds)
		enableSessionRefreshPeriodically: false,
		// Whether to refresh the session whenever a window focus event happens, i.e, when your user refocuses the window. Set this to `false` to turn this off
		enableSessionRefreshOnWindowFocus: false,
		// Whether to add a global authentication middleware that will protect all pages without exclusion
		enableGlobalAppMiddleware: true,
		// Select the default-provider to use when `signIn` is called. Setting this here will also effect the global middleware behavior: E.g., when you set it to `github` and the user is unauthorized, they will be directly forwarded to the Github OAuth page instead of seeing the app-login page
		defaultProvider: undefined,
		// Configuration of the global auth-middleware (only applies if you set `enableGlobalAppMiddleware: true` above!)
		globalMiddlewareOptions: {
			// Whether to allow access to 404 pages without authentication. Set this to `false` to force users to sign-in before seeing `404` pages. Setting this to false may lead to vue-router problems (as the target page does not exist)
			allow404WithoutAuth: true
		}
	},
	apollo: {
		autoImports: true,
		clients: {
			default: {
				httpEndpoint: process.env.FATHOM_WEB_API_URL + '/graphql',
				tokenName: 'podium_token',
				tokenStorage: 'cookie',
				authType: 'Bearer',
				authHeader: 'Authorization',
				defaultOptions: {
					query: {
						fetchPolicy: 'network-only',
						errorPolicy: 'all',
					},
				}
			},
		},
	},
	sass: {
		sassOptions: {
		  includePaths: ['node_modules'],
		},
	},
	nitro: {
		routeRules: {
		  '/api/**': { cors: true }
		}
	  }
})