<template>
  <div class="h-[100vh] flex flex-col pt-16 pb-16 px-8 xl:px-0 items-center bg-black overflow-scroll">
    <button 
      v-if="step > 0" 
      @click="step--" 
      class="absolute top-0 left-0 m-4 bg-black text-black p-2 rounded-full"
    >
      Back
    </button>
    
    <div class="w-full text-center m-auto" v-if="step === 0">
      <div class="flex justify-center">
        <svg width="367" height="418" viewBox="0 0 367 418" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M27.0853 388.885H14.7615V417.924H0V342.294H27.0853C44.7991 342.294 53.656 352.593 53.656 365.702C53.656 377.192 46.0725 388.88 27.0853 388.88V388.885ZM26.4563 376.653C34.7779 376.653 38.4735 372.427 38.4735 365.707C38.4735 358.987 34.7779 354.65 26.4563 354.65H14.7615V376.653H26.4563Z" fill="white"/>
        <path d="M82.321 417.917C65.4545 417.917 52.6993 405.781 52.6993 386.929C52.6993 368.078 65.8703 355.941 82.742 355.941C99.6138 355.941 112.795 367.976 112.795 386.929C112.795 405.882 99.302 417.917 82.3262 417.917H82.321ZM82.321 404.696C90.128 404.696 97.6127 398.852 97.6127 386.929C97.6127 375.006 90.3359 369.162 82.5289 369.162C74.722 369.162 67.6687 374.905 67.6687 386.929C67.6687 398.954 74.4153 404.696 82.321 404.696Z" fill="white"/>
        <path d="M143.282 355.942C150.975 355.942 158.366 359.622 162.363 365.269V336.775H177.332V416.945H162.363V408.062C158.891 413.591 152.352 417.918 143.183 417.918C128.323 417.918 116.519 405.455 116.519 386.716C116.519 367.977 128.328 355.942 143.282 355.942ZM146.978 369.28C139.072 369.28 131.587 375.343 131.587 386.716C131.587 398.089 139.072 404.595 146.978 404.595C154.884 404.595 162.477 398.308 162.477 386.93C162.477 375.552 155.091 369.28 146.978 369.28Z" fill="white"/>
        <path d="M185.028 356.919H199.79V416.945H185.028V356.919Z" fill="white"/>
        <path d="M262.73 416.945H247.87V409.365C244.174 414.451 237.75 417.704 230.473 417.704C216.87 417.704 207.067 408.607 207.067 392.133V356.919H221.829V389.969C221.829 399.611 226.985 404.809 234.792 404.809C242.599 404.809 247.87 399.606 247.87 389.969V356.919H262.73V416.945Z" fill="white"/>
        <path d="M352.234 383.793C352.234 374.253 347.062 369.28 339.271 369.28C331.479 369.28 326.193 374.253 326.193 383.793V416.945H311.432V383.793C311.432 374.253 306.276 369.28 298.469 369.28C290.662 369.28 285.298 374.253 285.298 383.793V416.945H270.536V356.919H285.298V364.184C288.978 359.2 295.194 356.059 302.471 356.059C311.546 356.059 319.031 360.07 323.033 367.533C326.827 360.711 334.52 356.059 343.065 356.059C357.088 356.059 367 365.156 367 381.731V416.945H352.239V383.793H352.234Z" fill="white"/>
        <path d="M192.508 349.771C197.281 349.771 201.151 345.794 201.151 340.888C201.151 335.981 197.281 332.004 192.508 332.004C187.734 332.004 183.864 335.981 183.864 340.888C183.864 345.794 187.734 349.771 192.508 349.771Z" fill="white"/>
        <path d="M214.909 147.389H85.8985V279.977H214.909V147.389Z" fill="white"/>
        <path d="M229.238 191.584C280.713 191.584 322.446 148.693 322.446 95.7918C322.446 42.8902 280.728 0 229.238 0V191.584Z" fill="white"/>
        <path d="M150.411 132.68C186.041 132.68 214.924 102.996 214.924 66.3781C214.924 29.7605 186.041 0.0761719 150.411 0.0761719C114.782 0.0761719 85.8985 29.7605 85.8985 66.3781C85.8985 102.996 114.782 132.68 150.411 132.68Z" fill="white"/>
        </svg>
      </div>

      <div class="text-white font-bold text-center mb-2 mt-16 mx-20" style="font-size: 50pt;">
        Turn your podcast into a book.
      </div>


      <div class="w-full flex items-center pr-[30px]">
        <button @click="start()" class=" m-auto w-[420px] mt-16 bg-indigo-700 text-white text-4xl font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
          START
        </button>
      </div>
      
    </div>

    <div class="w-full sm:w-3/5 max-w-[464px]" v-if="step === 1">
      <div class="mb-32">
        <svg width="451" height="90" viewBox="0 0 451 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M294.858 8.31029C294.858 12.8999 291.237 16.6206 286.771 16.6206C282.306 16.6206 278.685 12.8999 278.685 8.31029C278.685 3.72064 282.306 0 286.771 0C291.237 0 294.858 3.72064 294.858 8.31029ZM76.0383 30.793C76.0383 47.7984 62.6231 61.5855 46.0765 61.5855V0.000448826C62.6279 0.000448826 76.0383 13.7876 76.0383 30.793ZM0 47.3781H41.4709V89.999H0V47.3781ZM20.7379 42.651C32.1911 42.651 41.4758 33.1089 41.4758 21.3381C41.4758 9.56725 32.1911 0.0251343 20.7379 0.0251343C9.28467 0.0251343 0 9.56725 0 21.3381C0 33.1089 9.28467 42.651 20.7379 42.651ZM120.49 53.2113H132.018V53.2063C149.78 53.2063 156.875 42.2725 156.875 31.5236C156.875 19.2605 148.589 9.62598 132.018 9.62598H106.681V80.3759H120.49V53.2113ZM142.672 31.5286C142.672 37.815 139.215 41.7677 131.43 41.7677H120.49V21.1844H131.43C139.215 21.1844 142.672 25.2421 142.672 31.5286ZM183.694 80.3695C167.916 80.3695 155.983 69.016 155.983 51.381C155.983 33.746 168.305 22.3924 184.088 22.3924C199.871 22.3924 212.202 33.651 212.202 51.381C212.202 69.1109 199.579 80.3695 183.699 80.3695H183.694ZM183.694 68.0015C190.997 68.0015 197.999 62.5346 197.999 51.381C197.999 40.2273 191.192 34.7604 183.888 34.7604C176.585 34.7604 169.987 40.1323 169.987 51.381C169.987 62.6296 176.298 68.0015 183.694 68.0015ZM258.569 31.118C254.829 25.836 247.915 22.393 240.719 22.393C226.73 22.393 215.683 33.6516 215.683 51.1816C215.683 68.7117 226.725 80.3701 240.626 80.3701C249.204 80.3701 255.32 76.3224 258.569 71.1503V79.4606H272.572V4.46313H258.569V31.118ZM229.779 51.1816C229.779 40.5427 236.78 34.8709 244.176 34.8709C251.766 34.8709 258.675 40.7376 258.675 51.3815C258.675 62.0255 251.572 67.9072 244.176 67.9072C236.78 67.9072 229.779 61.8206 229.779 51.1816ZM279.772 23.3071H293.581V79.4603H279.772V23.3071ZM338.556 79.4603H352.458V23.3071H338.556V54.2246C338.556 63.2395 333.626 68.1067 326.323 68.1067C319.019 68.1067 314.196 63.2445 314.196 54.2246V23.3071H300.387V56.2484C300.387 71.6597 309.557 80.1699 322.282 80.1699C329.089 80.1699 335.099 77.1266 338.556 72.3693V79.4603ZM436.188 48.4481C436.188 39.5232 431.35 34.8708 424.061 34.8708C416.772 34.8708 411.827 39.5232 411.827 48.4481V79.4605H398.018V48.4481C398.018 39.5232 393.195 34.8708 385.892 34.8708C378.588 34.8708 373.57 39.5232 373.57 48.4481V79.4605H359.761V23.3074H373.57V30.1035C377.013 25.4411 382.828 22.5028 389.636 22.5028C398.125 22.5028 405.127 26.2557 408.871 33.2367C412.421 26.8553 419.617 22.5028 427.61 22.5028C440.729 22.5028 450.001 31.013 450.001 46.5192V79.4605H436.192V48.4481H436.188Z" fill="white"/>
        </svg>
      </div>

      <h1 class="text-4xl font-semibold tracking-tight text-white text-left mb-10">
        What's your email?
      </h1>

      <form @submit.prevent="submitEmail()" class="flex flex-col gap-6">
        <input
                v-model="email"
                class="block w-full border-b-2 border-r-0 border-t-0 border-l-0 border-white bg-transparent py-1.5 text-white text-4xl shadow-none placeholder:text-white outline-none focus:ring-0 focus:border-white pl-0"
                style="border-radius: 0; -webkit-appearance: none;"
                id="email"
                type="email"
        />
        <button type="submit" class=" m-auto w-full mt-24 bg-indigo-700 text-white text-4xl font-medium rounded-lg py-2 px-4 hover:bg-indigo-600 transition-all">
          NEXT
        </button>
      </form>
      <div v-if="error != null" class="text-red-800 font-medium leading-5 px-6 py-4 rounded-md bg-red-50 mt-6">
        <SvgError class="inline mr-3" /> {{ error }}
      </div>
    </div>
    <div class="w-full sm:w-3/5 max-w-[464px]" v-else-if="step === 2">
      <div class="mb-32">
        <svg width="451" height="90" viewBox="0 0 451 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M294.858 8.31029C294.858 12.8999 291.237 16.6206 286.771 16.6206C282.306 16.6206 278.685 12.8999 278.685 8.31029C278.685 3.72064 282.306 0 286.771 0C291.237 0 294.858 3.72064 294.858 8.31029ZM76.0383 30.793C76.0383 47.7984 62.6231 61.5855 46.0765 61.5855V0.000448826C62.6279 0.000448826 76.0383 13.7876 76.0383 30.793ZM0 47.3781H41.4709V89.999H0V47.3781ZM20.7379 42.651C32.1911 42.651 41.4758 33.1089 41.4758 21.3381C41.4758 9.56725 32.1911 0.0251343 20.7379 0.0251343C9.28467 0.0251343 0 9.56725 0 21.3381C0 33.1089 9.28467 42.651 20.7379 42.651ZM120.49 53.2113H132.018V53.2063C149.78 53.2063 156.875 42.2725 156.875 31.5236C156.875 19.2605 148.589 9.62598 132.018 9.62598H106.681V80.3759H120.49V53.2113ZM142.672 31.5286C142.672 37.815 139.215 41.7677 131.43 41.7677H120.49V21.1844H131.43C139.215 21.1844 142.672 25.2421 142.672 31.5286ZM183.694 80.3695C167.916 80.3695 155.983 69.016 155.983 51.381C155.983 33.746 168.305 22.3924 184.088 22.3924C199.871 22.3924 212.202 33.651 212.202 51.381C212.202 69.1109 199.579 80.3695 183.699 80.3695H183.694ZM183.694 68.0015C190.997 68.0015 197.999 62.5346 197.999 51.381C197.999 40.2273 191.192 34.7604 183.888 34.7604C176.585 34.7604 169.987 40.1323 169.987 51.381C169.987 62.6296 176.298 68.0015 183.694 68.0015ZM258.569 31.118C254.829 25.836 247.915 22.393 240.719 22.393C226.73 22.393 215.683 33.6516 215.683 51.1816C215.683 68.7117 226.725 80.3701 240.626 80.3701C249.204 80.3701 255.32 76.3224 258.569 71.1503V79.4606H272.572V4.46313H258.569V31.118ZM229.779 51.1816C229.779 40.5427 236.78 34.8709 244.176 34.8709C251.766 34.8709 258.675 40.7376 258.675 51.3815C258.675 62.0255 251.572 67.9072 244.176 67.9072C236.78 67.9072 229.779 61.8206 229.779 51.1816ZM279.772 23.3071H293.581V79.4603H279.772V23.3071ZM338.556 79.4603H352.458V23.3071H338.556V54.2246C338.556 63.2395 333.626 68.1067 326.323 68.1067C319.019 68.1067 314.196 63.2445 314.196 54.2246V23.3071H300.387V56.2484C300.387 71.6597 309.557 80.1699 322.282 80.1699C329.089 80.1699 335.099 77.1266 338.556 72.3693V79.4603ZM436.188 48.4481C436.188 39.5232 431.35 34.8708 424.061 34.8708C416.772 34.8708 411.827 39.5232 411.827 48.4481V79.4605H398.018V48.4481C398.018 39.5232 393.195 34.8708 385.892 34.8708C378.588 34.8708 373.57 39.5232 373.57 48.4481V79.4605H359.761V23.3074H373.57V30.1035C377.013 25.4411 382.828 22.5028 389.636 22.5028C398.125 22.5028 405.127 26.2557 408.871 33.2367C412.421 26.8553 419.617 22.5028 427.61 22.5028C440.729 22.5028 450.001 31.013 450.001 46.5192V79.4605H436.192V48.4481H436.188Z" fill="white"/>
        </svg>
      </div>
      <h1 class="text-4xl font-semibold tracking-tight text-white text-left mb-10">
        Find your Pod.
      </h1>

      <form @submit.prevent="submitPodcast()" class="flex flex-col gap-6">
        <div class="relative">
          <div>
            <div class="mt-1">
              <input
                v-model="podcastTitle"
                class="block w-full border-b-2 border-white bg-transparent py-1.5 text-white text-4xl shadow-none placeholder:text-white outline-none focus:ring-0"
                style="border-radius: 0; -webkit-appearance: none;"
                id="podcastTitle"
              />
            </div>
          </div>
          <div v-if="searchResults" class="mt-8 mb-16">
            <div class="my-4 text-white text-xl font-normal w-full m-auto italic">Tap to select</div>
            <div v-for="result in searchResults" :key="result.id" @click="selectPodcast(result.title_original, result.id, result.rss)" class="cursor-pointer p-2 mb-4 flex items-center">
              <img :src="result.thumbnail" alt="Podcast Thumbnail" class="w-16 h-16 mr-2 rounded" />
              <div class="flex-grow truncate text-white text-xl font-semibold ml-4">
              {{ result.title_original }}
              </div>
            </div>
          </div>
        </div>
      </form>
      <div v-if="error != null" class="text-red-800 font-medium leading-5 px-6 py-4 rounded-md bg-red-50 mt-6">
        <SvgError class="inline mr-3" /> {{ error }}
      </div>
    </div>
    <div class="w-full sm:w-3/5 max-w-[450px]" v-else-if="step === 3">
      <div class="mb-32">
        <svg width="451" height="90" viewBox="0 0 451 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M294.858 8.31029C294.858 12.8999 291.237 16.6206 286.771 16.6206C282.306 16.6206 278.685 12.8999 278.685 8.31029C278.685 3.72064 282.306 0 286.771 0C291.237 0 294.858 3.72064 294.858 8.31029ZM76.0383 30.793C76.0383 47.7984 62.6231 61.5855 46.0765 61.5855V0.000448826C62.6279 0.000448826 76.0383 13.7876 76.0383 30.793ZM0 47.3781H41.4709V89.999H0V47.3781ZM20.7379 42.651C32.1911 42.651 41.4758 33.1089 41.4758 21.3381C41.4758 9.56725 32.1911 0.0251343 20.7379 0.0251343C9.28467 0.0251343 0 9.56725 0 21.3381C0 33.1089 9.28467 42.651 20.7379 42.651ZM120.49 53.2113H132.018V53.2063C149.78 53.2063 156.875 42.2725 156.875 31.5236C156.875 19.2605 148.589 9.62598 132.018 9.62598H106.681V80.3759H120.49V53.2113ZM142.672 31.5286C142.672 37.815 139.215 41.7677 131.43 41.7677H120.49V21.1844H131.43C139.215 21.1844 142.672 25.2421 142.672 31.5286ZM183.694 80.3695C167.916 80.3695 155.983 69.016 155.983 51.381C155.983 33.746 168.305 22.3924 184.088 22.3924C199.871 22.3924 212.202 33.651 212.202 51.381C212.202 69.1109 199.579 80.3695 183.699 80.3695H183.694ZM183.694 68.0015C190.997 68.0015 197.999 62.5346 197.999 51.381C197.999 40.2273 191.192 34.7604 183.888 34.7604C176.585 34.7604 169.987 40.1323 169.987 51.381C169.987 62.6296 176.298 68.0015 183.694 68.0015ZM258.569 31.118C254.829 25.836 247.915 22.393 240.719 22.393C226.73 22.393 215.683 33.6516 215.683 51.1816C215.683 68.7117 226.725 80.3701 240.626 80.3701C249.204 80.3701 255.32 76.3224 258.569 71.1503V79.4606H272.572V4.46313H258.569V31.118ZM229.779 51.1816C229.779 40.5427 236.78 34.8709 244.176 34.8709C251.766 34.8709 258.675 40.7376 258.675 51.3815C258.675 62.0255 251.572 67.9072 244.176 67.9072C236.78 67.9072 229.779 61.8206 229.779 51.1816ZM279.772 23.3071H293.581V79.4603H279.772V23.3071ZM338.556 79.4603H352.458V23.3071H338.556V54.2246C338.556 63.2395 333.626 68.1067 326.323 68.1067C319.019 68.1067 314.196 63.2445 314.196 54.2246V23.3071H300.387V56.2484C300.387 71.6597 309.557 80.1699 322.282 80.1699C329.089 80.1699 335.099 77.1266 338.556 72.3693V79.4603ZM436.188 48.4481C436.188 39.5232 431.35 34.8708 424.061 34.8708C416.772 34.8708 411.827 39.5232 411.827 48.4481V79.4605H398.018V48.4481C398.018 39.5232 393.195 34.8708 385.892 34.8708C378.588 34.8708 373.57 39.5232 373.57 48.4481V79.4605H359.761V23.3074H373.57V30.1035C377.013 25.4411 382.828 22.5028 389.636 22.5028C398.125 22.5028 405.127 26.2557 408.871 33.2367C412.421 26.8553 419.617 22.5028 427.61 22.5028C440.729 22.5028 450.001 31.013 450.001 46.5192V79.4605H436.192V48.4481H436.188Z" fill="white"/>
        </svg>
      </div>
      <h1 class="text-4xl font-semibold tracking-tight text-white text-left mb-10">
        Choose an episode.
      </h1>
      <div class="flex flex-col gap-6 mb-16">
        <div @click="submitEpisode(episode)" v-for="episode in episodes" :key="episode.title" class="flex items-center text-sm font-medium text-gray-700">
          <div class="w-16 h-16">
            <img :src="episode.image" alt="Episode Thumbnail" class="w-16 h-16 rounded object-cover" />
          </div>
          <div class="text-white text-lg font-medium ml-4" style="max-width: 370px;">
            <p class="overflow-ellipsis overflow-hidden" :style="{ 'textOverflow': 'ellipsis', 'display': '-webkit-box', 'WebkitLineClamp': 2, 'WebkitBoxOrient': 'vertical' }">{{ episode.title }}</p>
          </div>
        </div>
      </div>
      <div v-if="error != null" class="text-red-800 font-medium leading-5 px-6 py-4 rounded-md bg-red-50 mt-6">
        <SvgError class="inline mr-3" /> {{ error }}
      </div>
    </div>
    <div class="w-full text-center m-auto" v-else-if="step === 4">
      <div class="flex justify-center">
        <svg width="367" height="418" viewBox="0 0 367 418" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M27.0853 388.885H14.7615V417.924H0V342.294H27.0853C44.7991 342.294 53.656 352.593 53.656 365.702C53.656 377.192 46.0725 388.88 27.0853 388.88V388.885ZM26.4563 376.653C34.7779 376.653 38.4735 372.427 38.4735 365.707C38.4735 358.987 34.7779 354.65 26.4563 354.65H14.7615V376.653H26.4563Z" fill="white"/>
        <path d="M82.321 417.917C65.4545 417.917 52.6993 405.781 52.6993 386.929C52.6993 368.078 65.8703 355.941 82.742 355.941C99.6138 355.941 112.795 367.976 112.795 386.929C112.795 405.882 99.302 417.917 82.3262 417.917H82.321ZM82.321 404.696C90.128 404.696 97.6127 398.852 97.6127 386.929C97.6127 375.006 90.3359 369.162 82.5289 369.162C74.722 369.162 67.6687 374.905 67.6687 386.929C67.6687 398.954 74.4153 404.696 82.321 404.696Z" fill="white"/>
        <path d="M143.282 355.942C150.975 355.942 158.366 359.622 162.363 365.269V336.775H177.332V416.945H162.363V408.062C158.891 413.591 152.352 417.918 143.183 417.918C128.323 417.918 116.519 405.455 116.519 386.716C116.519 367.977 128.328 355.942 143.282 355.942ZM146.978 369.28C139.072 369.28 131.587 375.343 131.587 386.716C131.587 398.089 139.072 404.595 146.978 404.595C154.884 404.595 162.477 398.308 162.477 386.93C162.477 375.552 155.091 369.28 146.978 369.28Z" fill="white"/>
        <path d="M185.028 356.919H199.79V416.945H185.028V356.919Z" fill="white"/>
        <path d="M262.73 416.945H247.87V409.365C244.174 414.451 237.75 417.704 230.473 417.704C216.87 417.704 207.067 408.607 207.067 392.133V356.919H221.829V389.969C221.829 399.611 226.985 404.809 234.792 404.809C242.599 404.809 247.87 399.606 247.87 389.969V356.919H262.73V416.945Z" fill="white"/>
        <path d="M352.234 383.793C352.234 374.253 347.062 369.28 339.271 369.28C331.479 369.28 326.193 374.253 326.193 383.793V416.945H311.432V383.793C311.432 374.253 306.276 369.28 298.469 369.28C290.662 369.28 285.298 374.253 285.298 383.793V416.945H270.536V356.919H285.298V364.184C288.978 359.2 295.194 356.059 302.471 356.059C311.546 356.059 319.031 360.07 323.033 367.533C326.827 360.711 334.52 356.059 343.065 356.059C357.088 356.059 367 365.156 367 381.731V416.945H352.239V383.793H352.234Z" fill="white"/>
        <path d="M192.508 349.771C197.281 349.771 201.151 345.794 201.151 340.888C201.151 335.981 197.281 332.004 192.508 332.004C187.734 332.004 183.864 335.981 183.864 340.888C183.864 345.794 187.734 349.771 192.508 349.771Z" fill="white"/>
        <path d="M214.909 147.389H85.8985V279.977H214.909V147.389Z" fill="white"/>
        <path d="M229.238 191.584C280.713 191.584 322.446 148.693 322.446 95.7918C322.446 42.8902 280.728 0 229.238 0V191.584Z" fill="white"/>
        <path d="M150.411 132.68C186.041 132.68 214.924 102.996 214.924 66.3781C214.924 29.7605 186.041 0.0761719 150.411 0.0761719C114.782 0.0761719 85.8985 29.7605 85.8985 66.3781C85.8985 102.996 114.782 132.68 150.411 132.68Z" fill="white"/>
        </svg>
      </div>

      <div class="text-white font-bold text-center mb-0 mt-20 mx-20" style="font-size: 50pt;">
        We're making your Podbook!
      </div>
      <div class="text-white font-medium text-center mb-0 mt-20 mx-20" style="font-size: 20pt;">
        Estimated wait time 20 minutes.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import _ from "lodash";

