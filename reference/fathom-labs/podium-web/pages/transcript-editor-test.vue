<template>
  <div class="flex flex-row">
    <div class="p-4 w-96">
      <div class="mb-4">
        <div
          class="whitespace-pre-wrap"
          contenteditable
        >
        <span
            class="transcript-element"
            contenteditable
            v-for="(element, eIndex) in transcript.elements"
            :key="eIndex + element.value"
            :data-eindex="eIndex"
            
          >
            {{ element.value }} 
          </span>
        </div>
      </div>
    </div>
    <div class="w-96 ml-20">
      <div v-for="edit in edits" class="mb-4">
      {{ edit }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.transcript-text {
  display: inline;
  border: none;
  outline: none;
  background-color: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-align: inherit;
  vertical-align: inherit;
  letter-spacing: inherit;
  word-spacing: inherit;
  word-wrap: inherit;
  white-space: inherit;
  color: inherit;
}

.whitespace-pre-wrap {
  &:focus {
    outline: none;
  }
}

</style>


<script setup lang="ts">
definePageMeta({ auth: false })
import { definePageMeta, useSession, navigateTo } from '#imports'
import { useMainStore } from "~/store/main"
const route = useRoute()
const { signIn, status } = useSession()
const mainStore = useMainStore()

const edits = ref([])

const getSpeakerName = (speakerId) => {
  const speaker = transcript.value.speakers.find((sp) => sp.id === speakerId)
  return speaker ? speaker.default_name : ''
}

const isHighlighted = (mIndex, eIndex) => {
  return (
    highlightedWord &&
    highlightedWord.monologueIndex === mIndex &&
    highlightedWord.elementIndex === eIndex
  );
}

const storeElementEdit = (eIndex, target, isDelete=false) => {
  const elementSpan = target;
  const newValue = elementSpan.innerHTML;
  const oldValue = transcript.value.elements[eIndex].value;

  if (isDelete) {
    console.log('here1')
    edits.value.push({ type: 'delete', elementIndex: eIndex, value: null });
    
    turnObserverOff()
    // turn on observer after next tick
    nextTick(() => {
      transcript.value.elements.splice(eIndex, 1);
      console.log(transcript.value.elements)
      nextTick(() => {
        turnObserverOn()
      })
    })
  }
};

var observer = null

const config = { childList: true, subtree: true, characterData: true };

const turnObserverOn = () => {
  const editor = document.querySelector('.whitespace-pre-wrap')
  observer.observe(editor, config);
}

const turnObserverOff = () => {
  observer.disconnect();
}

onMounted(() => {
  transcript.value = transcript_source
  observer = new MutationObserver((mutations) => {
    console.log("MUTATIONS")
    console.log(mutations)
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        console.log('characterData')
        const elementSpan = mutation.target.parentElement;
        const eIndex = parseInt(elementSpan.getAttribute('data-eindex'));

        console.log(elementSpan)
        console.log(eIndex)
        storeElementEdit(eIndex, elementSpan);
      }

      if (mutation.type === 'childList' && mutation.addedNodes.length == 0) {
        console.log('childList')
        const elementSpan = mutation.removedNodes[0];
        const eIndex = parseInt(elementSpan.getAttribute('data-eindex'));

        console.log(elementSpan)
        console.log(eIndex)
        storeElementEdit(eIndex, elementSpan, true);
      }
    });
  });

  // turn on observer after next tick
  nextTick(() => {
    turnObserverOn()
  })
});

onUnmounted(() => {
  turnObserverOff()
});

const highlightedWord = {
  "monologueIndex": 0,
  "elementIndex": 0
}

