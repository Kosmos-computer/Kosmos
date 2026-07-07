<template>
  <input
      :value="modelValue"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
      class="py-4 pl-6 focus-visible:outline-black border-0 rounded-lg text-black font-semibold"
      style="--tw-ring-color: none; outline-offset: 0px;"
  />
</template>

<script setup lang="ts">
defineProps<{ modelValue: String }>();
</script>

<style lang="scss" scoped>
input {
  background: #F0F0F0;
  border: none;

  &::-webkit-search-decoration,
  &::-webkit-search-cancel-button,
  &::-webkit-search-results-button,
  &::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  &[type=radio], &[type=checkbox] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 30px;
    height: 30px;
    background: #F0F0F0;
    border-radius: 4px;
    position: relative;
    padding: 0;
  }

  &[type=radio] {
    border-radius: 100%;
  }

  &[type=radio]:checked:before {
    content: '';
    position: absolute;
    top: 50%;
    bottom: 0;
    right: 0;
    left: 50%;
    width: 20px;
    height: 20px;
    background: #007AFF;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  &[type=checkbox]:checked {
    background: #7ED321;
    &:after {
      content: '\2713';
      display: absolute;
      color: red;
    }
  }
}

.base-input {
  background: #F0F0F0;
}
</style>
