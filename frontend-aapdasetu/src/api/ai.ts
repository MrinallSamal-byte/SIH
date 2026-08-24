import { aiCall, withMockFallback } from './client'
import { mocks } from './mocks'
import type { FloodGeoJson, ReportInput, TriageResult, PfaChatResponse, DamageInfrastructureType } from '../types'

// =============================================================================
// FASTAPI AI ENGINE — BUILD CONTRACT
// =============================================================================

export function aiTriage(input: ReportInput): Promise<TriageResult> {
  return withMockFallback(
    () => aiCall<TriageResult>('POST', '/ai/triage', input),
    () => mocks.aiTriage(input),
    { mutating: true },
  )
}

// =============================================================================
// AI CHAT PROVIDERS (OpenCode Zen -> DeepSeek V4 Flash Free, then OpenRouter)
// =============================================================================
const ZEN_API_KEY = import.meta.env.VITE_ZEN_API_KEY as string | undefined
const ZEN_CHAT_URL = 'https://opencode.ai/zen/v1/chat/completions'

// Legacy provider — kept fully functional as an automatic fallback.
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const ZEN_FREE_MODELS = [
  'deepseek-v4-flash-free',
  'laguna-s-2.1-free',
  'nemotron-3-ultra-free',
  'nemotron-3.5-lightning-free',
  'big-pickle',
  'mimo-v2.5-free',
  'hy3-free',
] as const

export const OPENROUTER_FREE_MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free',
  'liquid/lfm-2.5-2.6b:free',
  'z-ai/glm-5.2:free',
] as const

interface ChatProviderConfig {
  name: string
  url: string
  key: string
  headers: Record<string, string>
  models: readonly string[]
}

function getChatProviders(): ChatProviderConfig[] {
  const providers: ChatProviderConfig[] = []
  if (ZEN_API_KEY) {
    providers.push({
      name: 'zen',
      url: ZEN_CHAT_URL,
      key: ZEN_API_KEY,
      headers: { Authorization: `Bearer ${ZEN_API_KEY}`, 'Content-Type': 'application/json' },
      models: ZEN_FREE_MODELS,
    })
  }
  if (OPENROUTER_API_KEY) {
    providers.push({
      name: 'openrouter',
      url: OPENROUTER_CHAT_URL,
      key: OPENROUTER_API_KEY,
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aapdasetu.in',
        'X-Title': 'AapdaSetu Disaster Response Ecosystem',
      },
      models: OPENROUTER_FREE_MODELS,
    })
  }
  return providers
}

/** True when at least one AI chat provider key is configured. */
export function isAiProviderConfigured(): boolean {
  return Boolean(ZEN_API_KEY || OPENROUTER_API_KEY)
}

export type AiLang = 'en' | 'hi' | 'bn' | 'or'

const AI_LANG_NAMES: Record<AiLang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  or: 'ଓଡ଼ିଆ',
}

function languageDirective(lang: AiLang = 'en'): string {
  return `\n\nLANGUAGE RULE (STRICT): Respond ONLY in ${AI_LANG_NAMES[lang]}. Mirror the user's language even if they mix scripts.`
}

const AAPDAMITRA_SYSTEM_PROMPT = `You are AapdaMitra AI (आपदामित्र), the official AI disaster survival assistant and crisis first-aid expert for AapdaSetu, India's national disaster response platform.

HOW TO ANSWER:
1. First, directly acknowledge the user's situation in one short empathetic sentence.
2. Then give 2 to 4 numbered, concrete life-saving action steps — be specific (exact positions, exact actions, what NOT to do). No vague advice.
3. If there is injury, bleeding, drowning, fire, entrapment or any life threat: give immediate first-aid steps FIRST, then tell them to call 112 (national emergency) / 108 (ambulance) and use the SOS button in the app.
4. For questions about the AapdaSetu app itself (SOS, report damage, shelters, safe routes, track report, missing persons), briefly explain which feature to use and how.
5. Respond in the EXACT language and script the user used (English, Hindi, Bengali, Odia, Hinglish, etc.). Keep it simple enough for a panicked person to follow.

STRICT RULES:
- Output ONLY your final answer. Never output internal monologue, thinking tags, rule echoes, or preambles like "The user is asking...".
- Never refuse a genuine emergency question; always give the safest practical guidance.
- Keep answers under 120 words unless the user asks for more detail.`

interface ChatHistoryItem {
  role: 'user' | 'bot' | 'assistant' | 'system'
  content: string
}

export type DangerLevel = 'CRITICAL' | 'MODERATE' | 'LOW'

