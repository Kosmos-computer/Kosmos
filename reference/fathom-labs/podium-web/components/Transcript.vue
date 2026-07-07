<template>
  <div class="pr-8 pb-32 z-10" id="transcript-component">
    <!-- Floating Button -->
    <div
      id="changeSpeakerButtononText"
      class="flex hidden absolute z-[1] flex-row items-center w-fit bg-white cursor-pointer text-gray-500 border border-gray-200 rounded-md whitespace-nowrap shadow-lg"
    >
      <div class="pl-4 pr-4 h-9 flex items-center	border-r border-gray-200" @click="openSpeakerDropdownClickOnSpeakerButton()">
        <svg
          width="14"
          height="17"
          viewBox="0 0 14 17"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M6.81875 8.60791C9.16825 8.60791 11.0729 6.70326 11.0729 4.35376C11.0729 2.00426 9.16825 0.0996094 6.81875 0.0996094C4.46925 0.0996094 2.5646 2.00426 2.5646 4.35376C2.5646 6.70326 4.46925 8.60791 6.81875 8.60791ZM9.1729 4.35376C9.1729 5.65392 8.11891 6.70791 6.81875 6.70791C5.51859 6.70791 4.4646 5.65392 4.4646 4.35376C4.4646 3.0536 5.51859 1.99961 6.81875 1.99961C8.11891 1.99961 9.1729 3.0536 9.1729 4.35376ZM7.07138 11.0047C4.97609 10.9398 3.64909 12.0398 2.86041 13.102C2.81968 13.1568 2.78038 13.2116 2.74248 13.2661C2.37248 13.7982 2.13637 14.3049 2.00465 14.632C1.96433 14.7321 1.93378 14.8154 1.91218 14.8775C1.89027 14.9404 1.93801 15.002 2.00465 15.002H11.7486C11.812 15.002 11.859 14.946 11.8427 14.8847C11.8231 14.811 11.7926 14.7053 11.7486 14.5756C11.635 14.2404 11.4316 13.7453 11.0944 13.2298C11.0666 13.1873 11.0379 13.1446 11.0083 13.102C10.3138 12.1014 9.10697 11.0673 7.07138 11.0047ZM1.8296 11.366C2.92474 10.1573 4.65931 9.02925 7.12978 9.10558C9.55064 9.18013 11.1865 10.3051 12.2009 11.5326C13.1696 12.7047 13.558 13.942 13.6789 14.3964C14.0457 15.7756 12.9414 16.902 11.7486 16.902H2.00465C0.754219 16.902 -0.373886 15.665 0.11783 14.2527C0.277107 13.7953 0.774898 12.5301 1.8296 11.366Z"
            fill="#7D828C"
          />
        </svg> <span class="text-sm font-normal leading-5 text-gray-700 pl-3 "
        >{{ t('Change Speaker') }}</span>
      </div>
    
      <div class="pl-4 pr-4 flex border-r border-gray-200 items-center h-9" @click="openModalAddClip()">
        <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" fill="#9CA3AF"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" fill="black" fill-opacity="0.2"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" stroke="#9CA3AF"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" stroke="black" stroke-opacity="0.2"/>
        </svg>
        <span class="text-sm font-normal leading-5 text-gray-700 pl-3"
          >{{ t('Add Clip') }}</span>
      </div>
     
      <!-- <div class="pl-4 pr-4 flex items-center h-9" >
        <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.3334 4.70638L13.6106 14.8251C13.5483 15.6973 12.8226 16.373 11.9482 16.373H5.05191C4.17751 16.373 3.45177 15.6973 3.38947 14.8251L2.66671 4.70638M6.83337 8.03971V13.0397M10.1667 8.03971V13.0397M11 4.70638V2.20638C11 1.74614 10.6269 1.37305 10.1667 1.37305H6.83337C6.37314 1.37305 6.00004 1.74614 6.00004 2.20638V4.70638M1.83337 4.70638H15.1667" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14.3334 4.70638L13.6106 14.8251C13.5483 15.6973 12.8226 16.373 11.9482 16.373H5.05191C4.17751 16.373 3.45177 15.6973 3.38947 14.8251L2.66671 4.70638M6.83337 8.03971V13.0397M10.1667 8.03971V13.0397M11 4.70638V2.20638C11 1.74614 10.6269 1.37305 10.1667 1.37305H6.83337C6.37314 1.37305 6.00004 1.74614 6.00004 2.20638V4.70638M1.83337 4.70638H15.1667" stroke="black" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div> -->
    </div>
   <!--Start add clip button-->
   <div
      @click="openModalAddClip()"
      id="addClipButtononText"
      class="flex hidden absolute z-[12] flex-row items-center w-fit bg-white pl-2 pr-4 h-9 cursor-pointer  text-gray-500 border border-gray-200 rounded-md whitespace-nowrap shadow-lg"
    >
      <span class="ml-2 mr-3">
        <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" fill="#9CA3AF"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" fill="black" fill-opacity="0.2"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" stroke="#9CA3AF"/>
          <path d="M5.85355 12.5195L5.70711 12.373H5.5H2.5C1.67157 12.373 1 11.7015 1 10.873V2.87305C1 2.04462 1.67157 1.37305 2.5 1.37305H14.5C15.3284 1.37305 16 2.04462 16 2.87305V10.873C16 11.7015 15.3284 12.373 14.5 12.373H11.5H11.2929L11.1464 12.5195L8.5 15.1659L5.85355 12.5195ZM4.5 3.37305C3.67157 3.37305 3 4.04462 3 4.87305C3 5.70147 3.67157 6.37305 4.5 6.37305H12.5C13.3284 6.37305 14 5.70147 14 4.87305C14 4.04462 13.3284 3.37305 12.5 3.37305H4.5ZM4.5 7.37305C3.67157 7.37305 3 8.04462 3 8.87305C3 9.70147 3.67157 10.373 4.5 10.373H7.5C8.32843 10.373 9 9.70147 9 8.87305C9 8.04462 8.32843 7.37305 7.5 7.37305H4.5Z" stroke="black" stroke-opacity="0.2"/>
        </svg>
      </span>
      <span class="text-sm font-normal leading-5 text-gray-700 select-none"
        >{{ t('Create Clip') }}</span
      >
    </div>
   <!--end add clip button-->


    <transition name="fade">
      <span
        v-if="svgScrollDown"
        class="flex items-center fixed bottom-[102px] top-[69px] right-[30px] cursor-pointer h-[calc(100vh - 171px)]"
        @click="goToHighlightDown"
        title="Scroll Down"
      >
        <SvgScrollDown />
      </span>
    </transition>
    <transition name="fade">
      <span
        v-if="svgScrollUp"
        class="flex items-center fixed bottom-[102px] top-[69px] right-[30px] cursor-pointer h-[calc(100vh - 171px)]"
        @click="goToHighlightUp"
        title="Scroll Up"
      >
        <SvgScrollUp />
      </span>
    </transition>

    <!-- Ends -->
    <div v-for="(monologue, mIndex) in transcript.monologues" :key="mIndex">
      <!-- Add chapter break if needed -->
      <div 
        v-if="shouldShowChapter(monologue.elements[0].start)" 
        class="chapter-break my-4 pt-4 flex flex-row items-center justify-between bg-gray-50"
      >
        <div class="flex flex-col items-left gap-2">
          <span class="text-gray-600 font-normal text-sm">
            Chapter {{ getCurrentChapter(monologue.elements[0].start)?.number }}
          </span>
          <h3 class="font-bold text-gray-700 text-xl">
            {{ getCurrentChapter(monologue.elements[0].start)?.title }}
          </h3>
          </div>
      </div>
      <div :class="{ 'mb-6': !isNextSpeakerSame(mIndex), 'mt-6': mIndex == 0 }" class="text-base text-gray-700 mr-1 relative">
      <h2 v-if="monologue.elements.length > 0" class="text-lg font-bold  flex justify-between text-gray-700"
         :class="{ 'my-2': !isPreviousSpeakerSame(mIndex), 'my-0': isPreviousSpeakerSame(mIndex) }"
        style="font">
        <div :data-openKey="mIndex" class="user-dropdown cursor-pointer mt-0" :class="{
          'user-dropdown__simple': simpleLayout,
          'user-dropdown__full': !simpleLayout
        }" @click="openSpeakerDropdownByIndex(mIndex, (monologue.speaker_id))">
          <div v-if="!isPreviousSpeakerSame(mIndex)"
            class="mt-0 flex flex-row mr-1 -ml-2 items-center max-w-60 bg-transparent hover:bg-white pl-2 pr-2 cursor-pointer hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-300 h-10 rounded-md whitespace-nowrap transition ease-in speaker-select">
            <span class="inline-block mr-3 font-semibold truncate block">
              <span v-if="!isPreviousSpeakerSame(mIndex)" :style="{ color: getSpeakerColor(monologue.speaker_id) }">{{
                getSpeakerNameRole(monologue.speaker_id)[0]
              }}</span>
              <span
                v-if="
                  !isPreviousSpeakerSame(mIndex) &&
                  getSpeakerNameRole(monologue.speaker_id)[1] != 'None' &&
                  getSpeakerNameRole(monologue.speaker_id)[1] != 'Unknown'
                "
                class="font-normal ml-2 text-gray-400 relative"
                >{{ getSpeakerNameRole(monologue.speaker_id)[1] }}</span
              >
            </span>
            <SvgCarrot
              class="user-dropdown__carrot opacity-50 transition ease-in speaker-select"
              :class="[classes, simpleLayout ? 'ml-2' : 'ml-auto']"
            />
          </div>
          <div >
            <SpeakerNamesDropdown
              :currentSpeakerNames="currentSpeakerName"
              :from="resourceFrom"
              :currentSpeakerId="currentSpeakersId"
              :transcriptData="transcript"
              :currentSpeakersMindexx="currentSpeakersMindex"
              @transcript="getLatestTranscript"
              :firstChildMindex="startEindex"
              :lastChildEindex="endEindex"
              @openAddSpkModal="hideShowAddSpkModal"
              @editedSpkInfo="getEditedInfo"
            />
          </div>
        </div>
        <span
          class="speaker-timecode font-normal text-base text-gray-400 inline-flex items-center"
          >{{ mainStore.formatTime(monologue.elements[0].start) }}</span
        >
      </h2>
      <div
        v-if="monologue.elements.length > 0"
        class="whitespace-pre-wrap z-50 mr-1 text-base leading-7 transcript-sentences"
        style="font-kerning: none;"
        contenteditable
        @focus="turnObserverOn($event.target)"
        @click="determineJumpToSeconds()"
        @input="determineJumpToSeconds()"
        @keyup="determineJumpToSeconds()"
        @keypress="handleKeys($event)"
        @keydown="goToNextParagraph($event)"
      >
        <span
          class="transcript-element"
          v-for="(element, eIndex) in monologue.elements"
          :key="
            mIndex.toString() +
            eIndex.toString() +
            element.value +
            element.start.toString()
          "
          :data-mindex="mIndex"
          :data-eindex="eIndex"
          :data-start="element.start"
          :data-end="element.end"
          :data-key="
            mIndex.toString() +
            eIndex.toString() +
            element.value +
            element.start.toString()
          "
        >
          {{ element.value }}
        </span>
      </div>
    
    </div>
    </div>
  </div>
  <Playbar
    class="z-20"
    v-model="playbarModel"
    :hideIntercom="false"
    @audio-timeupdate="updateHighlightedWord"
    @update:modelValue="pausePlay"
    @clickSeek="seekTime"
    :audio-url="audioUrl"
    :jump-to-seconds="jumpToSeconds"
    :transcript="transcript"
    :chapters="chapters"
  />
  <SpeakersModal
    v-if="transcriptSpeakersModalVisible"
    v-model:transcript="transcript"
    v-model:modalVisible="transcriptSpeakersModalVisible"
    :cancelButtonText="speakersModalCancelButtonText"
  />
  <AddNewSpeakerNameModal
    v-if="openAddSpeakerModal"
    :currentSpeakerId="currentSpeakersId"
    :currentSpeakersmIndex="currentSpeakersMindex"
    :from="resourceFrom"
    @close="openAddSpeakerModal = false"
    :currentSpeakerNames="currentSpeakerName"
    :lastChildEindex="endEindex"
    :firstChildMindex="startEindex"
    @latestSpeakersName="getLatestSpeakersName"
    :transcriptData="transcript"
    :editSpeakerInfo="spkInfoBySpkId"
  />
  <SpeakersMergeConfirmation
    v-if="mergeDifferentSpeakersTranscript"
    @close="mergeDifferentSpeakersTranscript = false"
    @merge="getData"
  />

  <AddClipTitle v-if="openAddClipModal" @close="openAddClipModal = false"  :startFrom="clipStartTime" :endTo="clipEndTime" />
