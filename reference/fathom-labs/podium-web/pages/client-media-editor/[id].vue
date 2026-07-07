<template>
    <div class="h-full flex flex-col bg-[#FCFCFD] z-0 relative min-h-screen">
        <NavigationClientHeader
            :return-url="route.query.return_url"
            :file-name="fileName"
            :podcast-name="podcastName"
            :client-configs="clientConfigs"
            :save-state="mainStore.transcriptSavingSavedState"
        />
        <div class="flex flex-grow flex-row relative">
            <div
                class="dashboard-links flex-grow min-w-[293px] 2xl:max-w-[293px] px-0"
            ></div>
            <FindModal
                v-if="openFindModal"
                @close="openFindModal = false"
                :transcriptContent="transcript"
            />
            <div class="w-full ml-6">
                <div class="w-full h-full flex">
                    <div
                        v-if="loadingTranscript || updateMediaTranscriptLoading"
                        class="px-8 flex h-screen w-full absolute right-0"
                    >
                        <div class="m-auto pb-56">
                            <SvgLoadingMd />

                        </div>
                    </div>

                    <div
                        v-if="
                            !loadingTranscript || !updateMediaTranscriptLoading
                        "
                        id="transcript-component"
                        class="pt-4 ml-0 flex flex-col w-full pr-0 min-w-[730px] pb-32 pr-6"
                    >
                        <div class="text-right flex justify-end">
                            <div
                                @click="openFindModel"
                                class="flex mr-3 w-fit flex-initial items-center w-fit bg-white pl-3 pr-3 h-10 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap"
                            >
                                <svg
                                    width="17"
                                    height="17"
                                    viewBox="0 0 17 17"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M16.3169 15.3081L10.9262 10.0425C11.7525 9.02189 12.25 7.725 12.25 6.31251C12.25 3.03876 9.58623 0.375 6.31248 0.375C3.03873 0.375 0.375 3.03873 0.375 6.31248C0.375 9.58623 3.03876 12.25 6.31251 12.25C7.725 12.25 9.02188 11.7525 10.0425 10.9262L15.4331 16.1919C15.555 16.3137 15.715 16.375 15.875 16.375C16.035 16.375 16.195 16.3137 16.3169 16.1919C16.5613 15.9475 16.5613 15.5525 16.3169 15.3081ZM6.31251 11C3.7275 11 1.62501 8.89749 1.62501 6.31248C1.62501 3.72747 3.7275 1.62498 6.31251 1.62498C8.89752 1.62498 11 3.72747 11 6.31248C11 8.89749 8.89749 11 6.31251 11Z"
                                        fill="#6B7280"
                                    />
                                    <path
                                        fill-rule="evenodd"
                                        clip-rule="evenodd"
                                        d="M0 6.31248C0 2.83162 2.83162 0 6.31248 0C9.79334 0 12.625 2.83165 12.625 6.31251C12.625 7.69184 12.1786 8.96761 11.4261 10.0065L16.582 15.0429C16.9729 15.4337 16.9729 16.0662 16.5821 16.457C16.3872 16.6519 16.1307 16.75 15.875 16.75C15.6201 16.75 15.3643 16.6525 15.1696 16.4587L15.168 16.457L10.0128 11.4215C8.97279 12.1768 7.69464 12.625 6.31251 12.625C2.83165 12.625 0 9.79334 0 6.31248ZM6.31248 0.75C3.24584 0.75 0.75 3.24584 0.75 6.31248C0.75 9.37912 3.24587 11.875 6.31251 11.875C7.63526 11.875 8.84964 11.4095 9.80654 10.6348L10.0659 10.4248L15.6983 15.9267C15.7472 15.9756 15.8106 16 15.875 16C15.9394 16 16.0028 15.9756 16.0517 15.9267C16.1492 15.8292 16.1496 15.6725 16.0529 15.5745L10.4198 10.0721L10.6348 9.80654C11.4095 8.84964 11.875 7.63526 11.875 6.31251C11.875 3.24587 9.37912 0.75 6.31248 0.75ZM6.31251 1.99998C3.93461 1.99998 2.00001 3.93458 2.00001 6.31248C2.00001 8.69038 3.93461 10.625 6.31251 10.625C8.69038 10.625 10.625 8.69038 10.625 6.31248C10.625 3.93458 8.69041 1.99998 6.31251 1.99998ZM1.25001 6.31248C1.25001 3.52036 3.52039 1.24998 6.31251 1.24998C9.10463 1.24998 11.375 3.52036 11.375 6.31248C11.375 9.1046 9.1046 11.375 6.31251 11.375C3.52039 11.375 1.25001 9.1046 1.25001 6.31248Z"
                                        fill="#6B7280"
                                    />
                                </svg>
                            </div>
                            <div
                                class="dashboard-links__wrapper mr-3 w-fit flex-initial"
                            >
                                <div
                                    class="dashboard-links__item w-fit min-w-[180px]"
                                >
                                    <a
                                        @click.prevent="showSpeakersModal()"
                                        class="flex items-center h-10 border border-gray-300 rounded-md hover:bg-gray-100"
                                        :class="{
                                            active: speakersModalVisible,
                                        }"
                                    >
                                        <SvgSpeakersIcon
                                            class="ml-2 scale-75"
                                        />
                                        <span class="ml-3">Speaker Names</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <!-- Floating Button -->
                        <div
                            @click="openSpeakerDropdownClickOnSpeakerButton()"
                            id="changeSpeakerButtononText"
                            class="flex hidden z-[12] absolute flex-row items-center w-fit bg-white pl-2 pr-4 h-8 cursor-pointer hover:bg-gray-100 text-gray-500 border-none border-gray-300 rounded-md whitespace-nowrap shadow-lg z-50"
                        >
                            <span class="ml-2 mr-3">
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
                                </svg>
                            </span>
                            <span
                                class="text-sm font-normal leading-5 text-gray-700"
                                >Change Speaker</span
                            >
                        </div>
                        <transition name="fade">
                        <span v-if="svgScrollDown" class="flex items-center fixed bottom-[102px] top-[69px] right-[30px] cursor-pointer h-[calc(100vh - 171px)]" 
                        @click="goToHighlightDown" title="Scroll Down" >
                            <SvgScrollDown />
                        </span></transition>
                        <transition name="fade">
                        <span v-if="svgScrollUp" class="flex items-center fixed bottom-[102px] top-[69px] right-[30px] cursor-pointer h-[calc(100vh - 171px)]"  
                        @click="goToHighlightUp" title="Scroll Up" >
                            <SvgScrollUp />
                        </span></transition>


                        <!-- Ends -->
                        <div
                            v-for="(monologue, mIndex) in transcript.monologues"
                            :key="mIndex"
                            :class="{
                                'mb-8': !isNextSpeakerSame(mIndex),
                                'mt-8': mIndex == 0,
                            }"
                            class="text-base text-gray-700 mr-1 relative"
                        >
                            <h2
                                v-if="monologue.elements.length > 0"
                                class="text-lg font-bold flex justify-between text-gray-700"
                                :class="{
                                    'my-3': !isPreviousSpeakerSame(mIndex),
                                    'my-0': isPreviousSpeakerSame(mIndex),
                                }"
                                style="font"
                            >
                                <div
                                    :data-openKey="mIndex"
                                    class="user-dropdown cursor-pointer mt-0"
                                    :class="{
                                        'user-dropdown__simple': simpleLayout,
                                        'user-dropdown__full': !simpleLayout,
                                    }"
                                    @click="
                                        openSpeakerDropdownByIndex(
                                            mIndex,
                                            monologue.speaker_id,
                                        )
                                    "
                                >
                                    <div
                                        v-if="!isPreviousSpeakerSame(mIndex)"
                                        class="mt-0 flex flex-row mr-1 -ml-2 items-center max-w-60 bg-transparent hover:bg-white pl-2 pr-2 cursor-pointer hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-300 h-10 rounded-md whitespace-nowrap transition ease-in speaker-select"
                                    >
                                        <span
                                            class="inline-block mr-3 font-semibold truncate block"
                                        >
                                            <span
                                                v-if="
                                                    !isPreviousSpeakerSame(
                                                        mIndex,
                                                    )
                                                "
                                                >{{
                                                    getSpeakerNameRole(
                                                        monologue.speaker_id,
                                                    )[0]
                                                }}</span
                                            >
                                            <span
                                                v-if="
                                                    !isPreviousSpeakerSame(
                                                        mIndex,
                                                    ) &&
                                                    (getSpeakerNameRole(
                                                        monologue.speaker_id,
                                                    )[1] != 'Unknown' && getSpeakerNameRole(
                                                        monologue.speaker_id,
                                                    )[1] != 'None')
                                                "
                                                class="font-normal ml-2 text-gray-400 relative"
                                                >{{
                                                    getSpeakerNameRole(
                                                        monologue.speaker_id,
                                                    )[1]
                                                }}</span
                                            >
                                        </span>
                                        <SvgCarrot
                                            class="user-dropdown__carrot opacity-50 transition ease-in"
                                            :class="[
                                                simpleLayout
                                                    ? 'ml-2'
                                                    : 'ml-auto',
                                            ]"
                                        />
                                    </div>
                                    <div>
                                        <SpeakerNamesDropdown
                                            :currentSpeakerNames="
                                                currentSpeakerName
                                            "
                                            :from="resourceFrom"
                                            :allSpeakersNames="speakersNames"
                                            :currentSpekId="currentSpeakersId"
                                            :currentSpeakersMindexx="
                                                currentSpeakersMindex
                                            "
                                            @transcript="getLatestTranscript"
                                            :firstChildMindex="startEindex"
                                            :lastChildEindex="endEindex"
                                            @openAddSpkModal="
                                                hideShowAddSpkModal
                                            "
                                            :transcriptData="transcript"
                                            @editedSpkInfo="getEditedInfo"
                                        />
                                    </div>
                                </div>
                                <span
                                    class="speaker-timecode font-normal text-base items-center inline-flex text-gray-400"
                                    >{{
                                        mainStore.formatTime(
                                            monologue.elements[0].start,
                                        )
                                    }}</span
                                >
                            </h2>
                            <div
                                v-if="monologue.elements.length > 0"
                                class="whitespace-pre-wrap z-50 mr-1 text-lg leading-8 transcript-sentences"
                                style="font-kerning: none"
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
                                    v-for="(
                                        element, eIndex
                                    ) in monologue.elements"
                                    :key="
                                        mIndex.toString() +
                                        eIndex.toString() +
                                        element.value +
                                        element.start.toString()
                                    "
                                    :data-mindex="mIndex"
                                    :data-eindex="eIndex"
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

                    <div class="w-80">
                    </div>
                </div>
            </div>
        </div>
        <Playbar
            class="z-50"
            v-model="playbarModel"
            @audio-timeupdate="updateHighlightedWord"
            :audio-url="audioUrl"
            :jump-to-seconds="jumpToSeconds"
        />
        <SpeakersModal
            v-if="speakersModalVisible"
            v-model:transcript="transcript"
            v-model:modalVisible="speakersModalVisible"
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
    </div>
