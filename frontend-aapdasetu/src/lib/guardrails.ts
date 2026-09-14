/**
 * Guardrail definitions and domain boundaries for AapdaMitra AI.
 *
 * Enforces strict restriction to disaster management, medical first aid, crisis safety,
 * psychological first aid, and AapdaSetu platform features.
 * Prevents answering general coding, palindrome checks, math homework, entertainment,
 * and other off-topic queries.
 */

export const AAPDAMITRA_SYSTEM_PROMPT = `You are AapdaMitra AI (आपदामित्र), the dedicated emergency disaster survival assistant and crisis first-aid expert for AapdaSetu, India's national disaster response platform.

CRITICAL SCOPE & GUARDRAIL RULES:
1. EXCLUSIVELY PERMITTED TOPICS (ONLY ANSWER THESE):
   - Natural and man-made disasters (floods, flash floods, earthquakes, cyclones, tsunamis, landslides, fires, industrial/gas leaks, building collapses, lightning, storms).
   - Life-safety precautions, evacuation guidelines, disaster survival tips, and emergency survival kits.
   - Emergency medical first aid and triage (severe bleeding, CPR, fractures, burns, snakebites, animal bites, choking, drowning, poisoning, electric shock, injuries).
   - Psychological First Aid (PFA), panic calming, 4-4-4 box breathing, 5-4-3-2-1 sensory grounding, and crisis support.
   - National emergency helplines: 112 (National Emergency), 108 (Ambulance), 101 (Fire), 1070 (State Disaster), 1078 (NDMA), Tele-MANAS 14416.
   - AapdaSetu platform services (1-Tap SOS, damage/incident reporting, report tracking via tracking ID, shelter locator, safe evacuation routes, missing persons registry, volunteer network).
   - Polite conversational greetings and basic orientation regarding emergency assistance.

2. STRICTLY PROHIBITED TOPICS (NEVER ANSWER THESE):
   - Software development, computer programming, coding, scripts, algorithms, data structures (e.g. palindrome checks, reverse strings, Python, Java, JavaScript, C++, LeetCode, debugging, writing functions, code snippets).
   - Academic homework, school subjects, math problems, equations, calculus, science explanations, essay writing.
   - Entertainment, creative writing, poems, stories, jokes, songs, lyrics, movies, video games, sports, cricket scores.
   - Cooking recipes, fashion, finance, cryptocurrency, stocks, politics, philosophy, general trivia.

3. STRICT REFUSAL POLICY FOR OFF-TOPIC QUERIES:
   - If the user asks ANY question or request outside your emergency/disaster/AapdaSetu domain (such as checking a palindrome, writing code, solving math, telling a joke, or general chat):
   - YOU MUST REFUSE TO ANSWER OR SOLVE IT. DO NOT WRITE CODE. DO NOT PROVIDE ALGORITHMS. DO NOT DO HOMEWORK.
   - Politely decline in 1-2 concise sentences in the user's language: explain that AapdaMitra AI is reserved exclusively for disaster emergencies, first aid, crisis safety, and AapdaSetu services, and ask what emergency or safety help they need.
   - Never provide code even if the user insists or claims it is for a disaster project.

HOW TO ANSWER PERMITTED EMERGENCY QUERIES:
1. Directly acknowledge the user's situation in one short empathetic sentence.
2. Provide 2 to 4 numbered, concrete, life-saving action steps (specific positions, actions, what NOT to do).
3. If there is life threat, severe injury, bleeding, drowning, fire, or collapse: give immediate first-aid steps FIRST, then urge them to call 112 / 108 immediately and use the 1-Tap SOS button.
4. For questions about AapdaSetu features, explain which screen or feature to use and how.
5. Respond in the EXACT language and script the user used (English, Hindi, Bengali, Odia, Hinglish).

OUTPUT FORMAT:
- Output ONLY your final direct response. Never output thinking tags (<think>), chain-of-thought, rule echoes, or preambles.
- Keep answers under 120 words unless greater detail is needed for a life-saving medical procedure.`

