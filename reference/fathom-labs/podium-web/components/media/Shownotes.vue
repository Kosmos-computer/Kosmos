<template>
  <div  v-if="dynamicCustomLoader || currentMediaTranscriptLoading || updateMediaTranscriptLoading || preetLoading || aiLoading || dynamicBlocksContentLoader" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
  style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999;">
    <SvgLoadingMd />
  </div>
  <!--div v-if="!dynamicCustomLoader && !currentMediaTranscriptLoading" class="sidebar-opener">
   <span  v-if="openPresetCustomSidebar" @click="openPresetCustomSidebar = false; presetSection= false; customSection = false"><svg  class="closed-icon-svg" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
   <path d="M8.08317 3.74866L12.1665 7.83199L8.08317 11.9153M3.4165 3.74866L7.49984 7.83199L3.4165 11.9153" stroke="#9CA3AF" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M8.08317 3.74866L12.1665 7.83199L8.08317 11.9153M3.4165 3.74866L7.49984 7.83199L3.4165 11.9153" stroke="black" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
   </svg>
 </span>
  <span   v-if="!openPresetCustomSidebar" @click="openPresetCustomSidebar = true; presetSection= true"><svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.5 19.5596L4.5 12.5596L11.5 5.55957M19.5 19.5596L12.5 12.5596L19.5 5.55957" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg></span>
  </div-->
 <div  
    v-if="!dynamicCustomLoader && !currentMediaTranscriptLoading && !dynamicBlocksContentLoader"
    class="flex flex-col w-full min-h-screen min-w-[730px]"
    >
   <div class="flex w-full pt-5 pr-8 justify-between mx-auto max-w-6xl">
     <h1 class="text-2xl text-gray-900 font-semibold leading-8">{{ t('Summary') }}</h1>
     <div v-if="!currentMediaAssetsLoading" class="flex justify-center items-center">
      <div @click="copy(assets[0]?.id, assets[0]?.editor_content_text)" class=" flex flex-row mr-2 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
           <div class="pr-2 pl-1">
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
               <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
             </svg>
           </div>          
           <div class="text-sm font-medium leading-5 text-gray-700">
             <span v-if="copied != assets[0]?.id">{{ t('Copy') }}</span>
             <span v-if="copied == assets[0]?.id">{{ t('Copied!') }}</span>
           </div>
         </div>
       <button @click="activePage = Math.max(activePage - 1, 0)"
         :class="['w-4 h-4 mr-3 rounded-full text-sm font-medium',
                  activePage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600']"
         :disabled="activePage === 0">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
           <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
         </svg>
       </button>
       <button v-for="n in 3" :key="n" @click="activePage = n - 1"
         :class="[
         'w-6 h-6 mx-2 rounded-full text-sm font-medium',
         activePage === n - 1 ? 'text-indigo-600' : 'text-gray-600',
         activePage === n - 1 ? 'ring-2 ring-indigo-600' : 'bg-transparent'
         ]">
         {{ n }}
       </button>

       <button @click="activePage = Math.min(activePage + 1, 2)"
         :class="['w-4 h-4 ml-3 rounded-full text-sm font-medium',
                  activePage === 2 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600']"
         :disabled="activePage === 2">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
           <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
         </svg>
       </button>
     </div>
   </div>
   <div v-if="!currentMediaAssetsLoading" class="flex w-full pr-8 mx-auto max-w-6xl">
    <div v-if="!currentMediaAssetsLoading && assets.length > 0" v-cloak class="mb-8">
         <Editor
           :ref="setEditorRef(0)"
           className="relative w-full text-sm leading-5 font-normal text-gray-700 bg-transparent"
           @update="debouncedUpdateContent(0,assets[0].id)"
           @drop.prevent="onDropIntoEditor(0)"
           

         />
         <div class="flex mt-3 items-center w-fit">
         <div @click="copy(assets[0].id, assets[0].editor_content_text)" class=" flex flex-row mr-2 items-center w-fit bg-white pl-2 pr-4 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap">
           <div class="pr-2 pl-1">
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M9 2C7.89543 2 7 2.89543 7 4V12C7 13.1046 7.89543 14 9 14H15C16.1046 14 17 13.1046 17 12V6.41421C17 5.88378 16.7893 5.37507 16.4142 5L14 2.58579C13.6249 2.21071 13.1162 2 12.5858 2H9Z" fill="#6B7280"/>
               <path d="M3 8C3 6.89543 3.89543 6 5 6V16H13C13 17.1046 12.1046 18 11 18H5C3.89543 18 3 17.1046 3 16V8Z" fill="#6B7280"/>
             </svg>
           </div>          
           <div class="text-sm font-medium leading-5 text-gray-700">
             <span v-if="copied != assets[0].id">{{ t('Copy') }}</span>
             <span v-if="copied == assets[0].id">{{ t('Copied!') }}</span>
           </div>
         </div>
         <div class="dropbtn-wraper relative" >
           <div :id="'dropBtn'+activePage" class="dropBtn !transform-none  inline-flex min-w-[40px] mr-2 items-center w-fit bg-white pl-2 pr-2 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 h-10 rounded-md whitespace-nowrap py-3" @click="openDropdowns(activePage)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4b5563" aria-hidden="true" class="nz sb"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"></path></svg>
           </div>
           <div :id="'editDeleteButtons'+activePage"   class="hidden editDeleteButtons user-dropdown__dropdown">
                <a  @click="openSaveTemplateModal()"  class="user-dropdown__dropdown-item" data-action="save-template" >
                   {{ t('Save as Template') }}
                 </a>
                 <a @click="regenrateNotes()"  class="user-dropdown__dropdown-item" data-action="regenerate-notes" >
                   {{ t('Regenerate summary') }}
                 </a>
                 <a @click="downloadPackage()" class="user-dropdown__dropdown-item" data-action="download-package" >
                   {{ t('Download as...') }}
                 </a>
                 <a @click="deleteContent()" class="user-dropdown__dropdown-item" data-action="delete-content" >
                   {{ t('Delete') }}
                 </a>
               </div>
         </div>
         </div>
       </div>
     <!-- Page 1 Content -->

     <button id="fdButton" @click="contactSupport" style="display:none"></button>
   </div>  
   
 </div>

 <div  v-if="!dynamicCustomLoader && !currentMediaTranscriptLoading && !dynamicBlocksContentLoader"   class="min-w-[293px] max-w-[293px]">
   <div  v-if="openPresetCustomSidebar" class=" border-l border-gray-200 sticky h-[calc(100vh-69px)] top-0">
   <div  class="flex border-b border-gray-200 px-6 pt-4" >
     <div v-if="openPresetCustomSidebar" @click="showPresetSections" :class="[presetSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-4 px-1 border-indigo-500 cursor-pointer mr-8']">{{ t('Preset') }}</div>
     <div v-if="openPresetCustomSidebar" @click="showCustomSections"  :class="[customSection?'border-b-2 text-indigo-600':'','font-medium text-sm text-gray-600 pb-4 px-1 border-indigo-500 cursor-pointer']">{{ t('Custom') }}</div>
   </div>
     <div v-if="presetSection" class="flex flex-col overflow-y-auto overscroll-contain pt-6 pl-6 gap-2 pr-5 max-h-[100vh] pb-32">
       <button type="button" @click="customBlock = true" class="btn btn-submit">
         {{ t('Create New Block') }}
       </button>
     <div v-for="(preset, key) in presets" :key="key"
      draggable="true" 
      @dragstart="dragStartChapters(preset)"
       >
     <div @click.stop="insertAtEndOfEditor(preset, activePage)" class="flex flex-col cursor-pointer bg-white hover:bg-indigo-50 shadow px-6 py-4 rounded-lg">
       <div class="text-sm font-medium leading-5 mb-1 flex items-center gap-4" v-if="isSync && preset == 'Highlights' && headingTexts.length > 0 && headingTexts.includes('Highlights')">
        <SvgShowNotesMenu />
        <span @click.stop="insertAtEndOfEditor(preset, activePage)">{{ t(preset) }}</span>
        <div class="mx-auto flex h-5 w-5 items-center justify-center rounded-full" @click.stop="openSync(preset)">
          <SvgNewHighighlight />
        </div>
       </div>
       <div class="text-sm font-medium leading-5 mb-1 flex items-center gap-4" v-else-if="isSyncName && preset == 'Name of Episode' && headingTexts.length > 0 && headingTexts.includes('Name of Episode')">
        <SvgShowNotesMenu />
        <span @click.stop="insertAtEndOfEditor(preset, activePage)">{{ t(preset) }}</span>
        <div class="mx-auto flex h-5 w-5 items-center justify-center rounded-full" @click.stop="openSync(preset)">
          <SvgNewHighighlight />
        </div>
       </div>
       <div @click.stop="insertAtEndOfEditor(preset, activePage)" v-else
        class="text-sm font-medium leading-5 mb-1 flex items-center gap-4">
          <SvgShowNotesMenu class="w-4"/>
          <span>{{ t(preset) }}</span>
        </div>
     </div> 
   </div> 
   </div> 
   <div v-if="customSection" class="flex flex-col overflow-y-auto overscroll-contain pt-6 pl-6 gap-2 pr-5 max-h-[100vh] pb-32">
     <button type="button" @click="customBlock = true" class="btn btn-submit" >
      {{ t('Create New Block') }}
     </button>
     <div v-for="(preset, key) in custom_prompts"
        draggable="true"              
        @dragstart="dragStart(preset.content, preset.type, preset.title)" 
         >
       <div class="flex  gap-4 cursor-pointer bg-white hover:bg-indigo-50 shadow px-6 py-4 rounded-lg relative break-words items-center">
        <div class="w-fit">
          <SvgShowNotesMenu /></div>
         <div  @click="insertAtEndOfEditor(preset.content, activePage, preset.type, preset.title)" class="text-sm font-medium leading-5 mb-1">
           {{ preset.title }}
            <div class="text-sm leading-5 text-gray-600">
           {{truncateString(preset.content)}} 
         </div>
         </div>
        
         <div class="dropBtn absolute right-2 w-5" @click="openEditDeleteDropdownByCustomId(key)">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4b5563" aria-hidden="true" class="nz sb"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"></path></svg>
         </div>
         <div  :id="'editDeleteButtons_'+key"  class="hidden editDeleteButtons user-dropdown__dropdown">
           <a  href="#" class="user-dropdown__dropdown-item" @click="openEditDeletePopUp(preset.id , preset.title , preset.content, preset.type)" data-action="edit-prompt">
             {{ t('Edit Prompt') }}
           </a>
           <a @click="openDeletePopUp(preset.id)" class="user-dropdown__dropdown-item" data-action="delete-prompt">
              {{ t('Delete Prompt') }}
           </a>
         </div>
       </div> 
     </div>
   </div>
   </div>
 </div>
 <ModalsEditCustomBlockShowNotes  :showNotesCustomId="showNotesCustomGuid"  :title="heading" :content="paragraph" :type="customType"  :open="editDeletePopup" @close="handleClose()" @submit="handleSubmit()"  />
 <ModalsCreateCustomBlockShowNotes :open="customBlock"  @close="handleClose()" @submit="handleSubmit()"  />
 <ModalsDelete :open="deletePopup" :assestId="selectedShowNotesCustomPrompt" @close="handleClose()" @submit="handleSubmit()" from="showNotesCustomTemplate"  />
 <ModalsSaveTemplateShowNotes :templatesList="headingTexts" :open="saveTemplateModal" @close="saveTemplateModal = false"/>
 <ModalsSync  :open="openSyncModal" @close="openSyncModal = false"  @sync="refreshLists" />
 <ModalsEpisode  :open="episodeModal" @close="episodeModal = false"  @save="saveEpisode" :title="updateTitle" />
 <ModalsDownloadFiles v-if="currentMedia" :media="mainStore.currentMedia" :open="openDownloadFilesModal" @close="closeOpenDownloadFilesModal" />
 <ModalsAssetsDownloadFiles   :open="openAssetsDownloadFilesModal" @close="openAssetsDownloadFilesModal = false" />
 <ModalsShownotesIntro :open="openShownotesModal" @close="handleCloseIntro"  />  

