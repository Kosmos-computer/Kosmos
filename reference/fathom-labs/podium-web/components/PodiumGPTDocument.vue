<template>
  <div class="text-left font-semibold text-black" ref="titleDiv">
    {{ title }} 
  </div>        
  <div v-if="doc" class="text-left text-base font-regular text-black mt-4 bg-white shadow p-6 rounded-lg" style="white-space: pre-line;">
    <div :id="doc.guid + '-content'" contenteditable @input="handleInput" class="focus-visible:outline-none" >
        <Markdown :source="content" html />
         <!-- {{ content }} -->
      <div v-if="isLoading" class="blink-cursor"></div>
    </div> 
    <div v-if="showRevisionControls" class="flex flex-row justify-center items-center mt-8 gap-3 relative transition-all">
      <div @click="cancelAllVariantions()" class="flex flex-row justify-center items-center bg-white px-2 cursor-pointer hover:bg-gray-100 border border-gray-300 h-9 w-9 rounded-full whitespace-nowrap z-10">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0.292893 0.292893C0.683417 -0.0976311 1.31658 -0.0976311 1.70711 0.292893L6 4.58579L10.2929 0.292893C10.6834 -0.0976311 11.3166 -0.0976311 11.7071 0.292893C12.0976 0.683417 12.0976 1.31658 11.7071 1.70711L7.41421 6L11.7071 10.2929C12.0976 10.6834 12.0976 11.3166 11.7071 11.7071C11.3166 12.0976 10.6834 12.0976 10.2929 11.7071L6 7.41421L1.70711 11.7071C1.31658 12.0976 0.683417 12.0976 0.292893 11.7071C-0.0976311 11.3166 -0.0976311 10.6834 0.292893 10.2929L4.58579 6L0.292893 1.70711C-0.0976311 1.31658 -0.0976311 0.683417 0.292893 0.292893Z" fill="#9CA3AF"/>
        </svg>
      </div>
      <div @click="undoVariation()" :class="[{'cursor-pointer hover:bg-gray-100': currentTuningIndex != 0}, {'border-opacity-30': currentTuningIndex == 0}, 'flex flex-row justify-center items-center bg-white px-2 border border-gray-300 h-9 w-9 rounded-full whitespace-nowrap z-10']">
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" :class="{'opacity-30': currentTuningIndex == 0}">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M5.70712 0.292893C6.09765 0.683417 6.09765 1.31658 5.70712 1.70711L3.41422 4H9.00003C12.866 4 16 7.13401 16 11V13C16 13.5523 15.5523 14 15 14C14.4478 14 14 13.5523 14 13V11C14 8.23858 11.7615 6 9.00003 6H3.41422L5.70712 8.29289C6.09765 8.68342 6.09765 9.31658 5.70712 9.70711C5.3166 10.0976 4.68343 10.0976 4.29291 9.70711L0.292894 5.70711C-0.0976314 5.31658 -0.0976314 4.68342 0.292894 4.29289L4.29291 0.292893C4.68343 -0.0976311 5.3166 -0.0976311 5.70712 0.292893Z" fill="#9CA3AF"/>
        </svg>
      </div>
      <div @click="updateDocument()" class="flex flex-row justify-center items-center w-fit rounded-md px-4 py-2 ring-1 ring-inset ring-indigo-700 bg-indigo-700 hover:bg-indigo-600 hover:ring-indigo-600 cursor-pointer z-10">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M13.7071 0.292893C14.0976 0.683417 14.0976 1.31658 13.7071 1.70711L5.70711 9.70711C5.31658 10.0976 4.68342 10.0976 4.29289 9.70711L0.292893 5.70711C-0.0976311 5.31658 -0.0976311 4.68342 0.292893 4.29289C0.683417 3.90237 1.31658 3.90237 1.70711 4.29289L5 7.58579L12.2929 0.292893C12.6834 -0.0976311 13.3166 -0.0976311 13.7071 0.292893Z" fill="white"/>
        </svg>
        <span class="text-white text-sm ml-3">{{ t('Save Changes') }}</span>
      </div>
      <div @click="redoVariation()" :class="[{'cursor-pointer hover:bg-gray-100': currentTuningIndex != tunings.length - 1}, {'border-opacity-30': currentTuningIndex == tunings.length - 1}, 'flex flex-row justify-center items-center bg-white px-2 border border-gray-300 h-9 w-9 rounded-full whitespace-nowrap z-10']">
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" :class="{'opacity-30': currentTuningIndex == tunings.length - 1}" style="transform: scaleX(-1)">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M5.70712 0.292893C6.09765 0.683417 6.09765 1.31658 5.70712 1.70711L3.41422 4H9.00003C12.866 4 16 7.13401 16 11V13C16 13.5523 15.5523 14 15 14C14.4478 14 14 13.5523 14 13V11C14 8.23858 11.7615 6 9.00003 6H3.41422L5.70712 8.29289C6.09765 8.68342 6.09765 9.31658 5.70712 9.70711C5.3166 10.0976 4.68343 10.0976 4.29291 9.70711L0.292894 5.70711C-0.0976314 5.31658 -0.0976314 4.68342 0.292894 4.29289L4.29291 0.292893C4.68343 -0.0976311 5.3166 -0.0976311 5.70712 0.292893Z" fill="#9CA3AF"/>
        </svg>
      </div>
      <div class="h-9 w-9 opacity-0">

      </div>
      <div class="absolute top-4.5 border-b border-gray-300 w-full z-0"></div>
    </div>
    <div class="relative mt-6 rounded-md w-full">
      <div class="w-full focus-within:z-10">
        <input
          @keyup.enter.native="generateNewTuning()" 
          :class="{'not-allowed-cursor': isGeneratingContent}"
          :readonly="isGeneratingContent"
          v-model="prompt" 
          class="block w-full rounded-md border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6" 
          placeholder="Improve this text with a prompt. For example, try 'make this shorter'." 
        />
      </div>
      <button @click="generateNewTuning()" type="" :class="{'not-allowed-cursor ring-gray-600 bg-gray-600': isGeneratingContent, 'ring-indigo-700 bg-indigo-700 hover:bg-indigo-600 hover:ring-indigo-600': !isGeneratingContent}" class="absolute top-0 right-0 mt-2 mr-2 rounded-md px-2 py-2 ring-1 ring-inset transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-4 h-4">
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>      
      </button>
    </div>
  </div>
  <div class="flex flex-row mt-4">
    <div v-if="!isLoading" @click="copy()" :class="{'not-allowed-cursor': isGeneratingContent}" class="flex flex-row mr-2 items-center w-fit bg-white pl-3 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
      <div class="pr-1 scale-75">
        <svg width="20" height="21" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.59091C3 0.712274 3.99718 0 5.22727 0H7.77273C9.00282 0 10 0.712274 10 1.59091V3.40909C10 4.28773 9.00282 5 7.77273 5H5.22727C3.99718 5 3 4.28773 3 3.40909V1.59091ZM5.22727 1.36364C5.05155 1.36364 4.90909 1.46539 4.90909 1.59091V3.40909C4.90909 3.53461 5.05155 3.63636 5.22727 3.63636H7.77273C7.94845 3.63636 8.09091 3.53461 8.09091 3.40909V1.59091C8.09091 1.46539 7.94845 1.36364 7.77273 1.36364H5.22727Z" fill="#6A727F"/>
            <path d="M9.7086 11.8807L6.88017 9.28807C6.70661 9.12897 6.70661 8.87103 6.88017 8.71193L9.7086 6.11932C9.88217 5.96023 10.1636 5.96023 10.3371 6.11932C10.4615 6.2333 10.5 6.5 10.5 6.5V8.5H15.5C15.7761 8.5 16 8.72386 16 9C16 9.27614 15.7761 9.5 15.5 9.5H10.5V11.5C10.5 11.5 10.4615 11.7667 10.3371 11.8807C10.1636 12.0398 9.88217 12.0398 9.7086 11.8807Z" fill="#6A727F"/>
            <path d="M4 1.25H2.75C1.23122 1.25 0 2.48122 0 4V14C0 15.5188 1.23122 16.75 2.75 16.75H10.75C12.2688 16.75 13.5 15.5188 13.5 14V12H12V14C12 14.6904 11.4404 15.25 10.75 15.25H2.75C2.05964 15.25 1.5 14.6904 1.5 14V4C1.5 3.30964 2.05964 2.75 2.75 2.75H4V1.25Z" fill="#6A727F"/>
            <path d="M9.5 2.75H10.75C11.4404 2.75 12 3.30964 12 4V7H13.5V4C13.5 2.48122 12.2688 1.25 10.75 1.25H9.5V2.75Z" fill="#6A727F"/>
         </svg>
      </div>  

      <div class="text-sm font-medium leading-5 ">
        <span v-if="!copied">{{ t('Copy') }}</span>
        <span v-if="copied">{{ t('Copied!') }}</span>
        
      </div>
    
   
    </div>
    <div class="dropbtn-wraper relative" v-if="!isLoading">
      <div class="dropBtn  inline-flex min-w-[40px] mr-2 items-center w-fit bg-white pl-2 pr-2 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap py-3" @click="openDropdowns(props.index)">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4b5563" aria-hidden="true" class="nz sb"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"></path></svg>
   </div>
   <div :id="'editDeleteButtonss'+index"   class="hidden editDeleteButtonss user-dropdown__dropdown">
            <a  @click="copy()"  class="user-dropdown__dropdown-item"  >
              {{ t('Copy to Clipboard') }}
            </a>
            <a @click="downloadTxtFile(title)"  class="user-dropdown__dropdown-item" >
              {{ t('Download.TXT file') }}
            </a>
          </div>
    </div>
  </div>
  <ModalsCustomAddPromptTemplate :open="openAddCustom" :titleGptDoc="titleDoc" from="podiumGptDoc"  @close="openAddCustom = false" @submit="handleSubmit()" />