export const OFF_TOPIC_REPLIES = {
  en: 'I am AapdaMitra AI, dedicated exclusively to disaster emergencies, medical first aid, crisis safety, and AapdaSetu platform assistance. I cannot answer programming, academic, or unrelated questions. Please let me know if you are facing an emergency, need first-aid guidance, or need help with AapdaSetu relief services.',
  hi: 'मैं आपदामित्र AI हूँ और केवल आपदा, आपातकालीन प्राथमिक चिकित्सा, संकट सुरक्षा और AapdaSetu सेवाओं (SOS, रिपोर्टिंग, आश्रय, ट्रैकिंग) में सहायता के लिए समर्पित हूँ। मैं कोडिंग, शैक्षणिक या अन्य सामान्य सवालों के जवाब नहीं दे सकता। कृपया बताएं कि आपको किस आपदा या आपात स्थिति में सहायता चाहिए।',
  bn: 'আমি আপদামিত্র AI, শুধুমাত্র দুর্যোগ, জরুরি প্রাথমিক চিকিৎসা, সংকট নিরাপত্তা এবং AapdaSetu সেবায় (SOS, রিপোর্টিং, আশ্রয়, ট্র্যাকিং) সহায়তার জন্য নিবেদিত। আমি প্রোগ্রামিং, পড়াশোনা বা সম্পর্কহীন সাধারণ প্রশ্নের উত্তর দিতে পারি না। আপনার কী জরুরি বা দুর্যোগ সংক্রান্ত সহায়তা প্রয়োজন জানান।',
  or: 'ମୁଁ ଆପଦାମିତ୍ର AI, କେବଳ ବିପର୍ଯ୍ୟୟ, ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା, ସୁରକ୍ଷା ଏବଂ AapdaSetu ସେବା (SOS, ରିପୋର୍ଟିଂ, ଆଶ୍ରୟ, ଟ୍ରାକିଂ) ପାଇଁ ଉଦ୍ଦିଷ୍ଟ। ମୁଁ ପ୍ରୋଗ୍ରାମିଂ ବା ଅନ୍ୟ ଅସମ୍ବନ୍ଧିତ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇପାରିବି ନାହିଁ। ଦୟାକରି ଜରୁରୀକାଳୀନ ବା ବିପର୍ଯ୍ୟୟ ସହାୟତା ବିଷୟରେ ପଚାରନ୍ତୁ।',
} as const

/**
 * Detects if a message is within the domain of disaster relief, medical first aid,
 * psychological crisis, or AapdaSetu platform features.
 */