</template>
<script setup>
import { useMainStore } from "~/store/main";
import { storeToRefs } from "pinia";

import emitter from "~/plugins/eventBus";
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
    return key => {
      const translation = languageStore.state.translations[key];
      return translation || key;  // Fallback to key if translation not found
    };
});
const props = defineProps(["speakersModalVisible"]);
const {
  storeElementEdit,
  playbarModel,
  setJumpToSeconds,
  closeDropdownList,
  turnObserverOff,
  determineIfSpeakersNeedToBeSet,
  updateHighlightedWord,
  determineJumpToSeconds,
  transcript,
  transcriptSpeakersModalVisible,
  turnObserverOn,
  jumpToSeconds,
  lastAudioTime,
  currentSpeakersMindex,
  startEindex,
  endEindex,
  showSpeakerChangeButtonSelected,
  showClipAddButtonSelected,
  puncts,
  goToHighlightUp,
  goToHighlightDown,
  lastTop,
  svgScrollDown,
  svgScrollUp,
} = useReplaceText();

const pausePlay = (value) => {
  emits("playBack", value.playbackState)
}

const seekTime = (value) => {
  emits("seekTime", value)
}

const emits = defineEmits(["update:speakersModalVisible", "from", "playBack", "seekTime"]);
const openSpeakerDropdownModal = ref(false);
const openSpeakerDropdown = ref(true);
const mainStore = useMainStore();
const mainStoreState = storeToRefs(mainStore);
const { updateMediaTranscript, updateMediaTranscriptLoading } =
  storeToRefs(mainStore);