</template>

<script setup>
import { nextTick } from "vue";
import { useMainStore } from "~/store/main";
import { definePageMeta, useSession, navigateTo } from "#imports";
import { useAudioSystem } from "~/store/audioSystem";
import { storeToRefs } from "pinia";
import emitter  from "~/plugins/eventBus";
definePageMeta({
    layout: "empty",
    auth: false,
});
const currentSpeakerName = ref("");
const resourceFrom = ref(false);
const openAddSpeakerModal = ref(false);
const openFindModal = ref(false);
const runtimeConfig = useRuntimeConfig();
const route = useRoute();
const { signIn, status } = useSession();
const mainStore = useMainStore();
const audioSystem = useAudioSystem();
const currentSpeakersId = ref("");
const startEindex = ref(0);
const endEindex = ref(0);
const auth_token = route.query.a;
const clientConfigs = ref(null);
const loadingClient = ref(true);
const loadingTranscript = ref(true);
const edits = ref([]);
const jumpToSeconds = ref(0);
const highlightingEnabled = ref(true);
const lastHighlightedWordElement = ref(null);
const audioUrl = ref("");
const playbarModel = ref(null);
const fileName = ref("");
const podcastName = ref("");
const speakersModalVisible = ref(false);
const speakersModalCancelButtonText = ref("Close");
const saveState = ref("idle");
const puncts = [
    " ",
    ".",
    ",",
    "?",
    "!",
    ":",
    ";",
    "-",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    '"',
    "'",
];
var saveEditsTimeout = null;

var lastAudioTime = 0;
var lastJumpToSeconds = null;
var lastHighlightedTranscriptElement = null;
const emits = defineEmits(["from"]);
const props = defineProps(["speakersModalVisible"]);
const currentSpeakersMindex = ref("");
const { updateMediaTranscript, updateMediaTranscriptLoading } =
    storeToRefs(mainStore);
const simpleLayout = ref(true);
const mergeDifferentSpeakersTranscript = ref(false);
const mergeSpeakersParagraph = ref("");
watch(speakersModalVisible, () => {
    if (!speakersModalVisible.value) {
        setJumpToSeconds(0);
    }
});
//add Watch for updateMediaTranscriptLoading
watch(
    () => updateMediaTranscriptLoading.value,
    (value) => {
        const element = document.getElementById("transcript-component");
        if (value === true) {
            //get element by id transcript-component

            //hide element
            element.style.display = "None";
        } else {
            //remove all inline styles
            element.removeAttribute("style");
        }
    },
);
const isScroll = ref(true)
const svgScrollDown = ref(false) 
const svgScrollUp  = ref(false)

const checkHighlightElementPosition = () => {
    const highlightedWordElement = lastHighlightedWordElement.value
    const elementRect = highlightedWordElement.getBoundingClientRect();
    // const scrollingBodyElement = document.getElementById("scrollingBody");
    const windowHeight = window.innerHeight;
    const scrollTop = document.documentElement.scrollTop

    // Determine if the highlighted word is within the viewport
    const elementTopRelativeToViewport = elementRect.top + scrollTop;
    const elementBottomRelativeToViewport = elementRect.bottom + scrollTop;

    // Check if the element is above the viewport
    if (elementBottomRelativeToViewport < scrollTop) {
        svgScrollDown.value = false;
        svgScrollUp.value = true;
    }
    // Check if the element is below the viewport
    else if (elementTopRelativeToViewport > scrollTop + windowHeight) {
        svgScrollDown.value = true;
        svgScrollUp.value = false;
    }
    // The element is within the viewport
    else {
        svgScrollDown.value = false;
        svgScrollUp.value = false;
    }

};


  const goToHighlightDown =()=>{
    isScroll.value = true
    scrollToHighlightedWord(lastHighlightedWordElement.value)
  }

  const goToHighlightUp =()=>{
    isScroll.value = true
    scrollToHighlightedWord(lastHighlightedWordElement.value)
  }


const openFindModel = () => {
    openFindModal.value = true;
    var content = "";
    loadingTranscript.value = content;
};
const classes = computed(() => {
    return {
        simple: simpleLayout.value,
    };
});
const showSpeakersModal = () => {
    speakersModalCancelButtonText.value = "Cancel";
    speakersModalVisible.value = true;
};

const goToNextParagraph = async (event)=>{
  if (event && (event.key === 'ArrowRight' || event.keyCode === 39 || event.key === 'ArrowDown' || event.keyCode === 40)) {
        //here logic for go to next paragraphs
        if (getCaretPositions(event.target) == 0){
          var currentspan = event.target.childNodes[0].nextElementSibling
        }
        else{
          var currentspan = getCurrentCaretSpan().nextElementSibling
        }
     
       
        if (currentspan == null) {
          event.preventDefault()
          setCursorPosition(getCurrentCaretSpan().parentElement.parentElement.nextElementSibling.childNodes[1], 0)
        }

  }
  else if (event && (event.key === 'ArrowLeft' || event.keyCode === 37 || event.key === 'ArrowUp' || event.keyCode === 38 )) {
        //here logic for go to previous paragraphs
       if (getCaretPositions(event.target) == 0){
        event.preventDefault()
        var previousDiv = event.target.parentElement.previousElementSibling.childNodes[1]
        var lastDiv = previousDiv.querySelector('.transcript-element:last-child')
        setCursorPosition(lastDiv, lastDiv.innerText.length)
        }
  }
}

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
const hideShowAddSpkModal = (data) => {
    if (data) {
        openAddSpeakerModal.value = data;
    }
};

