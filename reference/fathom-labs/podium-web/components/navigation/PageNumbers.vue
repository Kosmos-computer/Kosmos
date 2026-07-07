<template>
  <div v-show="totalPages > 1" class="flex items-center justify-between bg-white">
    <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm">
      <div 
        @click="goToPreviousPage"
        class="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-indigo-100 focus:z-20 focus:outline-offset-0 cursor-pointer">
        <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
      </div>
      <div
        v-for="(page, index) in pages"
        :key="index"
        @click="goToPage(page, index)"
        :class="['relative inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-300', page === currentPage ? 'bg-indigo-700 text-white' : 'bg-white text-black cursor-pointer hover:bg-indigo-100 focus:z-20 focus:outline-offset-0']"
      >
        {{ page }}
      </div>
      <div 
        @click="goToNextPage"
        class="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-indigo-100 focus:z-20 focus:outline-offset-0 cursor-pointer">
        <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
      </div>
    </nav>
  </div>
</template>

<script setup>
  import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
  const props = defineProps({
    currentPage: {
      type: Number,
      required: true
    },
    pageSize: {
      type: Number,
      required: true
    },
    totalCount: {
      type: Number,
      required: true
    }
  })

  onMounted(async () => {
    console.log(props)
    console.log(totalPages)
  })

  const emit = defineEmits(['page-change'])

  const totalPages = computed(() => {
      return Math.ceil(props.totalCount / props.pageSize)
  })

  const pages = computed(() => {
      const pages = []
      let start = props.currentPage - 5 <= 0 ? 1 : props.currentPage - 5
      let end = start + 9 >= totalPages.value ? totalPages.value : start + 9

      if (end - start < 9) {
        start = end - 9 <= 0 ? 1 : end - 9
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (totalPages.value > 10) {
        if (start > 1) {
          pages.unshift('...')
          pages.unshift(1)
        }
        if (end < totalPages.value) {
          pages.push('...')
          pages.push(totalPages.value)
        }
      }

      return pages;
  })
    
  const goToPage = (page, index) => {
      if (page === '...') {
        if (index === 1) {
          if (props.currentPage >= totalPages.value - 5) {
            emit('page-change', totalPages.value - 10)
          } else {
            emit('page-change', props.currentPage - 6)
          }
        } else {
          if (props.currentPage <= 6) {
            emit('page-change', 11)
          } else {
            emit('page-change', props.currentPage + 5)
          }
        }
      } else {
        emit('page-change', page)
        document.getElementsByClassName('dashboard')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  }
  
  const goToPreviousPage = () => {
    if (props.currentPage > 1) {
      goToPage(props.currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (props.currentPage < totalPages.value) {
      goToPage(props.currentPage + 1)
    }
  }
</script>
<style scoped>
.none {}
</style>