export function detectDangerLevel(text: string): DangerLevel {
  const lower = text.toLowerCase()
  const criticalKeywords = [
    'bleed', 'blood', 'hemorrhage', 'unconscious', 'fainted', 'trapped',
    'drown', 'sinking', 'heart attack', 'chest pain', 'stroke', 'electrocute',
    'severe burn', 'fire', 'choking', 'snake', 'snakebite', 'poison', 'collapse',
    'debris', 'fracture', 'broken bone', 'crush', 'dying', 'flood rising', 'water level',
    // ponytail: parity with backend ESCALATION_KEYWORDS (pfa.service.ts)
    "can't breathe", 'cant breathe', 'can not breathe', 'burn', 'sink', 'flooded',
    'electric shock', 'मदद',
    'खून', 'बेहोश', 'फंसा', 'डूब', 'हार्ट अटैक', 'सांप', 'आग', 'बिजली',
    'রক্ত', 'অজ্ঞান', 'আটকে', 'ডুব', 'সাপ', 'আগুন',
    'ରକ୍ତ', 'ଚେତାଶୂନ୍ୟ', 'ଫସିରହିଛି', 'ନିଆଁ',
    // Trapped (hi/bn/or native + Latin transliterations)
    'फंस गया', 'फंस गई', 'फंसा हुआ', 'मलबे में', 'fas gaya', 'fas gayi', 'fase hai', 'phansa', 'malbe me',
    'ধ্বসে', 'চাপা', 'atke ache', 'dhoshe', 'chapa poreche',
    'ମଳବା ତଳେ', 'ଚାପି ପଡ଼ିଛି', 'phansila', 'chapila',
    // Drowning
    'doob', 'doob raha', 'dub gaya', 'paani me gir', 'pani me doob',
    'ডুবে যাচ্ছে', 'jole dubche', 'dublo',
    'ବୁଡ଼ିଯାଉଛି', 'budi jauchhi',
    // Bleeding / blood
    'khoon', 'khoon beh', 'khoon nikal', 'ragat', 'rokto jhore',
    'खून निकल', 'रक्तस्राव', 'রক্তক্ষরণ', 'ରକ୍ତସ୍ରାବ', 'rakta sraba',
    // Unconscious
    'behosh', 'behos', 'hos nahi', 'ogyan hoye', 'অজ্ঞান হয়ে',
    'ଚେତା ନାହିଁ', 'chetala nahi',
    // Fire
    'aag lagi', 'aag lag', 'lagi aag', 'aagun lagche', 'agan lagiche',
    'ନିଆଁ ଲାଗିଛି', 'niam lagichi',
    // Collapse / rubble
    'building gira', 'ghar gira', 'deewar giri', 'malba', 'ध्वस्त', 'भवन गिरा',
    'ভবন ধসেছে', 'দেয়াল ভেঙে', 'bhavan dhaseche', 'deyal bhenge',
    'ଗୃହ ଧ୍ୱଂସ', 'ଦେଉଳି ଭାଙ୍ଗିଲା', 'griha dhwansa', 'deuli bhangila',
    // Water level rising / flood surge
    'पानी बढ़', 'पानी घुस', 'बाढ़', 'paani badh', 'pani badh', 'paani chadh', 'baadh aayi', 'barh aaya',
    'জল বাড়ছে', 'বন্যা', 'jol barche', 'banya ashe',
    'ପାଣି ବଢ଼ୁଛି', 'ପାଣି ଭରିବା', 'ବନ୍ୟା', 'pani badhuchhi', 'banya asuchi',
    // Chest pain / cardiac distress
    'छाती में दर्द', 'सीने में दर्द', 'chaati me dard', 'seene me dard',
    'বুকে ব্যথা', 'বুক ফাটা', 'শ্বাসকষ্ট', 'buke byatha', 'buker betha', 'shash koshto',
    'ଛାତି ଯନ୍ତ୍ରଣା', 'ଛାତି ବ୍ୟଥା', 'ଶ୍ୱାସ କଷ୍ଟ', 'chhati yantanara', 'shwas kasta'
  ]
  if (criticalKeywords.some((kw) => lower.includes(kw))) {
    return 'CRITICAL'
  }

  const moderateKeywords = [
    'pain', 'hurt', 'wound', 'cut', 'sprain', 'fever', 'shivering', 'cold',
    'panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'food', 'water',
    'shelter', 'medicine', 'insulin', 'elderly', 'baby', 'pregnant', 'lost',
    'दर्द', 'चोट', 'डर', 'घबराहट', 'खाना', 'पानी', 'दवाई', 'कष्ट', 'आहत', 'ভয়',
    'କ୍ଷତ', 'ଔଷଧ',
    // Vulnerable persons: pregnant / child-infant / elderly (hi/bn/or + Latin)
    'गर्भवती', 'garbhavati', 'garbhvati', 'महिला प्रसव',
    'গর্ভবতী', 'garboboti', 'মা হওয়ার',
    'ଗର୍ଭବତୀ', 'garbhabati',
    'बच्चा', 'बच्चे', 'शिशु', 'baccha', 'bachche', 'shishu',
    'শিশু', 'bachcha ache', 'shishu ache',
    'ପିଲା', 'ଶିଶୁ', 'pila', 'shishu',
    'बुज़ुर्ग', 'बूढ़े', 'वृद्ध', 'buzurg', 'budhape', 'vriddh',
    'বয়স্ক', 'burha', 'boyoshko',
    'ବୃଦ୍ଧ', 'ବୟସ୍କ', 'bruddha', 'bayaska',
    // Common distress needs in local scripts / transliteration
    'दर्द हो', 'dard ho', 'chot lag', 'ghayal', 'घायल',
    'ব্যথা', 'আহত', 'byatha', 'aahoto',
    'ଯନ୍ତ୍ରଣା', 'yantanara',
    'dar lag', 'darr lag', 'ghabrahat', 'डर लग', 'भय',
    'voy korche', 'bhoy pachche',
    'ଡର ଲାଗୁଛି', 'dara laguchi',
    'khana nahi', 'bhookh', 'paani chahiye', 'খাবার', 'জল চাই', 'khabar chai', 'jol chai',
    'ଖାଦ୍ୟ', 'ପାଣି ଦରକାର', 'khadya darkara',
    'aashray', 'ashroy', 'आश्रय', 'আশ্রয়', 'ashroy chai', 'ଆଶ୍ରୟ', 'ashraya darkara',
    'dawai', 'dava chahiye', 'ओषুধ', 'oshudh chai', 'aushadha',
    'lapata', 'gum ho', 'लापता', 'गुम हो', 'হারিয়ে', 'নিখোঁজ', 'hariye geche', 'nikhoj',
    'ନିଖୋଜ', 'ହଜିଆ', 'nikhoja', 'hajia',
    'bukhar', 'बुखार', 'জ্বর', 'jor hoyeche', 'ଜ୍ୱର', 'jwara'
  ]
  if (moderateKeywords.some((kw) => lower.includes(kw))) {
    return 'MODERATE'
  }

  return 'LOW'
}

