"use client";

import { All } from "@/app/(root)/AllContext";
import { useContext } from "react";

const defaultLocale = "en";
const fallbackLocale = "en";

export const locales = {
  en: {
    siteTitle: "SANATAN AI",
    termsTitle: (
      <>
        By Using <span className="font-display animated-gradient-text">Sanatan AI</span>
      </>
    ),
    termsIntro: "You agree to the following terms and conditions:",
    termsList1:
      "This AI is for informational and educational purposes related to Sanatan Dharma and general-purpose assistance.",
    termsList2:
      "Responses may not always be fully accurate. For matters of religious practice or interpretation, please consult a qualified spiritual teacher.",
    termsList3:
      "Sanatan AI does not provide medical, legal, financial, or psychological advice. Please consult a qualified professional for such matters.",
    termsList4:
      "You must be at least 8 years old to use Sanatan AI. We recommend that younger users use the service together with a parent or guardian.",
    termsList5:
      "Do not use this service for any illegal, harmful, or malicious activities.",
    termsList6: (
      <>
        <b>Sanatan AI</b> is operated by Shivam Sharma. Questions or requests
        can be sent to{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>
        .
      </>
    ),
    termsList7: (
      <>
        <b>Sanatan AI&apos;s Responses</b> are powered by Gemini{" "}
      </>
    ),
    termsList8: (
      <>
        Animated Icons are from{" "}
        <a href="https://lordicon.com" className="underline">
          LordIcon
        </a>
      </>
    ),
    termsList9: (
      <>
        Sanatan AI is hosted on Vercel. Your data may be processed by our
        service providers (including Google, Vercel, and MongoDB) as described
        in our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </>
    ),
    termsList10:
      "Your conversations may be used, including in anonymized form, to improve Sanatan AI.",
    termsList11:
      "Sanatan AI is currently free to use. We may introduce paid features in the future, with advance notice.",
    termsList12: "We reserve the right to change these terms at any time.",
    privacyTitle: (
      <>
        Your <span className="font-display animated-gradient-text">Privacy</span>
      </>
    ),
    privacyIntro:
      "This page explains what we collect, how we use it, and the choices you have:",
    privacySectionCollect: "What We Collect",
    privacyCollect1:
      "Account info: your name, email address, profile picture, and language preference.",
    privacyCollect2:
      "Conversation data: the messages, attachments, and AI-saved memories in your chats.",
    privacyCollect3:
      "Sign-in data: a Google sign-in token, or a one-time passcode emailed to you — verification codes are deleted automatically within minutes.",
    privacyCollect4:
      "Basic technical data, such as the secure cookie that keeps you signed in.",
    privacySectionUse: "How We Use It",
    privacyUse1:
      "To run your account, save your chat history, and remember your preferences and AI memories.",
    privacyUse2: (
      <>
        To generate responses using <b>Google Gemini</b>, and to search the web
        using <b>Tavily</b> when the assistant decides it&apos;s needed.
      </>
    ),
    privacyUse3: (
      <>
        To send sign-in emails through <b>Resend</b>.
      </>
    ),
    privacyUse4: "To keep Sanatan AI secure and prevent abuse.",
    privacyUse5:
      "Your conversations may be used, including in anonymized form, to improve Sanatan AI.",
    privacySectionShare: "Who We Share It With",
    privacyShare1:
      "We share data only with the service providers that run Sanatan AI — Google, Tavily, Resend, MongoDB, and Vercel — solely to operate the features above.",
    privacyShare2: "We do not sell your personal data.",
    privacySectionChoices: "Your Choices",
    privacyChoices1:
      "Delete individual chats or messages, or delete all messages, at any time.",
    privacyChoices2: "View or remove your saved AI memories from settings.",
    privacyChoices3: (
      <>
        Request access to or deletion of your data by contacting{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>
        .
      </>
    ),
    privacyChoices4:
      "Revoke Sanatan AI's access to your Google account anytime from your Google Account settings.",
    privacySectionChildren: "Children's Privacy",
    privacyChildren1:
      "Sanatan AI is intended for use with a parent or guardian's involvement for users under 13. Contact us if you believe a child has shared personal data without appropriate consent.",
    privacySectionContact: "Changes & Contact",
    privacyContact1: (
      <>
        <b>Sanatan AI</b> is operated by Shivam Sharma. We may update this
        policy from time to time; contact{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>{" "}
        with any questions.
      </>
    ),
    agreeProceed: "Agree & Proceed",
    welcomeSeeker: "Welcome Seeker",
    loginJourney: "Login to begin your journey.",
    almostThere: "Almost There!",
    tellAboutYou: "Tell about you.",
    enterNameLabel: "Enter your Name:",
    startAi: "Start AI",
    newChat: "New Chat",
    newChatTooltip: "Start a new conversation",
    aiTools: "AI Tools",
    enhancePrompt: "Enhance Prompt",
    uploadFile: "Upload File",
    deepThink: "Deep Think",
    search: "Search in Chat",
    voice: "Speak",
    send: "Send",
    deleteAllMessages: "Delete All Messages",
    profileTooltip: "Customize your Sanatan AI experience",
    searchGeetaTooltip: "Search and explore Bhagavad Gita verses",
    calendarTooltip: "Expore Hindu Calendar",
    sendMessageOption: "Send message",
    goToNextLine: "Insert newline",
    manageAIMemory: "Manage AI memory",
    sorrySomethingWrong: "Sorry, Something went wrong",
    errorInvalidEmail: "Error: Invalid email",
    errorInvalidOtp: "Error: Invalid OTP",
    pleaseSelectChat: "Select a chat, or tap 'New Chat' in the top-right.",
    pleaseWriteMessage: "Please write a message...",
    fileLimitExceeded: "File limit exceeded",
    unsupportedFileType: "This file type is not supported",
    messageCopied: "Message copied",
    termsAgree: (
      <>
        By using this service, you agree to the{" "}
        <a href="/terms" className="underline">
          terms & conditions
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline">
          privacy policy
        </a>
        .
      </>
    ),
    deleteAllConfirmation: "Are you sure you want to delete all messages?",
    pleaseEnterTextToEnhance: "Please enter text to enhance.",
    failedToEnhancePrompt: "Unable to enhance prompt.",
    memoryAdded: "Memory added",
    noMemoriesStored: "No memories stored.",
    addNewMemory: "Add new memory...",
    add: "Add",
    remove: "Remove",
    nameLabel: "Name:",
    themeLabel: "Theme",
    emailLabel: "Email: ",
    themeAuto: "Auto",
    submit: "Submit",
    themeLight: "Light",
    sendOTP: "Send OTP",
    themeDark: "Dark",
    languageLabel: "Language",
    deleteLabel: "Delete Chat",
    settingsTitle: "Settings",
    historyToday: "Today",
    historyYesterday: "Yesterday",
    historyLast7Days: "Previous 7 Days",
    historyOlder: "Older",
    greetingHello: "Hello",
    guestName: "Guest",
    samplePrompts: [
      "What should I do when bored?",
      "Write me an essay..",
      "What is Programming?",
      "Tell me about Lord Rama..",
      "Suggest a book to read..",
      "What is the meaning of life?",
      "How to manage stress?",
      "Explain quantum physics",
      "Give me some healthy recipes",
    ],
    googleLogin: "Sign in with Google",
    persona: "Custom instruction for AI",
    chatActions: "Chat Actions",
    import: "Import / Export",
    importChat: "Import a Chat",
    exportChat: "Export current Chat",
    loginError: "Login Error..",
    errorReading: "Error reading file",
    successfullyRemoved: "Successfully removed file..",
    changedSetting: "{setting} successfully changed..",
    reloadPage: "Try Reloading Page",
  },
  hi: {
    siteTitle: "सनातन एआई",
    termsTitle: <><span className="animated-gradient-text">सनातन ऐआई</span> का उपयोग करके,</>,
    termsIntro: "आप निम्नलिखित नियमों और शर्तों से सहमत होते हैं:",
    termsList1:
      "यह एआई सनातन धर्म से संबंधित जानकारी, शिक्षा और सामान्य सहायता के लिए है।",
    termsList2:
      "उत्तर हमेशा पूरी तरह सटीक नहीं हो सकते। धार्मिक अभ्यास या व्याख्या से जुड़े विषयों के लिए कृपया किसी योग्य आध्यात्मिक शिक्षक से सलाह लें।",
    termsList3:
      "सनातन एआई चिकित्सा, कानूनी, वित्तीय या मानसिक स्वास्थ्य संबंधी सलाह नहीं देता। ऐसे विषयों के लिए कृपया किसी योग्य विशेषज्ञ से संपर्क करें।",
    termsList4:
      "सनातन एआई का उपयोग करने के लिए आपकी उम्र कम से कम 8 वर्ष होनी चाहिए। कम उम्र के उपयोगकर्ताओं को माता-पिता या अभिभावक के साथ सेवा का उपयोग करने की सलाह दी जाती है।",
    termsList5:
      "कृपया किसी भी अवैध, हानिकारक या दुष्ट गतिविधि के लिए इस सेवा का उपयोग न करें।",
    termsList6: (
      <>
        <b>सनातन एआई</b> का संचालन शिवम शर्मा द्वारा किया जाता है। किसी भी
        प्रश्न या अनुरोध के लिए{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>{" "}
        पर संपर्क करें।
      </>
    ),
    termsList7: (
      <>
        <b>Sanatan AI के उत्तर</b> Gemini द्वारा समर्थित हैं
      </>
    ),
    termsList8: (
      <>
        एनिमेटेड आइकन{" "}
        <a href="https://lordicon.com" className="underline">
          LordIcon
        </a>{" "}
        से हैं
      </>
    ),
    termsList9: (
      <>
        सनातन एआई Vercel पर होस्ट किया गया है। आपका डेटा हमारी सेवा प्रदाताओं
        (जैसे Google, Vercel और MongoDB) द्वारा हमारी{" "}
        <a href="/privacy" className="underline">
          गोपनीयता नीति
        </a>{" "}
        के अनुसार संसाधित किया जा सकता है।
      </>
    ),
    termsList10:
      "आपकी बातचीत को गुमनाम रूप में सनातन एआई को बेहतर बनाने के लिए उपयोग किया जा सकता है।",
    termsList11:
      "सनातन एआई फिलहाल उपयोग करने के लिए निःशुल्क है। भविष्य में हम सशुल्क सुविधाएं शुरू कर सकते हैं, जिसकी पूर्व सूचना दी जाएगी।",
    termsList12:
      "हम किसी भी समय इन शर्तों को बदलने का अधिकार सुरक्षित रखते हैं।",
    privacyTitle: (
      <>
        आपकी <span className="animated-gradient-text">गोपनीयता</span>
      </>
    ),
    privacyIntro:
      "यह पेज बताता है कि हम क्या जानकारी एकत्र करते हैं, उसका उपयोग कैसे करते हैं, और आपके पास कौन से विकल्प हैं:",
    privacySectionCollect: "हम क्या एकत्र करते हैं",
    privacyCollect1:
      "खाता जानकारी: आपका नाम, ईमेल पता, प्रोफ़ाइल फ़ोटो, और भाषा प्राथमिकता।",
    privacyCollect2:
      "बातचीत का डेटा: आपकी चैट में मौजूद संदेश, अटैचमेंट, और एआई द्वारा सहेजी गई मेमोरी।",
    privacyCollect3:
      "साइन-इन डेटा: Google साइन-इन टोकन, या आपके ईमेल पर भेजा गया एक बार का पासकोड — सत्यापन कोड कुछ ही मिनटों में स्वतः हटा दिए जाते हैं।",
    privacyCollect4:
      "बुनियादी तकनीकी डेटा, जैसे वह सुरक्षित कुकी जो आपको साइन-इन रखती है।",
    privacySectionUse: "हम इसका उपयोग कैसे करते हैं",
    privacyUse1:
      "आपका खाता चलाने, चैट इतिहास सहेजने, और आपकी प्राथमिकताओं व एआई मेमोरी को याद रखने के लिए।",
    privacyUse2: (
      <>
        <b>Google Gemini</b> का उपयोग करके उत्तर तैयार करने के लिए, और जब सहायक
        आवश्यक समझे तब <b>Tavily</b> से वेब खोजने के लिए।
      </>
    ),
    privacyUse3: (
      <>
        <b>Resend</b> के माध्यम से साइन-इन ईमेल भेजने के लिए।
      </>
    ),
    privacyUse4: "सनातन एआई को सुरक्षित रखने और दुरुपयोग रोकने के लिए।",
    privacyUse5:
      "आपकी बातचीत को, गुमनाम रूप में, सनातन एआई को बेहतर बनाने के लिए उपयोग किया जा सकता है।",
    privacySectionShare: "हम इसे किसके साथ साझा करते हैं",
    privacyShare1:
      "हम डेटा केवल उन सेवा प्रदाताओं के साथ साझा करते हैं जो सनातन एआई को चलाते हैं — Google, Tavily, Resend, MongoDB, और Vercel — और केवल ऊपर बताई गई सुविधाओं के लिए।",
    privacyShare2: "हम आपका व्यक्तिगत डेटा नहीं बेचते।",
    privacySectionChoices: "आपके विकल्प",
    privacyChoices1:
      "किसी भी समय अलग-अलग चैट या संदेश हटाएं, या सभी संदेश एक साथ हटाएं।",
    privacyChoices2: "सेटिंग्स से अपनी सहेजी गई एआई मेमोरी देखें या हटाएं।",
    privacyChoices3: (
      <>
        अपने डेटा तक पहुंच या उसे हटाने का अनुरोध करने के लिए{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>{" "}
        पर संपर्क करें।
      </>
    ),
    privacyChoices4:
      "अपने Google खाता सेटिंग्स से कभी भी सनातन एआई की पहुंच वापस लें।",
    privacySectionChildren: "बच्चों की गोपनीयता",
    privacyChildren1:
      "13 वर्ष से कम उम्र के उपयोगकर्ताओं के लिए सनातन एआई का उपयोग माता-पिता या अभिभावक की भागीदारी के साथ किया जाना चाहिए। यदि आपको लगता है कि किसी बच्चे ने उचित सहमति के बिना व्यक्तिगत डेटा साझा किया है, तो कृपया हमसे संपर्क करें।",
    privacySectionContact: "बदलाव और संपर्क",
    privacyContact1: (
      <>
        <b>सनातन एआई</b> का संचालन शिवम शर्मा द्वारा किया जाता है। हम समय-समय पर
        इस नीति को अपडेट कर सकते हैं; किसी भी प्रश्न के लिए{" "}
        <a href="mailto:great.sanatan.ai@gmail.com" className="underline">
          great.sanatan.ai@gmail.com
        </a>{" "}
        पर संपर्क करें।
      </>
    ),
    termsAgree: (
      <>
        इस सेवा का उपयोग करके, आप{" "}
        <a href="/terms" className="underline">
          नियमों और शर्तों
        </a>{" "}
        से सहमत होते हैं।
      </>
    ),
    agreeProceed: "सहमत हूं ",
    welcomeSeeker: "स्वागत साधक",
    loginJourney: "अपनी यात्रा शुरू करने के लिए लॉगिन करें।",
    almostThere: "लगभग हो गया!",
    tellAboutYou: "अपने बारे में बताएं।",
    enterNameLabel: "अपना नाम दर्ज करें:",
    startAi: "AI शुरू करें",
    newChat: "नई चैट",
    newChatTooltip: "नई बातचीत शुरू करें",
    errorInvalidEmail: "ईमेल उपयुक्त नहीं है",
    aiTools: "एआई टूल्स",
    enhancePrompt: "प्रॉम्प्ट सुधारें",
    uploadFile: "फ़ाइल अपलोड करें",
    deepThink: "गहन सोच",
    search: "चैट में खोजें",
    voice: "वॉइस",
    send: "भेजें",
    sendOTP: "ओटीपी भेजें",
    deleteAllMessages: "सभी संदेश हटाएं",
    profileTooltip: "अपने Sanatan AI अनुभव को अनुकूलित करें",
    searchGeetaTooltip: "भगवद गीता के श्लोक खोजें और देखें",
    errorInvalidOtp: "ओटीपी गलत है",
    calendarTooltip: "हिन्दू कैलंडर का उपयोग करें",
    sendMessageOption: "संदेश भेजें",
    goToNextLine: "अगली पंक्ति जोड़ें",
    manageAIMemory: "एआई मेमोरी प्रबंधित करें",
    sorrySomethingWrong: "क्षमा करें, कुछ गलत हुआ",
    pleaseSelectChat:
      "कृपया चैट चुनें, या शीर्ष-दाएँ कोने में 'नई चैट' पर टैप करें।",
    pleaseWriteMessage: "कृपया एक संदेश लिखें...",
    fileLimitExceeded: "फ़ाइल सीमा पार हो गई",
    unsupportedFileType: "यह फ़ाइल समर्थित नहीं है",
    messageCopied: "संदेश कॉपी किया गया",
    deleteAllConfirmation:
      "क्या आप सुनिश्चित हैं कि आप सभी संदेश हटाना चाहते हैं?",
    pleaseEnterTextToEnhance: "कृपया सुधारने के लिए पाठ दर्ज करें।",
    failedToEnhancePrompt: "प्रॉम्प्ट को सुधारने में विफल",
    memoryAdded: "मेमोरी जोड़ी गई",
    noMemoriesStored: "कोई मेमोरी संग्रहीत नहीं है।",
    addNewMemory: "नई मेमोरी जोड़ें...",
    add: "जोड़ें",
    remove: "हटाएँ",
    submit: "जमा करें",
    nameLabel: "नाम:",
    themeLabel: "वातावरण",
    emailLabel: "ईमेल: ",
    themeAuto: "स्वतः",
    themeLight: "प्रकाश",
    themeDark: "अँधेरा",
    languageLabel: "भाषा",
    deleteLabel: "चैट हटाएँ",
    settingsTitle: "सेटिंग्स",
    historyToday: "आज",
    historyYesterday: "कल",
    historyLast7Days: "पिछले 7 दिन",
    historyOlder: "पुराने",
    greetingHello: "नमस्ते",
    guestName: "अतिथि",
    samplePrompts: [
      "उब जाने पर मुझे क्या करना चाहिए?",
      "मेरे लिए निबंध लिखो..",
      "प्रोग्रामिंग क्या है?",
      "भगवान राम के बारे में बताएं..",
      "पढ़ने के लिए कोई किताब सुझाव दें..",
      "जीवन का अर्थ क्या है?",
      "तनाव को कैसे प्रबंधित करें?",
      "क्वांटम भौतिकी समझाएँ",
      "मुझे कुछ स्वस्थ व्यंजन बताएं",
    ],
    googleLogin: "Google से साइन इन करें",
    persona: "एआई को खास निर्देश",
    chatActions: "चैट संबंधी क्रियाएं",
    import: "आयात / निर्यात",
    importChat: "चैट आयात करें",
    exportChat: "चैट का निर्यात करें",
    loginError: "कुछ आंतरिक खरीबी हुई है",
    errorReading: "फाइल पढ़ने मे खराबी हुई",
    successfullyRemoved: "फाइल सफलता से निकली गई",
    changedSetting: "{setting} सफलतापूर्वक बदल गई..",
    reloadPage: "पुनः पेज लोड करें",
  },
};

let currentTranslations = locales[defaultLocale];

function formatTemplate(text: string, vars?: Record<string, string>) {
  if (typeof text !== "string" || !vars) return text;
  return Object.keys(vars).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, "g"), vars[key]);
  }, text);
}

function t<K extends keyof typeof currentTranslations>(
  key: K,
  vars?: Record<string, string>,
  lang?: "en" | "hi",
): (typeof currentTranslations)[K] | string {
  if (lang) {
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
  if (globalThis.document?.documentElement)
    document.documentElement.lang = locale;
}

interface LanguageProps<K> {
  need: K;
  vars?: Record<string, string>;
}
export function Language(
  props: Readonly<LanguageProps<keyof typeof currentTranslations>>,
) {
  const { need: key, vars } = props;
  const {
    language: [lang],
  } = useContext(All).userData;
  const locale = locales[lang];
  const value = locale[key] ?? locales[fallbackLocale][key] ?? key;
  if (key == "samplePrompts" && Array.isArray(value)) return value;
  const text = formatTemplate(value as string, vars);
  return <>{text}</>;
}

export function useT() {
  const language = useContext(All).userData.language[0];
  return <K extends keyof typeof currentTranslations>(
    key: K,
    vars?: Record<string, string>,
  ): (typeof currentTranslations)[K] | string => t(key, vars, language);
}
