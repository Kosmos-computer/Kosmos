<template>
  <div class="grid grid-cols-3 gap-2 mb-6">
    <button
      v-for="(button, index) in buttons"
      :key="index"
      type="button"
      :class="buttonClasses(button.label)"
      @click="selectButton(button.label)"
      class="flex items-center px-2"
    >
      <component
        :is="button.icon"
        class="h-5 w-5"
        :color="iconColor(button.label)"
      />
      <span class="flex w-full text-center justify-center">{{ t(button.label) }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";
import MicrophoneIcon from "../svg/MicrophoneIcon.vue";
import PlayIcon from "../svg/PlayIcon.vue";
import CapIcon from "../svg/CapIcon.vue";
import SpiritualIcon from "../svg/SpiritualIcon.vue";
import CalendarIcon from "../svg/CalendarIcon.vue";
import PhoneIcon from "../svg/PhoneIcon.vue";
    import languageStore from '@/store/LanguageStore';

    const t = computed(() => {
      return key => {
        const translation = languageStore.state.translations[key];
        return translation || key;  // Fallback to key if translation not found
      };
    });

const props = defineProps({
  contentType: {
    type: String,
    default: "Podcast",
  },
});

const emit = defineEmits(["update"]);

const selected = ref("Podcast");
const buttons = [
  { label: "Podcast", icon: MicrophoneIcon },
  { label: "Video", icon: PlayIcon },
  { label: "Educational", icon: CapIcon },
  { label: "Spiritual", icon: SpiritualIcon },
  { label: "Meeting", icon: CalendarIcon },
  { label: "Customer Call", icon: PhoneIcon },
];

const selectButton = (label) => {
  selected.value = label;
  emit("update", label);
};

const buttonClasses = (label) => {
  return [
    "rounded-md px-3 py-2 text-sm font-medium shadow-sm",
    selected.value == label
      ? "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600"
      : "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
    "h-10",
  ].join(" ");
};

const iconColor = (label) => {
  return selected.value == label ? "#FFFFFF" : "#9CA3AF";
};
</script>

<style scoped>
/* Ensure vertical alignment if needed */
button {
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
