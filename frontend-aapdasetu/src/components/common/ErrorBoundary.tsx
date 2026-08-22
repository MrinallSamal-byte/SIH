import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ShieldAlert, Home, RefreshCw } from 'lucide-react'

// Mirrors the localStorage key used by the i18n provider (src/lib/i18n.tsx) without
// importing it, so this module stays dependency-free and safe during crashes.
const ERROR_STRINGS = {
  en: {
    updateTitle: 'New Application Update Available',
    updateDesc:
      'A newer version of AapdaSetu was deployed. Click below to reload with the latest emergency assets.',
    unavailableTitle: 'Emergency View Temporarily Unavailable',
    unavailableDesc:
      'A temporary component error occurred while rendering this emergency view. You can reload this view or navigate back safely.',
    refreshUpdate: 'Refresh & Update App',
    retryView: 'Retry View',
    returnHome: 'Return Home',
  },
  hi: {
    updateTitle: 'एप्लिकेशन का नया अपडेट उपलब्ध है',
    updateDesc:
      'आपदासेतु का एक नया संस्करण तैनात किया गया है। नवीनतम आपातकालीन संसाधनों के साथ पुनः लोड करने के लिए नीचे क्लिक करें।',
    unavailableTitle: 'आपातकालीन दृश्य अस्थायी रूप से अनुपलब्ध है',
    unavailableDesc:
      'इस आपातकालीन दृश्य को रेंडर करते समय एक अस्थायी त्रुटि हुई। आप इस दृश्य को पुनः लोड कर सकते हैं या सुरक्षित रूप से वापस जा सकते हैं।',
    refreshUpdate: 'रिफ्रेश करें और ऐप अपडेट करें',
    retryView: 'दृश्य पुनः आज़माएँ',
    returnHome: 'होम पर लौटें',
  },
  bn: {
    updateTitle: 'নতুন অ্যাপ্লিকেশন আপডেট উপলব্ধ',
    updateDesc:
      'আপদাসেতুর একটি নতুন সংস্করণ ডিপ্লয় করা হয়েছে। সর্বশেষ জরুরি সম্পদ সহ পুনরায় লোড করতে নিচে ক্লিক করুন।',
    unavailableTitle: 'জরুরি ভিউ সাময়িকভাবে অনুপলব্ধ',
    unavailableDesc:
      'এই জরুরি ভিউটি রেন্ডার করার সময় একটি অস্থায়ী ত্রুটি ঘটেছে। আপনি ভিউটি পুনরায় লোড করতে বা নিরাপদে ফিরে যেতে পারেন।',
    refreshUpdate: 'রিফ্রেশ করুন ও অ্যাপ আপডেট করুন',
    retryView: 'আবার চেষ্টা করুন',
    returnHome: 'হোমে ফিরুন',
  },
  or: {
    updateTitle: 'ନୂଆ ଆପ୍ଲିକେସନ ଅପଡେଟ୍ ଉପଲବ୍ଧ',
    updateDesc:
      'ଆପଦାସେତୁର ଏକ ନୂଆ ସଂସ୍କରଣ ଡେପ୍ଲୋି ହୋଇଛି। ସର୍ବଶେଷ ଜରୁରୀକାଳୀନ ଆସେଟ୍ ସହ ପୁଣି ଲୋଡ୍ କରିବା ପାଇଁ ତଳେ କ୍ଲିକ୍ କରନ୍ତୁ।',
    unavailableTitle: 'ଜରୁରୀକାଳୀନ ଭିଉ କ୍ଷଣିକ ପାଇଁ ଅନୁପଲବ୍ଧ',
    unavailableDesc:
      'ଏହି ଜରୁରୀକାଳୀନ ଭିଉ ରେଣ୍ଡର କରିବା ସମୟରେ ଏକ କ୍ଷଣିକ ତ୍ରୁଟି ଘଟିଲା। ଆପଣ ଏହି ଭିଉ ପୁଣି ଲୋଡ୍ କରିପାରିବେ କିମ୍ବା ସୁରକ୍ଷିତ ଭାବରେ ପଛକୁ ଫେରିପାରିବେ।',
    refreshUpdate: 'ରିଫ୍ରେସ୍ କରନ୍ତୁ ଓ ଆପ୍ ଅପଡେଟ୍ କରନ୍ତୁ',
    retryView: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
    returnHome: 'ଘରକୁ ଫେରନ୍ତୁ',
  },
} as const

type ErrorLang = keyof typeof ERROR_STRINGS

function readStoredLanguage(): ErrorLang {
  try {
    const stored = localStorage.getItem('aapdasetu_lang')
    if (stored === 'hi' || stored === 'bn' || stored === 'or') return stored
  } catch {
    // Storage unavailable — fall back to English
  }
  return 'en'
}

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  isChunkError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase()
    const isChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('importing a module script failed') ||
      msg.includes('failed to fetch')

    return { hasError: true, error, isChunkError }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AapdaSetu ErrorBoundary caught]:', error, errorInfo)
    const msg = (error?.message || '').toLowerCase()
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('importing a module script failed')
    ) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name))
        })
      }
    }
  }

  reset = () => {
    if (this.state.isChunkError) {
      if (typeof caches !== 'undefined') {
        caches
          .keys()
          .then((names) => {
            Promise.all(names.map((name) => caches.delete(name))).finally(() => {
              window.location.reload()
            })
          })
          .catch(() => {
            window.location.reload()
          })
      } else {
        window.location.reload()
      }
      return
    }
    this.setState({ hasError: false, error: null, isChunkError: false })
  }

  render() {
    if (this.state.hasError) {
      const s = ERROR_STRINGS[readStoredLanguage()]
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900/50 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {this.state.isChunkError
              ? s.updateTitle
              : this.props.fallbackTitle || s.unavailableTitle}
          </h2>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {this.state.isChunkError ? s.updateDesc : s.unavailableDesc}
          </p>

          {this.state.error && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{this.state.isChunkError ? s.refreshUpdate : s.retryView}</span>
            </button>
            <a
              href="#/"
              onClick={() => {
                this.reset()
                window.location.hash = '#/'
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{s.returnHome}</span>
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
