<template>
  <button
      :disabled="disabled"
      :class="['border-2 border-black font-semibold rounded-lg py-3 px-4', buttonCss]"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  color: {
    default: 'normal',
    type: String
  },
  disabled: {
    default: false,
    type: Boolean
  },
  loading: {
    default: false,
    type: Boolean
  },
})



const buttonCss = computed<string>(() => {
  let disabledCss = '';
  if (props.disabled) {
    disabledCss += 'disabled:text-primary disabled:cursor-not-allowed ';
    disabledCss += props.color === 'normal'
        ? 'disabled:bg-transparent disabled:border-[#979797]'
        : 'disabled:bg-[#f0f0f0] disabled:border-[#f0f0f0]';
  }
  if (props.color === 'normal') {
    return `${disabledCss} hover:black-outlined hover:text-black text-white focus:bg-black focus:text-white`;
  }
  if (props.color === 'black-outline') {
    disabledCss += 'disabled:text-primary disabled:cursor-not-allowed disabled:text-white ';
    return `${disabledCss} black-outlined hover:bg-black hover:text-white focus:bg-black text-gray-900`;
  }
  if (props.color === 'onBlack') {
    return `onBlack text-white `;
  }

  if (props.color === 'purps') {
    return `purps text-white `;
  }

  return `${disabledCss} hover:bg-white hover:text-black active:bg-white active:text-black`;
});
</script>

<style lang="scss" scoped>
button {
  line-height: 15px;

  &:not(:hover,:disabled):not(.black-outlined, .onBlack) {
    background: black;
  }

  &.onBlack {
    background: #2952e6;
  }
  &.onBlack:hover {
    background: #ffffff;
    color: #000;
  }


  &.purps {
    background: #4F46E5;
  }
  &.purps:hover {
    background: #ffffff;
    color: #000;
  }
}
</style>