</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useMainStore } from "~/store/main";
import { storeToRefs } from 'pinia'
import languageStore from '@/store/LanguageStore';
import Editor from "@/components/Editor.vue";
import { Editor as tipeditor } from '@tiptap/core';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import debounce from 'lodash/debounce';
import "novel-vue/dist/style.css";

const runtimeConfig = useRuntimeConfig()
const mainStore = useMainStore()
const mainStoreState = storeToRefs(mainStore)
const { currentMediaAssets, currentMediaAssetsLoading, currentMediaTranscriptLoading, updateMediaTranscriptLoading, currentMediaLoading, aiLoading, currentMedia, dynamicBlocksContent, dynamicBlocksContentLoader } = storeToRefs(mainStore)
const activePage = ref(0);
const assets = ref([])
const chapters = ref([])
const chaptersWithSummaries =ref([])
const chaptersWithShortSummaries =ref([])
const highlights =ref([])
const copied = ref(null)
const editors = ref([]);
const editorContents = ref([]);  
const presetSection = ref(true)
const customSection = ref(false)
const openPresetCustomSidebar = ref(true)
const customBlock = ref(false)
const custom_prompts= ref([])
const editDeletePopup = ref(false)
const showNotesCustomGuid = ref('')
const heading = ref('')
const paragraph = ref('')
const customType = ref('')
const selectedShowNotesCustomPrompt = ref('')
const deletePopup = ref(false)
const saveTemplateModal = ref(false)
const draggedContent = ref('');
const checkTypeOfCustom = ref('')
const dragFrom = ref('preset')
const timestampChapter =ref()
const summariesChapter =ref()
const shortSummariesChapter =ref()
const highlightsText =ref()
const keywordsText = ref()
const route = useRoute()
const dynamicCustomLoader = ref(false)
const headingTexts = ref([])
const dataVariationOne = ref([])
const dataVariationTwo = ref([])
const isTemplate = ref(false)
const whichEventInsertContent = ref('drag')
const staticTitle = ref('')
var eventSource = null;
const currrentClipLists = ref(mainStore.clipLists)
const parsedIsTemplateTrueContent = ref([])
const presets = ref({'episode-summary':'Podcast Summary','timestamp-chapter':'Chapters with timestamps','short-summaries-chapter':'Chapters with Short Summaries','summaries-chapter':'Chapters with Long Summaries','highlights-text':'Highlights','keywords-text':'Keywords','episode-block':'Name of Episode'})
const openSyncModal = ref(false)
const isSync = ref(false)
const isSyncName = ref(false)
const processSync = ref('')
const isProcess = ref(false)
const preetLoading = ref(false)
const episodeModal = ref(false)
const customEpisodeBlock = ref()
const updateTitle = ref('')
const updateEpisodeTitle = ref(false)
const openDownloadFilesModal = ref(false)
const openAssetsDownloadFilesModal = ref(false)
const matchDynamicBlocks = ref([])
const contentType = ref(mainStore.currentMedia && mainStore.currentMedia?.content_type ?  mainStore.currentMedia.content_type : 'podcast')
import { Node, mergeAttributes } from '@tiptap/core'

const openShownotesModal = ref(false);

onMounted(() => {
  const hasSeenShownotesIntro = localStorage.getItem('hasSeenShownotesIntro')
  if (!hasSeenShownotesIntro) {
    openShownotesModal.value = true
  }
})

function handleCloseIntro() {
  localStorage.setItem('hasSeenShownotesIntro', 'true')
  openShownotesModal.value = false
}

const customExtension = ref([])

// Create a Heading node
const EditableHeading = Node.create({
  name: 'editableHeading',

  group: 'block',

  content: 'text*',

  addAttributes() {
    return {
      level: {
        default: 2, // Default level (h2)
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'h2', // Assuming you're using h2 for the heading
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'h2',
      mergeAttributes(HTMLAttributes, { class: 'editable-heading' }),
      0, // This will insert the content (text) here
    ];
  },
});

const regenrateNotes = () => {
  editors.value[0].editor.commands.setContent(customSummaryBlock.value)
  const editorInstance = editors.value[0].editor
  if (editorInstance) {
    // Insert content at the beginning
    editorInstance.commands.insertContentAt(0, customSummaryBlock)
    
    // Remove the last empty paragraph
    const tr = editorInstance.state.tr
    const doc = tr.doc
    const lastNode = doc.lastChild
    
    // Check if the last node is an empty paragraph
    if (lastNode && lastNode.type.name === 'paragraph' && lastNode.content.size === 0) {
      // Remove the last node
      tr.delete(doc.content.size - lastNode.nodeSize, doc.content.size)
      
      // Apply the transaction
      editorInstance.view.dispatch(tr)
    }
  }
  updateContent(0, assets.value[0].id)
}
const deleteContent = () => {
  editors.value[0].editor.commands.setContent([{ type: "paragraph", content: [{ type: "text", text: '' }] }])
  updateContent(0, assets.value[0].id)     
}

const downloadPackage = () => {
  openDownloadFilesModal.value = true;
}
const closeOpenDownloadFilesModal = ()=>{
  openDownloadFilesModal.value = false
  const doNotShowNoti = localStorage.getItem('doNotShowNoti')
    if (doNotShowNoti === 'true') {
} else {
  openAssetsDownloadFilesModal.value = true
} 
}

const saveEpisode = (title) => {
  console.log(title)
  const formData = new FormData();
  episodeModal.value = false
  formData.append('episode_title', title);
  formData.append('original_filename', mainStore.currentMedia?.name || 'Untitled');
  formData.append('show_title', mainStore.currentMedia?.show_title && mainStore.currentMedia?.show_title != 'null' ? mainStore.currentMedia?.show_title :'');  
  mainStoreState.titleLoading.value = true
  
  customEpisodeBlock.value = {
      type: 'insertCustomDataExtension',
      attrs: {
        headingText: 'Name of Episode',
        class: 'episode-block',
      },
      content: [
        {
          type: "heading",
          attrs: {
            level: 3
          },
          content: [
            { type: "text", text: 'Name of Episode' }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: title }
          ]
        }
      ]

    }

    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/update`, {
				method: 'PUT',
				headers: {
                    'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
                },
                body: formData
			})
         .then((response) => response.json())
         .then((data) => {
            if(data){
              // mainStoreState.currentMedia.episode_title = title
              // updateTitle.value = 'Name Of Episode Added Successfully'
              mainStore.retrieveCurrentMedia(route.params.id, false)  
            }
        })
    const editorInst = editors.value[0]?.editor;
    if (editorInst) {
      const endPos = editorInst.state.doc.content.size;
      let transaction = editorInst.state.tr;
      editorInst.commands.insertContentAt(endPos, {
          type: "insertCustomDataExtension",
          attrs: {
            headingText: 'Name of Episode',
            class: 'episode-block',
          },
          content:  [
            {
              type:"heading",
              attrs: {
                level: 3
              },
              content: [
                { type: "text", text: 'Name of Episode' }
              ]
            },
          {
            type: "paragraph",
            content: [
              { type: "text", text: title }
            ]
          }
        ]
      });
    }

    // headingTexts.value = extractHeadingTexts(assets.value[0]?.getJSON().content)

    updateContent(0, assets.value[0].id, false)
  
}


const openSync = (presetTitle) => {
  processSync.value = presetTitle
  openSyncModal.value = true
}
const refreshLists = () =>{
  openSyncModal.value = false
  const editorInstance = editors.value[0].editor
  let transaction = editorInstance.state.tr;
  const docSize = editorInstance.state.doc.content.size;
  if (editorInstance && processSync.value == 'Highlights') {
    let content = [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: 'Highlights' }
        ]
      }
    ]
    highlights.value?.forEach((highlight) => {
      content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `(${mainStore.formatTime(highlight.start_seconds )}) ${highlight.content ? highlight.content : highlight.title} (${(highlight.end_seconds - highlight.start_seconds).toFixed(0)} Seconds)` }
          ]
      })
    })
    findAndUpdateNodeWithClass(editorInstance, 'highlights-text', content);

    // update code
    isSync.value = false
    isProcess.value = true
    updateContent(0, assets.value[0].id)
    mainStore.refreshCurrentMediaAssets()
    try {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${mainStore.getUserPodiumToken()}`);

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
      };
      const baseUrl = runtimeConfig.public.fathomWebApiURL + "/api/podium/internal/v1/clip/" + route.params.id + "/clip_status_changed/";

      fetch(baseUrl, requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));

    } catch (err) {
      console.error('Error update status:', err);
    }
  }
  if (editorInstance && processSync.value == 'Name of Episode') {
    let content = [
      {
        type:"heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: 'Name of Episode' }
        ]
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: mainStore.currentMedia?.episode_title }
        ]
      }
    ];
    findAndUpdateNodeWithClass(editorInstance, 'episode-block', content);
    updateContent(0, assets.value[0].id)
    isSyncName.value = false
  }
}