</template>
<script setup>
import { ref, computed } from 'vue'
import Markdown from 'vue3-markdown-it';
import MarkdownIt from 'markdown-it'
import { useMainStore } from "~/store/main"
import { throttle } from 'throttle-debounce'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const mainStore = useMainStore()
const { params } = useRoute();
const runtimeConfig = useRuntimeConfig()
const openAddCustom = ref(false)
const titleDoc = ref('')
const props = defineProps(['document', 'isGeneratingContent','index'])
const emit = defineEmits(['startedGenerating', 'stoppedGenerating', 'documentRemoved'])
const title = ref('')
const content = ref('')
const editableContent = ref('')
const prompt = ref('')
const isLoading = ref(false)
const copied= ref(false)
const titleDiv = ref(null)
const showRevisionControls = ref(false)
const isGeneratingContent = ref(false)
const tunings = ref([])
const currentTuningIndex = ref(0)
const autoScrollEnabled = ref(true)
const scrollBody = document.getElementById('scrollingBody');
var scrollBodyScrollEvent = null
var doc = null
const openDropdowns=(index)=>{
  var div = document.getElementById('editDeleteButtonss'+index);
  if (div) {
    if (div.classList.contains('hidden')) {
      div.classList.remove('hidden');
    } else {
      div.classList.add('hidden');
    }
  }  
}

