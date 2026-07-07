import { ref, computed } from 'vue'
import { useMainStore } from '~/store/main'

interface Notification {
    id: number,
    title: string;
    message: string;
    type: string;
}

export default function useNotification(): any {

    const ns = ref<Notification[]>([])
    const mainStore = useMainStore()
    
    const showNotification = (title: string, message: string, type: string) : void => {
        const notification = { id: Date.now(), title, message, type };
        ns.value.push(notification);
    }
    
    const showSuccess = (title : string, message : string) => {
        showNotification(title, message, 'success')
    }

    const showError = (title: string, message : string) => showNotification(title, message, 'error')

    const showInfo = (title: string, message : string) => showNotification(title, message, 'info')

    const closeNotification = (id: number) => {
        const index = ns.value.findIndex(notification => notification.id === id);
        if (index !== -1) {
          ns.value.splice(index, 1);
        }
    }

	watch(
		ns.value,
		(newVal) => {
            console.log("watcher", newVal)
			mainStore.notifications.push(newVal);
		}
	)

    return { 
        ns,
        showSuccess, 
        showError, 
        showInfo,
        closeNotification
    }
}