import { definePageMeta } from '#imports'
import checkCircleSvgSource from '@/assets/icons/check-circle.svg'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'


definePageMeta({
  layout: "empty",
  auth: false
});

const runtimeConfig = useRuntimeConfig()

const step = ref(0);
const error = ref(null);
const email = ref('');

const podcastId = ref('');
const podcastRssUrl = ref('');
const podcastTitle = ref('');
const searchResults = ref(null);
const searchEnabled = ref(true);
const nextButtonEnabled = ref(false);
const selectedEpisode = ref(null);

const episodes = ref([]);

onMounted(async () => {
  Intercom('update', {
    "hide_default_launcher": true
  });
})

const start = () => {
  step.value = 1
  // set active focus to email input
  setTimeout(() => {
    const emailElement = document.getElementById('email');
    console.log(emailElement)
    if(emailElement) emailElement.focus();
  }, 300)
}

const selectPodcast = async (title, id, rss) => {
  searchEnabled.value = false;

  podcastId.value = id;
  podcastTitle.value = title;
  podcastRssUrl.value = rss;

  searchResults.value = null;

  // Reset episodes list
  episodes.value = [];

  // Start the recursive fetching
  await fetchEpisodes();

  step.value = 3;

  setTimeout(() => {
    searchEnabled.value = true;
  }, 500);
};

