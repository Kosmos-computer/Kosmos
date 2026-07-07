<template>
    <div class="search" role="dialog" aria-modal="true">
    
        <BackgroundScreen :active="focused" />
    
        <div class="search__wrapper">
            <div class="search__wrapper-inner">
                <div class="search__input-parent">
                    <SvgSearch class="search" />
                    <input v-model="search"
                        @keydown.esc="unfocus($event)"
                        @keydown.down.prevent="selected === (filtered.length - 1) ? (filtered.length - 1) : selected++"
                        @keydown.up.prevent="selected === 0 ? 0 : selected--"
                        @keydown.enter="enterEvent($event)"
                        @focus="focused = true"
                        @focusout="!mouseOverResults || hitEnter ? focused = false : null" 
                        type="text" 
                        class="search__input" 
                        placeholder="Search" 
                        ole="combobox" 
                        aria-expanded="false" 
                        aria-controls="options" />
                </div>

                <!-- Results, show/hide based on command palette state. -->
                <ul v-if="focused && filtered.length > 0" 
                    @mouseenter="mouseOverResults = true"
                    @mouseleave="mouseOverResults = false"
                    class="search__results" id="options" role="listbox">
                    <!-- <li>
                        <h2 class="text-xs font-semibold text-gray-900">Projects</h2>
                        <ul class="-mx-4 mt-2 text-sm text-gray-700">
                            Active: "bg-indigo-600 text-white"
                            <li class="group flex cursor-default select-none items-center px-4 py-2" id="option-2" role="option" tabindex="-1">
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="h-6 w-6 flex-none rounded-full">
                            <span class="ml-3 flex-auto truncate">Leslie Alexander</span>
                            </li>

                        </ul>
                    </li> -->
                    <li>
                        <h2>Podcasts</h2>
                        <ul class="search__results-list">
                            <!-- Active: "bg-indigo-600 text-white" -->
                            <li v-for="(item, i) in filtered" 
                                :key="i" 
                                @mouseenter="selected = i"
                                @click="goToSelected"
                                :class="{
                                    'bg-indigo-600 text-white': i === selected,
                                }"
                                class="z-10 relative group flex cursor-default select-none items-center px-4 py-2" id="option-1" role="option" tabindex="-1">
                                <!-- Active: "text-white", Not Active: "text-gray-400" -->
                                <svg 
                                :class="{
                                    'text-white': i === selected,
                                    'text-gray-400': i !== selected,
                                }" width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path class="fill-current" fill-rule="evenodd" clip-rule="evenodd" d="M0.799805 2.7999C0.799805 1.47442 1.87432 0.399902 3.1998 0.399902H8.70275C9.33927 0.399902 9.94972 0.652759 10.3998 1.10285L14.4969 5.1999C14.9469 5.64999 15.1998 6.26044 15.1998 6.89696V17.1999C15.1998 18.5254 14.1253 19.5999 12.7998 19.5999H3.1998C1.87432 19.5999 0.799805 18.5254 0.799805 17.1999V2.7999ZM3.1998 9.9999C3.1998 9.33716 3.73706 8.7999 4.3998 8.7999H11.5998C12.2625 8.7999 12.7998 9.33716 12.7998 9.9999C12.7998 10.6626 12.2625 11.1999 11.5998 11.1999H4.3998C3.73706 11.1999 3.1998 10.6626 3.1998 9.9999ZM4.3998 13.5999C3.73706 13.5999 3.1998 14.1372 3.1998 14.7999C3.1998 15.4626 3.73706 15.9999 4.3998 15.9999H11.5998C12.2625 15.9999 12.7998 15.4626 12.7998 14.7999C12.7998 14.1372 12.2625 13.5999 11.5998 13.5999H4.3998Z" />
                                </svg>

                                <span class="ml-3 flex-auto truncate" v-html="item.matchedTitle" />
                            </li>

                            <!-- More projects... -->
                        </ul>
                    </li>
                </ul>

                <!-- Help, show/hide based on command palette state. -->
                <NavigationSearchFocused v-if="focused && filtered.length === 0 && search.length === 0" />


                <!-- Empty state, show/hide based on command palette state. -->
                <NavigationSearchNoResults v-if="focused && filtered.length === 0 && search.length > 0"  />

                <!-- <NavigationSearchHints /> -->
            </div>
        
        </div>
    </div>


    
</template>
<script setup lang="ts">
import { ref, computed, onMounted, withDefaults } from 'vue'
import podiumGetPodiumPackageUrl from '@/apollo/queries/podiumGetPodiumPackageUrl.gql';
import { useMainStore } from "~/store/main";

const mainStore = useMainStore();

const search = ref('')
const focused = ref(false)
const selected = ref(0)

const classes = computed(() => {
    return {
        'focused': focused.value
    }
})

const responseData = ref(mainStore.podiumPackages)

if (mainStore.podiumPackages.length === 0) {
  await mainStore.retrieveUserMedia();
}

const filtered = computed(() => {
    if (search.value === '') return []
    const regex = new RegExp(search.value, 'i')
    return responseData.value.filter(
        (item: any) => 
        { 
            if (item.title == null) return false
            const match = item.title.match(regex)
            if (!match) return false
            const start = match.index
            const end = start + match[0].length
            item.matchedTitle = `${item.title.slice(0, start)}<strong>${match[0]}</strong>${item.title.slice(end)}`
            return true
        }
    )
})

const goToSelected = () : void => {
    console.log("hi")
    navigateTo(`/job/${filtered.value[selected.value].guid}`)
}

const unfocus = (e:any) : void => {
    e.target.blur()
}

const enterEvent = (e:any) : void => {
    e.target.blur()
    goToSelected()
}

const mouseOverResults = ref(false)
const hitEnter = ref(false)
</script>

<style lang="scss" scoped>
.search {
    @apply  relative z-10;
    &__screen {
        @apply fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity;
    }
    &__wrapper {
        @apply fixed inset-0 z-10 overflow-y-auto p-2 bottom-auto;
        &-inner {
            @apply mx-auto max-w-xl transform divide-y divide-gray-100 overflow-hidden rounded-md bg-white ring-1 ring-black ring-opacity-5 transition-all;
       
            svg.search {
                @apply pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400;
            }
        }
    }
    &__input {
        @apply text-base leading-6 font-normal h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-500 focus:ring-0;
        &-parent {
            @apply relative;
        }
    }
    &__results {
        @apply max-h-80 scroll-py-10 scroll-pb-2 space-y-4 overflow-y-auto p-4 pb-2;
        h2 {
            @apply text-xs font-semibold text-gray-900;
        }
        &-list {
            @apply -mx-4 mt-2 text-sm text-gray-700;
        }

    }
}


</style>