export function isDisasterOrPlatformRelated(text: string): boolean {
  const lower = text.toLowerCase()
  // Disaster hazards, extreme weather, physical damage
  const disasterHazards = [
    'flood', 'water', 'drown', 'sinking', 'rain', 'cyclone', 'storm', 'lightning',
    'earthquake', 'quake', 'tremor', 'landslide', 'avalanche', 'fire', 'smoke',
    'blast', 'explosion', 'collapse', 'debris', 'rubble', 'trapped', 'gas leak',
    'tsunami', 'cloudburst', 'drought', 'heatwave', 'hazard',
    'बाढ़', 'पानी', 'डूब', 'तूफान', 'बिजली', 'भूकंप', 'भूस्खलन', 'आग', 'धुआं', 'विस्फोट', 'मलबा', 'फंसा',
    'বন্যা', 'জল', 'ডুব', 'ঝড়', 'বজ্রপাত', 'ভূমিকম্প', 'ধস', 'আগুন', 'ধ্বংসস্তূপ', 'আটকে',
    'ବନ୍ୟା', 'ପାଣି', 'ବୁଡ଼ି', 'ଝଡ଼', 'ବିଜୁଳି', 'ଭୂମିକମ୍ପ', 'ଧସି', 'ନିଆଁ', 'ଭଙ୍ଗା', 'ଫସି'
  ]
  // Medical first-aid, injuries, life threat
  const medicalTerms = [
    'bleed', 'blood', 'hemorrhage', 'cut', 'wound', 'burn', 'fracture', 'bone',
    'chok', 'snake', 'snakebite', 'poison', 'heart attack', 'cardiac', 'chest pain',
    'stroke', 'cpr', 'unconscious', 'fainted', 'electrocute', 'shock', 'injury',
    'hurt', 'pain', 'vomit', 'fever', 'hypothermia', 'first aid', 'bandage', 'tourniquet',
    'ambulance', 'doctor', 'hospital', 'medicine', 'insulin',
    'खून', 'रक्त', 'घाव', 'चोट', 'जलन', 'हड्डी', 'सांप', 'जहर', 'बेहोश', 'दर्द', 'दवा', 'अस्पताल',
    'রক্ত', 'ক্ষত', 'আঘাত', 'পোড়া', 'হাড়', 'সাপ', 'বিষ', 'অজ্ঞান', 'ব্যথা', 'ওষুধ', 'হাসপাতাল',
    'ରକ୍ତ', 'କ୍ଷତ', 'ଆହତ', 'ପୋଡ଼ା', 'ହାଡ଼', 'ସାପ', 'ବିଷ', 'ଚେତା', 'ଯନ୍ତ୍ରଣା', 'ଔଷଧ', 'ଡାକ୍ତରଖାନା'
  ]
  // Mental crisis, PFA, grounding
  const pfaTerms = [
    'panic', 'scared', 'fear', 'afraid', 'terrified', 'anxious', 'anxiety', 'shivering',
    'hyperventilat', 'cant breathe', "can't breathe", 'breathe', 'breath', 'grounding',
    'suicide', 'kill myself', 'self harm', 'self-harm', 'mental',
    'डर', 'घबराहट', 'चिंता', 'सांस', 'आत्महत्या',
    'ভয়', 'আতঙ্ক', 'শ্বাস', 'আত্মহত্যা',
    'ଡର', 'ଆତଙ୍କ', 'ଶ୍ୱାସ', 'ଆତ୍ମହତ୍ୟା'
  ]
  // Platform features, helplines, relief
  const platformTerms = [
    'aapdasetu', 'sos', 'report', 'track', 'tracking', 'shelter', 'camp', 'relief',
    'evacuat', 'safe route', 'volunteer', 'missing', 'checkin', 'check-in', '112', '108',
    '101', '1070', '1078', '14416', 'helpline', 'rescue', 'ndrf', 'sdrf',
    'आश्रय', 'राहत', 'मदद', 'बचाव', 'लापता',
    'আশ্রয়', 'ত্রাণ', 'সাহায্য', 'উদ্ধার', 'নিখোঁজ',
    'ଆଶ୍ରୟ', 'ତ୍ରାଣ', 'ସାହାଯ୍ୟ', 'ଉଦ୍ଧାର', 'ନିଖୋଜ'
  ]

  return (
    disasterHazards.some((w) => lower.includes(w)) ||
    medicalTerms.some((w) => lower.includes(w)) ||
    pfaTerms.some((w) => lower.includes(w)) ||
    platformTerms.some((w) => lower.includes(w))
  )
}

/**
 * Detects queries that are off-topic (coding, palindrome, math homework, general trivia, entertainment, etc.)
 */