const edits = ref([]);
const audioUrl = ref("");
const speakersModalCancelButtonText = ref("Close");
const simpleLayout = ref(true);
const currentSpeakersId = ref("");
const resourceFrom = ref(false);
const openAddSpeakerModal = ref(false);
const currentSpeakerName = ref("");
const sendFromBtnOrDrpdn = ref(false);
const runtimeConfig = useRuntimeConfig();
const route = useRoute();
const mergeDifferentSpeakersTranscript = ref(false);
const mergeSpeakersParagraph = ref("");
const openAddClipModal =ref(false)
watch(transcriptSpeakersModalVisible.value, () => {
  () => openSpeakerDropdownModal.value;
  if (props.speakersModalVisible != transcriptSpeakersModalVisible.value) {
    emits("update:speakersModalVisible", transcriptSpeakersModalVisible.value);
  }
  if (!transcriptSpeakersModalVisible.value) {
    setJumpToSeconds(0);
  }
});


const speakerColors = [
  '#0284c7', // sky-600
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366f1',
  '#84cc16',
  '#f43f5e',
  '#06b6d4',
];

// Add this computed property
const speakerColorMap = computed(() => {
  const map = new Map();
  const speakers = new Set();
  
  // Extract all unique speaker IDs
  if (mainStore.currentMediaTranscript?.monologues) {
    mainStore.currentMediaTranscript.monologues.forEach(monologue => {
      if (monologue.speaker_id) {
        speakers.add(monologue.speaker_id);
      }
    });
  }
  
  // Assign colors to speakers
  Array.from(speakers).forEach((speakerId, index) => {
    const colorIndex = index % speakerColors.length;
    map.set(speakerId, speakerColors[colorIndex]);
  });
  
  return map;
});

