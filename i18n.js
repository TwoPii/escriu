const fs = require("fs");
const path = require("path");

class I18n {
  constructor() {
    this.currentLanguage = "en";
    this.translations = {};
    this.loadTranslations();
  }

  loadTranslations() {
    const localesDir = path.join(__dirname, "locales");

    try {
      const enPath = path.join(localesDir, "en.json");
      if (fs.existsSync(enPath)) {
        this.translations.en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      }

      const caPath = path.join(localesDir, "ca.json");
      if (fs.existsSync(caPath)) {
        this.translations.ca = JSON.parse(fs.readFileSync(caPath, "utf-8"));
      }
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  }

  setLanguage(language) {
    if (this.translations[language]) {
      this.currentLanguage = language;
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key, fallback = "") {
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return fallback || key;
          }
        }
        break;
      }
    }

    return typeof value === "string" ? value : fallback || key;
  }

  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  getLanguageName(code) {
    const names = {
      en: "English",
      ca: "Català",
    };
    return names[code] || code;
  }
}

module.exports = new I18n();