const spkInfoBySpkId = ref('')

const getEditedInfo =(data)=>{
  if(data){
    spkInfoBySpkId.value = data
  }
}
watch(()=>playbarModel.value, (a,b)=>{
  if(playbarModel.value.playbackState ==='paused'){
    svgScrollDown.value = false
    svgScrollUp.value = false
  }
})
const openSpeakerDropdownByIndex = (mIndex, currentSpeakerId) => {
    resourceFrom.value = false; 
    mainStore.mIndex = mIndex
    currentSpeakersId.value =  currentSpeakerId
    currentSpeakerName.value = getSpeakerNameRole(currentSpeakerId)[0];
    currentSpeakersMindex.value = mIndex;
    var isOpenSpeakerDropdown = document.querySelectorAll(
        ".isOpenSpeakerDropdown",
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
const closeDropdownList = () => {
    var isOpenSpeakerDropdown = document.querySelectorAll(
        ".isOpenSpeakerDropdown",
    );
    isOpenSpeakerDropdown.forEach((isOpenSpeakerDropdown) => {
        isOpenSpeakerDropdown.classList.remove("dropdown-open");
        isOpenSpeakerDropdown.classList.add("dropdown-shut");
    });
    return isOpenSpeakerDropdown;
};
const openSpeakerDropdownClickOnSpeakerButton = () => {
    resourceFrom.value = true;
    updateMediaTranscript.value = true;
    var changeSpeakerButtononText = document.getElementById(
        "changeSpeakerButtononText",
    );
    var isOpenSpeakerDropdown = closeDropdownList();
    isOpenSpeakerDropdown[currentSpeakersMindex.value].classList.remove(
        "dropdown-shut",
    );
    isOpenSpeakerDropdown[currentSpeakersMindex.value].classList.add(
        "dropdown-open",
    );
    isOpenSpeakerDropdown[currentSpeakersMindex.value].style.top =
        changeSpeakerButtononText.offsetTop + "px";
    isOpenSpeakerDropdown[currentSpeakersMindex.value].style.left =
        changeSpeakerButtononText.offsetLeft + "px";
};
const getSpeakerNameRole = (speakerId) => {
  // const speaker = transcript.value.speakers.find((sp) => sp.id === speakerId)
  const speakerIndex = transcript.value.speakers.findIndex((sp) => sp.id === speakerId);
  const speaker = transcript.value.speakers[speakerIndex];
  var name = ''
  var role = ''
  if (speaker) {
    if (speaker.set_name) {
      name = speaker.set_name
    } else if(speaker.default_name) {
      name = speaker.default_name
    }else{
      name = 'Speaker' + ' '+ (speakerIndex + 1) 
    }

    if (speaker.set_role) {
      role = speaker.set_role
    } else {
      role = speaker.default_role
    }
  }
  return [name, mainStore.capitalizeFirstLetter(role)]
}
const getLatestTranscript = (data) => {
    transcript.value = data;
    mainStore.currentMediaTranscript = data
};
function getCaretPositions(element) {
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
const handleKeys = async (event) => {
    var changeSpeakerButtononText = document.getElementById(
        "changeSpeakerButtononText",
    );
    if (!changeSpeakerButtononText.classList.contains("hidden")) {
        changeSpeakerButtononText.classList.add("hidden");
    }
    if (event && (event.key === "Enter" || event.keyCode === 13)) {
        event.preventDefault();
        mainStore.transcriptSavingSavedState = ''

        if (getCaretPositions(event.target) == 0) {
            return;
        }
        try {
            var currentspan = getCurrentCaretSpan().nextElementSibling;
            var lastspan = event.target.querySelector(
                ".transcript-element:last-child",
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
                    var start = parseInt(
                        currentspan.getAttribute("data-eindex"),
                    );
                } else {
                    // throw "No element found after this unable to split the speaker";
                    return
                }
                var start = parseInt(currentspan.getAttribute("data-eindex"));
            } else {
                var start = parseInt(currentspan.getAttribute("data-eindex"));
            }
        } catch {
            // alert("No element found after this unable to split the speaker");
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
                    const first_split = transcript.value.monologues[
                        i
                    ].elements.slice(0, start);
                    const second_split = transcript.value.monologues[
                        i
                    ].elements.slice(start, end);

                    if (first_split.length > 0) {
                        new_monlouge.push({
                            speaker_id:
                                transcript.value.monologues[i].speaker_id,
                            elements: first_split,
                        });
                    }
                    if (second_split.length > 0) {
                        new_monlouge.push({
                            speaker_id:
                                transcript.value.monologues[i].speaker_id,
                            elements: second_split,
                        });
                    }
                } else {
                    new_monlouge.push(transcript.value.monologues[i]);
                }
            }
            transcript.value.monologues = new_monlouge;
            mainStore.transcriptSavingSavedState = "Saving..."
            await fetch(
                `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/split`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
                    },
                    body: JSON.stringify(data),
                },
            )
                .then((response) => response.json())
                .then((data) => {
                    mainStore.transcriptSavingSavedState = "Saved"
                    if (!data) {
                        alert(
                            "There was an error saving the speakers. Please try again.",
                        );
                    }
                });
        }
    }
};

const determineJumpToSeconds = () => {
    const currentSpan = getCurrentCaretSpan();

    if (!currentSpan) {
        return;
    } else {
        var element =
            transcript.value.monologues[parseInt(currentSpan.dataset.mindex)]
                .elements[parseInt(currentSpan.dataset.eindex)];
        var start = element.start;

        if (element.type === "punct") {
            const lastTextElementIndex = getLastTextElementIndexForMonologue(
                parseInt(currentSpan.dataset.mindex),
            );
            if (parseInt(currentSpan.dataset.eindex) > lastTextElementIndex) {
                start =
                    transcript.value.monologues[
                        parseInt(currentSpan.dataset.mindex)
                    ].elements[lastTextElementIndex].start;
            } else {
                start = getNextWordStart(
                    parseInt(currentSpan.dataset.mindex),
                    parseInt(currentSpan.dataset.eindex),
                );
            }
        }

        setJumpToSeconds(start);
    }
};

const setJumpToSeconds = (seconds) => {
    if (seconds === lastJumpToSeconds) {
        return;
    }

    lastJumpToSeconds = seconds;

    if (
        !lastHighlightedTranscriptElement ||
        seconds < lastHighlightedTranscriptElement.start ||
        seconds > lastHighlightedTranscriptElement.end
    ) {
        jumpToSeconds.value = 0; // force update
        nextTick(() => {
            jumpToSeconds.value = seconds;
        });
    }
};

const getLastTextElementIndexForMonologue = (mIndex) => {
    var lastTextElementIndex = -1;
    for (
        var i = transcript.value.monologues[mIndex].elements.length - 1;
        i >= 0;
        i--
    ) {
        if (transcript.value.monologues[mIndex].elements[i].type === "text") {
            return i;
        }
    }
    return -1;
};



