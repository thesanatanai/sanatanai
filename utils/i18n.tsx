"use client"

import { All } from "@/app/(root)/AllContext";
import { useContext } from "react";
import Markdown from "./md";

const defaultLocale = 'hi';
const fallbackLocale = 'hi';

export const locales = {
  en: {
    siteTitle: 'SANATAN AI',
    termsTitle: 'Terms of Service',
    termsIntro: 'By using Sanatan AI, you agree to the following terms and conditions:',
    termsList1: 'This AI is for informational and educational purposes related to Sanatan Dharma.',
    termsList2: 'The information provided may not always be 100% accurate. Please consult with qualified spiritual teachers for profound matters.',
    termsList3: 'Do not use this service for any illegal or malicious activities.',
    termsList4: '**Sanatan AI\'s Responses** are powered by Gemini',
    termsList5: 'Animated Icons are from [LordIcon](https://lordicon.com)',
    termsList6: 'Your conversations may be used anonymously to improve the AI model.',
    termsList7: 'We reserve the right to change these terms at any time.',
    agreeProceed: 'Agree & Proceed',
    welcomeSeeker: 'Welcome Seeker',
    loginJourney: 'Login to begin your journey.',
    almostThere: 'Almost There!',
    tellAboutYou: 'Tell about you.',
    enterNameLabel: 'Enter your Name:',
    startAi: 'Start AI',
    newChat: 'New Chat',
    newChatTooltip: 'Start a new conversation',
    aiTools: 'AI Tools',
    enhancePrompt: 'Enhance Prompt',
    uploadFile: 'Upload File',
    deepThink: 'Deep Think',
    search: 'Search in Chat',
    voice: 'Speak',
    send: 'Send',
    deleteAllMessages: 'Delete All Messages',
    profileTooltip: 'Customize your Sanatan AI experience',
    searchGeetaTooltip: 'Search and explore Bhagavad Gita verses',
    onPressEnter: 'When pressing Enter:',
    sendMessageOption: 'Send message',
    goToNextLine: 'Insert newline',
    manageAIMemory: 'Manage AI memory',
    sorrySomethingWrong: 'Sorry, Something went wrong',
    errorInvalidEmail: "Error: Invalid email",
    errorInvalidOtp: "Error: Invalid OTP",
    regenerateResponse: 'Regenerate response?',
    pleaseSelectChat: "Select a chat, or tap 'New Chat' in the top-right.",
    pleaseWriteMessage: 'Please write a message...',
    fileLimitExceeded: 'File limit exceeded',
    unsupportedFileType: 'This file type is not supported',
    messageCopied: 'Message copied',
    deleteAllConfirmation: 'Are you sure you want to delete all messages?',
    pleaseEnterTextToEnhance: 'Please enter text to enhance.',
    failedToEnhancePrompt: 'Unable to enhance prompt.',
    memoryAdded: 'Memory added',
    noMemoriesStored: 'No memories stored.',
    addNewMemory: 'Add new memory...',
    add: 'Add',
    remove: 'Remove',
    nameLabel: 'Name:',
    themeLabel: 'Theme',
    emailLabel: "Enail: ",
    themeAuto: 'Auto',
    submit: "Submit",
    themeLight: 'Light',
    sendOTP: "Send OTP",
    themeDark: 'Dark',
    languageLabel: 'Language',
    deleteLabel: 'Delete Chat',
    settingsTitle: 'Settings',
    historyToday: 'Today',
    historyYesterday: 'Yesterday',
    historyLast7Days: 'Previous 7 Days',
    historyOlder: 'Older',
    greetingHello: 'Hello',
    guestName: 'Guest',
    samplePrompts: [
      'What should I do when bored?',
      'Write me an essay..',
      'What is Programming?',
      'Tell me about Lord Rama..',
      'Suggest a book to read..',
      'What is the meaning of life?',
      'How to manage stress?',
      'Explain quantum physics',
      'Give me some healthy recipes',
    ],
    googleLogin: 'Sign in with Google',
    searchGeetaButton: 'Bhagavad Gita',
    persona: "Custom instruction for AI",
    chatActions: "Chat Actions",
    import: "Import / Export",
    importChat: "Import a Chat",
    exportChat: "Export current Chat",
    loginError: "Login Error..",
    errorReading: "Error reading file",
    successfullyRemoved: "Successfully removed file..",
    changedSetting: "{setting} successfully changed.."
  },
  hi: {
    siteTitle: 'सनातन एआई',
    termsTitle: 'सेवा की शर्तें',
    termsIntro: 'Sanatan AI का उपयोग करके, आप निम्नलिखित नियमों और शर्तों से सहमत होते हैं:',
    termsList1: 'यह एआई सनातन धर्म से संबंधित जानकारी और शैक्षिक उद्देश्यों के लिए है।',
    termsList2: 'प्रदान की गई जानकारी हमेशा 100% सही नहीं हो सकती। गहरी समझ के लिए योग्य आध्यात्मिक शिक्षकों से परामर्श करें।',
    termsList3: 'कृपया किसी भी अवैध या दुष्ट गतिविधियों के लिए इस सेवा का उपयोग न करें।',
    termsList4: '**Sanatan AI के उत्तर** Gemini द्वारा समर्थित हैं',
    termsList5: 'एनिमेटेड आइकन [LordIcon](https://lordicon.com) से हैं',
    termsList6: 'आपकी बातचीत को मॉडेल सुधारने के लिए गुमनाम रूप से उपयोग किया जा सकता है।',
    termsList7: 'हम किसी भी समय इन शर्तों को बदलने का अधिकार सुरक्षित रखते हैं।',
    agreeProceed: 'सहमत हूं और आगे बढ़ें',
    welcomeSeeker: 'स्वागत साधक',
    loginJourney: 'अपनी यात्रा शुरू करने के लिए लॉगिन करें।',
    almostThere: 'लगभग हो गया!',
    tellAboutYou: 'अपने बारे में बताएं।',
    enterNameLabel: 'अपना नाम दर्ज करें:',
    startAi: 'AI शुरू करें',
    newChat: 'नई चैट',
    newChatTooltip: 'नई बातचीत शुरू करें',
    errorInvalidEmail: "ईमेल उपयुक्त नहीं है",
    aiTools: 'एआई टूल्स',
    enhancePrompt: 'प्रॉम्प्ट सुधारें',
    uploadFile: 'फ़ाइल अपलोड करें',
    deepThink: 'गहन सोच',
    search: 'चैट में खोजें',
    voice: 'वॉइस',
    send: 'भेजें',
    sendOTP: "ओटीपी भेजें",
    deleteAllMessages: 'सभी संदेश हटाएं',
    profileTooltip: 'अपने Sanatan AI अनुभव को अनुकूलित करें',
    searchGeetaTooltip: 'भगवद गीता के श्लोक खोजें और देखें',
    errorInvalidOtp: "ओटीपी गलत है",
    onPressEnter: 'Enter दबाने पर:',
    sendMessageOption: 'संदेश भेजें',
    goToNextLine: 'अगली पंक्ति जोड़ें',
    manageAIMemory: 'एआई मेमोरी प्रबंधित करें',
    sorrySomethingWrong: 'क्षमा करें, कुछ गलत हुआ',
    regenerateResponse: 'क्या उत्तर पुनरुत्पादित करें?',
    pleaseSelectChat: "कृपया चैट चुनें, या शीर्ष-दाएँ कोने में 'नई चैट' पर टैप करें।",
    pleaseWriteMessage: 'कृपया एक संदेश लिखें...',
    fileLimitExceeded: 'फ़ाइल सीमा पार हो गई',
    unsupportedFileType: 'यह फ़ाइल समर्थित नहीं है',
    messageCopied: 'संदेश कॉपी किया गया',
    deleteAllConfirmation: 'क्या आप सुनिश्चित हैं कि आप सभी संदेश हटाना चाहते हैं?',
    pleaseEnterTextToEnhance: 'कृपया सुधारने के लिए पाठ दर्ज करें।',
    failedToEnhancePrompt: 'प्रॉम्प्ट को सुधारने में विफल',
    memoryAdded: 'मेमोरी जोड़ी गई',
    noMemoriesStored: 'कोई मेमोरी संग्रहीत नहीं है।',
    addNewMemory: 'नई मेमोरी जोड़ें...',
    add: 'जोड़ें',
    remove: 'हटाएँ',
    submit: "जमा करें",
    nameLabel: 'नाम:',
    themeLabel: 'वातावरण',
    emailLabel: "ईमेल: ",
    themeAuto: 'स्वतः',
    themeLight: 'प्रकाश',
    themeDark: 'अँधेरा',
    languageLabel: 'भाषा',
    deleteLabel: 'चैट हटाएँ',
    settingsTitle: 'सेटिंग्स',
    historyToday: 'आज',
    historyYesterday: 'कल',
    historyLast7Days: 'पिछले 7 दिन',
    historyOlder: 'पुराने',
    greetingHello: 'नमस्ते',
    guestName: 'अतिथि',
    samplePrompts: [
      'उब जाने पर मुझे क्या करना चाहिए?',
      'मेरे लिए निबंध लिखो..',
      'प्रोग्रामिंग क्या है?',
      'भगवान राम के बारे में बताएं..',
      'पढ़ने के लिए कोई किताब सुझाव दें..',
      'जीवन का अर्थ क्या है?',
      'तनाव को कैसे प्रबंधित करें?',
      'क्वांटम भौतिकी समझाएँ',
      'मुझे कुछ स्वस्थ व्यंजन बताएं',
    ],
    googleLogin: 'Google से साइन इन करें',
    searchGeetaButton: 'भगवद गीता',
    persona: "एआई को खास निर्देश",
    chatActions: "चैट संबंधी क्रियाएं",
    import: "आयात / निर्यात",
    importChat: "चैट आयात करें",
    exportChat: "चैट का निर्यात करें",
    loginError: "कुछ आंतरिक खरीबी हुई है",
    errorReading: "फाइल पढ़ने मे खराबी हुई",
    successfullyRemoved: "फाइल सफलता से निकली गई",
    changedSetting: "{setting} सफलतापूर्वक बदल गई.."
  },
};