export function detectBreathingExercise(text: string): string | undefined {
  const lower = text.toLowerCase()
  const panicKeywords = [
    'panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'hyperventilat',
    'heart racing', 'shaking', 'trembling', 'breathe', 'breathing', 'grounding',
    'डर', 'घबराहट', 'चिंता', 'सांस', 'ভয়', 'আতঙ্ক', 'শ্বাস', 'ଡର', 'ଭୟ',
    'ghabrahat', 'darr lag', 'dar lag', 'sans tez', 'sans phool',
    'atank', 'voy pachche', 'bhoy lagche', 'atanka', 'dara laguchi'
  ]
  if (panicKeywords.some((kw) => lower.includes(kw))) {
    return '4-4-4_BOX_BREATHING'
  }
  return undefined
}

function detectGroundingNeed(text: string): boolean {
  const lower = text.toLowerCase()
  const groundingKeywords = [
    'grounding', 'ground myself', 'dizzy', 'lightheaded', 'shaking', 'shaky',
    'numb', 'detached', 'unreal', 'panic attack', 'calm down',
    'चक्कर', 'कांप', 'थरथर', 'शांत होना', 'chakkar', 'kaamp', 'tharathar', 'shant hona',
    'মাথা ঘোরা', 'কাঁপছে', 'শান্ত হতে', 'matha ghure', 'kampchhe', 'shanto hote',
    'ଚକ୍କର', 'କମ୍ପୁଛି', 'ଶାନ୍ତ ହେବା', 'chakkara', 'kampuchhi', 'shanta heba'
  ]
  return groundingKeywords.some((kw) => lower.includes(kw))
}

