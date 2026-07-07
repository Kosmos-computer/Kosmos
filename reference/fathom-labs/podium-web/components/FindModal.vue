<template>
    <div v-if="loadershow" class="m-auto fixed left-0 top-0 bottom-0 right-0 m-auto" 
    style=" display: flex; justify-content: center !important; align-items: center !important; z-index: 9999; background-color: rgba(0, 0, 0, 0.25);">
    <SvgLoadingMd />

      </div>
    <div v-if="!showFindAndReplaceModal" class="modalContainer " :class="{ 'hidden': isClicked }">
        <div class="innerWrap">
            <form class="new-project-form" @submit.prevent="rightClick">
                <div class="flex flex-row mr-0 items-center pl-0 pr-0 h-auto">
                    <div class="new-project-form__row flex-1 mr-3" style="padding: 0;">
                        <div class="new-project-form__input-row w-full m-0" style="margin-top: 0 !important;">
                            <div class="new-project-form__input-wrapper items-center">
                                <input type="text" name="nameText" id="nameText" autocomplete="nameText"
                                    class="new-project-form__input pr-1" v-model="findTexts" @input="findText()" @keypress="handleKeys($event)"
                                    :placeholder="t('Find')" />
                                <span class="nums text-gray-500 text-sm pr-3"> <span>{{ startingCount }}</span> {{ t('of') }} <span>{{
                                    totalCount }}</span> </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-row mr-3 items-center w-fit bg-white pl-3 pr-3 h-9 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap"
                        @click="leftClick">
                        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M7.53033 0.21967C7.82322 0.512563 7.82322 0.987437 7.53033 1.28033L2.06066 6.75L7.53033 12.2197C7.82322 12.5126 7.82322 12.9874 7.53033 13.2803C7.23744 13.5732 6.76256 13.5732 6.46967 13.2803L0.46967 7.28033C0.176777 6.98744 0.176777 6.51256 0.46967 6.21967L6.46967 0.21967C6.76256 -0.0732233 7.23744 -0.0732233 7.53033 0.21967Z"
                                fill="#7D828C" />
                        </svg>
                    </div>

                    <div class="flex flex-row mr-3 items-center w-fit bg-white pl-3 pr-3 h-9 cursor-pointer hover:bg-gray-100 text-gray-500 border border-gray-300 rounded-md whitespace-nowrap"
                        @click="rightClick">
                        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M0.46967 0.21967C0.176777 0.512563 0.176777 0.987437 0.46967 1.28033L5.93934 6.75L0.46967 12.2197C0.176777 12.5126 0.176777 12.9874 0.46967 13.2803C0.762563 13.5732 1.23744 13.5732 1.53033 13.2803L7.53033 7.28033C7.82322 6.98744 7.82322 6.51256 7.53033 6.21967L1.53033 0.21967C1.23744 -0.0732233 0.762563 -0.0732233 0.46967 0.21967Z"
                                fill="#7D828C" />
                        </svg>
                    </div>

                    <div @click="handleClose"
                        class="flex flex-row mr-0 items-center w-fit bg-white pl-0 pr-0 h-9 cursor-pointer text-gray-500 whitespace-nowrap">
                        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M2.7955 1.2045C2.35616 0.765165 1.64384 0.765165 1.2045 1.2045C0.765165 1.64384 0.765165 2.35616 1.2045 2.7955L7.15901 8.75L1.2045 14.7045C0.765165 15.1438 0.765165 15.8562 1.20451 16.2955C1.64384 16.7348 2.35616 16.7348 2.7955 16.2955L8.75 10.341L14.7045 16.2955C15.1438 16.7348 15.8562 16.7348 16.2955 16.2955C16.7348 15.8562 16.7348 15.1438 16.2955 14.7045L10.341 8.75L16.2955 2.7955C16.7348 2.35616 16.7348 1.64384 16.2955 1.20451C15.8562 0.765165 15.1438 0.765165 14.7045 1.20451L8.75 7.15901L2.7955 1.2045Z"
                                fill="#7D828C" />
                        </svg>
                    </div>
                </div>



                <div class="new-project-form__actions">
                    <div>
                        <input id="match_case" name="match_case" type="checkbox" v-model="exactMatch" @click="checkExactMatch"
                            class="focus:ring-indigo-500 h-4 w-4 mr-1 text-indigo-600 border-gray-300 rounded" />
                        <span class="text-sm leading-6 text-gray-900 pl-1">{{ t('Match case') }}</span>
                        <span class="text-sm leading-6 text-blue-700 pl-1 ml-3 action font-medium"
                            style="text-decoration: none;" @click="openFindAndReplaceModel">{{ t('Find and replace') }}</span>
                    </div>

                </div>
            </form>
        </div>
    </div>
    <div v-if="showFindAndReplaceModal" class="modalContainer ">
        <div class="innerWrap">
            <form class="new-project-form" @submit.prevent="rightClick">
   
                <h2 class="new-project-form__title pt-1 relative">{{ t('Find and replace') }}
                    <div @click="handleClose"
                        class="pl-0 pr-0 h-9 cursor-pointer text-gray-500 whitespace-nowrap absolute right-0 top-0">
                        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M2.7955 1.2045C2.35616 0.765165 1.64384 0.765165 1.2045 1.2045C0.765165 1.64384 0.765165 2.35616 1.2045 2.7955L7.15901 8.75L1.2045 14.7045C0.765165 15.1438 0.765165 15.8562 1.20451 16.2955C1.64384 16.7348 2.35616 16.7348 2.7955 16.2955L8.75 10.341L14.7045 16.2955C15.1438 16.7348 15.8562 16.7348 16.2955 16.2955C16.7348 15.8562 16.7348 15.1438 16.2955 14.7045L10.341 8.75L16.2955 2.7955C16.7348 2.35616 16.7348 1.64384 16.2955 1.20451C15.8562 0.765165 15.1438 0.765165 14.7045 1.20451L8.75 7.15901L2.7955 1.2045Z"
                                fill="#7D828C" />
                        </svg>
                    </div>
                </h2>

                <div class="new-project-form__row mb-4" style="padding: 0;">
                    <label for="nameText" class="new-project-form__label">{{ t('Find') }}</label>
                    <div class="new-project-form__input-row w-full">
                        <div class="new-project-form__input-wrapper items-center">
                            <input type="text" name="find" id="find" autocomplete="find" class="new-project-form__input"
                                :placeholder="t('Find')" @input="findText()" @keypress="handleKeys($event)" v-model="findTexts" />
                            <span class="nums text-gray-500 text-sm pr-3"> <span>{{ startingCount }}</span> {{ t('of') }}
                                <span>{{ totalCount }}</span> </span>
                        </div>
                    </div>
                </div>

                <div class="new-project-form__row mb-4" style="padding: 0;">
                    <label for="nameText" class="new-project-form__label">{{ t('Replace with') }}</label>
                    <div class="new-project-form__input-row w-full">
                        <div class="new-project-form__input-wrapper">
                            <input type="text" name="replaceWith" id="replaceWith" autocomplete="replaceWith"
                                class="new-project-form__input" :placeholder="t('Replace with')" v-model="replaceText" />
                        </div>
                    </div>
                </div>
                <div>
                    <input id="match_case" name="match_case" type="checkbox"
                        class="focus:ring-indigo-500 h-4 w-4 mr-1 text-indigo-600 border-gray-300 rounded"
                        v-model="exactMatch" @click="checkExactMatch()" />
                    <span class="text-sm leading-6 text-gray-900 pl-1">{{ t('Match case') }}</span>
                </div>
                <div class="new-project-form__actions">
                    <button type="button" class="btn btn-submit" @click="replaceSelectTextFunction">{{ t('Replace') }}</button>
                    <button type="button" class="btn btn-submit" @click="replaceAllTextFunction">{{ t('Replace All') }}</button>
                    <button type="button" class="btn btn-cancel" @click="leftClick" ref="cancelButtonRef">{{ t('Previous') }}</button>
                    <button type="button" class="btn btn-cancel" @click="rightClick" ref="cancelButtonRef">{{ t('Next') }}</button>

                </div>
            </form>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const props = defineProps<{
    transcriptContent: string
}>()
import { data } from "autoprefixer";
import { useMainStore } from "~/store/main";
const { storeElementEdit,playbarModel,splitElementValue, determineIfSpeakersNeedToBeSet,updateHighlightedWord,determineJumpToSeconds,transcript,transcriptSpeakersModalVisible,turnObserverOn,turnObserverOff,saveState,compressEdits,triggerSaveEdits,saveEdits} = useReplaceText()
const mainStore = useMainStore()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const isClicked = ref(false)
const openFindAndReplaceModal = ref(false)
const findTexts = ref('')
const totalCount = ref(0)
const startingCount = ref(0)
const showFindAndReplaceModal = ref(false)
const exactMatch = ref(false)
const combinedText = ref('')
const indices = ref([])
const mIndex = ref('')
const eIndex = ref('')
const elementType = ref('')
const replaceText = ref('')
const audioUrl = ref("")
const loadershow = ref(false)
const emit = defineEmits(['close', 'submit','hideTranscript','totalCount'])
const openFindAndReplaceModel = () => {
    showFindAndReplaceModal.value = true
    isClicked.value = true
    openFindAndReplaceModal.value = true
}
const handleClose = () => {
    let spans = document.querySelectorAll('.transcript-element');
    //get attribute of all the span elements
    spans.forEach((span) => {
        span.classList.remove('focus')
        span.classList.remove('focusTotext')
    });
    findTexts.value = null
    startingCount.value = 0
    totalCount.value = 0
    emit('close')
}
const countWordsWithSpacesAndPunctuation = () => {
    let text = findTexts.value.replace(/[^\w\s]+/g, ' ');
    // Remove leading and trailing spaces
    text = text.trim();
    // Split the text into words using spaces or any special symbols as separators
    var words = text.split(/\s+/);
    // Count the words and add the count of split characters
    var totalWords = words.length;
    // Add the count of split characters
    totalWords += text.length - text.replace(/\s+/g, '').length;
    return totalWords;
}
const findWordAtIndex = (array, index,is_focus=false,replaceText = null) => {
    let cumulativeIndex = 0;
    let totalWords = countWordsWithSpacesAndPunctuation(findTexts.value);
    for (let i = 0; i < array.length; i++) {
        let item = array[i];
        let wordLength = item.word.length;
        if (index >= cumulativeIndex && index < cumulativeIndex + wordLength) {
          
            if (is_focus == true){
                item.span.classList.add('focusTotext')
                mIndex.value=item.span.getAttribute('data-mindex')
                eIndex.value=item.span.getAttribute('data-eindex')
                elementType.value=item.span.getAttribute('data-type')
                    item.span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
            else{
            item.span.classList.add('focus');
            }
            var parentDiv = item.span.parentElement;
            for (let j = 1; j <= totalWords-1; j++) {
                if (i + j < array.length) {
                    if (is_focus == true){
                        array[i + j].span.classList.add('focusTotext')
                    }
                    else{
                        array[i + j].span.classList.add('focus');
                    }
                }
            }
            var nextSpan = item.span.nextElementSibling;
            if(nextSpan){
                mIndex.value=nextSpan.getAttribute('data-mindex')
                eIndex.value=nextSpan.getAttribute('data-eindex')
                elementType.value=nextSpan.getAttribute('data-type')
            }
           if (replaceText != null) {
            //get next span tag
            for (let j = 1; j <= totalWords-1; j++) {
              storeElementEdit(parseInt(mIndex.value), parseInt(eIndex.value), array[i + j].span, true)
            }
          }
            return item.span;
        }
        cumulativeIndex += wordLength;
    }
    return null;
}

function highlightSentence(sentence: any) {
    let spans = document.querySelectorAll('.transcript-element');
    // Get all span elements with class transcript-element
    const combinedTextWithIndex = [];
    // Combine the text content of all spans into a single string without adding extra spaces
    spans.forEach(span => {
        //remove all the highlighted class
        // span.style.backgroundColor = 'white';
        span.classList.remove('focus')
        combinedTextWithIndex.push({ word: span.textContent, span });
    });
    combinedText.value = combinedTextWithIndex.map(item => item.word).join('')
    var combinedTextWrap = combinedText.value.toLowerCase();
    // Join the words to form the combined text
    if (!exactMatch.value) {
        
        
        let index = combinedTextWrap.indexOf(sentence);
        while (index !== -1) {
            indices.value.push(index);
            index = combinedTextWrap.indexOf(sentence, index + 1);
        }
    }
    else {      
        const regex = new RegExp('\\b' + sentence + '\\b', 'g');
        let match;
        while ((match = regex.exec(combinedText.value)) !== null) {
        indices.value.push(match.index);
        }
    }
    // Find all starting indices of the sentence in the combined text
    var totalWords = countWordsWithSpacesAndPunctuation(sentence);
    totalCount.value = indices.value.length;
    if (indices.value.length > 0) {
        totalCount.value = indices.value.length;
        indices.value.forEach(startIndex => {
            findWordAtIndex(combinedTextWithIndex, startIndex);
        });
        return true;
    } else {
        startingCount.value = 0
    }
    return false;
}

const replaceSelectTextFunction = () => {
    if (totalCount.value == 0)return
    let selectedIndices = indices.value[startingCount.value -1];
    let spans = document.querySelectorAll('.transcript-element');
    let combinedTextWithIndex = [];
    spans.forEach(span => {
        combinedTextWithIndex.push({ word: span.textContent, span });
    });
    indices.value.forEach(startIndex => {
        findWordAtIndex(combinedTextWithIndex, startIndex);
        });
    var selectedspantag = findWordAtIndex(combinedTextWithIndex, selectedIndices,true,replaceText.value);
    turnObserverOn(selectedspantag);
    selectedspantag.firstChild.textContent = replaceText.value;
    
    findText()
}

const splitDataKey = (span) =>{
    var dataKey = span.getAttribute('data-key');
    var dataValueSplit = dataKey.split(span.innerText);
    return span.innerText+dataValueSplit[1]
}

const findWithDataKey = (span,matchspan) => {
    var dataKey = span.getAttribute('data-key');
    var dataValueSplit = dataKey.split(span.innerText);
    if (matchspan == span.innerText+dataValueSplit[1]){
        return true
    }
    else{
        return false
    
    }
}

const replaceCounter = ref(0)
const intervalId = ref(null)
const replaceAllTextFunction = () => {
    replaceCounter.value = 0
    let spans = document.querySelectorAll('.transcript-element');
    let totalWords = countWordsWithSpacesAndPunctuation(findTexts.value);
    let combinedTextWithIndex = [];
    spans.forEach(span => {
        combinedTextWithIndex.push({ word: span.textContent, span });
    });
    let itrationCheck = 0
    let spanNeedToReplce = []
    indices.value.forEach(startIndex => {
        spanNeedToReplce.push(findWordAtIndex(combinedTextWithIndex, startIndex));
        });

    function checkAndExecuteFunction() {
        loadershow.value = true
        if (spanNeedToReplce.length > 0) {
            loadershow.value=true
            let spans = document.querySelectorAll('.transcript-element');
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (findWithDataKey(span, splitDataKey(spanNeedToReplce[0]))) {
                    if (replaceText.value != null) {
                        let totalWords = countWordsWithSpacesAndPunctuation(findTexts.value);
                        var nextSpan = span.nextElementSibling;
                        for (let j = 0; j < totalWords-1; j++) {
                            storeElementEdit(parseInt(nextSpan.getAttribute('data-mindex')), parseInt(nextSpan.getAttribute('data-eindex')), span, true)
                        }
                        span.firstChild.textContent = replaceText.value;
                        storeElementEdit(parseInt(span.getAttribute('data-mindex')), parseInt(span.getAttribute('data-eindex')), span)  
                        
                        //remove 0 index from array of spanNeedToReplce
                        spanNeedToReplce.shift()
                        break;
                    }
                }
            }
        }
        else{
            loadershow.value=false
            
        clearInterval(intervalId.value);
        findText()
        }
        }
    if (spanNeedToReplce.length > 0) {
        intervalId.value = setInterval(checkAndExecuteFunction, 1800);
    }
    }