let currentTranslations = locales[defaultLocale];

function formatTemplate(text: string, vars?: Record<string, string>) {
  if (typeof text !== 'string' || !vars) return text;
  return Object.keys(vars).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, 'g'), vars[key]);
  }, text);
}

function t<K extends keyof typeof currentTranslations>(key: K, vars?: Record<string, string>, lang?: "en" | "hi"): typeof currentTranslations[K] | string {
  if(lang) {
    const locale = locales[lang];
    const value = locale[key] ?? locales[fallbackLocale][key] ?? key;
    if (key == "samplePrompts" && Array.isArray(value)) return value;
    return formatTemplate(value as string, vars);
  }
  const value = currentTranslations[key] ?? locales[fallbackLocale][key] ?? key;
  if (key == "samplePrompts" && Array.isArray(value)) return value;
  return formatTemplate(value as string, vars);
}

export function initI18n(locale: "en" | "hi") {
  if (!locales[locale]) {
    locale = defaultLocale;
  }
  currentTranslations = locales[locale];
  if(globalThis.document && globalThis.document.documentElement) document.documentElement.lang = locale;
}


interface LanguageProps<K> {
  need: K;
  vars?: Record<string, string>;
}
export function Language(props: Readonly<LanguageProps<keyof typeof currentTranslations>>) {
  const { need: key, vars } = props;
  const { language: [lang] } = useContext(All).userData
  const locale = locales[lang];
  const value = locale[key] ?? locales[fallbackLocale][key] ?? key;
  if (key == "samplePrompts" && Array.isArray(value)) return value;
  const text = formatTemplate(value as string, vars);
  if(!/[*[]/.exec(text)) return (
    <>
     {text}
    </>
  )
    return <Markdown markdown={text} />
}

export function useT() {
  const language = useContext(All).userData.language[0];
  return <K extends keyof typeof currentTranslations>(key: K, vars?: Record<string, string>): typeof currentTranslations[K] | string => t(key, vars, language)
}