/** Localized fixed replies for the offline/degraded path (no LLM key or provider chain failed). */
const DEGRADED_REPLIES: Record<AiLang, { greeting: string; breathing: string; grounding: string; crisis: string; offTopic: string }> = {
  en: {
    greeting: 'Namaste! I am AapdaMitra AI. I am currently running in offline mode with limited answers. Tell me your emergency (flood, bleeding, trapped, fire, panic) and I will give you immediate survival steps. For life-threatening danger, tap the SOS button or call 112 right now.',
    breathing: 'You are safe right now. Calm your body with 4-4-4 box breathing:\n1. Breathe IN through your nose for 4 seconds.\n2. HOLD the breath gently for 4 seconds.\n3. Breathe OUT through your mouth for 4 seconds.\nRepeat this cycle 4 to 6 times until your heartbeat slows. You are not alone — I am here with you.',
    grounding: 'Anchor yourself in the present with the 5-4-3-2-1 grounding technique:\n1. Name 5 things you can SEE around you.\n2. Touch and name 4 things near you.\n3. Listen for 3 sounds you can HEAR.\n4. Notice 2 things you can SMELL or feel.\n5. Take 1 slow, deep breath out.\nRepeat once more if the fear returns.',
    crisis: 'THIS IS A LIFE-THREATENING EMERGENCY. Act NOW:\n1. Tap the red SOS button in the app or call 112 immediately (ambulance: 108).\n2. Move to the safest spot you can reach and stay visible to rescuers.\n3. Do not attempt risky rescues alone.\nRescue teams have been alerted — help is on the way.',
    offTopic: 'I can only help with disaster, emergency, and AapdaSetu website topics (SOS, Report, Shelter, Track, Medical guidance). Please ask about flood, injury, shelter, or tracking. Example: "water entering house" or "severe bleeding".'
  },
  hi: {
    greeting: 'नमस्ते! मैं आपदामित्र AI हूँ। अभी मैं ऑफ़लाइन मोड में चल रहा हूँ, इसलिए उत्तर सीमित हैं। अपनी आपात स्थिति बताएं (बाढ़, खून बहना, फंसना, आग, घबराहट) और मैं तुरंत जीवन रक्षक कदम बताऊँगा। जानलेवा खतरे में SOS बटन दबाएं या तुरंत 112 पर कॉल करें।',
    breathing: 'आप इस समय सुरक्षित हैं। 4-4-4 बॉक्स ब्रीदिंग से शरीर को शांत करें:\n1. नाक से 4 सेकंड तक सांस लें।\n2. 4 सेकंड तक सांस धीरे रोकें।\n3. मुंह से 4 सेकंड में सांस छोड़ें।\nदिल की धड़कन धीमी होने तक यह चक्र 4 से 6 बार दोहराएं। आप अकेले नहीं हैं — मैं आपके साथ हूँ।',
    grounding: '5-4-3-2-1 ग्राउंडिंग तकनीक से खुद को वर्तमान में वापस लाएं:\n1. चारों ओर दिखने वाली 5 चीज़ें गिनें।\n2. पास की 4 चीज़ें छूकर नाम लें।\n3. सुनाई देने वाली 3 आवाज़ें सुनें।\n4. 2 चीज़ों की गंध या स्पर्श महसूस करें।\n5. एक धीमी, गहरी सांस बाहर छोड़ें।\nडर लौटे तो एक बार और दोहराएँ।',
    crisis: 'यह जानलेवा आपात स्थिति है। तुरंत करें:\n1. ऐप का लाल SOS बटन दबाएं या 112 पर कॉल करें (एम्बुलेंस: 108)।\n2. जिस सबसे सुरक्षित जगह तक पहुँच सकते हैं वहाँ जाएं और बचावकर्ताओं को दिखते रहें।\n3. अकेले जोखिम भरा बचाव करने की कोशिश न करें।\nबचाव टीमों को सूचना दे दी गई है — मदद रास्ते में है।',
    offTopic: 'मैं केवल आपदा, आपातकाल और AapdaSetu वेबसाइट से जुड़े विषयों में मदद कर सकता हूँ (SOS, रिपोर्ट, आश्रय, ट्रैकिंग, चिकित्सा मार्गदर्शन)। कृपया बाढ़, चोट, आश्रय या ट्रैकिंग के बारे में पूछें। उदाहरण: "घर में पानी भर रहा है" या "तेज़ खून बह रहा है"।'
  },
  bn: {
    greeting: 'নমস্কার! আমি আপদামিত্র AI। এই মুহূর্তে আমি অফলাইন মোডে চলছি, তাই উত্তর সীমিত। আপনার জরুরি অবস্থা বলুন (বন্যা, রক্তক্ষরণ, আটকে পড়া, আগুন, আতঙ্ক) এবং আমি সঙ্গে সঙ্গে প্রাণরক্ষার পদক্ষেপ জানাব। প্রাণঘাতী বিপদে SOS বোতাম চাপুন বা এখনই ১১২ নম্বরে কল করুন।',
    breathing: 'আপনি এই মুহূর্তে নিরাপদ। ৪-৪-৪ বক্স শ্বাস-প্রশ্বাস দিয়ে শরীর শান্ত করুন:\n১. নাক দিয়ে ৪ সেকেন্ড শ্বাস নিন।\n২. ৪ সেকেন্ড আলতো করে ধরে রাখুন।\n৩. মুখ দিয়ে ৪ সেকেন্ডে শ্বাস ছাড়ুন।\nহৃদস্পন্দন ধীর না হওয়া পর্যন্ত এই চক্র ৪–৬ বার করুন। আপনি একা নন — আমি আপনার সঙ্গে আছি।',
    grounding: '৫-৪-৩-২-১ গ্রাউন্ডিং কৌশলে নিজেকে বর্তমান মুহূর্তে ফিরিয়ে আনুন:\n১. চারপাশে দেখা যাচ্ছে এমন ৫টি জিনিস গুনুন।\n২. কাছের ৪টি জিনিস ছুঁয়ে চিনুন।\n৩. শোনা যাচ্ছে এমন ৩টি শব্দ শুনুন।\n৪. ২টি জিনিসের গন্ধ বা স্পর্শ টের পান।\n৫. একটা ধীর, গভীর শ্বাস ছাড়ুন।\nভয় ফিরলে আবার একবার করুন।',
    crisis: 'এটি একটি প্রাণঘাতী জরুরি অবস্থা। এখনই করুন:\n১. অ্যাপের লাল SOS বোতাম চাপুন বা ১১২ নম্বরে কল করুন (অ্যাম্বুলেন্স: ১০৮)।\n২. যেখানে পৌঁছাতে পারেন সবচেয়ে নিরাপদ সেখানে যান এবং উদ্ধারকারীদের কাছে দৃশ্যমান থাকুন।\n৩. একা ঝুঁকিপূর্ণ উদ্ধারের চেষ্টা করবেন না।\nউদ্ধারকারী দলকে খবর দেওয়া হয়েছে — সাহায্য পথে আছে।',
    offTopic: 'আমি শুধু দুর্যোগ, জরুরি অবস্থা এবং AapdaSetu ওয়েবসাইট সম্পর্কিত বিষয়ে সাহায্য করতে পারি (SOS, রিপোর্ট, আশ্রয়, ট্র্যাকিং, চিকিৎসা পরামর্শ)। বন্যা, আঘাত, আশ্রয় বা ট্র্যাকিং সম্পর্কে জিজ্ঞাসা করুন। উদাহরণ: "বাড়িতে জল ঢুকছে" বা "প্রচণ্ড রক্তক্ষরণ"।'
  },
  or: {
    greeting: 'ନମସ୍କାର! ମୁଁ ଆପଦାମିତ୍ର AI। ଏହି ସମୟରେ ମୁଁ ଅଫଲାଇନ୍ ମୋଡରେ ଚାଲୁଛି, ତେଣୁ ଉତ୍ତର ସୀମିତ। ଆପଣଙ୍କ ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି କୁହନ୍ତୁ (ବନ୍ୟା, ରକ୍ତସ୍ରାବ, ଫସିଯିବା, ନିଆଁ, ଆତଙ୍କ) ଏବଂ ମୁଁ ତୁରନ୍ତ ଜୀବନରକ୍ଷା ପଦକ୍ଷେପ କହିବି। ଜୀବନଘାତକ ବିପଦରେ SOS ବଟନ୍ ଦବାନ୍ତୁ ବା ଏବେ ହୁଅନ୍ତେ ୧୧୨କୁ କଲ୍ କରନ୍ତୁ।',
    breathing: 'ଆପଣ ଏହି ମୁହୂର୍ତ୍ତରେ ସୁରକ୍ଷିତ। ୪-୪-୪ ବକ୍ସ୍ ଶ୍ୱାସ-ପ୍ରଶ୍ୱାସ ଦ୍ୱାରା ଶରୀରକୁ ଶାନ୍ତ କରନ୍ତୁ:\n୧. ନାକ ଦେଇ ୪ ସେକେଣ୍ଡ ଶ୍ୱାସ ନିଅନ୍ତୁ।\n୨. ୪ ସେକେଣ୍ଡ ଆଳିସେ ଧରି ରଖନ୍ତୁ।\n୩. ପାଟି ଦେଇ ୪ ସେକେଣ୍ଡରେ ଶ୍ୱାସ ଛାଡ଼ନ୍ତୁ।\nହୃଦସ୍ପନ୍ଦନ ଧୀର ନ ହେବା ପର୍ଯ୍ୟନ୍ତ ଏହି ଚକ୍ର ୪–୬ ଥର କରନ୍ତୁ। ଆପଣ ଏକା ନୁହଁନ୍ତି — ମୁଁ ଆପଣଙ୍କ ସହ ଅଛି।',
    grounding: '୫-୪-୩-୨-୧ ଗ୍ରାଉଣ୍ଡିଂ କୌଶଳ ଦ୍ୱାରା ନିଜକୁ ବର୍ତ୍ତମାନ ମୁହୂର୍ତ୍ତକୁ ଫେରାନ୍ତୁ:\n୧. ଚାରିପାଖରେ ଦେଖାଯାଉଥିବା ୫ଟି ଜିନିଷ ଗଣନ୍ତୁ।\n୨. ପାଖରେ ଥିବା ୪ଟି ଜିନିଷ ଛୁଇଁ ଚିହ୍ନନ୍ତୁ।\n୩. ଶୁଣାଯାଉଥିବା ୩ଟି ଶବ୍ଦ ଶୁଣନ୍ତୁ।\n୪. ୨ଟି ଜିନିଷର ଗନ୍ଧ ବା ସ୍ପର୍ଶ ଅନୁଭବ କରନ୍ତୁ।\n୫. ଗୋଟିଏ ଧୀର, ଗଭୀର ଶ୍ୱାସ ବାହାରକୁ ଛାଡ଼ନ୍ତୁ।\nଭୟ ଫେରିଲେ ପୁଣି ଥରେ କରନ୍ତୁ।',
    crisis: 'ଏହା ଏକ ଜୀବନଘାତକ ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି। ଏବେ ତୁରନ୍ତ କରନ୍ତୁ:\n୧. ଆପର ଲାଲ SOS ବଟନ୍ ଦବାନ୍ତୁ କିମ୍ବା ୧୧୨କୁ କଲ୍ କରନ୍ତୁ (ଆମ୍ବୁଲାନ୍ସ: ୧୦୮)।\n୨. ପହଞ୍ଚିପାରିବା ସବୁଠାରୁ ସୁରକ୍ଷିତ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ ଏବଂ ଉଦ୍ଧାରକାରୀଙ୍କୁ ଦେଖାଯାଉଥିବା ରୁହନ୍ତୁ।\n୩. ଏକୁଟିଆ ବିପଜ୍ଜନକ ଉଦ୍ଧାର ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ।\nଉଦ୍ଧାରକାରୀ ଦଳକୁ ଖବର ଦିଆଯାଇଛି — ସାହାଯ୍ୟ ବାଟରେ ଅଛି।',
    offTopic: 'ମୁଁ କେବଳ ବିପର୍ଯ୍ୟୟ, ଜରୁରୀକାଳୀନ ଏବଂ AapdaSetu ୱେବସାଇଟ୍ ସମ୍ବନ୍ଧୀୟ ବିଷୟରେ ସହାୟତା କରିପାରିବି (SOS, ରିପୋର୍ଟ, ଆଶ୍ରୟ, ଟ୍ରାକିଂ, ଡାକ୍ତରୀ ପରାମର୍ଶ)। ବନ୍ୟା, ଆଘାତ, ଆଶ୍ରୟ କିମ୍ବା ଟ୍ରାକିଂ ବିଷୟରେ ପଚାରନ୍ତୁ। ଉଦାହରଣ: "ଘରକୁ ପାଣି ଭରିବା" କିମ୍ବା "ପ୍ରବଳ ରକ୍ତସ୍ରାବ"।'
  }
}

