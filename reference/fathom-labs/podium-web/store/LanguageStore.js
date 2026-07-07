// store/languageStore.js
import { reactive, readonly } from 'vue';

const state = reactive({
  selectedLanguage: 'en',  // Default language
  translations: {},
  isLoadingTranslations: true
});

const methods = {
  setLanguage(newLang) {
    localStorage.setItem('selectedLanguage', newLang);
    state.selectedLanguage = newLang;
    this.loadTranslations(newLang);
  },
  initializeLanguage() {
    const storedLang = localStorage.getItem('selectedLanguage');
    const browserLang = navigator.language.split('-')[0]; // Get base language, e.g., 'en' from 'en-US'

    if (storedLang) {
      this.setLanguage(storedLang);
    } else if (browserLang && this.isSupportedLanguage(browserLang)) {
      this.setLanguage(browserLang);
    } else {
      this.setLanguage('en'); // Default language if no match found
    }
  },
  isSupportedLanguage(lang) {
    const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ar', 'zh']; // List your supported language codes
    return supportedLanguages.includes(lang);
  },
  async loadTranslations(lang) {
    state.isLoadingTranslations = true;  // Start loading
    try {
      const translations = await import(`@/assets/translations/${lang}.json`);
      state.translations = translations.default;
    } catch (error) {
      console.error('Failed to load translations:', error);
      state.translations = {};
    } finally {
      state.isLoadingTranslations = false;  // Stop loading after translations are loaded
    }
  }
};

export default {
  state: readonly(state),
  methods
};