const transcript = ref({})
var transcript_source = {
			"elements": [
				{
					"type": "text",
					"value": "I",
					"start_seconds": 0.141,
					"end_seconds": 0.181,
					"start": 0.141,
					"end": 0.181
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.181,
					"end_seconds": 0.181,
					"start": 0.181,
					"end": 0.181
				},
				{
					"type": "text",
					"value": "took",
					"start_seconds": 0.221,
					"end_seconds": 0.361,
					"start": 0.221,
					"end": 0.361
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.361,
					"end_seconds": 0.361,
					"start": 0.361,
					"end": 0.361
				},
				{
					"type": "text",
					"value": "that",
					"start_seconds": 0.381,
					"end_seconds": 0.482,
					"start": 0.381,
					"end": 0.482
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.482,
					"end_seconds": 0.482,
					"start": 0.482,
					"end": 0.482
				},
				{
					"type": "text",
					"value": "as",
					"start_seconds": 0.522,
					"end_seconds": 0.602,
					"start": 0.522,
					"end": 0.602
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.602,
					"end_seconds": 0.602,
					"start": 0.602,
					"end": 0.602
				},
				{
					"type": "text",
					"value": "a",
					"start_seconds": 0.622,
					"end_seconds": 0.663,
					"start": 0.622,
					"end": 0.663
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.663,
					"end_seconds": 0.663,
					"start": 0.663,
					"end": 0.663
				},
				{
					"type": "text",
					"value": "personal",
					"start_seconds": 0.723,
					"end_seconds": 1.185,
					"start": 0.723,
					"end": 1.185
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.185,
					"end_seconds": 1.185,
					"start": 1.185,
					"end": 1.185
				},
				{
					"type": "text",
					"value": "nod",
					"start_seconds": 1.385,
					"end_seconds": 1.586,
					"start": 1.385,
					"end": 1.586
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.586,
					"end_seconds": 1.586,
					"start": 1.586,
					"end": 1.586
				},
				{
					"type": "text",
					"value": "to",
					"start_seconds": 1.606,
					"end_seconds": 1.687,
					"start": 1.606,
					"end": 1.687
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.687,
					"end_seconds": 1.687,
					"start": 1.687,
					"end": 1.687
				},
				{
					"type": "text",
					"value": "Kevin",
					"start_seconds": 1.727,
					"end_seconds": 2.028,
					"start": 1.727,
					"end": 2.028
				},
				{
					"type": "punct",
					"value": ".",
					"start_seconds": 2.028,
					"end_seconds": 2.028,
					"start": 2.028,
					"end": 2.028
				},
				{
					"type": "text",
					"value": "I",
					"start_seconds": 0.141,
					"end_seconds": 0.181,
					"start": 0.141,
					"end": 0.181
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.181,
					"end_seconds": 0.181,
					"start": 0.181,
					"end": 0.181
				},
				{
					"type": "text",
					"value": "took",
					"start_seconds": 0.221,
					"end_seconds": 0.361,
					"start": 0.221,
					"end": 0.361
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.361,
					"end_seconds": 0.361,
					"start": 0.361,
					"end": 0.361
				},
				{
					"type": "text",
					"value": "that",
					"start_seconds": 0.381,
					"end_seconds": 0.482,
					"start": 0.381,
					"end": 0.482
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.482,
					"end_seconds": 0.482,
					"start": 0.482,
					"end": 0.482
				},
				{
					"type": "text",
					"value": "as",
					"start_seconds": 0.522,
					"end_seconds": 0.602,
					"start": 0.522,
					"end": 0.602
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.602,
					"end_seconds": 0.602,
					"start": 0.602,
					"end": 0.602
				},
				{
					"type": "text",
					"value": "a",
					"start_seconds": 0.622,
					"end_seconds": 0.663,
					"start": 0.622,
					"end": 0.663
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.663,
					"end_seconds": 0.663,
					"start": 0.663,
					"end": 0.663
				},
				{
					"type": "text",
					"value": "personal",
					"start_seconds": 0.723,
					"end_seconds": 1.185,
					"start": 0.723,
					"end": 1.185
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.185,
					"end_seconds": 1.185,
					"start": 1.185,
					"end": 1.185
				},
				{
					"type": "text",
					"value": "nod",
					"start_seconds": 1.385,
					"end_seconds": 1.586,
					"start": 1.385,
					"end": 1.586
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.586,
					"end_seconds": 1.586,
					"start": 1.586,
					"end": 1.586
				},
				{
					"type": "text",
					"value": "to",
					"start_seconds": 1.606,
					"end_seconds": 1.687,
					"start": 1.606,
					"end": 1.687
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.687,
					"end_seconds": 1.687,
					"start": 1.687,
					"end": 1.687
				},
				{
					"type": "text",
					"value": "Kevin",
					"start_seconds": 1.727,
					"end_seconds": 2.028,
					"start": 1.727,
					"end": 2.028
				},
				{
					"type": "punct",
					"value": ".",
					"start_seconds": 2.028,
					"end_seconds": 2.028,
					"start": 2.028,
					"end": 2.028
				},
				{
					"type": "text",
					"value": "I",
					"start_seconds": 0.141,
					"end_seconds": 0.181,
					"start": 0.141,
					"end": 0.181
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.181,
					"end_seconds": 0.181,
					"start": 0.181,
					"end": 0.181
				},
				{
					"type": "text",
					"value": "took",
					"start_seconds": 0.221,
					"end_seconds": 0.361,
					"start": 0.221,
					"end": 0.361
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.361,
					"end_seconds": 0.361,
					"start": 0.361,
					"end": 0.361
				},
				{
					"type": "text",
					"value": "that",
					"start_seconds": 0.381,
					"end_seconds": 0.482,
					"start": 0.381,
					"end": 0.482
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.482,
					"end_seconds": 0.482,
					"start": 0.482,
					"end": 0.482
				},
				{
					"type": "text",
					"value": "as",
					"start_seconds": 0.522,
					"end_seconds": 0.602,
					"start": 0.522,
					"end": 0.602
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.602,
					"end_seconds": 0.602,
					"start": 0.602,
					"end": 0.602
				},
				{
					"type": "text",
					"value": "a",
					"start_seconds": 0.622,
					"end_seconds": 0.663,
					"start": 0.622,
					"end": 0.663
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 0.663,
					"end_seconds": 0.663,
					"start": 0.663,
					"end": 0.663
				},
				{
					"type": "text",
					"value": "personal",
					"start_seconds": 0.723,
					"end_seconds": 1.185,
					"start": 0.723,
					"end": 1.185
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.185,
					"end_seconds": 1.185,
					"start": 1.185,
					"end": 1.185
				},
				{
					"type": "text",
					"value": "nod",
					"start_seconds": 1.385,
					"end_seconds": 1.586,
					"start": 1.385,
					"end": 1.586
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.586,
					"end_seconds": 1.586,
					"start": 1.586,
					"end": 1.586
				},
				{
					"type": "text",
					"value": "to",
					"start_seconds": 1.606,
					"end_seconds": 1.687,
					"start": 1.606,
					"end": 1.687
				},
				{
					"type": "punct",
					"value": " ",
					"start_seconds": 1.687,
					"end_seconds": 1.687,
					"start": 1.687,
					"end": 1.687
				},
				{
					"type": "text",
					"value": "Kevin",
					"start_seconds": 1.727,
					"end_seconds": 2.028,
					"start": 1.727,
					"end": 2.028
				},
				{
					"type": "punct",
					"value": ".",
					"start_seconds": 2.028,
					"end_seconds": 2.028,
					"start": 2.028,
					"end": 2.028
				},
			]
}

</script>
