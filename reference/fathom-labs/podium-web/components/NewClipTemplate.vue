<template>
    <div>
      <div class="block text-lg leading-6 font-medium text-gray-900">
          {{ t('Background') }} 
      </div>
      <div class="block text-sm leading-5 font-regular text-gray-600 mt-2 flex flex-col">
          {{ t('Template will include the design settings as well as all the text positions and styles as well. Setting a template as default will apply the template to all the new clips by default.') }} 
      </div>
      <div class="relative flex flex-col items-center justify-center mt-7 mb-4">
          <div class="w-[100px] mx-auto	mt-8">
              <span class="block text-base text-sm text-gray-700">{{ t('Template Name') }}</span>
              <div class="mt-1">
                  <input id="color" v-model="colorCode" class="block w-full rounded-md border-0 py-1.5 px-2 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Template Name" />
              </div>
          </div>
      </div>
  
      <div class="form__actions">
              <button type="button" class="btn btn-submit" @click="saveColor">{{ t('Save') }}</button>
              <button type="button" class="btn btn-cancel" @click="handleClose" ref="cancelButtonRef">{{ t('Cancel') }}</button>
      </div>
    </div>  
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import languageStore from '@/store/LanguageStore';

  const t = computed(() => {
    return key => {
      const translation = languageStore.state.translations[key];
      return translation || key;  // Fallback to key if translation not found
    };
  });
  const runtimeConfig = useRuntimeConfig()
  const emit = defineEmits(['close','backgroundColor'])
  const props = defineProps(['source','selectedColorCode'])
  const colorCode = ref(props.selectedColorCode && props.selectedColorCode != 'null' ? props.selectedColorCode : '#FFFFFF');
  
  const handleClose = () => {
      emit('close')
  }
  function hueToRGBA(hue, alpha = 1) {
    const chroma = 1;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= huePrime && huePrime < 1) {
        r = chroma; g = x; b = 0;
    } else if (1 <= huePrime && huePrime < 2) {
        r = x; g = chroma; b = 0;
    } else if (2 <= huePrime && huePrime < 3) {
        r = 0; g = chroma; b = x;
    } else if (3 <= huePrime && huePrime < 4) {
        r = 0; g = x; b = chroma;
    } else if (4 <= huePrime && huePrime < 5) {
        r = x; g = 0; b = chroma;
    } else if (5 <= huePrime && huePrime < 6) {
        r = chroma; g = 0; b = x;
    }

    const m = 1 - chroma;
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `rgba(${r},${g},${b},${alpha})`;
}
function hexToHue(hex) {
    // Ensure the hex string is in the correct format
    if (hex.charAt(0) === '#') {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        hex = hex.split('').map(function(h) {
            return h + h;
        }).join('');
    }

    // Convert hex to RGB
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    // Find the maximum and minimum values of R, G, and B
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    // Calculate the hue
    let hue;
    if (max === min) {
        hue = 0; // Achromatic
    } else {
        const delta = max - min;
        switch (max) {
            case r:
                hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                hue = ((b - r) / delta + 2) * 60;
                break;
            case b:
                hue = ((r - g) / delta + 4) * 60;
                break;
        }
    }

    return Math.round(hue);
}

           

  
  const saveColor =()=>{
    var data = {
      color : colorCode.value,
      source : props.source
    }
    emit('backgroundColor', data)
    console.log(data, 'data')
    colorCode.value=''
    emit('close')
  }
  

  onMounted(()=>{
    var colorBlock = document.getElementById('color-block');
    let hueSlider = document.getElementById("slider-hue");
    var ctx1 = colorBlock.getContext('2d');
    var width1 = colorBlock.width;
    var height1 = colorBlock.height;
    ctx1.canvas.style.cursor = 'crosshair';
    

    var x = 0;
    var y = 0;
    var drag = false;
    var rgbaColor = hueToRGBA(hueSlider.value)
    


function getColorAt(x, y) {
                const imageData = ctx1.getImageData(x, y, 1, 1).data;
                return `rgba(${imageData[0]}, ${imageData[1]}, ${imageData[2]}, ${imageData[3] / 255})`;
            }
function findColor(targetColor) {
                const targetRGBA = targetColor.match(/\d+/g).map(Number);
                const threshold = 5; // Tolerance for color matching

                for (let x = 0; x < width1; x++) {
                    for (let y = 0; y < height1; y++) {
                        const color = getColorAt(x, y);
                        const colorRGBA = color.match(/\d+/g).map(Number);

                        const diff = colorRGBA.map((c, i) => Math.abs(c - targetRGBA[i]));
                        const distance = diff.reduce((acc, val) => acc + val);

                        if (distance < threshold) {
                            drawPointer(x,y)
                           // ctx1.strokeRect(x - 5, y - 5, 10, 10); // Draw a rectangle around the match
                            return { x, y };
                        }
                    }
                }
                return null;
            }

    ctx1.rect(0, 0, width1, height1);
    let test = hexToRgba(props.selectedColorCode);
    hueSlider.value = hexToHue(props.selectedColorCode);
    rgbaColor = hueToRGBA(hueSlider.value)
    fillGradient(hueToRGBA(hueSlider.value));
    findColor(test)
    document.documentElement.style.setProperty('--hue-wildcard', hueSlider.value);

    


    function hexToRgba(hex, alpha = 1) {
      hex = hex.replace(/^#/, '');
      let r = parseInt(hex.slice(0, 2), 16);
      let g = parseInt(hex.slice(2, 4), 16);
      let b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  
    hueSlider.oninput = function() {
      console.log(hueSlider.value, '111111')
      rgbaColor = hueToRGBA(hueSlider.value)
      fillGradient(rgbaColor)
      document.documentElement.style.setProperty('--hue-wildcard', hueSlider.value);
      console.log(rgbaToHex(rgbaColor), '1111111111111111111')
      colorCode.value = rgbaToHex(rgbaColor);
      
    }

    function fillGradient(rgba) {
       // Fill the canvas with the base color
    ctx1.fillStyle = rgba;
    ctx1.fillRect(0, 0, width1, height1);

    // Create a gradient from white to transparent
    var grdWhite = ctx1.createLinearGradient(0, 0, width1, 0);
    grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
    grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
    ctx1.fillStyle = grdWhite;
    ctx1.fillRect(0, 0, width1, height1);

    // Create a gradient from transparent to black
    var grdBlack = ctx1.createLinearGradient(0, 0, 0, height1);
    grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
    grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
    ctx1.fillStyle = grdBlack;
    ctx1.fillRect(0, 0, width1, height1);
    }

    function drawPointer(x, y) {
        ctx1.beginPath();
        ctx1.arc(x, y, 5, 0, 2 * Math.PI);
        ctx1.strokeStyle = 'white';
        ctx1.lineWidth = 2;
        ctx1.stroke();
        ctx1.closePath();
    }

    function mousedown(e) {
      drag = true;
      changeColor(e);
    }

    function mousemove(e) {
      if (drag) {
        changeColor(e);
      }
    }

    function mouseup(e) {
      drag = false;
    }
    function rgbaToHex(rgba) {
    // Extract RGBA components
    const rgbaRegex = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
    const matches = rgba.match(rgbaRegex);
    
    if (!matches) {
        throw new Error('Invalid RGBA color format');
    }
    
    // Convert to integers
    const r = parseInt(matches[1]);
    const g = parseInt(matches[2]);
    const b = parseInt(matches[3]);
    
    // Convert alpha if present
    let alpha = 255; // Default to opaque
    if (matches[4]) {
        alpha = Math.round(parseFloat(matches[4]) * 255);
    }
    
    // Convert to hex
    const rgbHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    const alphaHex = alpha.toString(16).padStart(2, '0');
    
    // Combine hex values
    const hex = `#${rgbHex}${alphaHex !== 'ff' ? alphaHex : ''}`;
    
    return hex.toUpperCase(); // Optionally return uppercase hex value
}

  

    function changeColor(e) {
      x = e.offsetX;
      y = e.offsetY;
      var imageData = ctx1.getImageData(x, y, 1, 1).data;
      var rgbaColorr = 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    
      colorCode.value = rgbaToHex(rgbaColorr);
      fillGradient(rgbaColor)
      drawPointer(x,y)
    }

  

    colorBlock.addEventListener("mousedown", mousedown, false);
    colorBlock.addEventListener("mouseup", mouseup, false);
    colorBlock.addEventListener("mousemove", mousemove, false);
    
  })
  </script>
  
  <style lang="scss" scoped>
  
.color-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 12px;
  border-radius: 10px;  
  outline: none;
}


.color-slider--lightness {
  background: pink;
}

.color-slider--hue {
  background: linear-gradient(to right,
                hsl(var(--hue-0), var(--saturation), var(--lightness)),
                hsl(var(--hue-30), var(--saturation), var(--lightness)),
                hsl(var(--hue-60), var(--saturation), var(--lightness)), 
                hsl(var(--hue-90), var(--saturation), var(--lightness)),
                hsl(var(--hue-120), var(--saturation), var(--lightness)), 
                hsl(var(--hue-150), var(--saturation), var(--lightness)), 
                hsl(var(--hue-180), var(--saturation), var(--lightness)),
                hsl(var(--hue-210), var(--saturation), var(--lightness)), 
                hsl(var(--hue-240), var(--saturation), var(--lightness)), 
                hsl(var(--hue-270), var(--saturation), var(--lightness)),
                hsl(var(--hue-300), var(--saturation), var(--lightness)),
                hsl(var(--hue-330), var(--saturation), var(--lightness)), 
                hsl(var(--hue-360), var(--saturation), var(--lightness)));
}

.color-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  border-radius: 50%; 
  border: 2px solid #ffffff;
  cursor: pointer;
  position: relative;
  background: hsl(var(--hue-wildcard), 100%, 50%);
}

.color-slider::-moz-range-thumb {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  cursor: pointer;
  background: hsl(var(--hue-wildcard), 100%, 50%);
}


  .form {
      &__actions {
          @apply
          mt-0
          sm:mt-0
          sm:flex
          sm:gap-x-3;
      }
  }
  .btn {
      @apply
      mt-3
      inline-flex
      w-full
      justify-center
      rounded-md
      px-3 py-2.5
      text-sm
      font-medium
      shadow-sm
      ring-1
      ring-inset
      sm:col-start-1
      sm:mt-0;
      
      &-submit {
          @apply
          bg-indigo-700
          ring-indigo-700
          text-white
          hover:bg-indigo-600
          hover:ring-indigo-600
      }
      &-cancel {
          @apply
          bg-white
          text-gray-900
          ring-gray-300
          hover:bg-gray-50;
      }
  }
  .color-display {
  width: 100px;
  height: 100px;
  margin-top: 10px;
  border: 1px solid #000;
}

input {
  margin-bottom: 10px;
}

p {
  color: red;
}


#color-input {
  display: none;
}
#color-label {
  margin-left: 15px;
  position: absolute;
  height: 30px;
  width: 50px;
} 
#color-input:checked ~ #color-picker {
  opacity: 1;
}


  </style>