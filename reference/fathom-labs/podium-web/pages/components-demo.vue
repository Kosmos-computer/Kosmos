<template>
  <div class="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 pt-16 pb-16 px-10">
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium mb-5">
        Fonts
      </h1>
      <div >
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">text-4xl</span>
        <p class="text-4xl">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div>
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">text-2xl</span>
        <p class="text-2xl">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div >
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">text-base</span>
        <p class="text-base">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div >
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">text-sm</span>
        <p class="text-sm">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <div >
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">text-xs</span>
        <p class="text-xs">
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Processing icons
      </h1>
      <div>
        <span class="block font-medium text-sm text-slate-500 font-mono mb-3">Complete</span>
        <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 10C0.5 15.51 4.97 20 10.53 20H10.54C16.04 20 20.51 15.51 20.51 10C20.51 4.49 16.04 0 10.54 0H10.47C4.97 0 0.5 4.49 0.5 10ZM9.26491 14.6547L9.26996 14.6599H9.25996L9.26491 14.6547ZM9.26491 14.6547L15.29 8.24995C15.67 7.84995 15.65 7.21995 15.25 6.83995C14.85 6.45995 14.22 6.47995 13.84 6.87995L9.24996 11.7599L6.53996 8.93995C6.15996 8.53995 5.52996 8.52995 5.12996 8.90995C4.72996 9.28995 4.71996 9.91995 5.09996 10.3199L9.26491 14.6547Z" fill="#2952E6"/>
        </svg>
      </div>
      <div>
        <span class="block font-medium text-sm text-slate-500 font-mono mb-3">Loading</span>
        <div class="loader inline-block"></div>
      </div>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Buttons
      </h1>
      <div>
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">Normal on black</span>
        <div class="bg-black p-4 mb-5">
          <BaseButton color="black" class="w-full">
            Click me!
          </BaseButton>
        </div>
      </div>
      <div>
        <span class="block font-medium text-sm text-slate-500 font-mono mb-3">Normal on white</span>
        <BaseButton color="normal">
          Click me!
        </BaseButton>
      </div>
      <div>
        <span class="block font-medium text-sm text-slate-500 font-mono mb-3">Normal disabled</span>
        <BaseButton disabled>
          Click me!
        </BaseButton>
      </div>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Input field
      </h1>
      <div>
        <span class="block font-medium text-sm text-slate-500 font-mono mb-3">Normal</span>
        <BaseInput/>
      </div>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Error message
      </h1>
      <BaseSnackbar class="py-2.5 px-10 text-center">
        <span class="block font-semibold leading-4 text-white mb-2.5">Sorry, there was an error when uploading your file.</span>
        <span class="block text-xs leading-4 text-white">Sorry, there was an error when uploading your file.</span>
      </BaseSnackbar>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Checkbox
      </h1>
      <label for="checkbox_input--normal">
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">Normal</span>
        <BaseInput v-model:model-value="checkbox1" id="checkbox_input--normal" type="checkbox"/>
      </label>
      <label for="checkbox_input--active">
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">Checked</span>
        <BaseInput v-model:model-value="checkbox2" id="checkbox_input--active" type="checkbox" checked/>
      </label>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Checkbox
      </h1>
      <label for="radio_input--normal">
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">Normal</span>
        <BaseInput v-model:model-value="checkbox1" id="radio_input--normal" type="radio"/>
      </label>
      <label for="radio_input--active">
        <span class="font-medium text-sm text-slate-500 font-mono mb-3">Checked</span>
        <BaseInput v-model:model-value="checkbox2" id="radio_input--active" type="radio" checked/>
      </label>
    </div>
    <div class="flex flex-col gap-5">
      <h1 class="text-4xl font-medium">
        Share Links
      </h1>
      <ShareLink component="facebook"/>
      <ShareLink component="reddit"/>
      <ShareLink component="twitter"/>
    </div>
    <div class="flex flex-col gap-5 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 ">
      <h1 class="text-4xl font-medium">
        Continue Bar
      </h1>
      <ContinueBar class="relative w-full" :file-selected="true"/>
    </div>
    <div class="flex flex-col gap-5 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 ">
      <h1 class="text-4xl font-medium">
        Free Trial bar
      </h1>
      <CreditsHeader/>
    </div>
    <div class="flex flex-col gap-5 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 ">
      <h1 class="text-4xl font-medium">
        Mobile top navigation
      </h1>
      <div class="flex items-center">
        <svg width="96" height="20" viewBox="0 0 96 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.731 8.052C12.731 8.98733 12.5163 9.846 12.087 10.628C11.6577 11.3947 10.9983 12.0157 10.109 12.491C9.21967 12.9663 8.11567 13.204 6.797 13.204H4.359V19H0.426V2.854H6.797C8.085 2.854 9.17367 3.07633 10.063 3.521C10.9523 3.96567 11.6193 4.579 12.064 5.361C12.5087 6.143 12.731 7.04 12.731 8.052ZM6.498 10.076C7.24933 10.076 7.809 9.89967 8.177 9.547C8.545 9.19433 8.729 8.696 8.729 8.052C8.729 7.408 8.545 6.90967 8.177 6.557C7.809 6.20433 7.24933 6.028 6.498 6.028H4.359V10.076H6.498ZM20.6205 19.184C19.3632 19.184 18.2285 18.9157 17.2165 18.379C16.2199 17.8423 15.4302 17.0757 14.8475 16.079C14.2802 15.0823 13.9965 13.917 13.9965 12.583C13.9965 11.2643 14.2879 10.1067 14.8705 9.11C15.4532 8.098 16.2505 7.32367 17.2625 6.787C18.2745 6.25033 19.4092 5.982 20.6665 5.982C21.9239 5.982 23.0585 6.25033 24.0705 6.787C25.0825 7.32367 25.8799 8.098 26.4625 9.11C27.0452 10.1067 27.3365 11.2643 27.3365 12.583C27.3365 13.9017 27.0375 15.067 26.4395 16.079C25.8569 17.0757 25.0519 17.8423 24.0245 18.379C23.0125 18.9157 21.8779 19.184 20.6205 19.184ZM20.6205 15.78C21.3719 15.78 22.0082 15.504 22.5295 14.952C23.0662 14.4 23.3345 13.6103 23.3345 12.583C23.3345 11.5557 23.0739 10.766 22.5525 10.214C22.0465 9.662 21.4179 9.386 20.6665 9.386C19.8999 9.386 19.2635 9.662 18.7575 10.214C18.2515 10.7507 17.9985 11.5403 17.9985 12.583C17.9985 13.6103 18.2439 14.4 18.7345 14.952C19.2405 15.504 19.8692 15.78 20.6205 15.78ZM28.6411 12.56C28.6411 11.2413 28.8864 10.0837 29.3771 9.087C29.8831 8.09033 30.5654 7.32367 31.4241 6.787C32.2827 6.25033 33.2411 5.982 34.2991 5.982C35.1424 5.982 35.9091 6.15833 36.5991 6.511C37.3044 6.86367 37.8564 7.339 38.2551 7.937V1.98H42.1881V19H38.2551V17.16C37.8871 17.7733 37.3581 18.264 36.6681 18.632C35.9934 19 35.2037 19.184 34.2991 19.184C33.2411 19.184 32.2827 18.9157 31.4241 18.379C30.5654 17.827 29.8831 17.0527 29.3771 16.056C28.8864 15.044 28.6411 13.8787 28.6411 12.56ZM38.2551 12.583C38.2551 11.6017 37.9791 10.8273 37.4271 10.26C36.8904 9.69267 36.2311 9.409 35.4491 9.409C34.6671 9.409 34.0001 9.69267 33.4481 10.26C32.9114 10.812 32.6431 11.5787 32.6431 12.56C32.6431 13.5413 32.9114 14.3233 33.4481 14.906C34.0001 15.4733 34.6671 15.757 35.4491 15.757C36.2311 15.757 36.8904 15.4733 37.4271 14.906C37.9791 14.3387 38.2551 13.5643 38.2551 12.583ZM47.0114 4.832C46.3214 4.832 45.7541 4.63267 45.3094 4.234C44.8801 3.82 44.6654 3.314 44.6654 2.716C44.6654 2.10267 44.8801 1.59667 45.3094 1.198C45.7541 0.783999 46.3214 0.576999 47.0114 0.576999C47.6861 0.576999 48.2381 0.783999 48.6674 1.198C49.1121 1.59667 49.3344 2.10267 49.3344 2.716C49.3344 3.314 49.1121 3.82 48.6674 4.234C48.2381 4.63267 47.6861 4.832 47.0114 4.832ZM48.9664 6.166V19H45.0334V6.166H48.9664ZM64.4896 6.166V19H60.5566V17.252C60.158 17.8193 59.6136 18.2793 58.9236 18.632C58.249 18.9693 57.4976 19.138 56.6696 19.138C55.6883 19.138 54.822 18.9233 54.0706 18.494C53.3193 18.0493 52.7366 17.413 52.3226 16.585C51.9086 15.757 51.7016 14.7833 51.7016 13.664V6.166H55.6116V13.135C55.6116 13.9937 55.834 14.6607 56.2786 15.136C56.7233 15.6113 57.3213 15.849 58.0726 15.849C58.8393 15.849 59.445 15.6113 59.8896 15.136C60.3343 14.6607 60.5566 13.9937 60.5566 13.135V6.166H64.4896ZM83.6907 6.028C85.2853 6.028 86.5503 6.511 87.4857 7.477C88.4363 8.443 88.9117 9.78467 88.9117 11.502V19H85.0017V12.031C85.0017 11.203 84.7793 10.5667 84.3347 10.122C83.9053 9.662 83.3073 9.432 82.5407 9.432C81.774 9.432 81.1683 9.662 80.7237 10.122C80.2943 10.5667 80.0797 11.203 80.0797 12.031V19H76.1697V12.031C76.1697 11.203 75.9473 10.5667 75.5027 10.122C75.0733 9.662 74.4753 9.432 73.7087 9.432C72.942 9.432 72.3363 9.662 71.8917 10.122C71.4623 10.5667 71.2477 11.203 71.2477 12.031V19H67.3147V6.166H71.2477V7.776C71.6463 7.23933 72.1677 6.81767 72.8117 6.511C73.4557 6.189 74.184 6.028 74.9967 6.028C75.9627 6.028 76.8213 6.235 77.5727 6.649C78.3393 7.063 78.9373 7.65333 79.3667 8.42C79.8113 7.71467 80.417 7.13967 81.1837 6.695C81.9503 6.25033 82.786 6.028 83.6907 6.028Z" fill="black"/>
          <path d="M93.5023 19.184C92.8123 19.184 92.245 18.9847 91.8003 18.586C91.371 18.172 91.1563 17.666 91.1563 17.068C91.1563 16.4547 91.371 15.941 91.8003 15.527C92.245 15.113 92.8123 14.906 93.5023 14.906C94.177 14.906 94.729 15.113 95.1583 15.527C95.603 15.941 95.8253 16.4547 95.8253 17.068C95.8253 17.666 95.603 18.172 95.1583 18.586C94.729 18.9847 94.177 19.184 93.5023 19.184Z" fill="#FF4E0D"/>
        </svg>
        <NavigationHamburger class="ml-32"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false })
import {useNavigationStore} from "~/store/navigation";

const checkbox1 = ref(false);
const checkbox2 = ref(true);

  const navigationStore = useNavigationStore();
onMounted(() => {
  // navigationStore.mobileMenuVisible = true;
});
</script>

<style lang="scss" scoped>
.loader {
  width: 20px; /* the size */
  height: 20px;
  padding: 3px;       /* the border thickness */
  background: #000;

  aspect-ratio: 1;
  border-radius: 50%;
  --_m:
      conic-gradient(#0000,#000),
      linear-gradient(#000 0 0) content-box;
  -webkit-mask: var(--_m);
  mask: var(--_m);
  -webkit-mask-composite: source-out;
  mask-composite: subtract;
  box-sizing: border-box;
  animation: load 1s linear infinite;
}

@keyframes load {
  to{transform: rotate(1turn)}
}
</style>