const updateHighlightedWord = (audioTime) => {
    if (!highlightingEnabled.value) {
        return;
    }

    // round to nearest 0.001
    audioTime = Math.round(audioTime * 1000) / 1000;

    var allowClosest = false;
    if (Math.abs(audioTime - lastAudioTime) > 5) {
        allowClosest = true;
        isScroll.value = true
    }

    lastAudioTime = audioTime;
    lastJumpToSeconds = null;

    if (audioTime == 0) {
        scrollToTop();
        allowClosest = false;
    }

    if (
        !playbarModel.value ||
        !playbarModel.value.playbackState === "playing"
    ) {
        allowClosest = true;
    }

    const mIndex = findMonologueIndex(audioTime, allowClosest);
    if (mIndex === -1) {
        return;
    }

    const eIndex = findElementIndex(audioTime, mIndex, allowClosest);
    if (eIndex === -1) {
        return;
    }

    lastHighlightedTranscriptElement =
        transcript.value.monologues[mIndex].elements[eIndex];

    // check if currently highlighted word is the same as the new one
    var highlightedWordElement = document.querySelector(".highlightedWord");

    emitter.emit('audioLatestTime', audioTime)
    if (!highlightedWordElement) {
        highlightedWordElement = document.querySelector(".highlightedEditWord");
    }
    if (highlightedWordElement) {
        const highlightedWordMIndex = parseInt(
            highlightedWordElement.dataset.mindex,
        );
        const highlightedWordEIndex = parseInt(
            highlightedWordElement.dataset.eindex,
        );
        if (
            highlightedWordMIndex === mIndex &&
            highlightedWordEIndex === eIndex
        ) {
            //console.debug('no updateHighlightedWord')
            return;
        } else {
            if (
                playbarModel.value &&
                playbarModel.value.playbackState === "playing"
            ) {
                highlightedWordElement.classList.add("fadingHighlightedWord");
            }
            highlightedWordElement.classList.remove("highlightedWord");
            highlightedWordElement.classList.remove("highlightedEditWord");
        }
    }

    if (playbarModel.value.playbackState != "playing") {
        const highlightedEditWordElement = document.querySelector(
            ".highlightedEditWord",
        );
        if (highlightedEditWordElement) {
            const highlightedEditWordMIndex = parseInt(
                highlightedEditWordElement.dataset.mindex,
            );
            const highlightedEditWordEIndex = parseInt(
                highlightedEditWordElement.dataset.eindex,
            );
            if (
                highlightedEditWordMIndex === mIndex &&
                highlightedEditWordEIndex === eIndex
            ) {
                return;
            } else {
                highlightedEditWordElement.classList.remove(
                    "highlightedEditWord",
                );
            }
        }
    }


    // highlight new word
    const newElementToHighlight = document.querySelector(
        `[data-mindex="${mIndex}"][data-eindex="${eIndex}"]`,
    );
    
    if (newElementToHighlight) {
        newElementToHighlight.classList.remove("fadingHighlightedWord");
        if (
            playbarModel.value &&
            playbarModel.value.playbackState === "playing"
        ) {
            if (
                !newElementToHighlight.classList.contains("highlightedEditWord")
            ) {
                newElementToHighlight.classList.add("highlightedWord");
            }
        } else {
            newElementToHighlight.classList.add("highlightedEditWord");
        }

       if (isScroll.value && newElementToHighlight){
        scrollToHighlightedWord(newElementToHighlight);
        }

        highlightedWordElement = newElementToHighlight
    }

    lastHighlightedWordElement.value = highlightedWordElement
    
    if (playbarModel.value.playbackState == 'playing') {
        checkHighlightElementPosition()
    }
};


var lastTop = 0;
const scrollToTop = () => {
    lastTop = 0;
    window.scrollTo({ top: lastTop, behavior: "smooth" });
};
const showSpeakerChangeButtonSelected = () => {
    // delete changeSpeakerButtononText if it exists
    var changeSpeakerButtononText = document.getElementById(
        "changeSpeakerButtononText",
    );

    var selectedText = window.getSelection();
    //get parent element of selected text
    var parent = selectedText.anchorNode.parentElement;
    //check is this parent span or have attribute data-mindex
    if (parent.tagName == "SPAN" && parent.hasAttribute("data-mindex")) {
        if (window.getSelection().toString().length > 0) {
            var range = selectedText.getRangeAt(0);
            var rect = range.getBoundingClientRect();

            var tempDiv = document.createElement("div");
            if (
                puncts.includes(range.commonAncestorContainer.data) &&
                range.commonAncestorContainer.nodeName == "#text"
            ) {
                changeSpeakerButtononText.classList.add("hidden");
                return;
            }
            if (
                range.commonAncestorContainer.nodeName == "#text" &&
                !puncts.includes(range.commonAncestorContainer.data) &&
                range.commonAncestorContainer.parentElement.tagName == "SPAN"
            ) {
                tempDiv.appendChild(
                    range.commonAncestorContainer.parentElement.cloneNode(),
                );
                try {
                    range.commonAncestorContainer.parentElement.parentElement.parentElement.childNodes[0].childNodes[0].before(
                        changeSpeakerButtononText,
                    );
                } catch {}
            } else {
                tempDiv.appendChild(range.cloneContents());
                try {
                    range.commonAncestorContainer.parentElement.childNodes[0].childNodes[0].before(
                        changeSpeakerButtononText,
                    );
                } catch {}
            }
            //check is tempdiv child has any span element
            var spanElement = tempDiv.querySelector("span");
            if (spanElement) {
                changeSpeakerButtononText.classList.remove("hidden");
                changeSpeakerButtononText.style.top =
                    range.startContainer.parentElement.offsetTop - 35 + "px";
                changeSpeakerButtononText.style.left =
                    range.startContainer.parentElement.offsetLeft + "px";
                //get first and last child of tempDiv
                //get first and last child of tempDiv
                var firstChild = tempDiv.firstChild;
                var lastChild = tempDiv.lastChild;
                startEindex.value = firstChild.getAttribute("data-eindex");
                endEindex.value = lastChild.getAttribute("data-eindex");
                currentSpeakersMindex.value =
                    firstChild.getAttribute("data-mindex");
                mainStore.mIndex = currentSpeakersMindex.value
            }
        }
    }
};
const scrollToHighlightedWord = (highlightedWordElement) => {
    closeDropdownList();
    const elementRect = highlightedWordElement.getBoundingClientRect();

    if (lastTop === elementRect.top) {
        return;
    } else {
        lastTop = elementRect.top;
    }

    const windowHeight = window.innerHeight;

    if (elementRect.top > windowHeight - getScrollBottomThreshold()) {
        const scrollToY =
            window.scrollY + elementRect.top - getScrollTargetOffset();
        window.scrollTo({ top: scrollToY, behavior: "smooth" });
        disableHighlightingUntilScrollComplete();
    }

    if (elementRect.top < getScrollTopThreshold()) {
        const scrollToY =
            elementRect.top + window.scrollY - getScrollTargetOffset();
        window.scrollTo({ top: scrollToY, behavior: "smooth" });
        disableHighlightingUntilScrollComplete();
    }
};

// const scrollingBodyElement = document.getElementById("scrollingBody");


const getScrollTopThreshold = () => {
    if (speakersModalVisible.value) {
        const windowHeight = window.innerHeight;
        const speakersModalRect = document
            .getElementById("speakersModal")
            .getBoundingClientRect();

        if (speakersModalRect.bottom > windowHeight * 0.7) {
            return windowHeight / 2;
        } else {
            return speakersModalRect.bottom - 50;
        }
    }

    return 50;
};

const getScrollBottomThreshold = () => {
    return 130;
};

const getScrollTargetOffset = () => {
    if (speakersModalVisible.value) {
        const windowHeight = window.innerHeight;
        const speakersModalRect = document
            .getElementById("speakersModal")
            .getBoundingClientRect();

        if (speakersModalRect.bottom > windowHeight * 0.7) {
            return windowHeight / 2;
        } else {
            return speakersModalRect.bottom + 64;
        }
    }

    if (playbarModel.value.currentTime === "playing") {
        return 130;
    }

    return 130;
};

const disableHighlightingUntilScrollComplete = () => {
    highlightingEnabled.value = false;
    let position = null;
    const checkIfScrollIsStatic = setInterval(() => {
        if (position === window.scrollY) {
            clearInterval(checkIfScrollIsStatic);
            highlightingEnabled.value = true;
            if (playbarModel.value.playbackState == 'playing') {
                checkHighlightElementPosition()
            }
        }
        position = window.scrollY;
    }, 50);
};

const findMonologueIndex = (audioTime, allowClosest = false) => {
    let start = 0;
    let end = transcript.value.monologues.length - 1;
    let closestIndex = -1;
    let closestDifference = Infinity;

    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        let monologue = transcript.value.monologues[mid];

        // Ensure we've found a monologue with elements
        while (!monologue.elements || monologue.elements.length == 0) {
            mid = mid + 1;
            if (mid > end) {
                console.log("No monologue elements found");
                return -1;
            }
            monologue = transcript.value.monologues[mid];
        }

        const monologueStart = monologue.elements[0].start;
        const monologueEnd =
            monologue.elements[monologue.elements.length - 1].end;

        if (audioTime >= monologueStart && audioTime <= monologueEnd) {
            return mid;
        } else if (audioTime < monologueStart) {
            end = mid - 1;
        } else {
            start = mid + 1;
        }

        const startDifference = Math.abs(audioTime - monologueStart);
        const endDifference = Math.abs(audioTime - monologueEnd);
        const minDifference = Math.min(startDifference, endDifference);

        if (minDifference < closestDifference) {
            closestDifference = minDifference;
            closestIndex = mid;
        }
    }

    if (allowClosest) {
        return findClosestMonologueIndex(audioTime, closestIndex);
    } else {
        return -1;
    }
};

