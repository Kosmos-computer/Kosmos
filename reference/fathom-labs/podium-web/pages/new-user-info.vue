<template>
  <div class="flex bg-gray-50 pt-8 pr-8">
    <div class="flex flex-grow justify-center pt-12 pb-16">
      <Transition mode="out-in">
        <div class="flex flex-col items-center w-3/5 max-w-[464px]">
          <h1 class="text-4xl font-semibold tracking-tight text-gray-900 text-center">
            {{ t("Tell us more about you!") }}
          </h1>
          <h2 class="mt-6 leading-6 text-base leading-8 text-gray-500 font-medium text-center">
            {{ t("This helps us customize your experience.") }}
          </h2>
          <form @submit.prevent="updateUser" class="mt-6 flex flex-col gap-6">
            <BaseTUIInput
                :placeholder="t('Enter name here')"
                class="w-full"
                id="name"
                inputmode="text"
                v-model="name"
                :label="t('What is your name?')"
                required
            />
            <BaseTUIInput
                placeholder="https://"
                class="w-full"
                id="rss-feeds"
                type="text"
                inputmode="text"
                v-model="rssFeeds"
                :label="t('What is your RSS or Youtube channel address?')"
            />
            <BaseTUIInput
                :placeholder="t('Enter number')"
                class="w-full"
                id="podcast-count"
                type="text"
                inputmode="text"
                v-model="podcastCount"
                :label="t('How many podcasts do you create/manage?')"
                required
            />
            <BaseTUIInput
                :placeholder="t('Creator, Editor, Producer?')"
                class="w-full"
                id="role"
                type="text"
                inputmode="text"
                v-model="role"
                :label="t('What is your role?')"
                required
            />
            <div class="w-full relative">
              <label class="block text-sm font-medium leading-6 text-gray-900">{{ t("What's your podcast category?") }}</label>
              <VueMultiselect
                :options=category
                v-model="searchCategory"
                :close-on-select="true"
                :clear-on-select="false"
                :placeholder="t('Choose your Category')"
                class="cstSelect-holder">
                <template #caret>
                  <span class="inline-block absolute right-3 bottom-[10px]">
                    <ChevronDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </template>
                <template #noResult>
                  {{ t("Oops! No category found.") }}
                </template></VueMultiselect>
         
                
            </div>
            
           
            <div class="new-file-form__row">
           
            <Menu as="div" class="relative text-left w-full mr-0">
                <div>
                  <label class="block text-sm font-medium leading-6 text-gray-900">{{ t("How did you hear about Podium?") }}</label>
                  <MenuButton class="project-combobox set-speakers-form__combobox">
                     {{ t(selectAnOption) }} 
                    <ChevronDownIcon class=" mb-0 -mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                  </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
                  <MenuItems
                    class="absolute right-0 z-20 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div class="py-0 border-none" v-for="hearFromWhere in hearFromWhereAboutPodium">
                      <MenuItem v-slot="{ active  }">
                      <span  @click="updateOptions(hearFromWhere)"
                        :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm cursor-pointer relative',
                        ]">
                        {{ t(hearFromWhere) }}  
                        <span v-if="hearFromWhere==selectAnOption" class="slectedIcon absolute right-6 ">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 6.29289C20.0976 6.68342 20.0976 7.31658 19.7071 7.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L4.29289 13.7071C3.90237 13.3166 3.90237 12.6834 4.29289 12.2929C4.68342 11.9024 5.31658 11.9024 5.70711 12.2929L9 15.5858L18.2929 6.29289C18.6834 5.90237 19.3166 5.90237 19.7071 6.29289Z" fill="#0F1826"/>
                          </svg>
                        </span>
                      </span>
                    
                      </MenuItem>
                    </div>
                  </MenuItems>
                </transition>
              </Menu>
        </div>
            <BaseTUIButton type="submit" class="w-full" >
              {{ t("Next") }}
            </BaseTUIButton>
            <h2 v-if="updateUserError" class="text-red-500 font-bold mt-2">
            <div v-if="updateUserErrorMsg">{{updateUserErrorMsg}}</div>
            <div v-else>{{ t("Something went wrong. Please try again.") }}</div>

          </h2>
          </form>
        </div>
      </Transition>
    </div>
    <div v-if="podiumPackageGuid" class="flex mb-10 justify-end">
      <div class="bg-white rounded-2xl p-8 h-full w-[400px]">
        <h1 class="mt-4 text-2xl font-semibold tracking-tight text-gray-900 text-center">
          {{ t("File Progress") }}
        </h1>
        <h2 class="my-4 text-base font-medium leading-6 text-gray-400 text-center">
             {{ currentMedia? currentMedia.name :''}} 
        </h2>
        <JobItems v-if="!currentMediaLoading && currentMedia" :showDownloadFiles="false" :credits="totalCredits"  :processingError="currentMedia.processing_error"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "app"
});
import podiumUpdateUser from '~/apollo/mutations/podiumUpdateUser.gql'
import {useMainStore} from "~/store/main";
import { storeToRefs } from 'pinia'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import VueMultiselect from 'vue-multiselect'
import { computed } from 'vue';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});