const downloadTxtFile = (title)=>{
      var isHtml = checkContentIsTextOrHtml(editableContent.value)
      if(isHtml){
        var markdown = convertHtmlToMarkdown(editableContent.value)
      }else{
      var markdown = editableContent.value
      }
      var text = markdownToText(markdown)
      const blob = new Blob([text], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      //dynamic file name 
      link.download = `${title}.txt`;
      document.body.appendChild(link);
      link.click();
      // Remove the link from the document
      document.body.removeChild(link);
}
const openAddCustomModal=(title)=>{
titleDoc.value = title
openAddCustom.value = true
}
const handleSubmit = () => {
  openAddCustom.value = false
}
var eventSource = null;
class Document {
  guid = ''
  title = ''
  content = ''
  variations = []
}


watch (() => props.isGeneratingContent, (newValue) => {
  if (newValue == false && isGeneratingContent.value == true) {
    if (doc._isNew) {
      eventSource?.close()
      updateDocument()
      autoScrollEnabled.value = true
    }    
    isLoading.value = false
  }
  isGeneratingContent.value = newValue
})


const handleInput = (e) => {
  editableContent.value = e.target.innerHTML
  if (doc.content !== editableContent.value) {
    showRevisionControls.value = true
  }

  if (currentTuningIndex.value < tunings.value.length - 1) {
    cleanUpTunings()
  }

  if (tunings.value[currentTuningIndex.value].isManual == false) {
    tunings.value.push({
      'prompt': '',
      'content': editableContent.value,
      'isManual': true
    })
    currentTuningIndex.value = tunings.value.length - 1
  } else {
    tunings.value[currentTuningIndex.value].content = editableContent.value
  }

}

const syncContent = () => {
  content.value = editableContent.value
}

const determineUrl = (doc) => {
  const encodedPrompt = encodeURIComponent(doc.title)
  const baseUrl = runtimeConfig.public.fathomWebApiURL + "/api/podium/v1/gpt/stream_response/" + params.id + "/" + encodedPrompt

  if (doc._isParent) {
    return baseUrl
  }
  else {
    return baseUrl + "?parent_guid=" + doc._parentGuid
  }
}

const generateNewDocument = async () => {
  if (isGeneratingContent.value == true) {
    return
  }
  
  const url = determineUrl(doc)
  eventSource?.close()
  eventSource = new EventSource(url)
  content.value = ''
  editableContent.value = ''
  
  isLoading.value = true
  emit('startedGenerating')

  autoScrollEnabled.value = true
  scrollToTop()

  eventSource.onmessage = (event) => {
    if (event.data === '{FINISHED}') {
      eventSource?.close()
      isLoading.value = false
      doc._isNew = false
      emit('stoppedGenerating')
      tunings.value.push({
        'prompt': doc.title,
        'content': doc.content,
        'isManual': false
      })
      autoScrollEnabled.value = true
    }
    else if (event.data.startsWith('{GUID')) {
      doc.guid = event.data.replace('{GUID ', '').replace('}', '')
    }
    else {
      var incoming = JSON.parse(event.data)
      const part = incoming.choices[0].delta.content
      if (part != null) {
        editableContent.value += part
        doc.content += part
        syncContent()
        determineIfScrollingIsNeeded()
      }
    }
  }
}

const cleanUpTunings = () => {
  tunings.value.splice(currentTuningIndex.value + 1, tunings.value.length - currentTuningIndex.value - 1) 
}

const generateNewTuning = async () => { 
  if (props.isGeneratingContent) {
    return
  }

  cleanUpTunings()
 
  showRevisionControls.value = false
  const url = determineUrl(doc)
  eventSource?.close()

  var controller = new AbortController()
  var signal = controller.signal
  const response = await fetch(runtimeConfig.public.fathomWebApiURL + `/api/podium/clients/v1/media/asset/${doc.guid}/tuning/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/event-stream',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify({
      'prompt': prompt.value,
      'content': editableContent.value
    }),
    signal: signal
  })
  // To recieve data as a string we use TextDecoderStream class in pipethrough
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  
  editableContent.value = ''
  content.value = ''

  isLoading.value = true

  isGeneratingContent.value = true
  emit('startedGenerating')

  autoScrollEnabled.value = true
  scrollToTop()
  fixContentHeight()

  var safetyCounter = 0
  while (isGeneratingContent.value == true) {
    safetyCounter++
    if (safetyCounter > 50000) {
      break
    }

    var {value, done} = await reader.read();

    if (value) {
      var formattedValues = []
      const splitValues = value.split('data: {')

      splitValues.forEach((splitValue) => {
        var formattedValue = splitValue.replace('data:', '').trim()
        if (formattedValue && formattedValue.length > 0) {
          formattedValues.push('{' + formattedValue)
        }
      })

      formattedValues.forEach((formattedValue) => {
        if (formattedValue === '{FINISHED}') {
          done = true
        }
        else if (formattedValue) {
          try {
            var incoming = JSON.parse(formattedValue)
            const part = incoming.choices[0].delta.content
            if (part != null) {
              editableContent.value += part
              syncContent()
              determineIfScrollingIsNeeded()
            }
          } catch (error) {
            console.log('Error parsing JSON', error)
          }
        }
      })
    }

    if (done) {
      break
    }
  }

  tunings.value.push({
    'prompt': prompt.value,
    'content': editableContent.value,
    'isManual': false
  })

  currentTuningIndex.value = tunings.value.length - 1

  emit('stoppedGenerating')
  isLoading.value = false
  showRevisionControls.value = true
  autoScrollEnabled.value = true
  controller.abort()
}

const scrollToTop = (extraOffset=100, method='smooth') => {
  const scrollingBody = document.getElementById('scrollingBody')
  
  if (scrollingBody) {
    if (titleDiv && titleDiv.value) {
      throttledScrollTo(titleDiv.value.offsetTop - extraOffset, method)
    }
  }
}

const throttledScrollTo = throttle(1000, (top, method) => {
	const scrollingBody = document.getElementById('scrollingBody')
  
  if (scrollingBody) {
    scrollingBody.scrollTo({ top: top, behavior: method })
  }
})

const scrollToBottom = (windowHeightPercentage = 0.6, method = 'smooth') => {
  const contentElement = document.getElementById(doc.guid + '-content')
  const scrollingBody = document.getElementById('scrollingBody')

  if (contentElement && scrollingBody) {
    throttledScrollTo(contentElement.offsetTop + contentElement.offsetHeight - (windowHeightPercentage * window.innerHeight), method)
  }
}

const determineIfScrollingIsNeeded = () => {
  if (autoScrollEnabled.value == false) {
    return
  }

  const contentElement = document.getElementById(doc.guid + '-content')
  const scrollingBody = document.getElementById('scrollingBody')
  
  if (contentElement && scrollingBody) {
    const contentRect = contentElement.getBoundingClientRect()
    const scrollBottom = scrollingBody.scrollTop + window.innerHeight

    if ((contentRect.bottom + scrollingBody.scrollTop) > scrollBottom-150) {
      scrollToBottom(0.4)
    }
  }
  
}

const fixContentHeight = () => {
  const contentElement = document.getElementById(doc.guid + '-content')
  // fix the height of the content element so that it doesn't jump around
  var clientHeight = 400
  if (contentElement) {
    
    if (contentElement.clientHeight < 400) {
      clientHeight = contentElement.clientHeight
    }
    contentElement.style.minHeight = clientHeight + 'px'
  }
}

const unfixContentHeight = () => {
  const contentElement = document.getElementById(doc.guid + '-content')
  // fix the height of the content element so that it doesn't jump around
  if (contentElement) {
    contentElement.style.minHeight = 'auto'
  }
}

const undoVariation = () => {
  if (currentTuningIndex.value == 0) {
    return
  }

  syncContent()
  nextTick(() => {
    currentTuningIndex.value--
    editableContent.value = tunings.value[currentTuningIndex.value].content
    syncContent()

    unfixContentHeight()
    nextTick(() => {
      scrollToBottom(0.6, 'instant')
    })
  })
}

const redoVariation = () => {
  if (currentTuningIndex.value == tunings.value.length - 1) {
    return
  }

  syncContent()
  nextTick(() => {
    if (currentTuningIndex.value == 0 && editableContent.value != tunings.value[0].content) {
      editableContent.value = tunings.value[0].content
      syncContent()
    } else {
      currentTuningIndex.value++
      editableContent.value = tunings.value[currentTuningIndex.value].content
      syncContent()
    }

    unfixContentHeight()
    nextTick(() => {
      scrollToBottom(0.6, 'instant')
    })
  })
}

const cancelAllVariantions = () => {
  syncContent()

  nextTick(() => {
    editableContent.value = doc.content
    syncContent()
    tunings.value = []
    tunings.value.push({
      'prompt': doc.title,
      'content': doc.content,
      'isManual': false
    })
    currentTuningIndex.value = 0
    
    unfixContentHeight()
    prompt.value = ''
    showRevisionControls.value = false
    nextTick(() => {
      scrollToBottom(0.6, 'instant')
    })
  })
}

const updateDocument = () => {
  doc._isNew = false
  doc.content = convertHtmlToMarkdown(editableContent.value)
  syncContent()

  fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/asset/${doc.guid}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
    },
    body: JSON.stringify({
      'content': doc.content
    }),
  })
  .then(response => {
    if (response.ok) {
      tunings.value = []
      tunings.value.push({
        'prompt': doc.title,
        'content': doc.content,
        'isManual': false
      })

      unfixContentHeight()
      prompt.value = ''
      showRevisionControls.value = false
    } else {
      console.log('Failed to update document')
    }
  })
}
function convertHtmlToMarkdown(html) {
  // Remove newlines and replace multiple spaces with single space
  html = html.replace(/\n/g, ' ').replace(/\s\s+/g, ' ');

  // Replace <br> with newlines
  html = html.replace(/<br>/gi, '\n');

  // Handle headers
  html = html.replace(/<h1(.*?)>(.*?)<\/h1>/gi, '# $2\n');
  html = html.replace(/<h2(.*?)>(.*?)<\/h2>/gi, '## $2\n');
  html = html.replace(/<h3(.*?)>(.*?)<\/h3>/gi, '### $2\n');
  html = html.replace(/<h4(.*?)>(.*?)<\/h4>/gi, '#### $2\n');
  html = html.replace(/<h5(.*?)>(.*?)<\/h5>/gi, '##### $2\n');
  html = html.replace(/<h6(.*?)>(.*?)<\/h6>/gi, '###### $2\n');

  // Handle bold and italic
  html = html.replace(/<strong(.*?)>(.*?)<\/strong>/gi, '**$2**');
  html = html.replace(/<b(.*?)>(.*?)<\/b>/gi, '**$2**');
  html = html.replace(/<em(.*?)>(.*?)<\/em>/gi, '*$2*');
  html = html.replace(/<i(.*?)>(.*?)<\/i>/gi, '*$2*');

  // Handle lists
  html = html.replace(/<ul>(.*?)<\/ul>/gi, function (match, p1) {
    let items = p1.split('</li>');
    items.pop(); // Remove last empty item after last </li>
    items = items.map(function (item) {
      return '- ' + item.replace(/<li(.*?)>(.*?)<\/li>/gi, '$2').trim() + '\n';
    });
    return items.join('');
  });

  // Handle links
  html = html.replace(/<a(.*?)href="(.*?)"(.*?)>(.*?)<\/a>/gi, '[$4]($2)');

  // Handle images
  html = html.replace(/<img(.*?)src="(.*?)"(.*?)>/gi, '![]($2)');

  // Handle code blocks
  html = html.replace(/<code(.*?)>(.*?)<\/code>/gi, '`$2`');

  // Handle inline code
  html = html.replace(/<pre(.*?)>(.*?)<\/pre>/gi, '```\n$2\n```');

  // Handle paragraphs
  html = html.replace(/<p(.*?)>(.*?)<\/p>/gi, '$2\n\n');

  // Handle horizontal rules
  html = html.replace(/<hr(.*?)>/gi, '---\n');

  // Handle blockquotes
  html = html.replace(/<blockquote(.*?)>(.*?)<\/blockquote>/gi, '> $2\n');

  // Remove any remaining HTML tags
  html = html.replace(/<.*?>/gi, '');

  return html.trim();
}

function markdownToText(markdown) {
    // Remove headers (##, ###, etc.)
    markdown = markdown.replace(/^#{1,6}\s/gm, '');

    // Remove emphasis (bold and italic)
    markdown = markdown.replace(/[*_]{1,3}(.*?)[*_]{1,3}/gm, '$1');

    // Remove lists (ul, ol)
    markdown = markdown.replace(/^[\-*+]\s+/gm, '');

    // Remove links
    markdown = markdown.replace(/\[([^\]]+)\]\([^)]+\)/gm, '$1');

    // Remove images
    markdown = markdown.replace(/!\[([^\]]+)\]\([^)]+\)/gm, '');

    // Remove code blocks
    markdown = markdown.replace(/```[\s\S]*?```/gm, '');

    // Remove blockquotes
    markdown = markdown.replace(/^>\s+/gm, '');

    // Remove horizontal rules
    markdown = markdown.replace(/^[-*]\s*$/gm, '');

    // Trim extra whitespace
    markdown = markdown.trim();

    return markdown;
}

const checkContentIsTextOrHtml = (content)=>{
  return /<[a-z][\s\S]*>/i.test(content);
}


const copy = () => {
  if (props.isGeneratingContent) {
    return;
  }
  var isHtml = checkContentIsTextOrHtml(editableContent.value)
  if(isHtml){
    var markdown = convertHtmlToMarkdown(editableContent.value)
  }else{
  var markdown = editableContent.value
  }
  var text = markdownToText(markdown)
  navigator.clipboard.writeText(text);
  
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2500);
}

// Initialization
onMounted(() => {
  doc = props.document
  title.value = doc.title
  editableContent.value = doc.content
  syncContent()

  if (doc._isNew) {
    generateNewDocument()
  } else {
    tunings.value.push({
      'prompt': doc.title,
      'content': doc.content,
      'isManual': false
    })
  }
  
  scrollBodyScrollEvent = scrollBody.addEventListener('wheel', () => {
    autoScrollEnabled.value = false;
  });
//add event listener click
document.addEventListener('mousedown', function(event) {
    var targetElement = event.target.innerText =='Save Prompt as Template' || event.target.innerText =='Copy to Clipboard' || event.target.innerText =='Download.TXT file'  || event.target.innerText =='Save';
    if(!targetElement){
      var editDeleteButtonss = document.getElementsByClassName('editDeleteButtonss');
  //add class hidden to all editDeleteButtonss
  for (var i = 0; i < editDeleteButtonss.length; i++) {
    editDeleteButtonss[i].classList.add('hidden');
  }
    }

  });


})

onBeforeUnmount(() => {
  // TODO: Move generation to main.ts and remove this edge-case hack
  if (doc._isNew && isGeneratingContent.value) {
    mainStore.deleteMediaAsset(doc.guid).then(() => {
      mainStore.refreshCurrentMediaAssets()
    })
  }

  eventSource?.close()
  scrollBody.removeEventListener('scroll', scrollBodyScrollEvent)
})

</script>

<style scoped>
.blink-cursor {
  display: inline-block;
  width: 10px;
  height: 15px;
  margin-left: 0.25rem;
  background-color: #4b5563;
  opacity: 1;
  top: 2px;
  position: relative;
  animation: blink 1s step-end infinite;
}

.not-allowed-cursor {
    cursor: not-allowed;
}

@keyframes blink {
  0%, 50% {
    opacity: 0;
  }
  50%, 100% {
    opacity: 1.0;
  }
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

/* .dropBtn {
    top: 50%;
    transform: translateY(-50%);
} */
</style>