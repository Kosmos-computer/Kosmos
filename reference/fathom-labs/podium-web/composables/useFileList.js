import {useMainStore} from "~/store/main";

export default function () {
	const files = ref([]);
	const uploadError = ref(false);
	const mainStore = useMainStore();

	const fileSelected = computed(() => files.value.length > 0);

	function addFiles(newFiles) {
		// heap.track('file-dropped', {})
		uploadError.value = false;
		files.value = [];
		// let newUploadableFiles = [...newFiles]
		let newUploadableFiles = Array.from(newFiles)
			.map((file) => new UploadableFile(file))
			.filter((file) => !fileExists(file.id))
			if (newUploadableFiles.length) {
				files.value = files.value.concat(newUploadableFiles);
			  } else {
				uploadError.value = true;
			  }
	}

	function fileExists(otherId) {
		return files.value.some(({id}) => id === otherId)
	}

	function removeFile(file) {
		const index = files.value.indexOf(file)

		if (index > -1) files.value.splice(index, 1)
	}

	function clearAll() {
		files.value = []
	}

	watch(
		() => files.value,
		(newVal) => {
			mainStore.files = newVal;
		}
	)
	return { files, fileSelected, addFiles, removeFile, clearAll, uploadError }
}

class UploadableFile {
	constructor(file) {
		this.file = file
		this.id = `${file.name}-${file.size}-${file.lastModified}-${file.type}`
		this.url = URL.createObjectURL(file)
		this.status = null
	}
}
