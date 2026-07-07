import { elements } from "chart.js";
import { nextTick } from "vue";
import { useMainStore } from "~/store/main";
import emitter from "~/plugins/eventBus";
export default function () {
  const startEindex = ref(0);
  const endEindex = ref(0);
  const currentSpeakersMindex = ref("");
  const transcriptSpeakersModalVisible = ref(false);
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
  const saveState = ref("idle");
  const edits = ref([]);
  var lastJumpToSeconds = null;
  var lastHighlightedTranscriptElement = null;
  const lastHighlightedWordElement = ref(null);
  const jumpToSeconds = ref(0);
  var lastAudioTime = 0;
  const highlightingEnabled = ref(true);
  const playbarModel = ref(null);
  const runtimeConfig = useRuntimeConfig();
  const route = useRoute();
  const mainStore = useMainStore();
  var observer = null;
  var saveEditsTimeout = null;
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
  const showSpeakerChangeButtonSelected = () => {
    var addClipButtononText = document.getElementById(
      "addClipButtononText",
    );
    addClipButtononText.classList.add('hidden')
    // delete changeSpeakerButtononText if it exists
    var changeSpeakerButtononText = document.getElementById(
      "changeSpeakerButtononText",
    );

    var selectedText = window.getSelection();
    //get parent element of selected text
    var parent = selectedText.anchorNode.parentElement;

    if (parent.tagName == "SPAN" && parent.hasAttribute("data-mindex")) {
      if (window.getSelection().toString().length > 0) {
        var range = selectedText.getRangeAt(0);
        //create a button and show it at the rect.top and rect.left
        var tempDiv = document.createElement("div");
        if (
          puncts.includes(range.commonAncestorContainer.data) &&
          range.commonAncestorContainer.nodeName == "#text"
        ) {
          changeSpeakerButtononText.classList.add("hidden");
          return;
        }
        else if (
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
        }else {
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
          var firstChild = tempDiv.firstChild;
          var lastChild = tempDiv.lastChild;
          startEindex.value = firstChild.getAttribute("data-eindex");
          endEindex.value = lastChild.getAttribute("data-eindex");
          currentSpeakersMindex.value = firstChild.getAttribute("data-mindex");
          mainStore.mIndex = currentSpeakersMindex.value
        }
      }
    }
  };
  const stickyClipValue = ref('');
  const handleStaticClip = (value) => {
    stickyClipValue.value = value;
  };
  onMounted(() => {
    emitter.on('staticClip', handleStaticClip);
  });
  onUnmounted(() => {
    emitter.off('staticClip', handleStaticClip);
  });
  const showClipAddButtonSelected = () => {
    var changeSpeakerButtononText = document.getElementById("changeSpeakerButtononText");
    changeSpeakerButtononText.classList.add("hidden");
  
    var addClipButtononText = document.getElementById("addClipButtononText");
    
    var selectedText = window.getSelection();
    var parent = selectedText.anchorNode ? selectedText.anchorNode.parentElement : null;
  
    if (parent && parent.tagName === "SPAN" && parent.hasAttribute("data-mindex")) {
      if (selectedText.toString().length > 0) {
        var range = selectedText.getRangeAt(0);
        
        var relativeDiv = parent.closest('.relative');
        if (relativeDiv) {
          addClipButtononText.classList.remove("hidden");
          relativeDiv.appendChild(addClipButtononText);
          addClipButtononText.classList.remove("hidden");
          if(stickyClipValue.value == 'setFixedClip'){
            addClipButtononText.style.top =  "212px";
            addClipButtononText.style.left = "316px";
            addClipButtononText.style.position = "fixed";
          }else{
            addClipButtononText.style.position = "absolute";
            addClipButtononText.style.top = range.startContainer.parentElement.offsetTop - 58 + "px";
            addClipButtononText.style.left = range.startContainer.parentElement.offsetLeft   + "px";
          }
            
        } else {
          addClipButtononText.classList.add("hidden");
        }
      } else {
        addClipButtononText.classList.add("hidden");
      }
    } else {
      addClipButtononText.classList.add("hidden");
    }
  };

  const isScroll = ref(true)
  const svgScrollDown = ref(false) 
  const svgScrollUp  = ref(false)

  const goToHighlightDown =()=>{
    isScroll.value = true
    scrollToHighlightedWord(lastHighlightedWordElement.value)
  }

  const goToHighlightUp =()=>{
    isScroll.value = true
    scrollToHighlightedWord(lastHighlightedWordElement.value)
  }
  

  const checkHighlightElementPosition = () => {
    const highlightedWordElement = lastHighlightedWordElement.value
    const elementRect = highlightedWordElement.getBoundingClientRect();
    const scrollingBodyElement = document.getElementById("scrollingBody");
    const windowHeight = scrollingBodyElement.clientHeight;
    const scrollTop = scrollingBodyElement.scrollTop;

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

  const scrollToHighlightedWord = (highlightedWordElement) => {
    closeDropdownList();
    const elementRect = highlightedWordElement.getBoundingClientRect();
    const scrollingBodyElement = document.getElementById("scrollingBody");
    if (lastTop === elementRect.top) {
      return;
    } else {
      lastTop = elementRect.top;
    }
    const windowHeight = scrollingBodyElement.clientHeight;

    if (elementRect.top > windowHeight - getScrollBottomThreshold()) {
      const scrollToY =
        scrollingBodyElement.scrollTop +
        elementRect.top -
        getScrollTargetOffset();
      scrollingBodyElement.scrollTo({ top: scrollToY, behavior: "smooth" });
      disableHighlightingUntilScrollComplete();
    }

    if (elementRect.top < getScrollTopThreshold()) {
      const scrollToY =
        elementRect.top +
        scrollingBodyElement.scrollTop -
        getScrollTargetOffset();
      scrollingBodyElement.scrollTo({ top: scrollToY, behavior: "smooth" });
      disableHighlightingUntilScrollComplete();
    }
  
  };

  const scrollingBodyElement = document.getElementById("scrollingBody");
  if(scrollingBodyElement != null){
    scrollingBodyElement.addEventListener('wheel', function(event){
      if (playbarModel.value.playbackState == 'playing') {
        isScroll.value = false
        checkHighlightElementPosition()
      }
    })
  }
 


  const updateHighlightedWord = (audioTime) => {
    if (!highlightingEnabled.value) {
      return;
    }

    // round to nearest 0.001
    audioTime = Math.round(audioTime * 1000) / 1000;

    var allowClosest = false;
    if (Math.abs(audioTime - lastAudioTime) > 5) {
      allowClosest = true;
      isScroll.value = true;
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

    if (playbarModel.value && playbarModel.value.playbackState != "playing") {
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
          highlightedEditWordElement.classList.remove("highlightedEditWord");
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
        if (!newElementToHighlight.classList.contains("highlightedEditWord")) {
          newElementToHighlight.classList.add("highlightedWord");
        }
      } else {
        newElementToHighlight.classList.add("highlightedEditWord");
      }
    
        if(isScroll.value){
          scrollToHighlightedWord(newElementToHighlight);
        }
        highlightedWordElement = newElementToHighlight
    }
        lastHighlightedWordElement.value = highlightedWordElement
    
    if (playbarModel.value.playbackState == 'playing') {
        checkHighlightElementPosition()
    }
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
  const findMonologueIndex = (audioTime, allowClosest = false) => {
    let start = 0;
    let end = transcript.value.monologues.length - 1;
    let closestIndex = -1;
    let closestDifference = Infinity;

    while (start <= end) {
      var mid = Math.floor((start + end) / 2);
      var monologue = transcript.value.monologues[mid];

      // Ensure we've found a monologue with elements
      while (
        (!monologue.elements || monologue.elements.length == 0) &&
        mid < transcript.value.monologues.length - 1
      ) {
        mid++;
        monologue = transcript.value.monologues[mid];
      }

      if (!monologue.elements) {
        return -1;
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
          currentMonologue.elements[currentMonologue.elements.length - 1].end;

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
          currentMonologue.elements[currentMonologue.elements.length - 1].end;

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
  const getScrollTargetOffset = () => {
    if (transcriptSpeakersModalVisible.value) {
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
  const getScrollTopThreshold = () => {
    if (transcriptSpeakersModalVisible.value) {
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

  var lastTop = 0;
  const scrollToTop = () => {
    lastTop = 0;
    window.scrollTo({ top: lastTop, behavior: "smooth" });
  };
  const getScrollBottomThreshold = () => {
    return 130;
  };

  function setCaretPosition(editableDiv, caretPos) {
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
      }
      updateHighlightedWord(lastAudioTime);
    }
  }

  function saveEdits() {
    saveEditsTimeout = null;
    if (edits.value.length > 0) {
      saveState.value = "saving";
      mainStore.transcriptSavingSavedState = "Saving..."

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
            Authorization: `Bearer ${mainStore.getUserPodiumToken()}`,
          },
          body: jsonEditsToSave,
        },
      )
        .then((response) => response.json())
        .then((data) => {
          edits.value.forEach((edit) => {
            if (edit.saveState === "saving") {
              edit.saveState = "saved";
            }
          });
          mainStore.transcriptSavingSavedState = "Saved"
          saveState.value = "saved";
          // lastSaveTime.value = new Date().getTime()
        });
    }
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
    observer = new MutationObserver((mutations) => {
      // we are only going to process the last mutation for each element
      const lastElementMutations = {};
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          const elementSpan = mutation.target.parentElement;
          const mIndex = parseInt(elementSpan.getAttribute("data-mindex"));
          const eIndex = parseInt(elementSpan.getAttribute("data-eindex"));
          lastElementMutations[mIndex + "-" + eIndex] = mutation;
        }
  
        if (mutation.type === "childList") {
          var elementSpan;
          if (mutation.removedNodes.length > 0) {
            elementSpan = mutation.removedNodes[0];
          } else if (mutation.addedNodes.length > 0) {
            elementSpan = mutation.addedNodes[0];
          }
          if (elementSpan) {
            const mIndex = parseInt(elementSpan.getAttribute("data-mindex"));
            const eIndex = parseInt(elementSpan.getAttribute("data-eindex"));
            lastElementMutations[mIndex + "-" + eIndex] = mutation;
          }
        }
      });
      // used to shift indexes when we delete elements
      var deletedCount = 0;
      Object.values(lastElementMutations).forEach((mutation) => {
        if (mutation.type === "characterData") {
          const elementSpan = mutation.target.parentElement;
          const mIndex = parseInt(elementSpan.getAttribute("data-mindex"));
          const eIndex = parseInt(elementSpan.getAttribute("data-eindex"));
          storeElementEdit(mIndex, eIndex - deletedCount, elementSpan);
        }
  
        if (mutation.type === "childList" && mutation.addedNodes.length == 0) {
          const elementSpan = mutation.removedNodes[0];
          const mIndex = parseInt(elementSpan.getAttribute("data-mindex"));
          const eIndex = parseInt(elementSpan.getAttribute("data-eindex"));
          storeElementEdit(mIndex, eIndex - deletedCount, elementSpan, true);
          deletedCount++;
        }
      });
    });

  // var observer=null
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

  const storeElementEdit = (mIndex, eIndex, target, isDelete = false) => {
    var elementSpan = target;
    var newValue = elementSpan.innerHTML;
    try {
      var oldValue = transcript.value.monologues[mIndex].elements[eIndex].value;
    } catch {
      var oldValue = transcript.value.monologues[mIndex].elements[eIndex];
    }

    var targetElement = transcript.value.monologues[mIndex].elements[eIndex];
    saveState.value = "idle";
    if (isDelete) {
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

        transcript.value.monologues[mIndex].elements[eIndex + 1].value =
          oldValue + oldValue;
        transcript.value.monologues[mIndex].elements.splice(eIndex, 1);
        nextTick(() => {
          transcript.value.monologues[mIndex].elements[eIndex].value = oldValue;
          nextTick(() => {
            turnObserverOn(lastObservedEditorNode);
          });
        });
      } else {
        transcript.value.monologues[mIndex].elements.splice(eIndex, 1);
        nextTick(() => {
          turnObserverOn(lastObservedEditorNode);
        });
      }
    } else {
      if (newValue != oldValue) {
        turnObserverOff();

        const elements = splitElementValue(newValue);
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
          value:  elementSpan.innerHTML + elements[0],
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
        } else 
        if (
          oldValue == " " &&
          elements.length == 2 &&
          !puncts.includes(nextTranscriptElement.value)
        ) {

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
        } else {
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
                transcript.value.monologues[mIndex].elements[eIndex].value !=
                element
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
                transcript.value.monologues[mIndex].elements[eIndex].value =
                  element;
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
                transcript.value.monologues[mIndex].elements[eIndex + index]
                  .value != element
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
                [start, end] = getInsertStartEnd(mIndex, eIndex + index);
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
                transcript.value.monologues[mIndex].elements[eIndex + index];
            }
          });

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
        }
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
  const transcript = ref({});

  const determineIfSpeakersNeedToBeSet = () => {
    var speakersAreSet = true;
    transcript.value.speakers.forEach((speaker) => {
      if (speaker.set_name === null || speaker.set_role === null) {
        speakersAreSet = false;
      }
    });
    if (!speakersAreSet && !mainStore.currentMediaSpeakersSkipped) {
      if (localStorage.doNotCheck == "true") {
        transcriptSpeakersModalVisible.value = false;
      } else {
        transcriptSpeakersModalVisible.value = true;
      }
    }
  };
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
      // find any deleted elements with start times between the threshold start and end
      edits.value.forEach((edit) => {
        if (
          edit.type == "delete" &&
          edit.start > thresholdStart &&
          edit.start < thresholdEnd
        ) {
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
            transcript.value.monologues[parseInt(currentSpan.dataset.mindex)]
              .elements[lastTextElementIndex].start;
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
  function splitElementValue(elementValue) {
    return elementValue.split(/([ .?!])/).filter(Boolean);
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

  return {
    storeElementEdit,
    turnObserverOn,
    turnObserverOff,
    determineIfSpeakersNeedToBeSet,
    transcript,
    transcriptSpeakersModalVisible,
    determineJumpToSeconds,
    updateHighlightedWord,
    playbarModel,
    splitElementValue,
    triggerSaveEdits,
    compressEdits,
    saveState,
    saveEdits,
    closeDropdownList,
    jumpToSeconds,
    lastAudioTime,
    startEindex,
    endEindex,
    currentSpeakersMindex,
    showSpeakerChangeButtonSelected,
    showClipAddButtonSelected,
    puncts,
    goToHighlightDown, 
    goToHighlightUp,
    lastTop,
    svgScrollDown,
    svgScrollUp
  };
}