// Add this method
const getSpeakerColor = (speakerId) => {
  return speakerColorMap.value.get(speakerId) || '#6B7280'; // Default gray color if not found
};

watch(
  () => playbarModel.value,
  (a, b) => {
    if (playbarModel.value.playbackState === "paused") {
      svgScrollDown.value = false;
      svgScrollUp.value = false;
    }
  }
);

watch(props.speakersModalVisible, () => {
  transcriptSpeakersModalVisible.value = props.speakersModalVisible;
});
watch(mainStoreState.currentMediaShowSpeakersModal, (newVal) => {
  if (newVal) {
    transcriptSpeakersModalVisible.value = true;
  }
});

const hideShowAddSpkModal = (data) => {
  if (data) {
    openAddSpeakerModal.value = data;
  }
};
const spkInfoBySpkId = ref("");

const getEditedInfo = (data) => {
  if (data) {
    spkInfoBySpkId.value = data;
  }
};
const openSpeakerDropdownByIndex = (mIndex, currentSpeakerId) => {
  resourceFrom.value = false;
  mainStore.mIndex = mIndex;
  currentSpeakersId.value = currentSpeakerId;
  currentSpeakerName.value = getSpeakerNameRole(currentSpeakerId)[0];
  currentSpeakersMindex.value = mIndex;
  var isOpenSpeakerDropdown = document.querySelectorAll(
    ".isOpenSpeakerDropdown"
  );
  for (var i = 0; i < isOpenSpeakerDropdown.length; i++) {
    if (i == mIndex) {
      isOpenSpeakerDropdown[i].removeAttribute("style");
      if (isOpenSpeakerDropdown[i].classList.contains("dropdown-shut")) {
        isOpenSpeakerDropdown[i].classList.add("dropdown-open");
        isOpenSpeakerDropdown[i].classList.remove("dropdown-shut");
      } else {
        isOpenSpeakerDropdown[i].classList.remove("dropdown-open");
        isOpenSpeakerDropdown[i].classList.add("dropdown-shut");
      }
    } else {
      isOpenSpeakerDropdown[i].classList.remove("dropdown-open");
      isOpenSpeakerDropdown[i].classList.add("dropdown-shut");
    }
  }
};
watch(mainStore.currentMediaTranscript, (a, b) => {
  mainStore.currentMediaTranscript;
});
const openSpeakerDropdownClickOnSpeakerButton = () => {
  resourceFrom.value = true;
  updateMediaTranscript.value = true;
  var changeSpeakerButtononText = document.getElementById(
    "changeSpeakerButtononText"
  );
  var isOpenSpeakerDropdown = closeDropdownList();
  isOpenSpeakerDropdown[currentSpeakersMindex.value].classList.remove(
    "dropdown-shut"
  );
  isOpenSpeakerDropdown[currentSpeakersMindex.value].classList.add(
    "dropdown-open"
  );
  isOpenSpeakerDropdown[currentSpeakersMindex.value].style.position =
    "absolute";
  isOpenSpeakerDropdown[currentSpeakersMindex.value].style.top =
    changeSpeakerButtononText.offsetTop + "px";
  isOpenSpeakerDropdown[currentSpeakersMindex.value].style.left =
    changeSpeakerButtononText.offsetLeft + "px";
};

const getLatestTranscript = (data) => {
  transcript.value = data;
  mainStore.currentMediaTranscript = data;
};
const isPreviousSpeakerSame = (mIndex) => {
  if (mIndex === 0) {
    return false;
  } else {
    return (
      transcript.value.monologues[mIndex].speaker_id ===
      transcript.value.monologues[mIndex - 1].speaker_id
    );
  }
};
const isNextSpeakerSame = (mIndex) => {
  if (mIndex === transcript.value.monologues.length - 1) {
    return false;
  } else {
    return (
      transcript.value.monologues[mIndex].speaker_id ===
      transcript.value.monologues[mIndex + 1].speaker_id
    );
  }
};
const getSpeakerNameRole = (speakerId) => {
  // const speaker = transcript.value.speakers.find((sp) => sp.id === speakerId)
  const speakerIndex = transcript.value.speakers.findIndex(
    (sp) => sp.id === speakerId
  );
  const speaker = transcript.value.speakers[speakerIndex];
  var name = "";
  var role = "";
  if (speaker) {
    if (speaker.set_name) {
      name = speaker.set_name;
    } else if (speaker.default_name) {
      name = speaker.default_name;
    } else {
      name = "Speaker" + " " + (speakerIndex + 1);
    }

    if (speaker.set_role) {
      role = speaker.set_role;
    } else {
      role = speaker.default_role;
    }
  }
  return [name, mainStore.capitalizeFirstLetter(role)];
};