function extractHeadingTexts(contentJson) {
  if (contentJson) {
    const uniqueHeadings = new Set(); // Create a Set to store unique heading texts

    return contentJson
      .filter(item => item?.type === "heading" || item?.type === "insertCustomDataExtension") // Filter for headings
      .map(heading => {
        console.log("heading-->",heading)
        // Ensure there is a content array and the first element exists
        if (heading.attrs?.class) {
          const textContent = heading.attrs && heading.attrs.class
            ? heading.attrs.class 
            : '';
          return presets.value[textContent] ? presets.value[textContent] : heading.attrs?.headingText; // Return the text of the heading
        } else if (heading.type === 'heading') {
          const textContent = heading.content && heading.content.length > 0 
            ? heading.content[0].text 
            : '';
          return textContent; // Return the text of the heading
        }
      })
      .filter(text => {
        if (text) {
          // Check if the text is already in the Set
          if (!uniqueHeadings.has(text)) {
            uniqueHeadings.add(text); // Add to the Set if it's unique
            return true; // Include in the final result
          }
        }
        return false; // Exclude duplicates
      }); 
  }
  return [];
}

const dragStart=(content, typeOfCustom, title)=> {
  console.log('title:', title)
    staticTitle.value = title
    whichEventInsertContent.value = 'drag'
    dragFrom.value = 'custom'
    draggedContent.value = content; 
    checkTypeOfCustom.value = typeOfCustom
}


  const dragStartChapters = (chapters) => {
    console.log('chapters:', chapters)
    whichEventInsertContent.value = 'drag'
    
    // Existing logic for setting dragFrom
    if(chapters == 'Chapters with timestamps'){
      dragFrom.value ='timestamps'
    } else if(chapters == 'Chapters with Long Summaries'){
      dragFrom.value ='Summaries'
    } else if(chapters == 'Chapters with Short Summaries'){
      dragFrom.value ='Short Summaries'
    } else if(chapters == 'Highlights'){
      dragFrom.value ='Highlights'
    } else if(chapters == 'Name of Episode'){
      dragFrom.value ='Episode'
    } else if(chapters == `${capitalizeFirstLetter(contentType.value)} Summary`){
      dragFrom.value ='Summary'
    } else if(chapters == 'Keywords'){
      dragFrom.value ='Keywords'
    }
    
    draggedContent.value = chapters
  
    // Add a global event listener for dragend
    const handleDragEnd = (event) => {
      // Check if no drop occurred in the editor
      if (!event.dataTransfer || event.dataTransfer.dropEffect === 'none') {
        // Force insert at the end of the editor
        insertAtEndOfEditor(chapters, activePage.value)
      }
      
      // Remove the event listener
      document.removeEventListener('dragend', handleDragEnd)
    }
  
    // Attach the dragend event listener
    document.addEventListener('dragend', handleDragEnd)
  }

  const insertAtEndOfEditor =(presetSElection, index, typeOfCustom, title)=>{
    console.log(presetSElection, index)
      staticTitle.value = title
      whichEventInsertContent.value = 'click'
      if(presetSElection == 'Chapters with timestamps'){
        dragFrom.value ='timestamps'
      }else if(presetSElection == 'Chapters with Long Summaries'){
        dragFrom.value ='Summaries'
      }else if(presetSElection == 'Chapters with Short Summaries'){
        dragFrom.value ='Short Summaries'
      }else if(presetSElection == 'Highlights'){
        dragFrom.value ='Highlights'
      }else if(presetSElection == 'Name of Episode'){
        dragFrom.value ='Episode'
      }else if(presetSElection == `${capitalizeFirstLetter(contentType.value)} Summary`){
        dragFrom.value ='Summary'
      }else if(presetSElection == 'Keywords'){
        dragFrom.value ='Keywords'
      }else{
        dragFrom.value = 'custom'
        draggedContent.value = presetSElection; 
        checkTypeOfCustom.value = typeOfCustom
      }
      draggedContent.value = presetSElection
      if( whichEventInsertContent.value == 'click'){
        onDropIntoEditor(0)
      }
  }
  
  const summary = mainStore.currentMedia?.show_notes?.episode_summary ? mainStore.currentMedia?.show_notes?.episode_summary.split("\n") : []
  console.log("\\n", summary)
  const customSummaryBlock = {
    type:"insertCustomDataExtension",
    attrs: {
      headingText: `${capitalizeFirstLetter(contentType.value)} Summary`,
      class: 'episode-summary',
    },
    content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: `${capitalizeFirstLetter(contentType.value)} Summary` }
        ]
      }
    ]
  }
  if (summary.length > 0) {
    summary?.forEach((item) => {
      if (item != '') {
        customSummaryBlock.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: item}
          ]
        })
      }
    })

  } else {
    customSummaryBlock.content.push({
        type: "paragraph",
        content: [
          { type: "text", text: '' }
        ]
    })
  }
 
onBeforeUnmount(() => {
  eventSource?.close()
  document.removeEventListener('copy', copytEditorContent)
})
const editableContent = ref('')

const contactSupport = () => {
  Intercom('showNewMessage');
}

const removeLastEmptyParagraph = (editorInstance) => {
  const tr = editorInstance.state.tr
  const doc = tr.doc
  const lastNode = doc.lastChild
  
  // Check if the last node is an empty paragraph
  if (lastNode && lastNode.type.name === 'paragraph' && lastNode.content.size === 0) {
    // Remove the last node
    tr.delete(doc.content.size - lastNode.nodeSize, doc.content.size)
    
    // Apply the transaction
    editorInstance.view.dispatch(tr)
  }
};

