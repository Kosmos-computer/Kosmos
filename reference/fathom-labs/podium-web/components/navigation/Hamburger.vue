<template>
<button id="hamburger" @click="toggleOpen">
  <svg class="hamburger">
    <line x1="0" y1="50%" x2="100%" y2="50%" class="hamburger__bar hamburger__bar--top" />
    <line x1="0" y1="50%" x2="100%" y2="50%" class="hamburger__bar hamburger__bar--mid" />
    <line x1="0" y1="50%" x2="100%" y2="50%" class="hamburger__bar hamburger__bar--bot" />
  </svg>
</button>
</template>

<script setup>
import {useNavigationStore} from "~/store/navigation";

const navigationStore = useNavigationStore();

const opened = ref(false);


const toggleOpen = () => {
  const hamburger = document.getElementById('hamburger');
  hamburger.classList.toggle('is-opened');
  navigationStore.mobileMenuVisible = !navigationStore.mobileMenuVisible
};

watch(() => navigationStore.mobileMenuVisible, (newVal) => {
  if (newVal) {
    const hamburger = document.getElementById('hamburger');
    hamburger.classList.add('is-opened');
  } else {
    const hamburger = document.getElementById('hamburger');
    hamburger.classList.remove('is-opened');
  }
});


</script>

<style lang="scss" scoped>
* {
  -webkit-backface-visibility: hidden;
}


.hamburger {
  width: 30px;
  height: 30px;
}

.hamburger__bar {
  transform-origin: center;
  stroke: rgb(0, 0, 0);
  stroke-width: 10%;
}

.is-opened .hamburger {

}

.hamburger__bar--top {
  transform: translateY(-30%);
}

.hamburger__bar--bot {
  transform: translateY(30%);
}

.is-opened .hamburger__bar--top {
  transition-property: transform;
  transition-duration: 0.3s;
  transform: rotate(45deg);
}

.is-opened .hamburger__bar--mid {
  transition-property: transform;
  transition-duration: 0.3s;
  transform: scaleX(0.1);
}

.is-opened .hamburger__bar--bot {
  transition-property: transform;
  transition-duration: 0.3s;
  transform: rotate(-45deg);
}

</style>
