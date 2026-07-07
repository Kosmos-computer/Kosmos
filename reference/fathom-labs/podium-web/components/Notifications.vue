<template>
    <div aria-live="assertive" class="notification__wrapper">
        <div class="notification__parent"
            v-if="notifications.length > 0"
            :class="{
                'open': notifications.length > 0,
                'closed': notifications.length == 0
            }">
            <div 
                class="notification__inner hide-after-5s" 
                v-for="(notification, i) in notifications"
                :key="notification.id"
                :ref="notification.id"
                :class="{
                    'open': mainStore.notifications.length > 0,
                    'closed': mainStore.notifications.length == 0
                }">
                <div v-if="notification">

                    <Notification 
                        :message="notification[0].message" 
                        :id="notification[0].id"
                        :type="notification[0].type" 
                        :title="notification[0].title" 
                        @destroy="destroyItem(notification[0].id)" />
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'

import useNotification from '~/composables/useNotification';

import { useMainStore } from '~/store/main'

const { closeNotification } = useNotification()

const mainStore = useMainStore()

const notifications = computed(() => mainStore.notifications)

const close = () => {
    closeNotification()
}
    
const destroyItem = (id: number) => {
  for (var i = 0; i < notifications.value.length; i++) {
    const index = notifications.value[i].findIndex(notification => notification.id === id);
    if (index !== -1) {
        notifications.value.splice(index, 1);
    }
  }
};

watch(
        mainStore.notifications,
		(newVal) => {
            console.log("main store notification watcher", newVal)
		}
	)


    watch(
        notifications,
		(newVal) => {
            console.log("notification watcher", newVal)
		}
	)


</script>

<style lang="scss" scoped>

@keyframes hideElement {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    display: none;
  }
}

.hide-after-5s {
  animation: hideElement 5s forwards;
}
.notification {

    &__wrapper {
        @apply pointer-events-none fixed inset-0 top-auto z-20 flex items-end px-4 py-6 sm:p-6;
    }
    &__parent {
        @apply flex w-full flex-col items-center space-y-4 sm:items-end translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2;
    
        &.open {
            @apply transform ease-out duration-300 transition translate-y-0 opacity-100 sm:translate-x-0;
        }
        &.closed {
            @apply transition ease-in duration-100 opacity-0;
        }
    
    }
    &__inner {
        @apply pointer-events-auto w-full max-w-sm overflow-hidden relative rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5;
    }
}
</style>