const onDropIntoEditor = (index, checkedEpisode = true) => {
  console.log('drop start ...',customEpisodeBlock.value)
  if (checkedEpisode && !updateEpisodeTitle.value && dragFrom.value == 'Episode' && (!mainStore.currentMedia || !mainStore.currentMedia?.episode_title || mainStore.currentMedia?.episode_title == 'null')) {
    episodeModal.value = true
  }
    const editorInstance = editors.value[index]?.editor;
    const contentToSet = draggedContent.value;
    if (whichEventInsertContent.value == 'click') {
        // Insert at the end of the editor content
        if (editorInstance && editorInstance.commands) {
            // Find the end position
            const endPos = editorInstance.state.doc.content.size;
            if (dragFrom.value == 'custom') {
                if (contentToSet) {
                    if (checkTypeOfCustom.value == 'static_show_notes') {
                        if (staticTitle.value && staticTitle.value.trim() !== '') {
                            const heading = {
                              type: 'insertCustomDataExtension',
                              attrs: {
                                headingText: staticTitle.value,
                                class: 'static-content',
                              },
                              content: [
                                {
                                    type: "heading",
                                    attrs: {
                                        level: 3
                                    },
                                    content: [
                                        { type: "text", text: staticTitle.value ? staticTitle.value : 'Static Content:' }
                                    ]
                                }
                            ]
                            };
                            const paragraph = {
                                type: "paragraph",
                                content: [
                                    { type: "text", text: contentToSet }
                                ]
                            };
                            const customStaticTitleContent = [heading, paragraph];
                            if (endPos > 2) {
                              editorInstance.commands.insertContentAt(endPos, customStaticTitleContent);
                            } else {
                              editorInstance.commands.insertContentAt(0, customStaticTitleContent);
                              removeLastEmptyParagraph(editorInstance);
                            }
                            draggedContent.value = '';
                            whichEventInsertContent.value = '';
                        } 
                    } else if (checkTypeOfCustom.value == 'dynamic_show_notes') {
                      preetLoading.value = true
                      const content = encodeURIComponent(contentToSet);
                      const baseUrl = runtimeConfig.public.fathomWebApiURL + "/api/podium/v1/gpt/show_notes_prompts/" + route.params.id + "/" + content;
                      eventSource?.close();
                      eventSource = new EventSource(baseUrl);
                      let headingInserted = false; // Flag to check if the heading has been inserted
                      let headingText = decodeURIComponent(contentToSet); // Store the heading text
                      // Insert the heading first if it hasn't been added yet
                      let firstContent = true
                      let previousText = ''
                     

                      eventSource.onmessage = (event) => {
                          if (event.data === '{FINISHED}') {
                            setTimeout(() => {
                              preetLoading.value = false
                            }, 2000)
                              eventSource.close(); // Stop the API when finished
                          } else if (event.data.startsWith('{GUID')) {
                              // Handle GUID messages if needed
                            setTimeout(() => {
                              preetLoading.value = false
                            }, 2000)
                          } else {
                            if (!headingInserted) {
                              const { from, to } = editorInstance.state.selection;
                                  const heading = {
                                      type: "insertCustomDataExtension",
                                      attrs: {
                                        headingText: staticTitle.value,
                                        class: 'dynamic-content',
                                      },
                                      content: [{
                                        type: "heading",
                                        attrs: {
                                          level: 3
                                        },
                                        content: [
                                          { type: "text", text: staticTitle.value ? staticTitle.value : 'Dynamic Content:' },
                                        
                                        ]
                                      }]
                                  };

                                  const paragraph = {
                                      type: "paragraph",
                                      content:[
                                      
                                      ]
                                      
                                  };
                                  if (endPos > 2) {
                                    editorInstance.commands.insertContentAt(endPos, heading);
                                  } else {
                                    editorInstance.commands.insertContentAt(0, heading);
                                    removeLastEmptyParagraph(editorInstance);
                                  }

                                  editorInstance.commands.selectTextblockEnd()

                                  editorInstance.commands.insertContent(paragraph); 
                            
                                  headingInserted = true; // Set the flag to true to avoid adding it again
                              }
                            if(headingInserted){
                              
                              const { from, to } = editorInstance.state.selection;
                              
                              console.log(from, 'from')
                              // return
                              // editorInstance.commands.insertContentAt(from, '\n');
                              var incoming = JSON.parse(event.data)
                              const part = incoming.choices[0].delta.content
                              if (part != null || part != undefined) {
                                editableContent.value += part
                                if (firstContent == true) {
                                  editorInstance.commands.insertContentAt(from + 1, part);
                                  firstContent = false
                                } else {
                                  if (/#/.test(part)) {
                                    previousText = part
                                  } else {
                                    if (previousText != '') {
                                      console.log('previousText+part', previousText+part)
                                      editorInstance.commands.insertContentAt(from, previousText+part);
                                      previousText = ''
                                    } else {
                                      console.log('previousText', previousText)
                                      editorInstance.commands.insertContentAt(from, part);
                                    }
                                  }
                                }
                              }
                                // preetLoading.value = false
                            }
                          }
                      };


                    }
                }
            } else if (dragFrom.value == 'timestamps' && timestampChapter.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, timestampChapter.value);
              } else {
                editorInstance.commands.insertContentAt(0, timestampChapter.value);
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Summaries' && summariesChapter.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, summariesChapter.value);
              } else {
                editorInstance.commands.insertContentAt(0, summariesChapter.value);
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Short Summaries' && shortSummariesChapter.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, shortSummariesChapter.value);
              } else {
                editorInstance.commands.insertContentAt(0, shortSummariesChapter.value);
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Highlights' && highlightsText.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, highlightsText.value);
              } else {
                editorInstance.commands.insertContentAt(0, highlightsText.value);
                removeLastEmptyParagraph(editorInstance);
              }
              isSync.value = false
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Episode' && customEpisodeBlock.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, customEpisodeBlock.value);
              } else {
                editorInstance.commands.insertContentAt(0, customEpisodeBlock.value);
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Summary' && customSummaryBlock) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, customSummaryBlock);
              } else {
                editorInstance.commands.insertContentAt(0, customSummaryBlock);
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            } else if (dragFrom.value == 'Keywords' && keywordsText.value) {
              if (endPos > 2) {
                editorInstance.commands.insertContentAt(endPos, keywordsText.value);
              } else {
                editorInstance.commands.insertContentAt(0, keywordsText.value);;
                removeLastEmptyParagraph(editorInstance);
              }
              whichEventInsertContent.value = '';
            }
        }
    }
    else if (whichEventInsertContent.value == 'drag' || whichEventInsertContent.value == '') {
        editorInstance.chain().focus().run();
        const { x, y } = event; // Assuming the drop event contains x and y positions
        const dropPosition = editorInstance.view.posAtCoords({ left: x, top: y });
    
        // Find nearest paragraph break
        const doc = editorInstance.state.doc;
        let position = dropPosition.pos;
        
        // Function to find nearest paragraph boundary
        const findNearestParagraphBoundary = (pos) => {
            let prevBreak = 0;
            let nextBreak = doc.content.size;
        
        // Iterate through nodes to find paragraph boundaries
        doc.descendants((node, nodePos) => {
            if (node.type.name === 'paragraph') {
                if (nodePos < pos && nodePos > prevBreak) {
                    prevBreak = nodePos + node.nodeSize;
                }
                if (nodePos > pos && nodePos < nextBreak) {
                    nextBreak = nodePos;
                }
            }
        });
        
        // Return the closest boundary
        return (pos - prevBreak < nextBreak - pos) ? prevBreak : nextBreak;
    };
    
    // Get the nearest paragraph boundary
    let snapPosition = findNearestParagraphBoundary(position);
          if (dragFrom.value == 'custom') {
            if (contentToSet) {
                if (checkTypeOfCustom.value == 'static_show_notes') {
                  if (staticTitle.value && staticTitle.value.trim() !== '') {
                            const heading = {
                                type: "heading",
                                attrs: {
                                    level: 3 // Set the desired heading level
                                },
                                content: [
                                    { type: "text", text: staticTitle.value ? staticTitle.value : 'Static Content:' } // Ensure valid text
                                ]
                            };
                            const paragraph = {
                                type: "paragraph",
                                content: [
                                    { type: "text", text: contentToSet }
                                ]
                            };
                            const customStaticTitleContent = [heading, paragraph];
                            if(snapPosition){
                              editorInstance.chain().focus().insertContentAt(snapPosition, customStaticTitleContent).run();
                            }
                            draggedContent.value = '';
                            whichEventInsertContent.value = '';
                        } 
                } else if (checkTypeOfCustom.value == 'dynamic_show_notes') {
                  preetLoading.value = true
                  const content = encodeURIComponent(draggedContent.value);
                  const baseUrl = runtimeConfig.public.fathomWebApiURL + "/api/podium/v1/gpt/show_notes_prompts/" + route.params.id + "/" + content;
                  eventSource?.close();
                  eventSource = new EventSource(baseUrl);

                  let accumulatedContent = ''; // Accumulated content from the API
                  let headingInserted = false; // Flag to check if the heading has been inserted
                  const headingText = decodeURIComponent(contentToSet); // Store the heading text
                  const insertedParagraphs = new Set(); // Track inserted paragraphs to avoid duplicates
                  const PARAGRAPH_BREAK_REGEX = /(?<=\.|\?)\n{1,2}|[\n]{2,}/; // Regex for splitting paragraphs

eventSource.onmessage = (event) => {
    if (event.data === '{FINISHED}') {
        eventSource.close(); // Stop the API when finished

        // Insert the heading first if it hasn't been added yet
        if (!headingInserted) {
            const heading = {
                type: "heading",
                attrs: {
                    level: 3 // Set the desired heading level (3 in this case)
                },
                content: [
                    { type: "text", text: staticTitle.value ? staticTitle.value : 'Dynamic Content:' } // Use the content as the heading text
                ]
            };
            if (snapPosition) {
                editorInstance.chain()
                    .focus()
                    .insertContentAt(snapPosition, heading) // Insert heading at the current position
                    .run(); // Execute the chain
                headingInserted = true; // Set the flag to true to avoid adding it again
                snapPosition += staticTitle.value.length + 1; // Move position after heading insertion
            }
        }

        // Insert accumulated content if it exists
        if (headingInserted) {
          if (accumulatedContent.trim() !== '') {
              const paragraphs = accumulatedContent.split(PARAGRAPH_BREAK_REGEX); // Split into paragraphs
              paragraphs?.forEach((paragraph) => {
                  const trimmedParagraph = paragraph.trim();
                  if (trimmedParagraph !== '' && !insertedParagraphs.has(trimmedParagraph)) { // Check for non-empty and non-duplicate paragraphs
                      if (snapPosition) {
                          editorInstance.chain()
                              .focus()
                              .insertContentAt(snapPosition, { // Insert paragraph at current position
                                  type: "paragraph",
                                  content: [
                                      { type: "text", text: trimmedParagraph }
                                  ]
                              })
                              .run(); // Execute the chain
                          insertedParagraphs.add(trimmedParagraph); // Track the inserted paragraph
                          snapPosition += trimmedParagraph.length + 1; // Update position after insertion
                      }
                  }
              });
              accumulatedContent = ''; // Reset after inserting
          }

        setTimeout(() => {
          preetLoading.value = false
        }, 2000)
      }
    } else if (event.data.startsWith('{GUID')) {
      setTimeout(() => {
        preetLoading.value = false
      }, 2000)
        // Handle GUID messages if needed
    } else {
        // Insert the heading first if it hasn't been added yet
        if (!headingInserted) {
            const heading = {
                type: "heading",
                attrs: {
                    level: 3 // Set the desired heading level (3 in this case)
                },
                content: [
                    { type: "text", text: staticTitle.value ? staticTitle.value : 'Dynamic Content:' } // Use the content as the heading text
                ]
            };
            if (snapPosition) {
                editorInstance.chain()
                    .focus()
                    .insertContentAt(snapPosition, heading) // Insert heading at the current position
                    .run(); // Execute the chain
                headingInserted = true; // Set the flag to true to avoid adding it again
                snapPosition += staticTitle.value.length + 1; // Move position after heading insertion
            }
        }
        if (headingInserted) {
          const incoming = JSON.parse(event.data);
          // preetLoading.value = false
          incoming.choices?.forEach((choice) => {
              const part = choice.delta.content;
              if (part !== undefined) {
                  // Accumulate content only if part is defined
                  accumulatedContent += part; // Keep accumulating as a single string

                  // Check for paragraph breaks in the accumulated content
                  const newSegments = accumulatedContent.split(PARAGRAPH_BREAK_REGEX);

                  // Insert completed segments as new paragraphs
                  if (newSegments.length > 1) {
                      newSegments.slice(0, -1)?.forEach((segment) => {
                          const trimmedSegment = segment.trim();
                          if (trimmedSegment !== '' && !insertedParagraphs.has(trimmedSegment)) { // Avoid empty or duplicate segments
                              if (snapPosition) {
                                  editorInstance.chain()
                                      .focus()
                                      .insertContentAt(snapPosition, { // Insert paragraph
                                          type: "paragraph",
                                          content: [
                                              { type: "text", text: trimmedSegment }
                                          ]
                                      })
                                      .run(); // Execute the chain
                                  insertedParagraphs.add(trimmedSegment); // Track inserted segment
                                  snapPosition += trimmedSegment.length + 2; // Update position after insertion
                              }
                          }
                      });
                      // Retain the last segment to accumulate for the next message
                      accumulatedContent = newSegments[newSegments.length - 1];
                  }
              }
          });
        }
    }
};


                }
            }
        } else if (dragFrom.value == 'timestamps' && timestampChapter.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, timestampChapter.value).run();
            } 
        } else if (dragFrom.value == 'Summaries' && summariesChapter.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, summariesChapter.value).run();
            } 
        } else if (dragFrom.value == 'Short Summaries' && summariesChapter.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, shortSummariesChapter.value).run();
            } 
        } else if (dragFrom.value == 'Highlights' && highlightsText.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, highlightsText.value).run();
                isSync.value = false
            } 
        } else if (dragFrom.value == 'Episode' && customEpisodeBlock.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, customEpisodeBlock.value).run();
            } 
        } else if (dragFrom.value == 'Summary' && customSummaryBlock) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, customSummaryBlock).run();
            } 
        } else if (dragFrom.value == 'Keywords' && keywordsText.value) {
            if (snapPosition) {
                editorInstance.chain().focus().insertContentAt(snapPosition, keywordsText.value).run();
            } 
        }
    }
};