/** True when reply text is written in the script of the requested UI language. */
function replyMatchesScript(text: string, lang: AiLang): boolean {
  if (lang === 'hi') return /[\u0900-\u097F]/u.test(text)
  if (lang === 'bn') return /[\u0980-\u09FF]/u.test(text)
  if (lang === 'or') return /[\u0B00-\u0B7F]/u.test(text)
  return !/[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F]/u.test(text)
}

export function isReasoningContaminated(text: string): boolean {
  const reasoningTriggers = [
    /okay,\s*the\s*user\s*is/i,
    /the\s*user\s*is\s*(greeting|asking|testing|saying)/i,
    /looking\s*at\s*the\s*history/i,
    /according\s*to\s*(my\s*)?instructions/i,
    /according\s*to\s*(the\s*)?rules/i,
    /i\s*must\s*:/i,
    /•\s*reply\s*in/i,
    /•\s*give\s*only/i,
    /•\s*no\s*thinking/i,
    /•\s*since\s*it's/i,
    /here('s| is) (a |the )?thinking process/i,
    /thinking process:/i,
    /reasoning process:/i,
    /let's analyze/i,
    /rule \d+:/i,
  ]
  return reasoningTriggers.some((re) => re.test(text))
}

export function cleanAiOutput(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

  // 1. Strip explicit <think>...</think> or [THINK]...[/THINK]
  text = text.replace(/<think[\s\S]*?<\/think>/gi, '')
  text = text.replace(/<thought[\s\S]*?<\/thought>/gi, '')
  text = text.replace(/\[think[\s\S]*?\[\/think\]/gi, '')

  // ponytail: ^ + m so mid-sentence "…my Response:" words never truncate output
  const responseMarkers = [
    /^(?:(?:3|4|5)\.\s*)?Determine Response:\s*([\s\S]*)$/im,
    /^Final\s*Response:\s*([\s\S]*)$/im,
    /^Response:\s*([\s\S]*)$/im,
    /^Final\s*Answer:\s*([\s\S]*)$/im,
    /^Answer:\s*([\s\S]*)$/im,
    /^Output:\s*([\s\S]*)$/im,
  ]
  for (const marker of responseMarkers) {
    const match = text.match(marker)
    if (match && match[1] && match[1].trim().length > 0) {
      text = match[1]
      break
    }
  }

  // 3. Remove thinking process headers or internal commentary
  text = text.replace(/^(?:Here(?:'s| is) (?:a |the )?thinking process:?|Thinking Process:?|Reasoning:?)[\s\S]*?(?=\n\n\n|\n[A-Z]|$)/gmi, '')
  text = text.replace(/^(?:Okay,\s*the\s*user\s*is[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')
  text = text.replace(/^(?:Looking\s*at\s*the\s*history[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')
  text = text.replace(/^(?:According\s*to\s*my\s*instructions[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')

  // 4. Remove rule echo lines e.g. "• Rule 1: ...", "1. Analyze User Input: ...", "• Since it's..."
  text = text.replace(/^\s*(?:\d+\.\s*(?:Analyze|Check Rules|Determine|Evaluate|Reasoning)|•\s*(?:Rule\s*\d+:|Reply in|Give ONLY|No thinking|Since it's|It's a|I need to)).*$/gmi, '')

  // 5. If JSON encoded, extract value
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.message) text = parsed.message
      else if (parsed.reply) text = parsed.reply
      else if (parsed.text) text = parsed.text
      else if (parsed.response) text = parsed.response
    } catch {
      // Not valid JSON payload, keep text as is
    }
  }

  // 6. Remove markdown formatting, backticks, hashtags
  text = text.replace(/```(?:json|markdown)?/gi, '')
  text = text.replace(/```/g, '')
  text = text.replace(/`/g, '')
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 7. Strip ALL asterisks (*, **, ***, ****) completely
  text = text.replace(/\*+/g, '')

  // 8. Clean bullets and strip conversational filler
  text = text.replace(/^\s*[-•]\s+/gm, '• ')
  text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d/gu, '')
  text = text.replace(/^(?:Here is what you should do:?|Here are the steps:?|Answer:?|Assistant:?)\s*/gim, '')

  // 9. Normalize spacing and newlines
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

async function callOpenRouter(
  message: string,
  history: ChatHistoryItem[] = [],
  lang: AiLang = 'en'
): Promise<string> {
  // ponytail: callers (ChatWidget/PfaChat) pass the FULL conversation and its
  // last item IS the current user turn — treat history as-is, never append
  // `message` again (it is only a fallback when no history exists).
  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: AAPDAMITRA_SYSTEM_PROMPT + languageDirective(lang) },
    ...(history.length > 0
      ? history.slice(-6).map((h) => ({
          role: h.role === 'bot' ? ('assistant' as const) : ('user' as const),
          content: cleanAiOutput(h.content),
        }))
      : [{ role: 'user' as const, content: message }]),
  ]

  if (getChatProviders().length === 0) {
    throw new Error('No AI provider API key configured')
  }
  let lastError: unknown = null

  for (const provider of getChatProviders()) {
    for (const model of provider.models) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      try {
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: provider.headers,
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: chatMessages,
            temperature: 0.4,
            max_tokens: 500,
          }),
        })
        clearTimeout(timeout)

        if (!res.ok) {
          const errorBody = await res.text()
          console.warn(`[AapdaMitra AI] ${provider.name}/${model} returned HTTP ${res.status}:`, errorBody)
          continue
        }

        const data = await res.json()
        const msg = data?.choices?.[0]?.message
        // Some free models put everything into reasoning_content with an empty
        // content field — that is leaked thinking, not an answer, so skip them.
        const content = typeof msg?.content === 'string' ? msg.content : ''
        if (content.trim().length > 0) {
          const cleaned = cleanAiOutput(content)
          // If the output is still contaminated with leaked reasoning or too short, skip this model
          if (cleaned.length > 5 && !isReasoningContaminated(cleaned)) {
            return cleaned
          }
        }
      } catch (err) {
        clearTimeout(timeout)
        lastError = err
        console.warn(`[AapdaMitra AI] Error requesting ${provider.name}/${model}:`, err)
      }
    }
  }

  throw lastError || new Error('All AI providers produced empty or contaminated output')
}

/** POST /ai/pfa-chat — Intelligent AapdaMitra AI Crisis & Survival Companion. */
export async function aiPfaChat(
  message: string,
  history: ChatHistoryItem[] = [],
  victimName = 'Friend',
  lang: AiLang = 'en'
): Promise<PfaChatResponse> {
  const lowerScope = message.toLowerCase()
  const scopePattern = /\b(flood|bleed|cut|drown|sinking|cardiac|heart|snake|burn|fracture|chok|help|rescue|shelter|track|sos|report|aapdasetu|emergency|danger|pain|hurt|wound|panic|water|food|medicine|hospital|ambulance|fire|earthquake|collapse|trapped|missing|damage|helpline|112|108)\b/i
  const unrelatedPattern = /\b(reverse|py\s*code|python|java\s*code|javascript|programming|algorithm|leetcode|homework|essay|poem|joke|song|movie|game|translate|write\s*code|give\s*code|code\s*snippet|reverse\s*string)\b/i
  if (unrelatedPattern.test(lowerScope) && !scopePattern.test(lowerScope)) {
    return {
      reply: DEGRADED_REPLIES[lang].offTopic,
      exerciseType: undefined,
      isCritical: false,
      dangerLevel: 'LOW',
      helpline: undefined,
      safetyChecklist: ['National Emergency: 112 | Ambulance: 108'],
    }
  }
  try {
    const aiReply = await callOpenRouter(message, history, lang)
    // ponytail: detectDangerLevel never returns falsy — rank both texts instead
    const levels = [detectDangerLevel(message), detectDangerLevel(aiReply)]
    const dangerLevel: DangerLevel = levels.includes('CRITICAL')
      ? 'CRITICAL'
      : levels.includes('MODERATE')
      ? 'MODERATE'
      : 'LOW'
    const isCritical = dangerLevel === 'CRITICAL'
    const exerciseType = detectBreathingExercise(message) || detectBreathingExercise(aiReply)

    return {
      reply: cleanAiOutput(aiReply),
      exerciseType,
      isCritical,
      dangerLevel,
      helpline: isCritical ? '112' : dangerLevel === 'MODERATE' ? '108' : undefined,
      safetyChecklist: [
        'Prioritize human life over property',
        'Keep phone battery saved for emergency updates',
        'National Emergency Hotline: 112 | Medical Ambulance: 108',
      ],
    }
  } catch (err) {
    console.warn('[AapdaMitra AI] Falling back to local crisis intelligence engine:', err)
    const dangerLevel = detectDangerLevel(message)
    const exerciseType = detectBreathingExercise(message)
    const degraded = DEGRADED_REPLIES[lang] ?? DEGRADED_REPLIES.en

    let fallbackReply = ''
    try {
      const fallback = mocks.aiPfaChat(message, victimName)
      fallbackReply = typeof fallback?.reply === 'string' ? fallback.reply : ''
    } catch {
      // Mock engine unavailable — use the localized fixed response instead.
    }
    // The mock engine guesses language from the message text; when its guess does not
    // match the UI language the user selected, replace it with a localized fixed reply.
    if (!replyMatchesScript(fallbackReply, lang)) {
      fallbackReply =
        dangerLevel === 'CRITICAL'
          ? degraded.crisis
          : exerciseType === '4-4-4_BOX_BREATHING'
          ? degraded.breathing
          : detectGroundingNeed(message)
          ? degraded.grounding
          : degraded.greeting
    }

    return {
      reply: cleanAiOutput(fallbackReply),
      exerciseType,
      isCritical: dangerLevel === 'CRITICAL',
      dangerLevel,
      helpline: dangerLevel === 'CRITICAL' ? '112' : dangerLevel === 'MODERATE' ? '108' : undefined,
      safetyChecklist: ['National Emergency: 112 | Ambulance: 108'],
    }
  }
}

export interface DamageVerdict {
  claimedDamage: boolean
  verified: boolean
  duplicate: boolean
  exifValid: boolean
  exifDeltaKm?: number
  damageGrade: 'DESTROYED' | 'MAJOR' | 'MINOR'
  damageScore: number
  confidence: number
  compensationInr: number
  factors: string[]
  huggingFaceModel: string
  infrastructureType: string
}

/** POST /ai/damage-assessment — anti-fraud photo damage grading with HuggingFace model. */
export function aiDamageAssessment(
  photoDataUrl: string,
  reportedLat?: number,
  reportedLng?: number,
  description?: string,
  infrastructureType?: string,
): Promise<DamageVerdict> {
  return withMockFallback(
    () =>
      aiCall<DamageVerdict>('POST', '/ai/damage-assessment', {
        photoDataUrl,
        reportedLat,
        reportedLng,
        description,
        infrastructureType,
      }),
    () =>
      mocks.aiDamageAssessment(
        photoDataUrl,
        reportedLat,
        reportedLng,
        description,
        infrastructureType as DamageInfrastructureType,
      ),
    // ponytail: fabricated verdicts feed compensation claims — failures must surface
    { mutating: true },
  )
}

/** POST /ai/satelliteflood-map — Sentinel-1 SAR flood extent polygons. */
export function aiSatelliteFloodMap(payload: { district?: string; center?: { lat: number; lng: number }; radiusKm?: number } = {}): Promise<FloodGeoJson> {
  return withMockFallback(
    () => aiCall<FloodGeoJson>('POST', '/ai/satelliteflood-map', payload),
    () => mocks.aiSatelliteFloodMap(),
    { mutating: true },
  )
}