const goToNextParagraph = async (event) => {
  if (
    event &&
    (event.key === "ArrowRight" ||
      event.keyCode === 39 ||
      event.key === "ArrowDown" ||
      event.keyCode === 40)
  ) {
    //here logic for go to next paragraphs
    if (getCaretPosition(event.target) == 0) {
      var currentspan = event.target.childNodes[0].nextElementSibling;
    } else {
      var currentspan = getCurrentCaretSpan().nextElementSibling;
    }

    if (currentspan == null) {
      event.preventDefault();
      setCursorPosition(
        getCurrentCaretSpan().parentElement.parentElement.nextElementSibling
          .childNodes[1],
        0
      );
    }
  } else if (
    event &&
    (event.key === "ArrowLeft" ||
      event.keyCode === 37 ||
      event.key === "ArrowUp" ||
      event.keyCode === 38)
  ) {
    //here logic for go to previous paragraphs
    if (getCaretPosition(event.target) == 0) {
      event.preventDefault();
      var previousDiv =
        event.target.parentElement.previousElementSibling.childNodes[1];
      var lastDiv = previousDiv.querySelector(".transcript-element:last-child");
      setCursorPosition(lastDiv, lastDiv.innerText.length);
    }
  }
};

const handleKeys = async (event) => {
  var changeSpeakerButtononText = document.getElementById(
    "changeSpeakerButtononText"
  );
  if (!changeSpeakerButtononText.classList.contains("hidden")) {
    changeSpeakerButtononText.classList.add("hidden");
  }

  if (event && (event.key === "Enter" || event.keyCode === 13)) {
    event.preventDefault();
    mainStore.transcriptSavingSavedState = "";
    if (getCaretPosition(event.target) == 0) {
      return;
    }
    try {
      var currentspan = getCurrentCaretSpan().nextElementSibling;
      var lastspan = event.target.querySelector(
        ".transcript-element:last-child"
      );
      var mIndex = currentspan.getAttribute("data-mindex");

      var siblingspan = currentspan.nextElementSibling;

      if (currentspan.innerHTML == " ") {
        var start = parseInt(siblingspan.getAttribute("data-eindex"));
        // is check next element
        if (siblingspan.nextElementSibling.innerHTML) {
        }
      } else if (puncts.includes(currentspan.innerHTML)) {
        //count all siblingspan after currentspan
        var spancount = 0;
        while (siblingspan) {
          spancount++;
          siblingspan = siblingspan.nextElementSibling;
        }
        if (spancount > 1) {
          var start = parseInt(currentspan.getAttribute("data-eindex"));
        } else {
          // throw 'No element found after this unable to split the speaker'
          return;
        }
        var start = parseInt(currentspan.getAttribute("data-eindex"));
      } else {
        var start = parseInt(currentspan.getAttribute("data-eindex"));
      }
    } catch (e) {
      // alert('No element found after this unable to split the speaker')
      return;
    }

    var end = parseInt(lastspan.getAttribute("data-eindex"));
    var speakerId = transcript.value.monologues[mIndex].speaker_id;
    var data = {
      speaker_id: speakerId,
      monologue_index: mIndex,
      start: start,
      end: end,
    };
    if (speakerId && mIndex && start && end) {
      // updateMediaTranscriptLoading.value = true
      var new_monlouge = [];
      for (var i = 0; i < transcript.value.monologues.length; i++) {
        if (i == mIndex) {
          const first_split = transcript.value.monologues[i].elements.slice(
            0,
            start
          );
          const second_split = transcript.value.monologues[i].elements.slice(
            start,
            end
          );

          if (first_split.length > 0) {
            new_monlouge.push({
              speaker_id: transcript.value.monologues[i].speaker_id,
              elements: first_split,
            });
          }
          if (second_split.length > 0) {
            new_monlouge.push({
              speaker_id: transcript.value.monologues[i].speaker_id,
              elements: second_split,
            });
          }
        } else {
          new_monlouge.push(transcript.value.monologues[i]);
        }
      }
      transcript.value.monologues = new_monlouge;
      mainStore.transcriptSavingSavedState = "Saving...";
      await fetch(
        `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/split`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
          },
          body: JSON.stringify(data)
        })
          .then(response => response.json())
          .then(data => {
            mainStore.transcriptSavingSavedState = "Saved"
            if (!data) {
              alert('There was an error saving the speakers. Please try again.')
            }
          })
      }
    }
}