const getCustomPrompt = async () => {
 if (mainStoreState.showNotesCustomPrompts.value) {
   custom_prompts.value = mainStoreState.showNotesCustomPrompts.value
 }
}

const loadDynamicTemplate = () => {

  const dynamicBlocks = custom_prompts.value?.filter(item => item.type == 'dynamic_show_notes').map(item => item.title)
  console.log('dynmic include:',mainStore.templateFormatLists.filter(value => dynamicBlocks.includes(value)))
  matchDynamicBlocks.value = mainStore.templateFormatLists.filter(value => dynamicBlocks.includes(value))
  if (matchDynamicBlocks.value.length > 0) {
    if (assets.value && assets.value[0] && isValidJson(assets.value[0]?.editor_content_json)) {
      mainStoreState.dynamicBlocksContentLoader.value = false
    } else {
      console.log('Calling api to append dynamic blocks...')
      mainStoreState.dynamicBlocksContentLoader.value = true
      mainStoreState.dynamicBlocksContent.value = []
      matchDynamicBlocks.value?.forEach(title => {
        mainStore.getDynamicBlocks(route.params.id, title, matchDynamicBlocks.value.length)
      })
    }
  }

}

watch (() => mainStoreState.dynamicBlocksContentLoader.value, (newValue) => {
  if (dynamicBlocksContent.value?.length == matchDynamicBlocks.value.length) {
    templateTrueCaseEditorLists(assets.value) 
    const parsedContent = computed(() => createParsedContent(assets.value));
    setContent(activePage.value);
  }
})

watch (() => mainStoreState.showNotesCustomPrompts.value, (newValue) => {
 if (newValue) {
   getCustomPrompt()
   loadDynamicTemplate()
 }
})

const truncateString=(str)=> {
   if (str.length > 55) {
       return str.substring(0, 55) + "...";
   } else {
       return str;
   }
}

getCustomPrompt()


const t = computed(() => {
 return key => {
   const translation = languageStore.state.translations[key];
   return translation || key;  // Fallback to key if translation not found
 };
});


const showPresetSections =()=>{
 presetSection.value = true
 customSection.value = false
}

const showCustomSections =()=>{
 presetSection.value = false
 customSection.value = true
}

watch(currentMediaAssets.value, (newVal, oldVal) => {
  highlights.value = mainStore.currentMediaAssets?.filter(asset=>asset.type === "highlight")
  if (highlights.value.length > 0) {
    highlights.value.map(item => {
      if (isSync.value == false && isProcess.value == false && item.is_updated) {
        isSync.value = true
      }
    })
  }
})

watch(currentMediaAssetsLoading.value, (newVal, oldVal) => {

  const editorInstance = editors.value[0]?.editor;
  if (editorInstance) {
    console.log(1)
    editorInstance.state.doc.descendants((node, pos) => {
      let startPos = null;
      if (node.attrs.class != '' && node.attrs.class == 'episode-block') {
        startPos = pos
        editorInstance.state.doc.descendants((nextNode, nextPos) => {
          if (nextPos > startPos && nextNode.type.name === 'paragraph' && mainStore.currentMedia && mainStore.currentMedia?.episode_title != '' ) {
            if (nextNode.textContent != null && nextNode.textContent != '' && nextNode.textContent != mainStore.currentMedia?.episode_title) {
              isSyncName.value = true
            }
          }
        });
      }
    })
  }

})

watch(
      () => mainStore.clipLists,
      (newClipLists, oldClipLists) => {
        // Compare the new and old values
        if (JSON.stringify(newClipLists) !== JSON.stringify(oldClipLists)) {
          console.log('Clip list has changed', newClipLists, oldClipLists);
          // Handle the logic for when changes occur
        } else {
          console.log('No changes detected');
        }
      },
      { deep: true } // Use deep to watch for nested changes within objects
    );

onMounted(async() => {
  console.log('contentType', capitalizeFirstLetter(contentType.value))
  presets.value['episode-summary'] = `${capitalizeFirstLetter(contentType.value)} Summary`
  mainStore.getAllClipLists()
  mainStore.refreshCustomPrompts()
  await nextTick(); // Wait for the next DOM update cycle
  initAssets();
  if (highlights.value.length > 0) {
    highlights.value.map(item => {
      if (isSync.value == false && item.is_updated) {
        isSync.value = true
      }
    })
  }
})
function capitalizeFirstLetter(string) {
  if (!string) return ''; // Return empty if the string is empty
  return string
  .split('_')                // Split string by underscores
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter of each word
  .join(' ');   
}
const updateContent = async (index , id, isSave = true) => {
  mainStoreState.aiLoading.value = false
  console.log(id, 'id')
  const editorInst = editors.value[index].editor;
  if (editorInst) {
   


    // editorInst.commands.insertContent(nodeData)
    var data = {
      editor_content_json: editorInst.getJSON().content,
      editor_content_text: editorInst.getHTML(),
      content_text: editorInst.getText()
    }
    
      mapWithAsset(data, id)
      if (isSave) {
        saveContent(data, id)
      }
      
    editorInst.state.doc.descendants((node, pos) => {
      
      if (node.attrs.class && node.attrs.class.includes('episode-summary')) {
        //console node
        // console.log(node.content.toJSON()?.filter((content,i) => content.type !== "heading" || i > 0), 'node')
        data = {
          updated_content: node.content.toJSON()
        }
        console.log(assets.value[activePage.value].id, 'assets.value[activePage.value].id')


        mapWithAsset(data, assets.value[activePage.value].id)
        if (isSave) {
          saveContent(data, assets.value[activePage.value].id)
        }
        

      }
    
  }) 
    
  }
};

const mapWithAsset = (data,id) => {
  assets.value.map((asset) => {
    if (asset.id === id) {
      asset.editor_content_json = data.editor_content_json || asset.editor_content_json;
      asset.editor_content_text = data.editor_content_text || asset.editor_content_text;
      asset.content = data.content || asset.content;
      asset.updated_content = data.updated_content || asset.updated_content;
    }
  })
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

const openEditDeletePopUp=(id,title,content,type)=>{
  editDeletePopup.value = true
  customType.value = type
  showNotesCustomGuid.value = id
  heading.value = title
  paragraph.value = content
}

const handleSubmit = () => {
  updateContent(0, assets.value[0].id, true);
  editDeletePopup.value = false
  customBlock.value = false
}

const handleClose = () => {
  updateContent(0, assets.value[0].id, false);
  editDeletePopup.value = false;
  customBlock.value = false;
  deletePopup.value = false;
}

const openDeletePopUp=(id)=>{
 selectedShowNotesCustomPrompt.value = id
 deletePopup.value = true
}


let isDropdownVisible = false;

const openDropdowns = (index) => {
  const dropdownId = 'editDeleteButtons' + index;
  const buttonId = 'dropBtn' + index;
  const dropdown = document.getElementById(dropdownId);
  const button = document.getElementById(buttonId);

  if (!dropdown || !button) return;

  const closeDropdown = (event) => {
    // Close the dropdown if clicking outside or on an option
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add('hidden');
      isDropdownVisible = false;
      document.removeEventListener('click', closeDropdown); // Cleanup listener
    } else if (dropdown.contains(event.target)) {
      // Handle click on an option
      dropdown.classList.add('hidden');
      isDropdownVisible = false;
      document.removeEventListener('click', closeDropdown); // Cleanup listener
    }
  };

  if (!isDropdownVisible) {
    // Calculate position and show dropdown
    const rect = button.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    dropdown.classList.remove('top-12', 'bottom-12');
    if (spaceAbove > spaceBelow) dropdown.classList.add('bottom-12');
    else dropdown.classList.add('top-12');

    dropdown.classList.remove('hidden');
    isDropdownVisible = true;

    // Add event listener to detect outside clicks or option clicks
    setTimeout(() => document.addEventListener('click', closeDropdown), 0);
  } else {
    // Hide dropdown
    dropdown.classList.add('hidden');
    isDropdownVisible = false;
    document.removeEventListener('click', closeDropdown); // Cleanup listener
  }
};