const findClosestMonologueIndex = (audioTime, closestIndex) => {
    const closestMonologueStart =
        transcript.value.monologues[closestIndex].start;

    var closestTimeDifference = null;
    let currentIndex = closestIndex;
    if (audioTime < closestMonologueStart) {
        while (currentIndex >= 0) {
            const currentMonologue = transcript.value.monologues[currentIndex];
            const currentMonologueStart = currentMonologue.elements[0].start;
            const currentMonologueEnd =
                currentMonologue.elements[currentMonologue.elements.length - 1]
                    .end;

            var currentTimeDifference = Math.min(
                Math.abs(audioTime - currentMonologueStart),
                Math.abs(audioTime - currentMonologueEnd),
            );

            if (
                closestTimeDifference &&
                currentTimeDifference > closestTimeDifference
            ) {
                return currentIndex + 1;
            } else {
                closestTimeDifference = currentTimeDifference;
                if (currentIndex === 0) {
                    return currentIndex;
                }
            }
            currentIndex--;
        }
    } else {
        while (currentIndex < transcript.value.monologues.length) {
            const currentMonologue = transcript.value.monologues[currentIndex];
            const currentMonologueStart = currentMonologue.elements[0].start;
            const currentMonologueEnd =
                currentMonologue.elements[currentMonologue.elements.length - 1]
                    .end;

            var currentTimeDifference = Math.min(
                Math.abs(audioTime - currentMonologueStart),
                Math.abs(audioTime - currentMonologueEnd),
            );

            if (
                closestTimeDifference &&
                currentTimeDifference > closestTimeDifference
            ) {
                return currentIndex - 1;
            } else {
                closestTimeDifference = currentTimeDifference;
                if (currentIndex === transcript.value.monologues.length - 1) {
                    return currentIndex;
                }
            }

            currentIndex++;
        }
    }

    return closestIndex;
};

const findElementIndex = (audioTime, mIndex, allowClosest = false) => {
    const monologue = transcript.value.monologues[mIndex];
    let start = 0;
    let end = monologue.elements.length - 1;
    let closestIndex = -1;
    let closestDifference = Infinity;

    while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        const element = monologue.elements[mid];

        if (
            audioTime >= element.start &&
            audioTime <= element.end &&
            element.type === "text"
        ) {
            return mid;
        } else if (audioTime < element.start) {
            end = mid - 1;
        } else {
            start = mid + 1;
        }

        if (element.type === "text") {
            const startDifference = Math.abs(audioTime - element.start);
            const endDifference = Math.abs(audioTime - element.end);
            const minDifference = Math.min(startDifference, endDifference);

            if (minDifference < closestDifference) {
                closestDifference = minDifference;
                closestIndex = mid;
            }
        }
    }

    if (allowClosest) {
        return findClosestElementIndex(audioTime, mIndex, closestIndex);
    } else {
        return -1;
    }
};

const findClosestElementIndex = (audioTime, mIndex, closestIndex) => {
    const monologue = transcript.value.monologues[mIndex];
    const closestElementStart = monologue.elements[closestIndex].start;

    var closestTimeDifference = null;
    let currentIndex = closestIndex;
    var closestTextElementIndex = closestIndex;
    if (audioTime < closestElementStart) {
        while (currentIndex >= 0) {
            const currentElement = monologue.elements[currentIndex];
            if (currentElement.type === "text" || currentIndex === 0) {
                var currentTimeDifference = Math.min(
                    Math.abs(audioTime - currentElement.start),
                    Math.abs(audioTime - currentElement.end),
                );

                if (
                    closestTimeDifference &&
                    currentTimeDifference > closestTimeDifference
                ) {
                    return closestTextElementIndex;
                } else {
                    closestTimeDifference = currentTimeDifference;
                    closestTextElementIndex = currentIndex;
                    if (currentIndex === 0) {
                        return currentIndex;
                    }
                }
            }
            currentIndex--;
        }
    } else {
        while (currentIndex < monologue.elements.length) {
            const currentElement = monologue.elements[currentIndex];
            if (
                currentElement.type === "text" ||
                currentIndex === monologue.elements.length - 1
            ) {
                var currentTimeDifference = Math.min(
                    Math.abs(audioTime - currentElement.start),
                    Math.abs(audioTime - currentElement.end),
                );

                if (
                    closestTimeDifference &&
                    currentTimeDifference > closestTimeDifference
                ) {
                    return closestTextElementIndex;
                } else {
                    closestTimeDifference = currentTimeDifference;
                    closestTextElementIndex = currentIndex;
                    if (currentIndex === monologue.elements.length - 1) {
                        return currentIndex;
                    }
                }
            }
            currentIndex++;
        }
    }

    return closestIndex;
};

