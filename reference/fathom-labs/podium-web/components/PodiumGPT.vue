<template>
  <div  class="flex w-full justify-center min-h-screen min-w-[730px]" v-cloak>
    <div class="flex flex-col w-full pt-10 pr-8 mx-auto max-w-6xl">
    <div v-if="isLoading" class="m-auto min-h-[100vh] flex items-center justify-center fixed left-0 right-0 top-0" style="">
      <SvgLoadingMd />

    </div>
    <div v-if="!isLoading" class="flex flex-col w-full pt-6 pr-6 items-center text-center min-h-screen">
      <div id="podiumGPT-body" class="w-full px-1 min-h-screen mb-[100px]">
        <!--
        <canvas class="block">
            
        </canvas>
        -->
        <div v-if="documents.length == 0" class="mx-16">
          <div class="text-lg leading-5 font-bold text-gray-900 mt-32">
            {{ t('Welcome to PodiumGPT') }}
          </div>
          <div class="text-lg leading-5 font-regular text-gray-500 mt-6 leading-8">
            {{ t('Use PodiumGPT to create any kind of text based on your content with a prompt.') }}
          </div>
          <div class="text-lg leading-5 font-bold text-gray-900 mt-12">
            {{ t('Use the templates 👉 or try a prompt like...') }}
          </div>
          <div @click="generateTemplate('example')" class="text-lg leading-5 font-regular hover:text-gray-900 hover:underline cursor-pointer text-gray-500 mt-2 leading-8">
            "{{ t('List the key points of this episode.') }}"
          </div>
        </div>
        <div v-for="doc, index in documents" :key="doc.key" :id="doc.key" class="w-full mb-10">
          <PodiumGPTDocument 
            :document="doc"
            v-model:is-generating-content="isGeneratingContent"
            @started-generating="startGenerating"
            @stopped-generating="stopGenerating"
            @document-removed="documentRemoved"
            :index="index"
          />
        </div>
      </div>
    </div>
    <div class="sticky bottom-0 w-full z-20 pr-6">
      <div class="h-8 w-full bg-gradient-to-t from-gray-50"></div>
      
      <div v-if="!isLoading" class="pb-10 pt-6 bg-gray-50">
        <div v-if="!hidePromptInput" class="mr-4">
          <div class="w-full focus-within:z-10">
            <input
              @keyup.enter.native="generateNewDocument()" 
              :class="{'not-allowed-cursor': isGeneratingContent}"
              :readonly="isGeneratingContent"
              v-model="prompt" 
              id="prompt" 
              class="block w-full rounded-md border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6" 
              placeholder="Ask to create any kind of document" 
            />
          </div>
          <button @click="generateNewDocument()" :class="{'not-allowed-cursor': isGeneratingContent}" class="absolute top-14 right-0 mt-2 mr-12 rounded-md px-2 py-2 ring-1 ring-inset ring-indigo-700 bg-indigo-700 hover:bg-indigo-600 hover:ring-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>      
          </button>
        </div>

        <div v-if="hidePromptInput && !isGeneratingContent" class="">
          <div class="w-fit mx-auto rounded-md">
            <div @click="showPromptInput()" class="flex w-fit mx-auto rounded-md mb-3 px-4 py-2.5 ring-1 ring-inset ring-indigo-700 bg-indigo-700 hover:bg-indigo-600 hover:ring-indigo-600 cursor-pointer shadow-lg shadow-[#00000047]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="mt-0.5 mr-0.5">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M3 0C3.55228 0 4 0.447715 4 1V2H5C5.55228 2 6 2.44772 6 3C6 3.55228 5.55228 4 5 4H4V5C4 5.55228 3.55228 6 3 6C2.44772 6 2 5.55228 2 5V4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H2V1C2 0.447715 2.44772 0 3 0ZM3 10C3.55228 10 4 10.4477 4 11V12H5C5.55228 12 6 12.4477 6 13C6 13.5523 5.55228 14 5 14H4V15C4 15.5523 3.55228 16 3 16C2.44772 16 2 15.5523 2 15V14H1C0.447715 14 0 13.5523 0 13C0 12.4477 0.447715 12 1 12H2V11C2 10.4477 2.44772 10 3 10Z" fill="white"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.99995 0C10.4537 0 10.8505 0.305483 10.9667 0.744107L12.1459 5.19893L15.4997 7.13381C15.8092 7.31241 15.9999 7.64262 15.9999 8C15.9999 8.35738 15.8092 8.6876 15.4997 8.86619L12.1459 10.8011L10.9667 15.2559C10.8505 15.6945 10.4537 16 9.99995 16C9.54622 16 9.14935 15.6945 9.03324 15.2559L7.85402 10.8011L4.50027 8.86618C4.19072 8.68759 4 8.35738 4 8C4 7.64262 4.19072 7.31241 4.50027 7.13382L7.85402 5.19893L9.03324 0.744107C9.14935 0.305483 9.54622 0 9.99995 0Z" fill="white"/>
              </svg>
              <span class="text-white text-sm font-medium ml-2">{{ t('Generate New') }}</span>
            </div>
          </div>
        </div>
        <div v-if="hidePromptInput && isGeneratingContent">
          <div class="w-fit mx-auto rounded-md">
            <div @click="stopGenerating()" class="flex w-fit mx-auto rounded-md mb-3 px-4 py-2.5 ring-1 ring-inset ring-gray-600 bg-gray-600 hover:bg-gray-900 hover:ring-gray-900 cursor-pointer shadow-lg shadow-[#00000047]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top:3px;">
                <rect width="14" height="14" rx="3" fill="white"/>
              </svg>    
              <span class="text-white text-sm font-medium ml-3">{{ t('Stop Generating') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>

  <div v-if="!isLoading" class="min-w-[293px] max-w-[293px] border-l border-gray-200 sticky h-[calc(100vh-69px)] top-0">
    <div  class="flex border-b border-gray-200 items-center justify-between" >
      <div class="flex flex-row px-6 pt-4">
      <div @click="showPresetSections" :class="[presetSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-4 px-1 border-indigo-500 cursor-pointer mr-4']">{{ t('Preset') }}</div>
      <div @click="showCustomSections" :class="[customSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-4 px-1 border-indigo-500 cursor-pointer']">{{ t('Custom') }}</div>
      </div>
      <div @click="openTutorial = true" class="flex pr-2 text-gray-400 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12" y2="17"></line>
          </svg>
      </div>
      <ModalsPodiumGPTTutorial :open="openTutorial" @close="handleClose" />
    </div>
    <div v-if="presetSection" class="flex flex-col overflow-y-auto overscroll-contain pt-6 pl-6 gap-2 pr-5 max-h-[100vh] pb-32">
      <div v-for="(preset, key) in presets">
        <div v-if="preset.show_in_sidebar" @click="generateTemplate(key,'preset')" :class="{'not-allowed-cursor': isGeneratingContent}" class="flex flex-col cursor-pointer bg-white hover:bg-indigo-50 shadow px-6 py-4 rounded-lg">
          <div class="text-sm font-medium leading-5 mb-1">
            {{preset.title}}
          </div>
          <div class="text-sm leading-5 text-gray-600">
            {{preset.prompt}}
          </div>
        </div> 
      </div>
    </div>
    <div v-if="customSection" class="flex flex-col overflow-y-auto overscroll-contain pt-6 pl-6 gap-2 pr-5 max-h-[100vh] pb-32">
      <button type="button" @click="addCustom()" class="btn btn-submit" >
        <svg   width="11" height="10" viewBox="0 0 11 10" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M5.25 0C4.83594 0 4.5 0.335938 4.5 0.75V4H0.75C0.335938 4 0 4.33594 0 4.75C0 4.91992 0.0571289 5.07812 0.152832 5.20508C0.289551 5.38477 0.506348 5.5 0.75 5.5H4.5V9.25C4.5 9.66406 4.83594 10 5.25 10C5.66406 10 6 9.66406 6 9.25V5.5H9.75C10.1641 5.5 10.5 5.16406 10.5 4.75C10.5 4.55078 10.4229 4.37109 10.2969 4.23633C10.1602 4.0918 9.96582 4 9.75 4H6V0.75C6 0.335938 5.66406 0 5.25 0Z" fill="white"/>
        </svg>
      </button>
      <div v-for="(preset, key) in custom_prompts">
        <div  @click="generateTemplate(key,'custom',$event)" :class="{'not-allowed-cursor': isGeneratingContent}"  class="flex flex-col cursor-pointer bg-white hover:bg-indigo-50 shadow px-6 py-4 rounded-lg relative break-words">
          <div class="text-sm font-medium leading-5 mb-1">
       {{ preset.title }} 
          </div>
          <div class="text-sm leading-5 text-gray-600">
            {{truncateString(preset.content)}} 
          </div>
          <div class="dropBtn absolute right-2 w-5" @click="openEditDeleteDropdownByCustomId(key)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4b5563" aria-hidden="true" class="nz sb"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"></path></svg>
          </div>
          <div  :id="'editDeleteButtons_'+key"  class="hidden editDeleteButtons user-dropdown__dropdown">
            <a  href="#" class="user-dropdown__dropdown-item" @click="openEditDeletePopUp(preset.id , preset.title , preset.content)" >
              {{ t('Edit Prompt') }}
            </a>
            <a @click="openDeletePopUp(preset.id)" class="user-dropdown__dropdown-item" >
                    {{ t('Delete Prompt') }}
            </a>
          </div>
         
        </div> 
      </div>
    </div>
  </div>
  <ModalsCustomEditPromptTemplate   :customId="customGuid"  :title="heading" :content="paragraph" :open="editDeletePopup" @close="editDeletePopup = false" @submit="handleSubmit()"  />
  <ModalsCustomAddPromptTemplate :open="addCustomModal"  @close="addCustomModal = false" @submit="handleSubmit()" />
  <ModalsDelete :open="deletePopup" :assestId="selectedCustomPrompt" @close="deletePopup=false" @submit="handleSubmit()" from="customTemplate"  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import { Title } from "~/.nuxt/components";
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const { params } = useRoute();
const auth_token = useCookie('podium_token')
const runtimeConfig = useRuntimeConfig()
const isLoading = ref(true);
const documents = ref([]);
const prompt = ref('');
const isGeneratingContent = ref(false)
const hidePromptInput = ref(false)
const presetSection = ref(true)
const customSection =ref(false)
const editDeleteButtons=ref(false)
const editDeletePopup = ref(false)
const deletePopup = ref(false)
const source = ref('')
const customGuid = ref('')
const heading = ref('')
const paragraph = ref('')
const addCustomModal = ref(false)
const contentType = ref(mainStore.currentMedia && mainStore.currentMedia?.content_type ? typeTitle(mainStore.currentMedia.content_type) : 'Podcast')

class Document {
  guid: string = ''
  title: string = ''
  content: string = ''
  accepted_variant: boolean = false
  variations: Array<Document> = []
  _isParent: boolean = false
  _isNew: boolean = false
  _parentGuid: string = ''
  key: string = Math.random().toString(36).substring(7)
}
class Prompt {
  id: string = ''
  title: string = ''
  content: string = ''
}

const openTutorial = ref(false);

onMounted(() => {
  // Check if the modal has been shown before
  if (!localStorage.getItem('tutorialGPTShown')) {
    openTutorial.value = true;
  }
});

function handleClose() {
  // Set the flag in localStorage when the modal is closed
  localStorage.setItem('tutorialGPTShown', 'true');
  openTutorial.value = false;
}

function capitalizeFirstLetter(string: any ) {
  if(string && string != undefined){
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
}

function typeTitle(string: any) {
  if (string == 'podcast') {
    return 'podcast episode'
  } else if (string == 'religious') {
    return 'spirtual talk'
  } else if(string == 'educational') {
    return 'educational episode'
  } else if(string == 'video'){
    return 'video'
  } else if(string == 'meeting'){
    return 'meeting'
  } else if(string == 'customer_call'){
    return 'customer call'
  }
}

const presets: Ref<Object> = ref({
  'twitter': {title: t.value('Twitter Thread'), prompt: t.value(`Write a multi-tweet Twitter thread for this ${contentType.value}.`), show_in_sidebar: true},
  'blog': {title: t.value('Blog Post'), prompt: t.value(`Write a blog post for this ${contentType.value}.`), show_in_sidebar: true},
  'linkedin': {title: t.value('LinkedIn Post'), prompt: t.value(`Write a LinkedIn post announcing this ${contentType.value}.`), show_in_sidebar: true},
  'facebook': {title: t.value('Facebook Post'), prompt: t.value(`Write a Facebook post announcing this ${contentType.value}.`), show_in_sidebar: true},
  'email': {title: t.value('Email Newsletter'), prompt: t.value(`Write an email for the ${contentType.value} host\'s mailing list.`), show_in_sidebar: true},
  'titles': {title: t.value(`${capitalizeFirstLetter(contentType.value)} Titles`), prompt: t.value(`Suggest some titles for this ${contentType.value}.`), show_in_sidebar: true},
  'example': {title: '', prompt: t.value(`List the key points of this ${contentType.value}.`), show_in_sidebar: false},
})

const custom_prompts= ref([])

onBeforeUnmount(() => {
  if (mainStore.currentMedia != null) {
    mainStore.refreshCurrentMediaAssets()
  }
})

const showPresetSections= ()=>{
  presetSection.value = true
  customSection.value=false
}
const showCustomSections= ()=>{
  customSection.value = true
  presetSection.value = false
}
const openEditDeleteDropdownByCustomId=(index)=>{
  
  var div = document.getElementById('editDeleteButtons_'+index);
  if (div) {
    if (div.classList.contains('hidden')) {
      div.classList.remove('hidden');
    } else {
      div.classList.add('hidden');
    }
  }  
}
const truncateString=(str)=> {
    if (str.length > 55) {
        return str.substring(0, 55) + "...";
    } else {
        return str;
    }
}
const addCustom=()=>{
  addCustomModal.value = true
}
const openEditDeletePopUp=(id,title,content)=>{
  editDeletePopup.value = true
  customGuid.value = id
  heading.value = title
  paragraph.value = content
  source.value = 'Edit Custom'
}
const handleSubmit = () => {
  isLoading.value = true
  editDeletePopup.value = false
  addCustomModal.value = false
}
const selectedCustomPrompt = ref('')
const openDeletePopUp=(id)=>{
selectedCustomPrompt.value = id
deletePopup.value = true

}
const setupAnimation = () => {
  // Initialising the canvas
  var canvas = document.querySelector('canvas'),
      ctx = canvas.getContext('2d');

  // Setting the width and height of the canvas
  var podiumGPTBody = document.getElementById('podiumGPT-body')
  canvas.width = podiumGPTBody?.clientHeight;
  canvas.height = podiumGPTBody.clientWidth;

  // Setting up the letters
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZABCDEFGHIJKLMNOPQRSTUVXYZ';
  letters = letters.split('');

  // Setting up the columns
  var fontSize = 50,
      columns = canvas.width / fontSize;

  // Setting up the drops
  var drops = [];
  for (var i = 0; i < columns; i++) {
    drops[i] = 1;
  }

  // Setting up the draw function
  function draw() {
    ctx.fillStyle = 'rgba(249, 250, 251, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < drops.length; i++) {
      var text = letters[Math.floor(Math.random() * letters.length)];
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(text, i * fontSize, drops[i] * fontSize/6);
      drops[i]++;
      if (drops[i] * fontSize > canvas.height && Math.random() > .95) {
        drops[i] = 0;
      }
    }
  }

  // Loop the animation
  setInterval(draw, 33);
}

const generateTemplate = (template: string,type:string,event=null) => {
  // return
  if (event!=null){
    //check event target is svg or path of svg
    var targetElement = event.target.nodeName =='svg' || event.target.nodeName =='path' || event.target.innerText =='Edit Prompt' || event.target.innerText =='Delete Prompt';
    if(targetElement){
      return;
    }
    
  }
  if (isGeneratingContent.value) {
    return;
  }
  if (type=='preset'){
    console.log(presets.value[template].prompt, '11111111111111111111111111111111')
    prompt.value = presets.value[template].prompt;
  }else{
    prompt.value = custom_prompts.value[template].content;
  }
  generateNewDocument();
}

const generateNewDocument = async () => {
  mainStore.user.has_used_podium_gpt = true

  if (isGeneratingContent.value) {
    return;
  }

  if (prompt.value == '') {
    return;
  }
 
  const document = new Document()
  document.title = prompt.value
  document._isNew = true
  documents.value.push(document) // Triggers a new PodiumGPTDocument component to be created, which starts streaming the new document
  prompt.value = ''
  hidePromptInput.value = true
}

const scrollToBottom = () => {
  if (documents.value.length == 0) {
    return
  }
  
  const scrollingBody = document.getElementById('scrollingBody')
  if (!scrollingBody) {
    return
  }

  const targetElement = document.getElementById(documents.value[documents.value.length - 1].key)
  setTimeout(() => {
    if (targetElement)
      //scrollingBody.scrollTop = targetElement.offsetTop - 100
      scrollingBody.scrollTo({ top: targetElement.offsetTop - 100, behavior: 'smooth' })
  }, 100)
}

const startGenerating = () => {
  isGeneratingContent.value = true
}

const stopGenerating = () => {
  isGeneratingContent.value = false
}

const documentRemoved = (doc: Document) => {
  const index = documents.value.indexOf(doc)
  documents.value.splice(index, 1)
}

const showPromptInput = () => {
  hidePromptInput.value = false
  setTimeout(() => {
    document.getElementById('prompt')?.focus()
  }, 100)
}

const initDocuments = async () => {
  if (mainStoreState.currentMediaAssets.value) {
    documents.value = mainStoreState.currentMediaAssets.value
      .filter((asset: any) => asset.type == 'document')
      .sort((a: any, b: any) => a.created_at < b.created_at ? 1 : -1)
      .map((asset: any) => {
        const document = new Document()
        document.guid = asset.id
        document.title = asset.title
        document.content = asset.content
        document.accepted_variant = asset.accepted_variant
        document._isParent = true
        return document
      })

    isLoading.value = false
    if (documents.value.length) {
      hidePromptInput.value = true
    }
    nextTick(() => {
      scrollToBottom()
    })
  }
}


const initCustomPrompt = async () => {
  if (mainStoreState.customPrompts.value) {
    custom_prompts.value = mainStoreState.customPrompts.value
      .sort((a: any, b: any) => a.created_at < b.created_at ? 1 : -1)
      .map((asset: any) => {
        const document = new Prompt()
        document.id = asset.id
        document.title = asset.title
        document.content = asset.content
        return document
      })
      isLoading.value = false
    
    nextTick(() => {
      scrollToBottom()
    })
  }
}
watch (() => mainStoreState.currentMediaAssets.value, (newValue) => {
  if (newValue) {
    initDocuments()
    
    
  }
})
watch (() => mainStoreState.customPrompts.value, (newValue) => {
  if (newValue) {
   
    initCustomPrompt()
  
    
  }
})

initDocuments()
initCustomPrompt()


//onMounted(setupAnimation)
onMounted(() => {
  mainStore.refreshCustomPrompts()
  //add event listener click
  document.addEventListener('mousedown', function(event) {
    var targetElement = event.target.innerText =='Edit Prompt' || event.target.innerText =='Delete Prompt' || event.target.innerText =='Save Prompt as Template' || event.target.innerText =='Save';
    if(!targetElement){
      var editDeleteButtons = document.getElementsByClassName('editDeleteButtons');
  //add class hidden to all editDeleteButtons
  for (var i = 0; i < editDeleteButtons.length; i++) {
    editDeleteButtons[i].classList.add('hidden');
  }
    }

  });

})
</script>

<style scoped>
.not-allowed-cursor {
  cursor: not-allowed;
}
.user-dropdown {
    @apply flex relative z-20;
    &__simple {
        @apply items-center;
    }
    &__full {
        @apply items-start;
    }
    &__image-wrapper {
        @apply relative;
        img, svg {
            @apply rounded-full max-w-none w-9 h-9;
            &.full {

            }
        }
    }
    &__user {
        @apply mr-auto ml-3 mr-3 overflow-hidden;
        &-name {
            @apply font-medium leading-5 text-sm text-left text-gray-700 mb-2 whitespace-nowrap overflow-hidden truncate;
        }
        &-credits-badge {
            @apply text-center p-1 rounded-2xl w-auto px-2 w-fit text-xs font-medium leading-4;
            &.success {
                @apply text-teal-500 bg-teal-100;
            }
            &.warning {
                @apply text-yellow-500 bg-yellow-100;
            }
            &.danger {
                @apply text-red-500 bg-red-100;
            }
        }
    }
    &__dropdown {
        @apply absolute top-12 bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 py-2 z-20;
        &.simple {
            @apply right-0;
        }        
        &.full {
            @apply z-30;
            right: -180px;
        }
        &-item {
            @apply relative cursor-auto flex items-center px-4 py-3 font-inter text-sm text-gray-900;
            
            &:not(.no-hover) {
                @apply hover:bg-gray-100 cursor-pointer;
            }
            &-icon {
                @apply mr-3;
            }
            &-text {
                @apply text-sm;
            }
        }
        &.dropdown-open {
            @apply opacity-100 visible h-auto;
        }
        &.dropdown-shut {
            @apply opacity-0 invisible h-0;
        }
    }
}

.dropBtn {
    top: 50%;
    transform: translateY(-50%);
}
.btn {
    @apply
    mt-3
    inline-flex
    w-full
    justify-center
    rounded-lg
    px-3 py-2.5
    text-sm
    font-medium
    shadow-sm
    ring-1
    ring-inset
    sm:col-start-1
    sm:mt-0;
    &-submit {
        @apply
        bg-indigo-700
        text-white
        hover:bg-indigo-600
        ring-indigo-700
        hover:bg-indigo-600
        hover:ring-indigo-600
        focus-visible:outline
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-indigo-700 sm:col-start-2;
    }

}

</style>