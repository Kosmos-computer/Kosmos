<template>
  <div>
    <label for="email" class="block text-sm font-medium leading-6 text-gray-900">{{ label }}</label>
    <div class="mt-1">
      <input
        :value="modelValue"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
        class="pl-4 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 outline-0 focus:ring-1 focus:ring-indigo-600 focus-visible:ring-indigo-600 focus-visible:ring-1 sm:text-sm sm:leading-6"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ modelValue: String, label: String }>();
</script>

<style lang="scss" scoped>

div[type='password'] {
  padding: 0px;
  border: none;
  background-color: initial !important;
}

div[type='email'] {
  padding: 0px;
  border: none;
  background-color: initial !important;
}

div[type='text'] {
  padding: 0px;
  border: none;
  background-color: initial !important;
}

</style>
