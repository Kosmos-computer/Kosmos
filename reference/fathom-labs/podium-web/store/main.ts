import podiumGetUser from '@/apollo/queries/podiumGetUser.gql';
import podiumGetUserPodiumPackages from '@/apollo/queries/podiumGetUserPodiumPackages.gql';



export const useMainStore = defineStore('main', {
	state: () => ({
		files: [],
		podiumPackageGuid: null,
		currentMedia: null,
		currentMediaAssets: null,
		currentMediaTranscript: null,
		currentMediaTranscriptAfterAddSpeaker:null,
		currentMediaLoading: false,
		currentMediaAssetsLoading: false,
		currentMediaTranscriptLoading: false,
		updateMediaTranscript: false,
		updateMediaTranscriptLoading:false,
		loadershow:false,
		currentMediaTranscriptAfterAddSpeakerLoading:false,
		currentMediaSpeakersSkipped: false,
		currentMediaShowSpeakersModal: false,
		currentMediaSideNavSelection: null,
		customPrompts: null,
		showNotesCustomPrompts: null,
		clipLists : null,
		templateFormatLists : [],
		apisKeyLists : null,
		user: null,
		mediaPage: 1,
		mediaPageSize: 20,
		mediaTotalCount: 0,
		mediaLoading: null,
		media: [],
		projects: [],
		mainUserLoader:false,
		language : 
		[
			{"code": "en", "name": "En-English"},
			{"code": "zh", "name": "Zh-Chinese"},
			{"code": "de", "name": "De-German"},
			{"code": "es", "name": "Es-Spanish"},
			{"code": "ru", "name": "Ru-Russian"},
			{"code": "ko", "name": "Ko-Korean"},
			{"code": "fr", "name": "Fr-French"},
			{"code": "ja", "name": "Ja-Japanese"},
			{"code": "pt", "name": "Pt-Portuguese"},
			{"code": "tr", "name": "Tr-Turkish"},
			{"code": "pl", "name": "Pl-Polish"},
			{"code": "ca", "name": "Ca-Catalan"},
			{"code": "nl", "name": "Nl-Dutch"},
			{"code": "ar", "name": "Ar-Arabic"},
			{"code": "sv", "name": "Sv-Swedish"},
			{"code": "it", "name": "It-Italian"},
			{"code": "id", "name": "Id-Indonesian"},
			{"code": "hi", "name": "Hi-Hindi"},
			{"code": "fi", "name": "Fi-Finnish"},
			{"code": "vi", "name": "Vi-Vietnamese"},
			{"code": "he", "name": "He-Hebrew"},
			{"code": "uk", "name": "Uk-Ukrainian"},
			{"code": "el", "name": "El-Greek"},
			{"code": "ms", "name": "Ms-Malay"},
			{"code": "cs", "name": "Cs-Czech"},
			{"code": "ro", "name": "Ro-Romanian"},
			{"code": "da", "name": "Da-Danish"},
			{"code": "hu", "name": "Hu-Hungarian"},
			{"code": "ta", "name": "Ta-Tamil"},
			{"code": "no", "name": "No-Norwegian"},
			{"code": "th", "name": "Th-Thai"},
			{"code": "ur", "name": "Ur-Urdu"},
			{"code": "hr", "name": "Hr-Croatian"},
			{"code": "bg", "name": "Bg-Bulgarian"},
			{"code": "lt", "name": "Lt-Lithuanian"},
			{"code": "la", "name": "La-Latin"},
			{"code": "mi", "name": "Mi-Maori"},
			{"code": "ml", "name": "Ml-Malayalam"},
			{"code": "cy", "name": "Cy-Welsh"},
			{"code": "sk", "name": "Sk-Slovak"},
			{"code": "te", "name": "Te-Telugu"},
			{"code": "fa", "name": "Fa-Persian"},
			{"code": "lv", "name": "Lv-Latvian"},
			{"code": "bn", "name": "Bn-Bengali"},
			{"code": "sr", "name": "Sr-Serbian"},
			{"code": "az", "name": "Az-Azerbaijani"},
			{"code": "sl", "name": "Mk-Macedonian"},
			{"code": "br", "name": "Br-Breton"},
			{"code": "eu", "name": "Eu-Basque"},
			{"code": "is", "name": "Is-Icelandic"},
			{"code": "hy", "name": "Hy-Armenian"},
			{"code": "ne", "name": "Ne-Nepali"},
			{"code": "mn", "name": "Mn-Mongolian"},
			{"code": "bs", "name": "Bs-Bosnian"},
			{"code": "kk", "name": "Kk-Kazakh"},
			{"code": "sq", "name": "Sq-Albanian"},
			{"code": "sw", "name": "Sw-Swahili"},
			{"code": "gl", "name": "Gl-Galician"},
			{"code": "mr", "name": "Mr-Marathi"},
			{"code": "pa", "name": "Pa-Punjabi"},
			{"code": "si", "name": "Si-Sinhala"},
			{"code": "km", "name": "Km-Khmer"},
			{"code": "sn", "name": "Sn-Shona"},
			{"code": "yo", "name": "Yo-Yoruba"},
			{"code": "so", "name": "So-Somali"},
			{"code": "af", "name": "Af-Afrikaans"},
			{"code": "oc", "name": "Oc-Occitan"},
			{"code": "ka", "name": "Ka-Georgian"},
			{"code": "be", "name": "Be-Belarusian"},
			{"code": "tg", "name": "Tg-Tajik"},
			{"code": "sd", "name": "Sd-Sindhi"},
			{"code": "gu", "name":  "Lo-Lao"},
			{"code": "uz", "name": "Uz-Uzbek"},
			{"code": "fo", "name": "Fo-Faroese"},
			{"code": "ht", "name": "Ht-Haitian creole"},
			{"code": "ps", "name": "Ps-Pashto"},
			{"code": "tk", "name": "Tk-Turkmen"},
			{"code": "nn", "name": "Nn-Nynorsk"},
			{"code": "mt", "name": "Mt-Maltese"},
			{"code": "sa", "name": "Sa-Sanskrit"},
			{"code": "lb", "name": "Lb-Luxembourgish"},
			{"code": "my", "name": "My-Myanmar"},
			{"code": "bo", "name": "Bo-Tibetan"},
			{"code": "tl", "name": "Tl-Tagalog"},
			{"code": "mg", "name": "Mg-Malagasy"},
			{"code": "as", "name": "As-Assamese"},
			{"code": "tt", "name": "Tt-Tatar"},
			{"code": "haw","name": "Haw-Hawaiian"},
			{"code": "ln", "name": "Ln-Lingala"},
			{"code": "ha", "name": "Ha-Hausa"},
			{"code": "ba", "name": "Ba-Bashkir"},
			{"code": "jw", "name": "Jw-Javanese"},
			{"code": "su", "name": "Su-Sundanese"}
		],
		projectMediaProjectId: null,
		projectMediaPage: 1,
		projectMediaPageSize: 20,
		projectMediaTotalCount: 0,
		projectMediaLoading: null,
		projectMedia: [],
		selectedNavGuid: null,
		notifications: [],
		lastDashboardRoute: '/dashboard',
		isDropdownOpen : false,
		isClipEdit : false,
		clipTitleByClipId : null,
		currentMediaClip : null,
		backToClip : false,
		clipProgress: 0,
		clipVideoUrl : null, 
		transcriptSavingSavedState : null,
		transcriptSavedState : null,
		clipSavingSavedState : null,
		mIndex : 0,
		showEditPrompt: false,
		titleLoading: false,
		aiLoading: false,
		dynamicBlocksContent: [],
		dynamicBlocksContentLoader: false,
	}),
	actions: {
		updateProgress(value) {
			  this.clipProgress = value
			},
		async initialize() {
			if (this.user != null) {
				this.retrieveUserProjects();
			}
		},
		  stringToBoolean(str){
			if(str){
			  str = str.toLowerCase();
			  if (str === 'true') {
				  return true;
			  }
			  else if (str === 'false') {
				  return false;
			  }
			  else {
				  return null;
			  }
			}
			  
		  },
		async retrieveUser(email : String) {
			this.mainUserLoader = true
				//const { data } = await useAsyncQuery(podiumGetUser, { email: email });
				//if (data.value && data.value.podiumGetUser) {
				//	this.user = data.value.podiumGetUser
				//}


				const base_url = useRuntimeConfig().public.fathomWebApiURL
				const token = this.getUserPodiumToken()

				const data = await $fetch(`${base_url}/api/podium/internal/v1/user`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					}
				}).catch((error) => {
					console.log(error)
				})

				if (data) {
					this.user = data
					this.mainUserLoader = false
				}
    },

		

		async setMediaPage(pageNumber : Number) {
			this.mediaPage = pageNumber
			this.retrieveUserMedia()
		},

		async retrieveUserMedia() {
			this.mediaLoading = true

			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			const data = await $fetch(`${base_url}/api/podium/clients/v1/media/list?page_size=${this.mediaPageSize}&page=${this.mediaPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
			if (data) {
				this.media = data.media
				this.mediaTotalCount = data.total_count
				this.mediaLoading = false
			}
		},

		async retrieveUserProjects() {
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			const data = await $fetch(`${base_url}/api/podium/clients/v1/projects/list?page_size=1000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

			if (data) {
				// sort by project name
				data.projects.sort((a, b) => (a.name > b.name) ? 1 : -1)
				this.projects = data.projects
			}	
		},

		async initializeSelectedProject() {
			if (this.projectMediaProjectId != this.selectedNavGuid) {
				this.projectMediaProjectId = this.selectedNavGuid
				this.projectMedia = []
				this.setProjectMediaPage(1)
			}
		},

		async setProjectMediaPage(pageNumber) {
			this.projectMediaPage = pageNumber
			this.retrieveUserProjectMedia()
		},

		async retrieveUserProjectMedia() {
			this.projectMediaLoading = true

			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()
			const project = this.projects.find(project => project.id === this.selectedNavGuid)
			if (!project) {
				return
			}

			const data = await $fetch(`${base_url}/api/podium/clients/v1/project/${project.id}/media/list?page_size=${this.projectMediaPageSize}&page=${this.projectMediaPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
			if (data) {
				this.projectMedia = data.media
				this.projectMediaTotalCount = data.total_count
				this.projectMediaLoading = false
			}
		},

		async retrieveCurrentMedia(id, refresh = true) {
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			if (refresh) {
				this.currentMediaLoading = true
			}

			let mediaFetch = $fetch(`${base_url}/api/podium/clients/v1/media/${id}`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.currentMedia = data;
				this.currentMediaLoading = false
				this.titleLoading = false
				const credits = this.user?.current_subscription_credits_balance + this.user?.additional_credits_balance
				if (!this.currentMedia.processing_completed) {
					if (credits > 0) {
						setTimeout(() => { this.refreshCurrentMedia() }, 5000)
					} else {
						this.refreshCurrentMedia()
					}
				}

				if (this.mediaProcessingTaskCompleted('generate_transcript', this.currentMedia) && refresh) {
					this.refreshCurrentMediaTranscript(true)
					
				}
				
				if (refresh) {
					this.refreshCurrentMediaAssets(true)
				}
			})
		},

		refreshCurrentMedia(indicateLoading=false) {
			if (this.currentMedia == null) { return }
			
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			if (indicateLoading) {
				this.currentMediaLoading = true
			}

			let mediaFetch = $fetch(`${base_url}/api/podium/clients/v1/media/${this.currentMedia.id}`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				if (!this.mediaProcessingTaskCompleted('generate_transcript', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_transcript', data)) {
					this.refreshCurrentMediaTranscript(true)
				}
				
				if (
					(!this.mediaProcessingTaskCompleted('generate_chapters', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_chapters', data))
					|| (!this.mediaProcessingTaskCompleted('generate_highlights', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_highlights', data))
					|| (!this.mediaProcessingTaskCompleted('generate_show_notes_summary', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_show_notes_summary', data))
					|| (!this.mediaProcessingTaskCompleted('generate_titles', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_titles', data))
					|| (!this.mediaProcessingTaskCompleted('generate_keywords', this.currentMedia) && this.mediaProcessingTaskCompleted('generate_keywords', data))
				) {
					this.refreshCurrentMediaAssets(false)
				}

				this.currentMedia = data;
				this.currentMediaLoading = false

				if (!this.currentMedia.processing_completed) {
					setTimeout(() => { this.refreshCurrentMedia() }, 5000)
				} else {
					this.refreshCurrentMediaAssets(false)
					this.refreshCurrentMediaTranscript(false)
				}
			})
		},

		refreshCurrentMediaAssets(indicateLoading=false) {
			if (this.currentMedia == null) { return }

			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			if (indicateLoading) {
				this.currentMediaAssetsLoading = true
			}
			let assetsFetch = $fetch(`${base_url}/api/podium/clients/v1/media/${this.currentMedia.id}/assets`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
                this.isClipEdit = false
				this.currentMediaAssets = data;
				this.currentMediaAssetsLoading = false


			})
		},

		refreshCurrentMediaTranscript(indicateLoading=false) {
			if (this.currentMedia == null) { return }

			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			if (indicateLoading) {
				this.currentMediaTranscriptLoading = true
			}

			let transcriptFetch = $fetch(`${base_url}/api/podium/clients/v1/media/${this.currentMedia.id}/transcript`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.currentMediaTranscript = data;
				this.currentMediaTranscriptLoading = false
			})
		},

		getAllClipLists(){
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			$fetch(`${base_url}/api/podium/internal/v1/media/${this.currentMedia.id}/clips/`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.clipLists = data
				console.log(data, 'clip data is here')
			})
		},
		//refreshCustomPrompts
		refreshCustomPrompts() {
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			let customPromptsFetch = $fetch(`${base_url}/api/podium/clients/v1/custom-prompts`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.customPrompts = data.filter(record => record.type === 'podium_gpt');
				this.showNotesCustomPrompts = data.filter(record => 
					record.type === 'static_show_notes' || record.type === 'dynamic_show_notes'
				  );
			})
		},

		getTemplateForamt(){
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()
			$fetch(`${base_url}/api/podium/v1/show-notes-template`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.templateFormatLists = data.templates
			})
	    },
	

		//refreshAPIKeyLists
		refreshAPIKeyLists() {
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			 $fetch(`${base_url}/api/podium/internal/v1/user/api_keys`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.apisKeyLists = data;
				this.apisKeyLists.sort((a, b) => a.id - b.id);
			})
		},


		clearCurrentMedia() {
			this.currentMedia = null
			this.currentMediaAssets = null
			this.currentMediaTranscript = null
			this.currentMediaLoading = false
			this.currentMediaAssetsLoading = false
			this.currentMediaTranscriptLoading = false
			this.currentMediaSpeakersSkipped = false
			this.currentMediaShowSpeakersModal = false
			this.currentMediaSideNavSelection = null
		},

		deleteMediaAsset(id) {
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()

			let deleteAsset = $fetch(`${base_url}/api/podium/clients/v1/media/asset/${id}/delete`, {
				method: 'DELETE',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})

			return deleteAsset
		},

		mediaProcessingTaskCompleted(taskName, media) {
			if (media && media.processing_tasks) {
				const task = media.processing_tasks.find(task => task.task === taskName)
				if (task) {
					return task.completed
				} else {
					return false
				}
			}

			return false
		},

		getTranscriptSpeakerNameRole(speakerId, transcript) {
			const speaker = transcript.speakers.find((sp) => sp.id === speakerId)
			var name = ''
			var role = ''
		
			if (speaker) {
				if (speaker.set_name) {
					name = speaker.set_name
				} else {
					name = speaker.default_name
				}
				
				if (speaker.set_role) {
					role = speaker.set_role
				} else {
					role = speaker.default_role
				}
			}
			
			return [name, this.capitalizeFirstLetter(role)]
		},

		getUserPodiumToken() {
			const route = useRoute()
			const auth_token = route.query.a
			const userPodiumToken = useCookie('podium_token')

			if (auth_token) {
				return auth_token
			} else {	
				return userPodiumToken.value
			}
		},

		capitalizeFirstLetter(string) {
			if(string && string != undefined){
				return string.charAt(0).toUpperCase() + string.slice(1)
			}
		},

		formatTime(seconds) {
			const hh = Math.floor(seconds / 3600);
			const mm = Math.floor((seconds % 3600) / 60);
			const ss = Math.floor(seconds % 60);
		
			if (hh > 0) {
				return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
			} else {
				return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
			}
		},
		truncateString(str, maxLength) {
			if (str.length <= maxLength) {
				return str
			}
			return str.slice(0, maxLength) + '....'
		},
		handleEditClipState(value: boolean) {
			this.showEditPrompt = value
		},
		getDynamicBlocks(id: any, title: any, length: any){
			const base_url = useRuntimeConfig().public.fathomWebApiURL
			const token = this.getUserPodiumToken()
			$fetch(`${base_url}/api/podium/v1/gpt/continue_generate/${id}/${title}`, {
				method: 'GET',
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
				}
			})
			.then(data => {
				this.dynamicBlocksContent.push({title: title, content: data.response})
				if (this.dynamicBlocksContent.length == length) {
					this.dynamicBlocksContentLoader = false
				}
			})
	    },
	},
})