const mainStore = useMainStore();
const { currentMediaLoading, currentMedia } = storeToRefs(mainStore)
const {isValidEmailAddress} = useValidations();
const name = ref('');
const companyName = ref('');
const podcastCount = ref('');
const role = ref('');
const rssFeeds = ref('');
const searchCategory = ref('')
const category = computed(() => [
  t.value('Arts'),
  t.value('Business'),
  t.value('Comedy'),
  t.value('Education'),
  t.value('Fiction'),
  t.value('Government'),
  t.value('History'),
  t.value('Health & Fitness'),
  t.value('Kids & Family'),
  t.value('Leisure & Entertainment'),
  t.value('Music'),
  t.value('News'),
  t.value('Spirituality & Religion'),
  t.value('Science'),
  t.value('Society & Culture'),
  t.value('Sports'),
  t.value('Technology'),
  t.value('True Crime'),
  t.value('TV & Film')
]);
const updateUserError = ref(false);
const podiumPackageGuid = useCookie<string>('podiumPackageGuid');
const processingCompleted = ref(false);
const originalFilename = ref('');
const signedUrl = ref('');
const userEmail = ref('');
const hearFrom= ref('')
const selectAnOption =ref('Select an option') 
const hearFromWhereAboutPodium = ref([
'Social media','Search engine','Referral','Podcast mention','Advertisement (Google or social media)'
])
onBeforeUnmount(() => {
  mainStore.clearCurrentMedia()
})
onMounted(() => {
  if (podiumPackageGuid.value) {
    mainStore.retrieveCurrentMedia(podiumPackageGuid.value)
  }

});
const updateOptions = (hearFromWhere) => {
    selectAnOption.value = hearFromWhere
  }
const updateUserErrorMsg = ref('');

const updateUser = async () => {
  updateUserErrorMsg.value = '';
  //check if searchCategory is empty or selectAnOption is empty send error
  if(searchCategory.value == '' || selectAnOption.value == 'Select an option'){
    updateUserError.value = true;
    updateUserErrorMsg.value = 'Please fill category and hear about podium fields';
    return;
  } 
  try {
    const { mutate, loading } = useMutation(podiumUpdateUser, {
      variables: {
        name: name.value,
        companyName: companyName.value,
        podcastCount: podcastCount.value,
        role: role.value,
        rssFeeds: rssFeeds.value,
        hearAboutPodium : selectAnOption.value,
        category: searchCategory.value
      }
    })

    const result = await mutate();
    if (result && result.data.podiumUpdateUser.ok) {
      await mainStore.retrieveUser();

      if(podiumPackageGuid.value && podiumPackageGuid.value.trim() !== "") {
        const packagePath = `/job/${podiumPackageGuid.value}`

        navigateTo({ path: packagePath})
      } else {
        navigateTo('/dashboard')
      }
    } else {
      updateUserError.value = true;
    }
  } catch (error) {
    updateUserError.value = true;
    console.log('error', error);
  }
}
const data = computed(() => {
        return {
            selectAnOption : selectAnOption.value 
        }
    })
    const totalCredits = computed(() => {
  var credits = Math.round(mainStore.user?.current_subscription_credits_balance + mainStore.user?.additional_credits_balance)
  if (credits < 0) {
    credits = 0
  }

  return credits
})
</script>

<style lang="scss" scoped>
form {
  max-width: 600px;
  width: 100%;
}
.project-combobox {
    @apply
    inline-flex w-full justify-between items-center
    gap-x-1.5 rounded-md bg-white
    px-3 py-2
    text-sm leading-6 font-normal text-gray-900
    shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
}
// .selected .slectedIcon.hidden {
//     display: block;
// }


.cstSelect-holder {
  display: block;
  width: 100%;
  position: relative;
  z-index: 20;
}




</style>
