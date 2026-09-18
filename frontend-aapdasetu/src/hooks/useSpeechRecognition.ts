import { useState, useRef, useCallback, useEffect } from 'react'
import { useLanguage, type Language } from '../lib/i18n'

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      length: number
      [index: number]: {
        transcript: string
        confidence: number
      }
    }
  }
}

interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

const LANG_TO_BCP47: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  or: 'hi-IN', // Browser fallback: standard speech engines map Odia regional audio cleanly to Hindi-IN engine
}

export function useSpeechRecognition() {
  const { lang } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onResultCallbackRef = useRef<((transcript: string) => void) | null>(null)

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionClass() !== null

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Recognition might already be stopped
      }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(
    (onResult: (transcript: string) => void) => {
      setError(null)
      const SpeechRecognition = getSpeechRecognitionClass()
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser.')
        return
      }

      if (recognitionRef.current) {
        stopListening()
      }

      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = LANG_TO_BCP47[lang] || 'en-IN'

        onResultCallbackRef.current = onResult

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i]
            if (result && result[0]) {
              if (result.isFinal) {
                finalTranscript += result[0].transcript
              } else {
                interimTranscript += result[0].transcript
              }
            }
          }

          const text = (finalTranscript || interimTranscript).trim()
          if (text && onResultCallbackRef.current) {
            onResultCallbackRef.current(text)
          }
        }

        recognition.onerror = (e: SpeechRecognitionErrorEventLike) => {
          if (e.error !== 'no-speech') {
            setError(e.error || 'Speech input error')
          }
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
          recognitionRef.current = null
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to access microphone')
        setIsListening(false)
      }
    },
    [lang, stopListening],
  )

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
    error,
  }
}