const checkExactMatch = () => {
    exactMatch.value = !exactMatch.value
    findText()
}


const handleKeys = (event) => {
    // if key is enter, prevent default
    if (event && (event.key === 'Enter' || event.keyCode === 13)) {
      event.preventDefault()
      rightClick()
    }
}
const findText = () => {
    let spans = document.querySelectorAll('.transcript-element');
    indices.value = [];
    if (findTexts.value.length > 0) {
        startingCount.value = 1
        if (!exactMatch.value) {
            highlightSentence(findTexts.value.toLocaleLowerCase())
            focusTextSelected()
        } else {
            highlightSentence(findTexts.value)
            focusTextSelected()
        }
    }
    else {
        startingCount.value = 0
        totalCount.value = 0
        spans.forEach(span => {
            //remove all the highlighted class
            span.classList.remove('focus')
            span.classList.remove('focusTotext')
        });
    }

}
const focusTextSelected = () => {
    //console first indices value from array
    //get indices value from array
    let selectedIndices = indices.value[startingCount.value - 1];
    let spans = document.querySelectorAll('.transcript-element');
    let combinedTextWithIndex = [];
    spans.forEach(span => {
        span.classList.remove('focusTotext')
        combinedTextWithIndex.push({ word: span.textContent, span });
    });
    indices.value.forEach(startIndex => {
        findWordAtIndex(combinedTextWithIndex, startIndex);
    });
    findWordAtIndex(combinedTextWithIndex, selectedIndices, true);
}
const rightClick = () => {
    if (!findTexts.value) return
    if (findTexts.value.length > 0 && startingCount.value < totalCount.value) {
        startingCount.value++
        focusTextSelected()
    }
}
const leftClick = () => {
    if (!findTexts.value) return
    if (findTexts.value.length > 0 && startingCount.value > 1) {
        startingCount.value--
        focusTextSelected()
    }
}
onMounted(() => {
    try{
        transcript.value = mainStore.currentMediaTranscript
        audioUrl.value = mainStore.currentMedia.file_url
    }catch{
        transcript.value = props.transcriptContent
    }
    determineIfSpeakersNeedToBeSet()
    isClicked.value = false
    exactMatch.value = false
});
const highlightedWord = {
    "monologueIndex": 0,
    "elementIndex": 0
}
</script>
<style lang="scss" scoped>
.new-project-form {
    &__title {
        @apply text-lg leading-6 font-medium mb-6 text-gray-900;

    }

    &__label {
        @apply text-sm leading-5 font-medium mb-1 text-gray-700;

    }

    &__row {
        @apply col-span-full pb-1;

        &:not(.last) {
            @apply pb-6;
        }
    }

    &__input {
        @apply block flex-1 border-0 bg-transparent py-[0.4rem] pl-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 text-sm leading-6 rounded-md;

        &-before {
            @apply bg-gray-50 my-[1px] ml-[1px] py-[1px] pl-[10px] rounded-tl-md rounded-bl-md border-r-[1px] border-r-gray-300 text-gray-400 flex select-none items-center pl-3 sm:text-base pr-2;
        }

        &-row {
            @apply mt-2;
        }

        &-wrapper {
            @apply flex rounded-md ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600;

            &:focus-within {
                span {
                    @apply my-[2px] ml-[2px] py-[0px] pl-[11px]
                }
            }
        }
    }

    &__textarea {
        @apply block w-full rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 py-1.5 text-sm leading-6;
    }

    &__actions {
        @apply mt-4 sm:mt-6 sm:flex sm:gap-x-3;
    }
}

.project-combobox {
    @apply inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm leading-6 font-normal text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
}

.btn {
    @apply mt-3 inline-flex w-full justify-center rounded-md px-3 py-2.5 text-sm font-medium shadow-sm ring-1 ring-inset sm:col-start-1 sm:mt-0;

    &-submit {
        @apply bg-indigo-700 text-white hover:bg-indigo-600 ring-indigo-700 hover:bg-indigo-600 hover:ring-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:col-start-2;
    }

    &-cancel {
        @apply bg-white text-gray-900 ring-gray-300 hover:bg-gray-50;
    }

    &-change {
        @apply w-auto bg-white text-gray-900 ring-gray-300 hover:bg-gray-50;
    }
}

.new-project-form__input-wrapper:focus-within span.nums,
.new-project-form__input-wrapper:focus-within span.nums span {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    margin-left: 0 !important;
    padding-top: 0px !important;
    padding-bottom: 0px !important;
    padding-left: 0 !important;
}


.modalContainer {
    padding: 20px;
    background: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    position: fixed;
    right: 40px;
    top: 80px;
    z-index: 999;
    width: 34rem;
}
</style>