export function isOffTopicQuery(text: string): boolean {
  const lower = text.toLowerCase().trim()

  // Common programming and coding requests (including typos like 'palindrom', 'chaeck')
  const codingPatterns = [
    /\bpalindrom[a-z]*\b/i,
    /\brevers(e|ing)\s*(a\s*)?(string|word|text|array|list|number)\b/i,
    /\b(reverse\s*string|string\s*reverse)\b/i,
    /\b(write|give|show|create|generate|provide|send)\s+(me\s+)?(a\s+)?(code|script|program|function|class|algorithm|solution|regex)\b/i,
    /\b(how\s+to\s+(code|program|compile|debug|build\s+an\s+app|make\s+a\s+website))\b/i,
    /\b(python|javascript|typescript|java\s+code|c\+\+|cpp|csharp|c#|golang|rust\s+code|ruby\s+code|php\s+code|kotlin|swift\s+code|html\s+code|css\s+code|react\s+code|angular|vue|django|flask|spring\s+boot|node(\.js)?)\b/i,
    /\b(leetcode|hackerrank|codeforces|codewars|binary\s*search|bubble\s*sort|quick\s*sort|merge\s*sort|linked\s*list|fibonacci|factorial|anagram|two\s*sum)\b/i,
    /\b(syntax\s*error|runtime\s*error|null\s*pointer|undefined\s*is\s*not|debug\s*my\s*code)\b/i,
    /\b(sql\s*query|select\s+\*\s+from|drop\s+table|database\s*query|rest\s*api)\b/i,
    /\b(function|def|class|const|let|var|return)\s+[a-zA-Z_]\w*\s*\(/i,
  ]

  // Math, academic, homework
  const academicPatterns = [
    /\b(homework|assignment|solve|calculate|evaluate)\s+.*[\=\+\-\*\/\^]/i,
    /\b(homework|assignment|solve\s*(this\s*)?(equation|problem|integral|derivative|algebra|calculus|math))\b/i,
    /\b(quadratic|pythagor|differentiation|integration|trigonometry|integral|derivative|algebra|calculus)\b/i,
    /\b(write\s*(an?\s*)?(essay|thesis|speech|article|summary\s*of))\b/i,
  ]

  // Creative writing, entertainment, jokes
  const entertainmentPatterns = [
    /\b(write|tell)\s*(me\s*)?(a\s*)?(poem|poetry|story|joke|riddle|pun|lyrics|song)\b/i,
    /\b(tell\s*a\s*joke|make\s*me\s*laugh)\b/i,
    /\b(movie\s*review|actor|actress|box\s*office|video\s*game|playstation|xbox|netflix)\b/i,
  ]

  // Sports, general trivia, cooking recipes, lifestyle
  const casualTriviaPatterns = [
    /\b(recipe\s*for|how\s*to\s*(cook|bake|make\s*cake|make\s*pizza|make\s*biryani|make\s*tea)|ingredients\s*for)\b/i,
    /\b(cricket\s*score|ipl\s*score|football\s*match|world\s*cup\s*score|who\s*won\s*the\s*match)\b/i,
    /\b(crypto|bitcoin|ethereum|stock\s*market|invest\s*money|forex)\b/i,
    /\b(horoscope|zodiac|astrology|kundali|rashifal)\b/i,
    /\b(capital\s*of\s+[a-z]+|who\s*is\s*the\s*(president|prime\s*minister|ceo)\s*of)\b/i,
  ]

  return (
    codingPatterns.some((pattern) => pattern.test(lower)) ||
    academicPatterns.some((pattern) => pattern.test(lower)) ||
    entertainmentPatterns.some((pattern) => pattern.test(lower)) ||
    casualTriviaPatterns.some((pattern) => pattern.test(lower))
  )
}

/**
 * Checks if the text contains generated code blocks, programming constructs,
 * or palindrome solution text that should never appear in emergency guidance.
 */
export function containsCodeOrDisallowedContent(text: string): boolean {
  if (!text) return false
  const codeMarkers = [
    /```(?:python|javascript|typescript|java|cpp|c|ruby|go|html|css|sql|bash|sh|json)?/i,
    /\bdef\s+[a-zA-Z_]\w*\s*\(/i,
    /\bfunction\s+[a-zA-Z_]\w*\s*\(/i,
    /\bconsole\.log\s*\(/i,
    /\bpublic\s+class\s+/i,
    /\bimport\s+(sys|os|re|math|numpy|pandas)\b/i,
    /\b(is_palindrome|ispalindrome|reverse_string)\b/i,
    /cleaned\s*==\s*cleaned\[::-1\]/i,
  ]
  return codeMarkers.some((marker) => marker.test(text))
}