const storeElementEdit = (mIndex, eIndex, target, isDelete = false) => {
    var elementSpan = target;
    var newValue = elementSpan.innerHTML;
    try {
        var oldValue =
            transcript.value.monologues[mIndex].elements[eIndex].value;
    } catch {
        var oldValue = transcript.value.monologues[mIndex].elements[eIndex];
    }
    var targetElement = transcript.value.monologues[mIndex].elements[eIndex];
    //console.debug('TARGET ELEMENT', targetElement)

    saveState.value = "idle";

    if (isDelete) {
        //console.debug('DELETING')
        edits.value.push({
            type: "delete",
            monologueIndex: mIndex,
            elementIndex: eIndex,
            elementType: targetElement.type,
            value: targetElement.value,
            start: targetElement.start,
            end: targetElement.end,
            saveState: "unsaved",
        });

        turnObserverOff();

        //hack to get around bug where deleting a space with a space next to it causes deleting of both spaces
        if (
            transcript.value.monologues[mIndex].elements.length > eIndex + 2 &&
            transcript.value.monologues[mIndex].elements[eIndex + 1].value ==
                oldValue
        ) {
            //console.debug('DELETING CASE 1')
            transcript.value.monologues[mIndex].elements[eIndex + 1].value =
                oldValue + oldValue;
            transcript.value.monologues[mIndex].elements.splice(eIndex, 1);
            nextTick(() => {
                transcript.value.monologues[mIndex].elements[eIndex].value =
                    oldValue;
                nextTick(() => {
                    turnObserverOn(lastObservedEditorNode);
                });
            });
        } else {
            //console.debug('DELETING CASE 2')
            //console.debug(eIndex)
            //console.debug(transcript.value.monologues[mIndex].elements[eIndex])
            transcript.value.monologues[mIndex].elements.splice(eIndex, 1);
            nextTick(() => {
                turnObserverOn(lastObservedEditorNode);
            });
        }
        //console.debug(transcript.value.monologues[mIndex].elements)
    } else {
        //console.debug('UPDATING/INSERTING')
        if (newValue != oldValue) {
            turnObserverOff();

            const elements = splitElementValue(newValue);
            //console.debug("ELEMENTS")
            //console.debug(elements)

            var nextTranscriptElement =
                transcript.value.monologues[mIndex].elements[eIndex + 1];
            const currentCaretPos = getCaretPosition(elementSpan);

            if (
                elements.length == 2 &&
                puncts.includes(elements[0]) &&
                elements[0] == elements[1]
            ) {
                elementSpan.innerHTML = elements[0];
                edits.value.push({
                    type: "update",
                    monologueIndex: mIndex,
                    elementIndex: eIndex,
                    elementType: getElementType(newValue),
                    value:  elementSpan.innerHTML + elements[0] ,
                    start: targetElement.start,
                    end: targetElement.end,
                    saveState: "unsaved",
                });
                transcript.value.monologues[mIndex].elements[eIndex].value = newValue;
                const lastEdit = edits.value[edits.value.length - 1];

                nextTick(() => {
                    const element = document.querySelector(
                    '[data-key="' +
                        mIndex.toString() +
                        eIndex.toString() +
                        newValue +
                        lastEdit.start.toString() +
                        '"]',
                    );
            setCaretPosition(element, currentCaretPos);
            turnObserverOn(lastObservedEditorNode);
          });
            } else if (
                oldValue == " " &&
                elements.length == 2 &&
                !puncts.includes(nextTranscriptElement.value)
            ) {
                //console.debug("UPDATE CASE 1")
                // handle the case where the user deletes the last character in an element
                elementSpan.innerHTML = elements[0];
                elementSpan = elementSpan.nextSibling;
                newValue = elements[1] + elementSpan.innerHTML;

                targetElement =
                    transcript.value.monologues[mIndex].elements[eIndex + 1];

                edits.value.push({
                    type: "update",
                    monologueIndex: mIndex,
                    elementIndex: eIndex + 1,
                    elementType: getElementType(newValue),
                    value: newValue,
                    start: targetElement.start,
                    end: targetElement.end,
                    saveState: "unsaved",
                });

                transcript.value.monologues[mIndex].elements[eIndex + 1].value =
                    newValue;
                const lastEdit = edits.value[edits.value.length - 1];

                nextTick(() => {
                    //console.debug('[data-key="' + mIndex.toString() + (eIndex + 1).toString() + newValue + lastEdit.start.toString() + '"]')
                    const element = document.querySelector(
                        '[data-key="' +
                            mIndex.toString() +
                            (eIndex + 1).toString() +
                            newValue +
                            lastEdit.start.toString() +
                            '"]',
                    );
                    setCaretPosition(element, elements[1].length);
                    turnObserverOn(lastObservedEditorNode);
                });
            } else if (elements.length == 1) {
                //console.debug("UPDATE CASE 2")
                // handle the case where the user is simply modifying an element
                edits.value.push({
                    type: "update",
                    monologueIndex: mIndex,
                    elementIndex: eIndex,
                    elementType: getElementType(newValue),
                    value: newValue,
                    start: targetElement.start,
                    end: targetElement.end,
                    saveState: "unsaved",
                });
                transcript.value.monologues[mIndex].elements[eIndex].value =
                    newValue;
                const lastEdit = edits.value[edits.value.length - 1];

                nextTick(() => {
                    //console.log('[data-key="' + mIndex.toString() + eIndex.toString() + newValue + lastEdit.start.toString() + '"]')
                    const element = document.querySelector(
                        '[data-key="' +
                            mIndex.toString() +
                            eIndex.toString() +
                            newValue +
                            lastEdit.start.toString() +
                            '"]',
                    );

                    setCaretPosition(element, currentCaretPos);
                    turnObserverOn(lastObservedEditorNode);
                });
            } else {
                //console.debug("UPDATE CASE 3")
                // handle the case where we're inserting a new element
                //iterate over the elements. Create an update for the first one, and inserts for the rest.
                var lastInsertedTranscriptElement = null;

                elements.forEach((element, index) => {
                    if (
                        index === 0 &&
                        (puncts.includes(elements[0]) ||
                            puncts.includes(elements[elements.length - 1]))
                    ) {
                        // update the first element
                        if (
                            transcript.value.monologues[mIndex].elements[eIndex]
                                .value != element
                        ) {
                            edits.value.push({
                                type: "update",
                                monologueIndex: mIndex,
                                elementIndex: eIndex,
                                elementType: getElementType(element),
                                value: element,
                                start: targetElement.start,
                                end: targetElement.end,
                                saveState: "unsaved",
                            });
                            transcript.value.monologues[mIndex].elements[
                                eIndex
                            ].value = element;
                        }
                        target.innerHTML = element;
                    } else if (
                        index === elements.length - 1 &&
                        !(
                            puncts.includes(elements[0]) ||
                            puncts.includes(elements[elements.length - 1])
                        )
                    ) {
                        // update the last element
                        if (
                            transcript.value.monologues[mIndex].elements[
                                eIndex + index
                            ].value != element
                        ) {
                            edits.value.push({
                                type: "update",
                                monologueIndex: mIndex,
                                elementIndex: eIndex + index,
                                elementType: getElementType(element),
                                value: element,
                                start: targetElement.start,
                                end: targetElement.end,
                                saveState: "unsaved",
                            });
                            transcript.value.monologues[mIndex].elements[
                                eIndex + index
                            ].value = element;
                        }
                        target.innerHTML = element;
                    } else {
                        var start = targetElement.end;
                        var end = targetElement.end;

                        if (getElementType(element) != "punct") {
                            [start, end] = getInsertStartEnd(
                                mIndex,
                                eIndex + index,
                            );
                        } else if (
                            !(
                                puncts.includes(elements[0]) ||
                                puncts.includes(elements[elements.length - 1])
                            ) &&
                            lastInsertedTranscriptElement
                        ) {
                            start = lastInsertedTranscriptElement.end;
                            end = lastInsertedTranscriptElement.end;
                        }
                        // Insert the rest of the elements
                        edits.value.push({
                            type: "insert",
                            monologueIndex: mIndex,
                            elementIndex: eIndex + index,
                            elementType: getElementType(element),
                            value: element,
                            start: start,
                            end: end,
                            saveState: "unsaved",
                        });
                        transcript.value.monologues[mIndex].elements.splice(
                            eIndex + index,
                            0,
                            {
                                type: getElementType(element),
                                value: element,
                                start: start,
                                end: end,
                            },
                        );
                        lastInsertedTranscriptElement =
                            transcript.value.monologues[mIndex].elements[
                                eIndex + index
                            ];
                    }
                });

                //console.debug(transcript.value.monologues[mIndex].elements)
                const lastEdit = edits.value[edits.value.length - 1];

                nextTick(() => {
                    const caretElementIndex = getNextCaretPositionElementIndex(
                        elements,
                        currentCaretPos,
                    );
                    const element = document.querySelector(
                        '[data-key="' +
                            lastEdit.monologueIndex.toString() +
                            (eIndex + caretElementIndex).toString() +
                            elements[caretElementIndex] +
                            lastEdit.start.toString() +
                            '"]',
                    );

                    var elementCaretPos = 0;
                    if (
                        puncts.includes(elements[0]) ||
                        puncts.includes(elements[elements.length - 1])
                    ) {
                        elementCaretPos = elements[caretElementIndex].length;
                    }

                    if (element) {
                        setCaretPosition(element, elementCaretPos);
                    }
                    turnObserverOn(lastObservedEditorNode);
                });

                //console.debug(elements)
            }
        } else {
            //console.debug('NO CHANGE')
        }
    }

    compressEdits();
    triggerSaveEdits();
    setTimeout(() => {
      if(isDelete && transcript.value.monologues[mIndex].elements.length === 0){
        removeEmptyElementsByIndex(transcript.value.monologues, mIndex);
        //here we are calling the api for delete monologue from backend
        deleteMonologueBymIndex(mIndex)
      }
    }, 2000);
};