watch(podcastTitle, _.throttle(async (newValue) => {
  if (searchEnabled.value && newValue && newValue.length > 1) {
    try {
      const response = await axios.get(`https://listen-api.listennotes.com/api/v2/search?q=${newValue}&type=podcast&page_size=10`, {
        headers: {
          'Authorization': `Bearer d5e47a2bd7564602854aa3f44f8ca701`
        }
      });

      nextButtonEnabled.value = false;
      searchResults.value = response.data.results;
    } catch (err) {
      console.error('Error searching for podcast titles:', err);
    }
  }
}, 500));

const isValidEmail = () => {
  const emailRegex = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (!emailRegex.test(email.value)) {
    return false
  }
  return true;
}

const submitEmail = () => {
  if (isValidEmail()) {
    step.value = 2
    // set active focus to podcastTitle input
    setTimeout(() => {
      const podcastTitleElement = document.getElementById('podcastTitle');
      console.log(podcastTitleElement)
      if(podcastTitleElement) podcastTitleElement.focus();
    }, 300)
    error.value = null
  } else {
    error.value = 'This is not a valid email address.'
  }
}

const fetchEpisodes = async (nextEpisodePubDate, callCount = 0) => {
  if (callCount >= 3) return; // Stop after 3 recursive calls

  try {
    const response = await axios.get(`https://listen-api.listennotes.com/api/v2/podcasts/${podcastId.value}`, {
      headers: {
        'Authorization': `Bearer d5e47a2bd7564602854aa3f44f8ca701`
      },
      params: {
        next_episode_pub_date: nextEpisodePubDate,
        // Add any other parameters here if required, e.g., to limit the number of episodes returned
      }
    });

    // Append episodes to existing list
    episodes.value = episodes.value.concat(response.data.episodes.map(episode => ({
      title: episode.title,
      image: episode.thumbnail,
      audio: episode.audio,
      rss_guid: episode.guid_from_rss
    })));

    // Call recursively with the next_episode_pub_date for pagination
    await fetchEpisodes(response.data.next_episode_pub_date, callCount + 1);
  } catch (err) {
    console.error('Error fetching podcast episodes:', err);
    error.value = 'Failed to retrieve episodes. Please try again later.';
  }
};