var observer = null
const speakersNames = ref([])
const getLatestSpeakersName = (data) => {
  transcript.value = data
  mainStore.currentMediaTranscript = data
  getAllSpeakersNameBySpeakersId()
}
const getAllSpeakersNameBySpeakersId = () => {
  speakersNames.value = []
  transcript.value.speakers.forEach(obj => {
    return speakersNames.value.push({ name: obj.set_name ? obj.set_name : obj.default_name, role: obj.set_role, id: obj.id })
  });
}
const mergeTranscript = async (data) => {
  if (data) {
    mainStore.transcriptSavingSavedState = "Saving...";
    await fetch(
      `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/merge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
        },
        body: JSON.stringify(data),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        mainStore.transcriptSavingSavedState = "Saved";
        if (!data) {
          alert("There was an error saving the speakers. Please try again.");
        }
      });
  }
};
function getCurrentCaretSpan() {
  const selection = document.getSelection();
  if (selection.rangeCount > 0) {
    const textNode = selection.anchorNode;
    const parentElement = textNode.parentElement;
    if (parentElement.tagName.toLowerCase() === "span") {
      return parentElement;
    }
  }
  return null;
}
function getCaretPosition(element) {
  var caretOffset = 0;
  var doc = element.ownerDocument || element.document;
  var win = doc.defaultView || doc.parentWindow;
  var sel;
  if (typeof win.getSelection != "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      var range = win.getSelection().getRangeAt(0);
      var preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if ((sel = doc.selection) && sel.type != "Control") {
    var textRange = sel.createRange();
    var preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
}

function setCursorPosition(containerEl, index) {
  var range = document.createRange();
  var sel = window.getSelection();
  range.setStart(containerEl.childNodes[0], index);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}
const getData = (data) => {
  if (data == true) {
    mergeMonolouge(mergeSpeakersParagraph.value);
    mergeDifferentSpeakersTranscript.value = false;
  }
};
function mergeMonolouge(element = mergeSpeakersParagraph.value) {
  var clickedElement = element;
  if (clickedElement.classList.contains("transcript-sentences")) {
    var caretLocation = getCaretPosition(clickedElement);
    var firstSpanElement = clickedElement.querySelector("span");
    var mIndex = parseInt(firstSpanElement.getAttribute("data-mindex"));
    if (caretLocation == 0 && mIndex != 0) {
      event.preventDefault();
      // updateMediaTranscriptLoading.value = true
      var new_monologue = [];
      for (var i = 0; i < transcript.value.monologues.length; i++) {
        if (i == mIndex - 1) {
          const new_element = transcript.value.monologues[i].elements.concat(
            transcript.value.monologues[i + 1].elements
          );
          new_monologue.push({
            speaker_id: transcript.value.monologues[i].speaker_id,
            elements: new_element,
          });
        } else if (i == mIndex) {
        } else {
          new_monologue.push(transcript.value.monologues[i]);
        }
      }
      transcript.value.monologues = new_monologue;
      var data = { monologue_index: mIndex };
      var previousDiv =
        clickedElement.parentElement.previousSibling.childNodes[1];
      var lastDiv = previousDiv.querySelector(".transcript-element:last-child");
      setCursorPosition(lastDiv, lastDiv.innerText.length);
      mergeTranscript(data);
    }
  }
}
const clipStartTime = ref(0)
const clipEndTime = ref(0)

const openModalAddClip =()=>{
  openAddClipModal.value = true
}

const chapters = ref([])

const getChapters = () => {

  if (!mainStore.currentMediaAssets) {
    console.warn('currentMediaAssets is not available yet');
    return;
  }

  try {
    let filteredChapters = mainStore.currentMediaAssets.filter(asset => asset.type === 'chapter')
    filteredChapters.sort((a, b) => a.start_seconds - b.start_seconds)
    chapters.value = filteredChapters
    console.log('Chapters loaded:', chapters.value)
    return true;
  } catch (error) {
    console.error('Error loading chapters:', error);
    return false;
  }
}

watch(() => mainStore.currentMediaAssets, (newVal) => {
  if (newVal && newVal.length > 0) {
    getChapters();
  }
}, { immediate: true, deep: true });


onMounted( async () => {
  try {
    transcript.value = mainStore.currentMediaTranscript;
    audioUrl.value = mainStore.currentMedia.file_url;
    await getChapters();
    adjustChapterTimes();
  } catch (error) {
    console.error('Error initializing transcript:', error);
  }
  document.addEventListener("selectionchange", function (event) {
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 0) {
      showSpeakerChangeButtonSelected();

      // disable content editting
      document
        .querySelectorAll("div.transcript-sentences")
        .forEach(function (div) {
          div.contentEditable = false;
        });

      // calculate the start and stop time of the selection and output to console
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startElement = range.startContainer.parentElement;
        const endElement = range.endContainer.parentElement;

        // Collect all unique mIndex values in the selection
        const selectedMIndexes = new Set();
        for (let i = 0; i < selection.rangeCount; i++) {
          const range = selection.getRangeAt(i);
          const elements = range.cloneContents().querySelectorAll("[data-mindex]");
          elements.forEach(el => selectedMIndexes.add(el.getAttribute("data-mindex")));
        }
        const elementRect = startElement.getBoundingClientRect();
        const scrollTop = document.documentElement.scrollTop
        const elementBottomRelativeToViewport = elementRect.bottom + scrollTop;
        if (elementBottomRelativeToViewport < scrollTop) {
          emitter.emit('staticClip', 'setFixedClip' )
        }else{
          emitter.emit('staticClip', 'setAbsoluteClip' )
        }
        // Determine which function to call based on the number of unique mIndex values
        if (selectedMIndexes.size > 1) {
          showClipAddButtonSelected();
        } else {
          showSpeakerChangeButtonSelected();
        }

        // Check for the transcript elements and log the start and end time
        if (
          startElement.classList.contains("transcript-element") &&
          endElement.classList.contains("transcript-element")
        ) {
          const startTime = parseFloat(startElement.getAttribute("data-start"));
          const endTime = parseFloat(endElement.getAttribute("data-end"));

          if (startTime && endTime) {
            clipStartTime.value = startTime
            clipEndTime.value = endTime
          }
        }
      }
    } else {
      // re-enable content editting
      document
        .querySelectorAll("div.transcript-sentences")
        .forEach(function (div) {
          div.contentEditable = true;
        });
    }
  });
  //on clickup event
  document.addEventListener("click", function (event) {
    var selectedText = window.getSelection().toString();
    //check if dropdown-open class is present
    //check event.target.parentElement.parentElement have class dropdown-open
    try {
      if (event.target.parentElement.parentElement) {
        if (
          event.target.parentElement.parentElement.classList.contains(
            "dropdown-open"
          )
        ) {
        }
      }
    } catch {}
    try {
      var changeSpeakerButtononText = document.getElementById(
        "changeSpeakerButtononText"
      );

      if (
        changeSpeakerButtononText.contains(event.target) ||
        event.target.classList.contains("speaker-select") ||
        event.target.parentElement.parentElement.classList.contains(
          "speaker-select"
        ) ||
        event.target.parentElement.classList.contains("speaker-select")
      ) {
      } else {
        var isOpenSpeakerDropdown = document.querySelectorAll(
          ".isOpenSpeakerDropdown"
        );
        isOpenSpeakerDropdown.forEach((isOpenSpeakerDropdown) => {
          isOpenSpeakerDropdown.classList.remove("dropdown-open");
          isOpenSpeakerDropdown.classList.add("dropdown-shut");
        });
      }
    } catch {
      var isOpenSpeakerDropdown = document.querySelectorAll(
        ".isOpenSpeakerDropdown"
      );
      isOpenSpeakerDropdown.forEach((isOpenSpeakerDropdown) => {
        isOpenSpeakerDropdown.classList.remove("dropdown-open");
        isOpenSpeakerDropdown.classList.add("dropdown-shut");
      });
    }
    if (selectedText.length > 0) {
    } else {
      var changeSpeakerButtononText = document.getElementById(
        "changeSpeakerButtononText"
      );
      if (changeSpeakerButtononText) {
        changeSpeakerButtononText.classList.add("hidden");
      }
      var addClipButtononText = document.getElementById(
        "addClipButtononText"
      );
      if (addClipButtononText) {
        addClipButtononText.classList.add("hidden");
      }
    }
  });
  document.addEventListener("keydown", function (event) {
    //detect key is backspace
    if (event.keyCode == 8 || event.key == "Backspace") {
      var clickedElement = event.target;
      if (clickedElement.classList.contains("transcript-sentences")) {
        var changeSpeakerButtononText = document.getElementById(
          "changeSpeakerButtononText"
        );
        var transcriptComponent = document.getElementById(
          "transcript-component"
        );

        if (changeSpeakerButtononText && transcriptComponent) {
          transcriptComponent.insertBefore(
            changeSpeakerButtononText,
            transcriptComponent.firstChild
          );
        }

        var caretLocation = getCaretPosition(clickedElement);
        var firstSpanElement = clickedElement.querySelector("span");
        var mIndex = parseInt(firstSpanElement.getAttribute("data-mindex"));
        mergeSpeakersParagraph.value = clickedElement;
        if (caretLocation == 0 && mIndex != 0) {
          if (!isPreviousSpeakerSame(mIndex)) {
            mergeDifferentSpeakersTranscript.value = true;
          }
        }
        if (isPreviousSpeakerSame(mIndex)) {
          mergeMonolouge(clickedElement);
        }
      }
    }
  });

  determineIfSpeakersNeedToBeSet();
  getAllSpeakersNameBySpeakersId();
});

onUnmounted(() => {
  turnObserverOff();
});

const highlightedWord = {
  monologueIndex: 0,
  elementIndex: 0,
};

const classes = computed(() => {
  return {
    simple: simpleLayout.value,
  };
});

// const transcript = ref({})

const getCurrentChapter = (timestamp) => {
  if (!chapters.value || chapters.value.length === 0) return null;
  let currentChapter = null;
  for (let i = 0; i < chapters.value.length; i++) {
    if (timestamp >= chapters.value[i].start_seconds) {
      currentChapter = chapters.value[i];
    } else {
      break;
    }
  }
  return currentChapter;
};

const shouldShowChapter = (currentTime, nextTime) => {
  if (!Array.isArray(chapters.value) || chapters.value.length === 0) return false;
  
  //return chapters.value.some(chapter => 
  //  chapter.start_seconds >= currentTime && 
  //  chapter.start_seconds < (nextTime || Infinity)
  //);

  return chapters.value.some(chapter => 
    Math.abs(chapter.start_seconds - currentTime) < 0.1 // Small threshold for floating point comparison
  );
};

const adjustChapterTimes = () => {
  if (!chapters.value?.length || !transcript.value?.monologues?.length) return;

  // Create a sorted array of all monologue start times
  const monologueStarts = transcript.value.monologues
    .map(m => m.elements[0]?.start)
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (monologueStarts.length === 0) return;

  // Adjust each chapter's start_seconds to the nearest monologue start time
  chapters.value = chapters.value.map((chapter, index) => {
    // Find the closest monologue start time that's <= chapter start time
    let closestTime = null;
    for (let i = 0; i < monologueStarts.length; i++) {
      if (monologueStarts[i] <= chapter.start_seconds) {
        closestTime = monologueStarts[i];
      } else {
        break;
      }
    }
    
    // If no monologue is before the chapter, use the first monologue
    if (closestTime === null && monologueStarts.length > 0) {
      closestTime = monologueStarts[0];
    }

    return {
      ...chapter,
      original_start_seconds: chapter.start_seconds,
      start_seconds: closestTime || chapter.start_seconds,
      number: index + 1 // Add 1 to make it 1-based index
    };
  });
};
</script>

<style lang="scss" scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.transcript-element {
  display: inline;
  background-color: transparent;
  position: relative;
  z-index: -10;
}

.whitespace-pre-wrap {
  &:focus {
    outline: none;
  }
}

@keyframes fadeIn {
  from {
    background-color: transparent;
  }

  to {
    background-color: #99f6e4;
  }
}

@keyframes fadeOut {
  from {
    background-color: #99f6e4;
  }

  to {
    background-color: transparent;
  }
}

.highlightedWord,
.highlightedEditWord,
.focus,
.focusTotext {
  border-radius: 4px;
  display: inline;
}

.highlightedEditWord::after {
  content: " ";
  position: absolute;
  display: inline-block;
  left: -4px;
  width: calc(100% + 8px);
  background-color: #99f6e4;
  border-radius: 4px;
  pointer-events: none;
  z-index: -10;
}

.highlightedWord::after {
  content: " ";
  position: absolute;
  animation: fadeIn 200ms forwards;
  display: inline-block;
  left: -4px;
  width: calc(100% + 8px);
  background-color: #99f6e4;
  border-radius: 4px;
  pointer-events: none;
  z-index: -10;
}

.focus::after {
  content: " ";
  position: absolute;
  display: inline-block;
  left: -4px;
  width: calc(100% + 8px);
  background-color: yellow;
  border-radius: 4px;
  pointer-events: none;
  z-index: -10;
}

.focusTotext::after {
  content: " ";
  position: absolute;
  display: inline-block;
  left: -4px;
  width: calc(100% + 8px);
  background-color: orange;
  border-radius: 4px;
  pointer-events: none;
  z-index: -10;
}

.fadingHighlightedWord {
  border-radius: 4px;
  display: inline-block;
  position: relative;
}

.fadingHighlightedWord::after {
  content: " ";
  position: absolute;
  animation: fadeOut 400ms forwards;
  display: inline-block;
  top: 0;
  left: -4px;
  width: calc(100% + 8px);
  background-color: #99f6e4;
  border-radius: 4px;
  pointer-events: none;
  z-index: -1;
}

.speaker-timecode {
  margin-left: auto;
}

.dashboard-links {
  @apply pt-5 px-2;

  &__wrapper {
    @apply w-full;
  }

  &__item {
    @apply hover:cursor-pointer;

    a {
      @apply rounded-md p-2 text-gray-600 text-sm leading-5 font-medium;

      span {
        @apply text-gray-600;
      }

      svg {
        @apply text-gray-400;
      }

      &.active {
        @apply bg-gray-200 text-gray-900;

        span {
          @apply text-gray-900;
        }

        svg {
          @apply text-indigo-600;
        }
      }
    }

    &:hover {
      svg {
        @apply text-indigo-600;
      }
    }
  }
}

.indent {
  @apply ml-4;
}

.user-dropdown {
  @apply flex relative;

  &__simple {
    @apply items-center;
  }

  &__full {
    @apply items-start;
  }

  &__image-wrapper {
    @apply relative;

    img,
    svg {
      @apply rounded-full max-w-none w-9 h-9;

      &.full {
      }
    }
  }

  &__carrot {
    @apply self-center mr-2 cursor-pointer w-6 h-6;

    &.dropdown-open {
      transform: rotate(-180deg);
    }

    &.dropdown-shut {
      transform: rotate(0deg);
    }
  }

  &:hover {
    .carrot {
      visibility: visible !important;
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
    @apply absolute top-12 bg-white rounded-lg w-56 shadow-lg ring-1 ring-black ring-opacity-5 pt-2 z-20;

    &.simple {
      @apply right-0;
    }

    &.full {
      @apply z-30;
      right: -180px;
    }

    &-item {
      @apply relative cursor-auto flex items-center px-4 py-2 font-inter text-sm;

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
.btn {
  @apply mt-3 inline-flex justify-center rounded-md px-3 py-2.5 text-sm leading-5 font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;

  &-submit {
    @apply bg-indigo-700 text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}
</style>
