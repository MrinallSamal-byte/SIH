import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Language = 'en' | 'hi' | 'or'

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    'app.name': 'AapdaSetu',
    'app.tagline': 'Disaster Response & AI Triage Ecosystem',
    'nav.home': 'Home',
    'nav.sos': '1-Tap SOS',
    'nav.report': 'Report Incident',
    'nav.track': 'Track Incident',
    'nav.checkin': 'Safety Check-in',
    'nav.shelters': 'Shelter Finder',
    'nav.alerts': 'Public Alerts',
    'nav.damage': 'Report Damage',
    'nav.missing': 'Missing Persons',
    'nav.routes': 'Safe Routes',
    'nav.more': 'More',
    'nav.admin': 'Command Center',
    'nav.volunteer': 'Volunteer Portal',
    'common.submit': 'Submit',
    'common.loading': 'Loading…',
    'common.send': 'Send',
    'common.close': 'Close',
    'common.status': 'Status',
    'common.priority': 'Priority',
    'common.location': 'Location',
    'common.details': 'Details',
    'demo.pill': 'Demo data (backend not connected)',
    'sos.title': 'Emergency SOS',
    'sos.trigger': 'PRESS FOR EMERGENCY',
    'sos.sent': 'SOS alert sent successfully',
    'sos.name': 'Your name (optional)',
    'sos.namePlaceholder': 'e.g. Rahul Sharma',
    'sos.phone': 'Mobile number (mandatory for rescue) *',
    'sos.phonePlaceholder': 'Enter 10-digit mobile number',
    'sos.phoneRequiredError': 'Please enter a valid 10-digit mobile number to send SOS distress signal.',
    'track.title': 'Track your incident',
    'track.lookup': 'Lookup Tracking ID',
    'chat.suggestion': 'Need help? Chat with our AI companion',
    'chat.title': 'AI Companion',
    'chat.subtitle': 'Psychological first aid & emergency guidance',
    'chat.greeting':
      'Hello, I am your AapdaSetu emergency companion. I am here with you while rescue is en route. How are you feeling right now?',
    'chat.placeholder': 'Tell me how you feel…',
  },
  hi: {
    'app.name': 'आपदासेतु',
    'app.tagline': 'आपदा प्रतिक्रिया और AI ट्राइएज पारिस्थितिकी तंत्र',
    'nav.home': 'होम',
    'nav.sos': 'वन-टैप SOS',
    'nav.report': 'घटना की रिपोर्ट करें',
    'nav.track': 'घटना ट्रैक करें',
    'nav.checkin': 'सुरक्षा चेक-इन',
    'nav.shelters': 'आश्रय खोजें',
    'nav.alerts': 'सार्वजनिक चेतावनी',
    'nav.damage': 'क्षति रिपोर्ट करें',
    'nav.missing': 'लापता व्यक्ति',
    'nav.routes': 'सुरक्षित मार्ग',
    'nav.more': 'और देखें',
    'nav.admin': 'कमांड सेंटर',
    'nav.volunteer': 'स्वयंसेवक पोर्टल',
    'common.submit': 'जमा करें',
    'common.loading': 'लोड हो रहा है…',
    'common.send': 'भेजें',
    'common.close': 'बंद करें',
    'common.status': 'स्थिति',
    'common.priority': 'प्राथमिकता',
    'common.location': 'स्थान',
    'common.details': 'विवरण',
    'demo.pill': 'डेमो डेटा (बैकएंड कनेक्ट नहीं)',
    'sos.title': 'आपातकालीन SOS',
    'sos.trigger': 'आपातकाल के लिए दबाएँ',
    'sos.sent': 'SOS अलर्ट सफलतापूर्वक भेजा गया',
    'sos.name': 'आपका नाम (वैकल्पिक)',
    'sos.namePlaceholder': 'उदा. राहुल शर्मा',
    'sos.phone': 'मोबाइल नंबर (बचाव के लिए अनिवार्य) *',
    'sos.phonePlaceholder': '10 अंकों का मोबाइल नंबर दर्ज करें',
    'sos.phoneRequiredError': 'SOS संकट संकेत भेजने के लिए कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें।',
    'track.title': 'अपनी घटना ट्रैक करें',
    'track.lookup': 'ट्रैकिंग ID खोजें',
    'chat.suggestion': 'मदद चाहिए? AI साथी से बात करें',
    'chat.title': 'AI साथी',
    'chat.subtitle': 'मनोवैज्ञानिक प्राथमिक चिकित्सा और आपातकालीन मार्गदर्शन',
    'chat.greeting':
      'नमस्ते, मैं आपका AapdaSetu आपातकालीन साथी हूँ। बचाव टीम आने तक मैं आपके साथ हूँ। आप अभी कैसा महसूस कर रहे हैं?',
    'chat.placeholder': 'मुझे बताएं आप कैसा महसूस कर रहे हैं…',
  },
  or: {
    'app.name': 'ଆପଦାସେତୁ',
    'app.tagline': 'ବିପର୍ଯ୍ୟୟ ପ୍ରତିକ୍ରିୟା ଓ AI ଟ୍ରିଏଜ ଇକୋସିଷ୍ଟମ',
    'nav.home': 'ହୋମ୍',
    'nav.sos': 'ଓ୍ବାନ-ଟାପ୍ SOS',
    'nav.report': 'ଘଟଣା ରିପୋର୍ଟ କରନ୍ତୁ',
    'nav.track': 'ଘଟଣା ଟ୍ରାକ୍ କରନ୍ତୁ',
    'nav.checkin': 'ସୁରକ୍ଷା ଚେକ୍-ଇନ୍',
    'nav.shelters': 'ଆଶ୍ରୟ ଖୋଜ',
    'nav.alerts': 'ସାର୍ବଜନୀନ ଚେତାବନୀ',
    'nav.damage': 'କ୍ଷତି ରିପୋର୍ଟ',
    'nav.missing': 'ନିଖୋଜ ବ୍ୟକ୍ତି',
    'nav.routes': 'ନିରାପଦ ରାସ୍ତା',
    'nav.more': 'ଅଧିକ',
    'nav.admin': 'କମାଣ୍ଡ ସେଣ୍ଟର',
    'nav.volunteer': 'ସ୍ବେଚ୍ଛାସେବୀ ପୋର୍ଟାଲ',
    'common.submit': 'ଦାଖଲ କରନ୍ତୁ',
    'common.loading': 'ଲୋଡିଂ…',
    'common.send': 'ପଠାନ୍ତୁ',
    'common.close': 'ବନ୍ଦ କରନ୍ତୁ',
    'common.status': 'ସ୍ଥିତି',
    'common.priority': 'ପ୍ରାଥମିକତା',
    'common.location': 'ସ୍ଥାନ',
    'common.details': 'ବିବରଣୀ',
    'demo.pill': 'ଡେମୋ ଡାଟା (ବ୍ୟାକଏଣ୍ଡ ଯୋଡ଼ି ହୋଇନାହିଁ)',
    'sos.title': 'ଜରୁରୀକାଳୀନ SOS',
    'sos.trigger': 'ଜରୁରୀ ପାଇଁ ଦବାନ୍ତୁ',
    'sos.sent': 'SOS ସତର୍କତା ସଫଳ ହେଲା',
    'sos.name': 'ଆପଣଙ୍କ ନାମ (ବିକଳ୍ପ)',
    'sos.namePlaceholder': 'ଯଥା: ରାହୁଲ ଶର୍ମା',
    'sos.phone': 'ମୋବାଇଲ୍ ନମ୍ବର (ଉଦ୍ଧାର ପାଇଁ ବାଧ୍ୟତାମୂଳକ) *',
    'sos.phonePlaceholder': '10 ଅଙ୍କ ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ',
    'sos.phoneRequiredError': 'SOS ଜରୁରୀକାଳୀନ ସଂକେତ ପଠାଇବା ପାଇଁ ଦୟାକରି 10 ଅଙ୍କର ମୋବାଇଲ୍ ନମ୍ବର ପ୍ରଦାନ କରନ୍ତୁ।',
    'track.title': 'ଆପଣା ଘଟଣା ଟ୍ରାକ୍ କରନ୍ତୁ',
    'track.lookup': 'ଟ୍ରାକିଂ ID ଖୋଜ',
    'chat.suggestion': 'ସାହାଯ୍ୟ ଦରକାର? AI ସାଥୀଙ୍କ ସହିତ କଥା ହୁଅନ୍ତୁ',
    'chat.title': 'AI ସାଥୀ',
    'chat.subtitle': 'ମାନସିକ ପ୍ରାଥମିକ ଚିକିତ୍ସା ଓ ଜରୁରୀ ମାର୍ଗଦର୍ଶନ',
    'chat.greeting':
      'ନମସ୍କାର, ମୁଁ ଆପଣଙ୍କ AapdaSetu ଜରୁରୀକାଳୀନ ସାଥୀ। ଉଦ୍ଧାର ପହଞ୍ଚିବା ପର୍ଯ୍ୟନ୍ତ ମୁଁ ଆପଣଙ୍କ ସହିତ ଅଛି। ଆପଣ ବର୍ତ୍ତମାନ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି?',
    'chat.placeholder': 'ଆପଣ କେମିତି ଅନୁଭବ କରୁଛନ୍ତି କୁହନ୍ତୁ…',
  },
}

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
]

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('aapdasetu_lang')
    return stored === 'hi' || stored === 'or' || stored === 'en' ? stored : 'en'
  })

  useEffect(() => {
    localStorage.setItem('aapdasetu_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