const openSaveTemplateModal =()=>{
  updateContent(0, assets.value[0].id, false);
  saveTemplateModal.value = true
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${secs}`;
}

const initAssets = async() => {
  assets.value = []
  chaptersWithSummaries.value = []
  chaptersWithShortSummaries.value = []
  highlights.value = []
  keywordsText.value = {
    type: 'insertCustomDataExtension',
    attrs: {
      headingText: t.value('Keywords'),
      class: 'keywords-text',
    },
    content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Keywords') }
        ]
      }
    ]
  }
  summariesChapter.value = {
    type: 'insertCustomDataExtension',
      attrs: {
        headingText: t.value('Chapters'),
        class: 'summaries-chapter',
      },
      content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Chapters') }
        ]
      }
    ]

  }
  shortSummariesChapter.value = {
    type: 'insertCustomDataExtension',
      attrs: {
        headingText: t.value('Chapters'),
        class: 'short-summaries-chapter',
      },
      content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Chapters') }
        ]
      }
    ]
  }
  highlightsText.value = {
    type: 'insertCustomDataExtension',
      attrs: {
        headingText: t.value('Highlights'),
        class: 'highlights-text',
      },
      content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Highlights') }
        ]
      }
    ]
  }
  timestampChapter.value = {
    type: 'insertCustomDataExtension',
      attrs: {
        headingText: t.value('Chapters'),
        class: 'timestamp-chapter',
      },
      content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Chapters') }
        ]
      }
    ]
  }

  // short summary
  let chapters = mainStore.currentMediaAssets?.filter(asset => asset.type === 'chapter')
  chapters?.sort((a, b) => a.start_seconds - b.start_seconds)
  chaptersWithShortSummaries.value = chapters
  chaptersWithShortSummaries.value?.forEach((summarries) => {
    shortSummariesChapter.value.content.push({
      type: "paragraph",
      content: [
        { type: "text", text: `${summarries.variations[0].title} (${mainStore.formatTime(summarries.variations[0].start_seconds)})` },
        { type: "hardBreak" },
        { type: "text", text: `${summarries.variations[0].content}` }
      ]
    });
  });
  // long summary
  chaptersWithSummaries.value = mainStore.currentMedia?.show_notes?.episode_chapters_with_full_summaries
   chaptersWithSummaries.value?.forEach((summarries) => {
    summariesChapter.value.content.push({
      type: "paragraph",
      content: [
        { type: "text", text: `(${formatTime(summarries.time)}) - ${summarries.description} (${summarries.duration} Minutes)` },
        { type: "hardBreak" },
        { type: "text", text: `${summarries.summary}` }
      ]
    });
  });
  if (mainStore.currentMediaAssets) {
    let filteredHighlights = mainStore.currentMediaAssets?.filter(asset=>asset.type === "highlight")
    filteredHighlights?.sort((a, b) => a.start_seconds - b.start_seconds)
    highlights.value = filteredHighlights
    highlights.value?.forEach((highlight) => {
      highlightsText.value.content.push({
        type: "paragraph",
        content: [
          { type: "text", text: `(${mainStore.formatTime(highlight.start_seconds )}) ${highlight.content ? highlight.content : highlight.title} (${(highlight.end_seconds - highlight.start_seconds).toFixed(0)} Seconds)` }
        ]
      })
    })
    let filteredKeywords = mainStore.currentMediaAssets?.filter(asset=>asset.type === "keywords")

    keywordsText.value.content.push({
        type: "paragraph",
        content: [
          { type: "text", text: filteredKeywords[0].content }
        ]
      })
    let filteredAssets = mainStore.currentMediaAssets?.filter(asset => asset.type === 'chapter')
    filteredAssets?.sort((a, b) => a.start_seconds - b.start_seconds)
    chapters.value = filteredAssets
    chapters.value?.forEach((chapter) => {
      timestampChapter.value.content.push({
        type: "paragraph",
        content: [
          { type: "text", text: `(${mainStore.formatTime(chapter.start_seconds)}) - ${chapter.title}` }
        ]
      })
    })
    console.log(timestampChapter.value, 'chapters')
    let filteredAsset = mainStore.currentMediaAssets.find(asset => asset.type === 'show_notes_summary')
    dataVariationOne.value = (() => {
        const uniqueHeadings = new Set(); // Create a Set to store unique heading texts

        return filteredAsset.variations[0]?.editor_content_json?.map(item => {
          if (item.type === "heading" && item.content && item.content[0]?.text) {
            const textContent = item.content[0].text;
            // Check if the text is already in the Set
            if (!uniqueHeadings.has(textContent)) {
                uniqueHeadings.add(textContent); // Add to the Set if it's unique
                return textContent; // Return the unique text
            }
        }
            return null; // Return null for non-heading items or duplicates
        }).filter(Boolean) || []; // Filter out nulls and return the result
    })();

    dataVariationTwo.value = (() => {
        const uniqueHeadings = new Set(); // Create a Set to store unique heading texts
        return filteredAsset.variations[1]?.editor_content_json?.map(item => {
            if (item.type === "heading" && item.content && item.content[0]?.text) {
                const textContent = item.content[0].text;
                // Check if the text is already in the Set
                if (!uniqueHeadings.has(textContent)) {
                    uniqueHeadings.add(textContent); // Add to the Set if it's unique
                    return textContent; // Return the unique text
                }
            }
            return null; // Return null for non-heading items or duplicates
        }).filter(Boolean) || []; // Filter out nulls and return the result
    })();

    customEpisodeBlock.value = {
      type: 'insertCustomDataExtension',
      attrs: {
        headingText: t.value('Name of Episode'),
        class: 'episode-block',
      },
      content: [
        {
          type: "heading",
          attrs: {
            level: 3
          },
          content: [
            { type: "text", text: t.value('Name of Episode') }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: mainStore.currentMedia?.episode_title && mainStore.currentMedia?.episode_title != 'null' ? mainStore.currentMedia?.episode_title :'' }
          ]
        }
      ]

    }
  
    // headingTexts.value = extractHeadingTexts(filteredAsset.editor_content_json);
    assets.value.push(filteredAsset)
    filteredAsset.variations?.forEach(variation => {
      assets.value.push(variation)
    })
    if (isValidJson(assets.value[0]?.editor_content_json)) {
      mainStoreState.dynamicBlocksContentLoader.value = false
    }
      editors.value = assets.value.map(() => ({ editor: null }));
      editorContents.value = assets.value.map(() => ({ title: '' })); // Initialize editor contents
      await nextTick(); // Wait for the next DOM update cycle
      editors.value?.forEach((editorWrapper, index) => {
        setContent(index);
      });
      scrollToTop();
      const editorInstance = editors.value[0]?.editor;
      if (editorInstance) {
        editorInstance.state.doc.descendants((node, pos) => {
          let startPos = null;
          let isProcess = false
          if (node.attrs.class != '' && node.attrs.class == 'episode-block') {
            startPos = pos
            editorInstance.state.doc.descendants((nextNode, nextPos) => {
              if (nextPos > startPos && nextNode.type.name === 'paragraph' && !isProcess && mainStore.currentMedia && mainStore.currentMedia?.episode_title != '' ) {
                isProcess = true
                if (nextNode.textContent != null && nextNode.textContent != '' && nextNode.textContent != mainStore.currentMedia?.episode_title) {
                  isSyncName.value = true
                }
              }
            });
          }
        })
        paginationContent()
      }
  }
}


function findAndUpdateNodeWithClass(editorInst, className, summaryContent) {
  editorInst.state.doc.descendants((node, pos) => {
    if (node.attrs.class && node.attrs.class.includes(className)) {
     //delete node range
     editorInst.commands.deleteRange({
        from: pos,
        to: pos + node.nodeSize
      });

      // Check doc size after deletion
      if (editorInst.state.doc.content.size <= 2) {
        // If document is essentially empty, use setContent
        editorInst.commands.setContent({
          type: "doc",
          content: [{
            type: "insertCustomDataExtension",
            attrs: {
              headingText: presets.value[className],
              class: className,
            },
            content: summaryContent
          }]
        });
      } else {
        // Otherwise insert at position
        editorInst.commands.insertContentAt(pos, {
          type: "insertCustomDataExtension",
          attrs: {
            headingText: presets.value[className],
            class: className,
          },
          content: summaryContent
        });
      }

      //insert new node
      /*editorInst.commands.insertContentAt(pos, {
        type: "insertCustomDataExtension",
        attrs: {
          headingText: presets.value[className],
          class: className,
        },
        content: summaryContent
      });*/
      //console.log(node.content.toJSON(), 'node')
      return false;  // Stop iteration after updating the node
    }
  });
}




watch(async () => activePage.value, (newPage) => {
  headingTexts.value = extractHeadingTexts(assets.value[0]?.editor_content_json)
  
  console.log(customSummaryBlock, 'customSummaryBlock')

  paginationContent()
});

watch(() => mainStore.currentMedia, (newValue) => {
  if (newValue) {
    contentType.value = mainStore.currentMedia && mainStore.currentMedia.content_type ? mainStore.currentMedia.content_type : 'podcast'
    presets.value['episode-summary'] = `${capitalizeFirstLetter(contentType.value)} Summary`
  }
});

watch(() => currentMediaTranscriptLoading.value, (newVal) => {
  initAssets()
  const parsedContent = computed(() => createParsedContent(assets.value));
  setContent(activePage.value);
  if(activePage.value === 0){
    headingTexts.value = headingTexts.value
  }else if(activePage.value === 1){
    headingTexts.value = dataVariationOne.value
  } else if(activePage.value === 2){
    headingTexts.value = dataVariationTwo.value
  }
});

function paginationContent() {
  const editorInstance = editors?.value[0]?.editor; // Assuming 'editor' is your Tiptap editor instance
  let summaryAsset = mainStore.currentMediaAssets.find(summary => summary.type === 'show_notes_summary')
  // Assuming the summaryContent is a JSON representation of the content you're inserting
  let content = activePage.value == 0 ? summaryAsset : activePage.value == 1 ? summaryAsset.variations[0] : summaryAsset.variations[1];

  if (activePage.value == 0) {
    content = summaryAsset.updated_content && summaryAsset.updated_content != null ? summaryAsset.updated_content : summaryAsset.content;
  } else if (activePage.value == 1) {
    content = summaryAsset.variations[0]?.updated_content && summaryAsset.variations[0]?.updated_content != null ? summaryAsset.variations[0]?.updated_content : summaryAsset.variations[0]?.content;
  } else if (activePage.value == 2) {
    content = summaryAsset.variations[1]?.updated_content && summaryAsset.variations[1]?.updated_content != null ? summaryAsset.variations[1]?.updated_content : summaryAsset.variations[1]?.content;
  }
  console.log(content, 'summaryAsset.variations[0]?.updated_content')
  //check if the summaryContent is an array
  let summaryContent = []
  if (Array.isArray(content)) {
    if (content[0].type === 'heading') {
      summaryContent = content;
    } else {
      summaryContent = [{
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value(`${capitalizeFirstLetter(contentType.value)} Summary`) }
        ]
      },...content];
    }
  } else {
    summaryContent = [
      {
          type: "heading",
          attrs: {
            level: 3
          },
          content: [
            { type: "text", text: t.value(`${capitalizeFirstLetter(contentType.value)} Summary`) }
          ]
      },
    ];
    let paragraph = content?.split("\n")
    if (paragraph.length > 0) {
      paragraph?.forEach((item) => {
        if (item != '') {
          summaryContent.push({
            type: "paragraph",
            content: [
              { type: "text", text: item}
            ]
          })
        }
      })
    }
  }
  
  customSummaryBlock.content = summaryContent;

  findAndUpdateNodeWithClass(editorInstance, 'episode-summary', summaryContent);

  headingTexts.value = extractHeadingTexts(assets.value[0]?.editor_content_json)

  updateContent(0, assets.value[0].id, false)

}

function manageSummary() {
  const contentArray = [];
  contentArray.push({
    type:"insertCustomDataExtension",
    attrs: {
      headingText: t.value('Episode Summary'),
      class: 'episode-summary',
    },
    content: [
      {
        type: "heading",
        attrs: {
          level: 3
        },
        content: [
          { type: "text", text: t.value('Episode Summary') }
        ]
      }
    ]
  });
  const summary = mainStore.currentMedia?.show_notes?.episode_summary ? mainStore.currentMedia?.show_notes?.episode_summary.split("\n") : []

  // const episodeSummary = mainStore.currentMediaAssets?.find(asset => asset.type === 'show_notes_summary') || 'No Episode Summary Available'; // Assuming you have an episode summary in your data
  if (summary.length > 0) {
    summary?.forEach((item) => {
      if (item != '') {
        contentArray[0]?.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: item}
          ]
        })
      }
    })

  } else {
    contentArray[0]?.content.push({
        type: "paragraph",
        content: [
          { type: "text", text: '' }
        ]
    })
  }
  return contentArray;
}

function templateTrueCaseEditorLists(assets) {
 // const templteLists = mainStore.templateFormatLists; // Dynamic template lists
   const templteLists = mainStore.templateFormatLists;

parsedIsTemplateTrueContent.value = []
  // Create a mapping of headings to their content-producing logic
  let contentMapping = {
    "Chapters with Short Summaries": () => {
      const contentArray = [];
      contentArray.push(
        {
          type: 'insertCustomDataExtension',
            attrs: {
              headingText: 'Chapters',
              class: 'short-summaries-chapter',
            },
            content: [
            {
              type: "heading",
              attrs: {
                level: 3
              },
              content: [
                { type: "text", text: 'Chapters' }
              ]
            }
          ]
        }
      )
      
      let chapters = mainStore.currentMediaAssets?.filter(asset => asset.type === 'chapter')
      chapters?.sort((a, b) => a.start_seconds - b.start_seconds)
      chaptersWithShortSummaries.value = chapters
      chaptersWithShortSummaries.value?.forEach((summarries) => {
        contentArray[0].content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `${summarries.variations[0].title} (${mainStore.formatTime(summarries.variations[0].start_seconds)})` },
            { type: "hardBreak" },
            { type: "text", text: `${summarries.variations[0].content}` }
          ]
        });
      });

      return contentArray;
    },
    "Chapters with Long Summaries": () => {
      const contentArray = [];
      contentArray.push({
        type: 'insertCustomDataExtension',
          attrs: {
            headingText: 'Chapters',
            class: 'summaries-chapter',
          },
          content: [
          {
            type: "heading",
            attrs: {
              level: 3
            },
            content: [
              { type: "text", text: 'Chapters' }
            ]
          }
        ]

      });
      chaptersWithSummaries.value?.forEach(summaries => {
        contentArray.push({
          type: "paragraph",
          content: [
            { type: "text", text: `(${formatTime(summaries.time)}) ${summaries.description} (${summaries.duration} Minutes)` },
            { type: "hardBreak" },
            { type: "text", text: `${summaries.summary}` }
          ]
        });
      });
      return contentArray;
    },
    "Highlights": () => {
      const contentArray = [];
      contentArray.push({
        type: 'insertCustomDataExtension',
          attrs: {
            headingText: 'Highlights',
            class: 'highlights-text',
          },
          content: [
          {
            type: "heading",
            attrs: {
              level: 3
            },
            content: [
              { type: "text", text: 'Highlights' }
            ]
          }
        ]
      }
      );
      const filteredHighlights = mainStore.currentMediaAssets?.filter(asset => asset.type === "highlight");
      filteredHighlights?.sort((a, b) => a.start_seconds - b.start_seconds);
      filteredHighlights?.forEach(highlight => {
        contentArray[0]?.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `(${mainStore.formatTime(highlight.start_seconds )}) ${highlight.content ? highlight.content : highlight.title} (${(highlight.end_seconds - highlight.start_seconds).toFixed(0)} Seconds)` }
          ]
        });
      });
      console.log('contentArray', contentArray)
      return contentArray;
    },
    "Keywords": () => {
      const contentArray = [];
      contentArray.push(
      {
        type: 'insertCustomDataExtension',
        attrs: {
          headingText: 'Keywords',
          class: 'keywords-text',
        },
        content: [
          {
            type: "heading",
            attrs: {
              level: 3
            },
            content: [
              { type: "text", text: 'Keywords' }
            ]
          }
        ]
      }
      );
      const filteredKeywords = mainStore.currentMediaAssets?.filter(asset => asset.type === "keywords");
      if (filteredKeywords?.length > 0) {
        contentArray[0]?.content.push({
          type: "paragraph",
          content: [{ type: "text", text: filteredKeywords[0].content }]
        });
      }
      return contentArray;
    },
    "Chapters with timestamps": () => {
      const contentArray = [];
      contentArray.push({
        type: 'insertCustomDataExtension',
          attrs: {
            headingText: 'Chapters',
            class: 'timestamp-chapter',
          },
          content: [
          {
            type: "heading",
            attrs: {
              level: 3
            },
            content: [
              { type: "text", text: 'Chapters' }
            ]
          }
        ]
      });

      const filteredAssets = mainStore.currentMediaAssets?.filter(asset => asset.type === 'chapter')
      filteredAssets?.sort((a, b) => a.start_seconds - b.start_seconds)
      filteredAssets?.forEach((chapter) => {
        contentArray[0]?.content.push({
          type: "paragraph",
          content: [
            { type: "text", text: `(${mainStore.formatTime(chapter.start_seconds)}) - ${chapter.title}` }
          ]
        })
      })

      return contentArray;
    },
    "Name of Episode": () => {
      const contentArray = [];
      if (mainStore.currentMedia?.episode_title && mainStore.currentMedia?.episode_title != 'null') {
        contentArray.push({
          type: 'insertCustomDataExtension',
          attrs: {
            headingText: 'Name of Episode',
            class: 'episode-block',
          },
          content: [
            {
              type: "heading",
              attrs: {
                level: 3
              },
              content: [
                { type: "text", text: 'Name of Episode' }
              ]
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: mainStore.currentMedia?.episode_title && mainStore.currentMedia?.episode_title != 'null' ? mainStore.currentMedia?.episode_title :'' }
              ]
            }
          ]
        });
      }
      return contentArray;
    },
    "Episode Summary": () => {
      return manageSummary()
    },
    "Podcast Summary": () => {
      return manageSummary()
    },
    "Video Summary": () => {
      return manageSummary()
    },
    "Educational Summary": () => {
      return manageSummary()
    },
    "Religious Summary": () => {
      return manageSummary()
    },
    "Customer Call Summary": () => {
      return manageSummary()
    },
    "Meeting Summary": () => {
      return manageSummary()
    },
  };

  custom_prompts.value?.forEach((item) => {
    if(item.type == 'static_show_notes') {
      const custom = [{
        type: "heading",
        attrs: {
            level: 3 // Set the desired heading level
        },
        content: [
            { type: "text", text: item.title } // Ensure valid text
        ]
      },
      {
        type: "paragraph",
        content: [
            { type: "text", text: item.content }
        ]
      }];
      contentMapping = {...contentMapping, [item.title]: () => {return custom}}
    }
  })

  mainStoreState.dynamicBlocksContent.value?.forEach((item) => {

    const dynamic = [{
      type: "heading",
      attrs: {
          level: 3 // Set the desired heading level
      },
      content: [
          { type: "text", text: item.title } // Ensure valid text
      ]
    },
    {
      type: "paragraph",
      content: [
          { type: "text", text: item.content }
      ]
    }];
    contentMapping = {...contentMapping, [item.title]: () => {return dynamic}}
    
  })

  // Loop through each heading in the templteLists array dynamically
  templteLists?.forEach(item => {
    const trimmedItem = item.trim(); // Remove any leading/trailing spaces
    if (contentMapping[trimmedItem]) {
      // If there's a mapping for this item, execute it and push the content to parsedIsTemplateTrueContent
      parsedIsTemplateTrueContent.value.push(...contentMapping[trimmedItem]());
    }
  });
  
  // Wrap parsedIsTemplateTrueContent in a document structure
  return parsedIsTemplateTrueContent.value;
}



// if(mainStore.templateFormatLists.length > 0){
//   isTemplate.value = true
//   templateTrueCaseEditorLists(assets.value)
// }

/* function createParsedContent(assets) {
  isTemplate.value = mainStore.templateFormatLists.length > 0
  if (isTemplate.value && parsedIsTemplateTrueContent.value.length == 0) {
    templateTrueCaseEditorLists(assets.value)
  }
  return assets.map(asset => ({
    type: "doc",
    content: isValidJson(asset.editor_content_json)
      ? asset.editor_content_json
      : (isTemplate.value && parsedIsTemplateTrueContent.value.length > 0 && !isValidJson(asset.editor_content_json)
        ? parsedIsTemplateTrueContent.value 
        : customSummaryBlock.content )
  }));
} */

function createParsedContent(assets) {
  isTemplate.value = mainStore.templateFormatLists.length > 0;

  if (isTemplate.value && parsedIsTemplateTrueContent.value.length === 0) {
    templateTrueCaseEditorLists(assets.value);
  }

  return assets.map(asset => {
    if (isValidJson(asset.editor_content_json)) {
      return {
        type: "doc",
        content: asset.editor_content_json
      };
    } else if (
      isTemplate.value &&
      parsedIsTemplateTrueContent.value.length > 0 &&
      !isValidJson(asset.editor_content_json)
    ) {
      return {
        type: "doc",
        content: parsedIsTemplateTrueContent.value
      };
    } else {
      // Call regenrateNotes if all conditions fail
      regenrateNotes();
      return null; // Skip mapping for this item
    }
  }).filter(item => item !== null); // Remove null items
}

function isValidJson(data) {
  // Check if the input is null or undefined
  if (data === null || data === undefined) {
    return false;
  }

  // Check if it's an object and whether it's empty
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      // If it's an array, check if it's empty
      return data.length > 0;
    } else {
      // If it's an object, check if it has keys
      return Object.keys(data).length > 0;
    }
  }

  // If it's neither an object nor an array, it's invalid
  return false;
}


function setContent(index) {
 const editorInstance = editors.value[index]?.editor;
 const contentToSet = parsedContent.value[index];
 if (editorInstance && editorInstance.commands && contentToSet) {
    editorInstance.commands.setContent(contentToSet);
 }
}

const copy = (id, content) => {
  const editorInstance = editors.value[0]?.editor;
  
  if (editorInstance && editorInstance.commands) {
    // Get the HTML content from the editor
    const htmlContent = editorInstance.getHTML();

    console.log('htmlContent', htmlContent, editorInstance.getText())

    // Use the Clipboard API to write the HTML content
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([editorInstance.getText()], { type: 'text/plain' }), // Optional: plain text version
      })
    ]).then(() => {
      copied.value = id; // Set the copied state
      setTimeout(() => {
        copied.value = null; // Reset after 2.5 seconds
      }, 2500);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }
 else{
  let plainTextContent = content;
  navigator.clipboard.writeText(plainTextContent)
    .then(() => {
      copied.value = id; // Set the copied state
      setTimeout(() => {
        copied.value = null; // Reset after 2.5 seconds
      }, 2500);
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });

 }
  
}

const debouncedUpdateContent = debounce(updateContent, 500);
const parsedContent = computed(() => createParsedContent(assets.value));

const saveContent = async (data, id) => {  
  mainStore.transcriptSavingSavedState = "Saving..." 
        fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/asset/${id}/update`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mainStore.getUserPodiumToken()}`
            },
            body: JSON.stringify(data) 
        })
          .then(response => response.json())
          .then(data => {
            // preetLoading.value = false 
            console.log('Shownotes updated successfully.')
            // headingTexts.value = extractHeadingTexts(assets.value[0]?.editor_content_json)
            mainStore.transcriptSavingSavedState = "Saved"
          })

};

const scrollToTop = () => {
 window.scrollTo({
   top: 0,
   behavior: 'smooth'
 });
};

const setEditorRef = (index, id) => (el) => {
 if (el) {
   editors.value[index].editor = el.editor;
   nextTick(() => {
     if (editors.value[index] && editors.value[index].editor && editors.value[index].editor.commands) {
       const contentToSet = parsedContent.value[index];
       if (contentToSet) {
         editors.value[index].editor.commands.setContent(contentToSet);
       } 
     } 
   });
 }
};

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

const copytEditorContent = (event) => {
  
  const selection = window.getSelection();
  if (selection.rangeCount) {
    const range = selection.getRangeAt(0);
    const clonedContents = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(clonedContents);

    // Create a function to recursively replace custom block tags with their inner HTML
    const replaceCustomBlock = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute('data-custom-extension')) {
        // Return the inner HTML of the custom block
        return node.innerHTML;
      }
      return node.outerHTML || node.textContent;
    };

    // Replace each node's outerHTML if it's a custom block
    const copiedHTML = Array.from(tempDiv.childNodes)
      .map(replaceCustomBlock)
      .join('');

    var isHtml = checkContentIsTextOrHtml(copiedHTML)
    if (isHtml) {
      var markdown = convertHtmlToMarkdown(copiedHTML)
    } else {
    var markdown = copiedHTML
    }
    var text = markdownToText(markdown)
    
    // add with new line
    const formattedText = text.replace(/<\/p>/g, '</p>\n\n')
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([copiedHTML], { type: 'text/html' }),
        'text/plain': new Blob([formattedText], { type: 'text/plain' }), // Optional: plain text version
      })
    ]).catch(err => {
      console.error('Failed to copy: ', err);
    });

  }
  event.preventDefault(); // Prevent default copy behavior
  
}

document.addEventListener('mousedown', function(event) {
  mainStore.transcriptSavingSavedState = "";
   var targetElement = event.target.getAttribute('data-action');
   if(!targetElement){
     var editDeleteButtons = document.getElementsByClassName('editDeleteButtons');
      for (var i = 0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].classList.add('hidden');
      }
   }
   if (targetElement === 'save-template') {
    headingTexts.value = extractHeadingTexts(assets.value[0]?.editor_content_json)
   }
 });

 onMounted(() => {
  //add event listener click
  document.addEventListener('mousedown', function(event) {
    var targetElement = event.target.getAttribute('data-action') === 'edit-prompt' || event.target.getAttribute('data-action') === 'delete-prompt' || event.target.getAttribute('data-action');
    if(!targetElement){
      var editDeleteButtons = document.getElementsByClassName('editDeleteButtons');
      //add class hidden to all editDeleteButtons
      for (var i = 0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].classList.add('hidden');
      }
    }
  });

  document.addEventListener('copy', copytEditorContent)
})
 

</script>
<style scoped>
.not-allowed-cursor {
 cursor: not-allowed;
}

.sidebar-opener {
 position: fixed;
   right: 33px;
   top: 82px;
   z-index: 9;
   cursor: pointer;
   width: 25px;
   height: 25px;
   display: flex;
   align-items: center;

}

.sidebar-opener svg {
 width: 25px;
 height: auto;


}
.sidebar-opener svg.closed-icon-svg{
 width: 16px;
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
       bg-indigo-100
       text-indigo-700
       hover:bg-indigo-100
       ring-indigo-100
       hover:bg-indigo-100
       hover:ring-indigo-100
       focus-visible:outline
       focus-visible:outline-2
       focus-visible:outline-offset-2
       focus-visible:outline-indigo-700 sm:col-start-2;
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
                @apply w-9 h-9;
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
       @apply absolute bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 py-2 z-20;
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
</style>