const submitEpisode = (episode) => {
  selectedEpisode.value = episode;
  if (selectedEpisode.value) {
    step.value = 4
    // console log all of the consts with a description of what they are
    console.log('email', email.value)
    console.log('podcast_rss_url', podcastRssUrl.value)
    console.log('podcast_episode_rss_guid', selectedEpisode.value.rss_guid)
    console.log('file_url', selectedEpisode.value.audio)

    fetch(`${runtimeConfig.public.fathomWebApiURL}/api/podium/internal/v1/expo/7516a8f7-25b2-4f99-ba16-ac2651eb571c`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.value,
                podcast_rss_url: podcastRssUrl.value,
                podcast_episode_rss_guid: selectedEpisode.value.rss_guid,
                file_url: selectedEpisode.value.audio
            })
        })
        .then((response) => {
            if (response.ok) {
                return response.json()
            } else {
                return response.text().then(text => { throw new Error(text) })
            }
        })
        .then(data => {
          // reset the form in 5 seconds
          setTimeout(() => {
            step.value = 0
            email.value = ''
            podcastId.value = ''
            podcastTitle.value = ''
            podcastRssUrl.value = ''
            selectedEpisode.value = null
            error.value = null
          }, 5000)

        })
        .catch((error) => {
            alert(error)
        })
  } else {
    error.value = 'Please select an episode.'
  }
}

</script>

<style lang="scss" scoped>
form {
  max-width: 600px;
  width: 100%;
}
#__nuxt {
  height: 100%;
}
</style>
