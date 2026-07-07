<template>
  <Popover>
    <div class="relative">
      <PopoverButton
        class="flex items-center h-full gap-1 p-2 text-sm font-medium text-stone-600 hover:bg-stone-100 active:bg-stone-200 focus:outline-none"
      >
        <span
          class="px-1 rounded-sm"
          :style="{
            color: activeColorItem?.color,
            backgroundColor: activeHighlightItem?.color,
          }"
        >
          A
        </span>

        <ChevronDown class="w-4 h-4" />
      </PopoverButton>

      <PopoverPanel
        align="start"
        class="z-[99999] absolute my-1 flex max-h-80 w-48 flex-col overflow-hidden overflow-y-auto rounded border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1"
        v-slot="{ close }"
      >
        <div class="px-2 my-1 text-sm text-stone-500">{{ t('Color') }}</div>
        <button
          v-for="(textColor, index) in TEXT_COLORS"
          :key="index"
          class="flex items-center justify-between px-2 py-1 text-sm rounded-sm text-stone-600 hover:bg-stone-100"
          type="button"
          @click="
            () => {
              editor.commands.unsetColor();
              textColor.name !== 'Default' &&
                editor
                  .chain()
                  .focus()
                  .setColor(textColor.color || '')
                  .run();
              close();
            }
          "
        >
          <div class="flex items-center space-x-2">
            <div
              class="px-1 py-px font-medium border rounded-sm border-stone-200"
              :style="{ color: textColor.color }"
            >
              A
            </div>
            <span>{{ textColor.name }}</span>
          </div>
          <Check
            v-if="editor.isActive('textStyle', { color: textColor.color })"
            class="w-4 h-4"
          />
        </button>
        <div class="px-2 mt-2 mb-1 text-sm text-stone-500">{{ t('Background') }}</div>
        <button
          v-for="(highlightColor, index) in HIGHLIGHT_COLORS"
          :key="index"
          @click="
            () => {
              editor.commands.unsetHighlight();
              highlightColor.name !== 'Default' &&
                editor.commands.setHighlight({ color: highlightColor.color });
              close();
            }
          "
          class="flex items-center justify-between px-2 py-1 text-sm rounded-sm text-stone-600 hover:bg-stone-100"
          type="button"
        >
          <div class="flex items-center space-x-2">
            <div
              class="px-1 py-px font-medium border rounded-sm border-stone-200"
              :style="{ backgroundColor: highlightColor.color }"
            >
              A
            </div>
            <span>{{ highlightColor.name }}</span>
          </div>

          <Check
            v-if="editor.isActive('highlight', { color: highlightColor.color })"
            class="w-4 h-4"
          />
        </button>
      </PopoverPanel>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { Editor } from "@tiptap/core";
import { Check, ChevronDown } from "lucide-vue-next";
import { PropType, computed } from "vue";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const props = defineProps({
  editor: {
    type: Object as PropType<Editor>,
    required: true,
  },
});
const TEXT_COLORS = [
  {
    name: t.value("Default"),
    color: "var(--novel-black)",
  },
  {
    name: t.value("Purple"),
    color: "#9333EA",
  },
  {
    name: t.value("Red"),
    color: "#E00000",
  },
  {
    name: t.value("Yellow"),
    color: "#EAB308",
  },
  {
    name: t.value("Blue"),
    color: "#2563EB",
  },
  {
    name: t.value("Green"),
    color: "#008A00",
  },
  {
    name: t.value("Orange"),
    color: "#FFA500",
  },
  {
    name: t.value("Pink"),
    color: "#BA4081",
  },
  {
    name: t.value("Gray"),
    color: "#A8A29E",
  },
];

const HIGHLIGHT_COLORS = [
  {
    name: t.value("Default"),
    color: "var(--novel-highlight-default)",
  },
  {
    name: t.value("Purple"),
    color: "var(--novel-highlight-purple)",
  },
  {
    name: t.value("Red"),
    color: "var(--novel-highlight-red)",
  },
  {
    name: t.value("Yellow"),
    color: "var(--novel-highlight-yellow)",
  },
  {
    name: t.value("Blue"),
    color: "var(--novel-highlight-blue)",
  },
  {
    name: t.value("Green"),
    color: "var(--novel-highlight-green)",
  },
  {
    name: t.value("Orange"),
    color: "var(--novel-highlight-orange)",
  },
  {
    name: t.value("Pink"),
    color: "var(--novel-highlight-pink)",
  },
  {
    name: t.value("Gray"),
    color: "var(--novel-highlight-gray)",
  },
];

const activeColorItem = computed(() =>
  TEXT_COLORS.find(({ color }) => props.editor.isActive("textStyle", { color }))
);

const activeHighlightItem = computed(() =>
  HIGHLIGHT_COLORS.find(({ color }) =>
    props.editor.isActive("highlight", { color })
  )
);
</script>

<style scoped></style>