const deleteMonologueBymIndex =(mIndex)=>{
    var data = {
      monologue_index : mIndex,
      type : 'monologue_delete'
    }
    fetch(
      `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/delete_monologue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
        },
        body:JSON.stringify(data)
      },
    )
      .then((response) => response.json())
      .then((data) => {
        if(data){
         console.log(data, 'data')
        }
      });

  }
  
  function removeEmptyElementsByIndex(transcript, index) {
    if (index >= 0 && index < transcript.length) {
      if (transcript[index].elements.length === 0) {
          transcript.splice(index, 1);
      }
  }
  return   transcript;
}

function getInsertStartEnd(mIndex, eIndex) {
    var foundDeletedEdits = [];
    const currentElement = transcript.value.monologues[mIndex].elements[eIndex];
    var [start, end] = getThresholdStartEnd(mIndex, eIndex);

    if (mIndex == 0 && eIndex == 0) {
        // find any deleted elements with start times before the current start
        edits.value.forEach((edit) => {
            if (edit.type == "delete" && edit.start < currentElement.start) {
                foundDeletedEdits.push(edit);
            }
        });
        if (foundDeletedEdits.length > 0) {
            // sort the deleted elements by start time, earliest first
            foundDeletedEdits.sort((a, b) => {
                return a.start - b.start;
            });

            start = foundDeletedEdits[0].start;
            end = foundDeletedEdits[0].end;
        }
    } else if (
        mIndex == transcript.value.monologues.length - 1 &&
        eIndex == transcript.value.monologues[mIndex].elements.length - 1
    ) {
        // find any deleted elements with start times after the current end
        edits.value.forEach((edit) => {
            if (edit.type == "delete" && edit.start > currentElement.end) {
                foundDeletedEdits.push(edit);
            }
        });

        if (foundDeletedEdits.length > 0) {
            // sort the deleted elements by start time, earliest first
            foundDeletedEdits.sort((a, b) => {
                return a.start - b.start;
            });

            start = foundDeletedEdits[0].start;
            end = foundDeletedEdits[0].end;
        }
    } else {
        const [thresholdStart, thresholdEnd] = getThresholdStartEnd(
            mIndex,
            eIndex,
        );
        //console.debug("THRESHOLD START: " + thresholdStart)
        //console.debug("THRESHOLD END: " + thresholdEnd)

        // find any deleted elements with start times between the threshold start and end
        edits.value.forEach((edit) => {
            if (
                edit.type == "delete" &&
                edit.start > thresholdStart &&
                edit.start < thresholdEnd
            ) {
                //console.debug("FOUND DELETED ELEMENT")
                foundDeletedEdits.push(edit);
            }
        });

        if (foundDeletedEdits.length > 0) {
            // sort the deleted elements by start time, earliest first
            foundDeletedEdits.sort((a, b) => {
                return a.start - b.start;
            });

            start = foundDeletedEdits[0].start;
            end = foundDeletedEdits[0].end;
        }
    }

    return [start, end];
}

function getThresholdStartEnd(mIndex, eIndex) {
    var start = 0;
    var end = 0;

    if (eIndex > 0) {
        start = transcript.value.monologues[mIndex].elements[eIndex - 1].end;
    } else {
        start = transcript.value.monologues[mIndex].elements[eIndex].start;
    }

    if (
        mIndex == transcript.value.monologues.length - 1 &&
        eIndex == transcript.value.monologues[mIndex].elements.length - 1
    ) {
        end = transcript.value.monologues[mIndex].elements[eIndex].end;
    } else if (
        eIndex ==
        transcript.value.monologues[mIndex].elements.length - 1
    ) {
        end = transcript.value.monologues[mIndex + 1].elements[0].start;
    } else {
        end = getNextWordStart(mIndex, eIndex);
    }

    return [start, end];
}

function getNextWordStart(mIndex, eIndex) {
    var start = transcript.value.monologues[mIndex].elements[eIndex].start;

    for (
        var i = eIndex;
        i < transcript.value.monologues[mIndex].elements.length;
        i++
    ) {
        if (transcript.value.monologues[mIndex].elements[i].type == "text") {
            start = transcript.value.monologues[mIndex].elements[i].start;
            break;
        }
    }

    return start;
}

function getPriorWordStart(mIndex, eIndex) {
    var start = transcript.value.monologues[mIndex].elements[eIndex].start;

    for (var i = eIndex; i > 0; i--) {
        if (transcript.value.monologues[mIndex].elements[i].type == "text") {
            start = transcript.value.monologues[mIndex].elements[i].start;
            break;
        }
    }

    return start;
}

function getElementType(string) {
    if (puncts.includes(string)) {
        return "punct";
    } else {
        return "text";
    }
}

function compressEdits() {
    const compressedEdits = [];
    var lastEdit = null;

    edits.value.forEach((edit) => {
        if (
            lastEdit &&
            lastEdit.saveState === "unsaved" &&
            lastEdit.monologueIndex == edit.monologueIndex &&
            lastEdit.elementIndex == edit.elementIndex &&
            lastEdit.type == "update"
        ) {
            compressedEdits.pop();
        }

        compressedEdits.push(edit);
        lastEdit = edit;
    });

    edits.value = compressedEdits;
}

function triggerSaveEdits() {
    // Cancel the previous saveEdits call if it exists
    if (saveEditsTimeout) {
        clearTimeout(saveEditsTimeout);
    }

    // Call saveEdits after a delay of 1 second
    saveEditsTimeout = setTimeout(() => {
        if (saveState.value === "saving") {
            triggerSaveEdits();
        } else {
            saveEdits();
        }
    }, 1500);
}

function saveEdits() {
    console.debug("SAVING EDITS");
    console.debug(edits.value);
    saveEditsTimeout = null;

    if (edits.value.length > 0) {
        saveState.value = "saving";
        mainStore.transcriptSavingSavedState = 'Saving...'

        var editsToSave = [];
        edits.value.forEach((edit) => {
            if (edit.saveState === "unsaved") {
                edit.saveState = "saving";
                editsToSave.push(edit);
            }
        });

        const jsonEditsToSave = JSON.stringify(editsToSave);

        fetch(
            `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/edits`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth_token}`,
                },
                body: jsonEditsToSave,
            },
        )
            .then((response) => response.json())
            .then((data) => {
                //console.debug(data)

                edits.value.forEach((edit) => {
                    if (edit.saveState === "saving") {
                        edit.saveState = "saved";
                    }
                });

                saveState.value = "saved";
                mainStore.transcriptSavingSavedState = 'Saved'
            });
    }
}

function getNextCaretPositionElementIndex(elements, currentCaretPos) {
    var currentIndex = 0;
    var currentOffset = 0;

    if (!puncts.includes(elements[0])) {
        currentIndex = elements.length - 1;
    } else {
        for (let i = 0; i < elements.length; i++) {
            currentOffset += elements[i].length;
            if (currentOffset >= currentCaretPos) {
                currentIndex = i;
                break;
            }
        }
    }

    return currentIndex;
}



function splitElementValue(elementValue) {
    return elementValue.split(/([ .?!])/).filter(Boolean);
}

var observer = null;

const config = { childList: true, subtree: true, characterData: true };
var lastObservedEditorNode = null;
const turnObserverOn = (editor) => {
    turnObserverOff();
    if (editor) {
        observer.observe(editor, config);
        lastObservedEditorNode = editor;
    }
};

const turnObserverOff = () => {
    observer.disconnect();
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

function getCaretPosition(editableDiv) {
    let caretPos = 0;
    let sel;
    let range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            if (range.commonAncestorContainer.parentNode == editableDiv) {
                caretPos = range.endOffset;
            }
        }
    } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range.parentElement() == editableDiv) {
            const tempEl = document.createElement("span");
            editableDiv.insertBefore(tempEl, editableDiv.firstChild);
            const tempRange = range.duplicate();
            tempRange.moveToElementText(tempEl);
            tempRange.setEndPoint("EndToEnd", range);
            caretPos = tempRange.text.length;
        }
    }
    return caretPos;
}

function setCaretPosition(editableDiv, caretPos) {
    //console.debug(editableDiv, caretPos)

    if (editableDiv) {
        let range;
        if (document.selection) {
            range = editableDiv.createTextRange();
            range.move("character", caretPos);
            range.select();
        } else {
            const sel = window.getSelection();
            range = document.createRange();
            range.setStart(editableDiv.childNodes[0], caretPos);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            updateHighlightedWord(lastAudioTime);
        }
    } else {
        //console.warn("Couldn't set caret position, editableDiv is null")
    }
}

const determineIfSpeakersNeedToBeSet = () => {
    var speakersAreSet = true;
    transcript.value.speakers.forEach((speaker) => {
        if (speaker.set_name === null || speaker.set_role === null) {
            speakersAreSet = false;
        }
    });
    if (!speakersAreSet) {
        speakersModalVisible.value = true;
    }
};

// pre-fetch client configs and media info
const [{ data: clientConfigsResponse }, { data: mediaResponse }] =
    await Promise.all([
        useFetch(
            `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/user/client-media-editor/configs`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth_token}`,
                },
            },
        ),
        useFetch(
            `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth_token}`,
                },
            },
        ),
    ]);
clientConfigs.value = clientConfigsResponse.value;
audioUrl.value = mediaResponse.value.file_url;
fileName.value = mediaResponse.value.name;
useHead({
    title: `${fileName.value} | ${clientConfigs.value.page_title}`,
    link: [
        {
            key: "favicon",
            rel: "icon",
            type: "image/png",
            href: `${clientConfigs.value.favicon_url}`,
        },
    ],
});

const speakersNames = ref([]);
const getLatestSpeakersName = (data) => {
    transcript.value = data;
    mainStore.currentMediaTranscript = data
    getAllSpeakersNameBySpeakersId();
};
const getAllSpeakersNameBySpeakersId = () => {
    speakersNames.value = [];
    transcript.value.speakers.forEach((obj) => {
        return speakersNames.value.push({
            name: obj.set_name ? obj.set_name : obj.default_name,
            role: obj.set_role,
            id: obj.id,
        });
    });
};
const mergeTranscript = async (data) => {
    mainStore.transcriptSavingSavedState = "Saving..."
    if (data) {
        await fetch(
            `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript/speakers/merge`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
                },
                body: JSON.stringify(data),
            },
        )
            .then((response) => response.json())
            .then((data) => {
                mainStore.transcriptSavingSavedState = "Saved"
                if (!data) {
                    alert(
                        "There was an error saving the speakers. Please try again.",
                    );
                }
            });
    }
};
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
        var caretLocation = getCaretPositions(clickedElement);
        var firstSpanElement = clickedElement.querySelector("span");
        var mIndex = parseInt(firstSpanElement.getAttribute("data-mindex"));
        if (caretLocation == 0 && mIndex != 0) {
            event.preventDefault();
            // updateMediaTranscriptLoading.value = true
            var new_monlouge = [];
            for (var i = 0; i < transcript.value.monologues.length; i++) {
                if (i == mIndex - 1) {
                    const new_element = transcript.value.monologues[
                        i
                    ].elements.concat(
                        transcript.value.monologues[i + 1].elements,
                    );
                    new_monlouge.push({
                        speaker_id: transcript.value.monologues[i].speaker_id,
                        elements: new_element,
                    });
                } else if (i == mIndex) {
                } else {
                    new_monlouge.push(transcript.value.monologues[i]);
                }
            }
            transcript.value.monologues = new_monlouge;
            var data = { monologue_index: mIndex };
            var previousDiv =
                clickedElement.parentElement.previousSibling.childNodes[1];
            var lastDiv = previousDiv.querySelector(
                ".transcript-element:last-child",
            );
            setCursorPosition(lastDiv, lastDiv.innerText.length);
            mergeTranscript(data);
        }
    }
}

onMounted(() => {
    document.addEventListener("wheel", (event) => {
    if (playbarModel.value.playbackState == 'playing') {
        isScroll.value = false
        checkHighlightElementPosition()
    }
  });
    document.addEventListener("selectionchange", function () {
        var selectedText = window.getSelection().toString();
        if (selectedText.length > 0) {
            showSpeakerChangeButtonSelected();
        }
    });
    document.addEventListener("click", function (event) {
        var selectedText = window.getSelection().toString();
        //check if dropdown-open class is present
        //check event.target.parentElement.parentElement have class dropdown-open
        try {
            if (event.target.parentElement.parentElement) {
                if (
                    event.target.parentElement.parentElement.classList.contains(
                        "dropdown-open",
                    )
                ) {
                }
            }
        } catch {}
        try {
            var changeSpeakerButtononText = document.getElementById(
                "changeSpeakerButtononText",
            );

            if (
                changeSpeakerButtononText.contains(event.target) ||
                event.target.classList.contains("speaker-select") ||
                event.target.parentElement.parentElement.classList.contains(
                    "speaker-select",
                ) ||
                event.target.parentElement.classList.contains("speaker-select")
            ) {
            } else {
                var isOpenSpeakerDropdown = document.querySelectorAll(
                    ".isOpenSpeakerDropdown",
                );
                isOpenSpeakerDropdown.forEach((isOpenSpeakerDropdown) => {
                    isOpenSpeakerDropdown.classList.remove("dropdown-open");
                    isOpenSpeakerDropdown.classList.add("dropdown-shut");
                });
            }
        } catch {
            var isOpenSpeakerDropdown = document.querySelectorAll(
                ".isOpenSpeakerDropdown",
            );
            isOpenSpeakerDropdown.forEach((isOpenSpeakerDropdown) => {
                isOpenSpeakerDropdown.classList.remove("dropdown-open");
                isOpenSpeakerDropdown.classList.add("dropdown-shut");
            });
        }

        if (selectedText.length > 0) {
        } else {
            var changeSpeakerButtononText = document.getElementById(
                "changeSpeakerButtononText",
            );
            if (changeSpeakerButtononText) {
                changeSpeakerButtononText.classList.add("hidden");
            }
        }
    });
    document.addEventListener("keydown", function (event) {
        //detect key is backspace
        if (event.keyCode == 8 || event.key == "Backspace") {
            var clickedElement = event.target;
            if (clickedElement.classList.contains("transcript-sentences")) {
              var changeSpeakerButtononText = document.getElementById('changeSpeakerButtononText');
              var transcriptComponent = document.getElementById('transcript-component');

              if (changeSpeakerButtononText && transcriptComponent) {
                  transcriptComponent.insertBefore(changeSpeakerButtononText, transcriptComponent.firstChild);
              }
              if (!changeSpeakerButtononText.classList.contains("hidden")) {
                    changeSpeakerButtononText.classList.add("hidden");
                }
                var caretLocation = getCaretPositions(clickedElement);
                var firstSpanElement = clickedElement.querySelector("span");
                var mIndex = parseInt(
                    firstSpanElement.getAttribute("data-mindex"),
                );
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

    // closeSpkBtnWhenClickOnAnywhere()
    // make an API call to get the transcript
    fetch(
        `${runtimeConfig.public.fathomWebApiURL}/api/podium/clients/v1/media/${route.params.id}/transcript`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${auth_token}`,
            },
        },
    )
        .then((response) => response.json())
        .then((data) => {
            //console.debug(data)
            mainStore.currentMediaTranscript = data
            transcript.value = data;
            loadingTranscript.value = false;
            determineIfSpeakersNeedToBeSet();
            getAllSpeakersNameBySpeakersId();
        });

    observer = new MutationObserver((mutations) => {
        //console.debug("MUTATIONS")
        //console.debug(mutations)

        // we are only going to process the last mutation for each element
        const lastElementMutations = {};

        mutations.forEach((mutation) => {
            if (mutation.type === "characterData") {
                //console.debug('found characterData')
                const elementSpan = mutation.target.parentElement;
                const mIndex = parseInt(
                    elementSpan.getAttribute("data-mindex"),
                );
                const eIndex = parseInt(
                    elementSpan.getAttribute("data-eindex"),
                );
                //console.debug(mIndex + '-' + eIndex)
                lastElementMutations[mIndex + "-" + eIndex] = mutation;
            }

            if (mutation.type === "childList") {
                //console.debug('found childList')
                var elementSpan;
                if (mutation.removedNodes.length > 0) {
                    elementSpan = mutation.removedNodes[0];
                } else if (mutation.addedNodes.length > 0) {
                    elementSpan = mutation.addedNodes[0];
                }

                const mIndex = parseInt(
                    elementSpan.getAttribute("data-mindex"),
                );
                const eIndex = parseInt(
                    elementSpan.getAttribute("data-eindex"),
                );
                //console.debug(mIndex + '-' + eIndex)
                lastElementMutations[mIndex + "-" + eIndex] = mutation;
            }
        });

        //console.debug(lastElementMutations)

        // used to shift indexes when we delete elements
        var deletedCount = 0;
        Object.values(lastElementMutations).forEach((mutation) => {
            if (mutation.type === "characterData") {
                //console.debug('running characterData')
                const elementSpan = mutation.target.parentElement;
                const mIndex = parseInt(
                    elementSpan.getAttribute("data-mindex"),
                );
                const eIndex = parseInt(
                    elementSpan.getAttribute("data-eindex"),
                );

                //console.debug(elementSpan)
                //console.debug(mIndex)
                //console.debug(eIndex)
                storeElementEdit(mIndex, eIndex - deletedCount, elementSpan);
            }

            if (
                mutation.type === "childList" &&
                mutation.addedNodes.length == 0
            ) {
                //console.debug('running childList')
                const elementSpan = mutation.removedNodes[0];
                const mIndex = parseInt(
                    elementSpan.getAttribute("data-mindex"),
                );
                const eIndex = parseInt(
                    elementSpan.getAttribute("data-eindex"),
                );

                //console.debug(elementSpan)
                //console.debug(mIndex)
                //console.debug(eIndex)
                storeElementEdit(
                    mIndex,
                    eIndex - deletedCount,
                    elementSpan,
                    true,
                );
                deletedCount++;
            }
        });
    });
});



onUnmounted(() => {
    turnObserverOff();
});

const highlightedWord = {
    monologueIndex: 0,
    elementIndex: 0,
};

const transcript = ref({});
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
    z-index: 10;
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
    z-index: -1;
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
    @apply pt-5 px-0;

    // &__wrapper {
    //   @apply w-full;
    // }

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

 .fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
}
</style>
