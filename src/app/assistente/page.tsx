'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  Calendar,
  DollarSign,
  Lock,
  Edit,
  XCircle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { estraiAzioniDaMessaggio, getIconaAzione, getLabelAzione, type AzioneAI } from '@/lib/ai-actions'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  azioni?: AzioneAI[] // Azioni proposte dall'AI
  azioniEseguite?: Record<number, 'pending' | 'success' | 'error'> // Stato delle azioni
}

const suggerimentiRapidi = [
  {
    titolo: 'Verifica disponibilità',
    testo: 'Un cliente chiede disponibilità dal 10 al 17 agosto per 4 persone. Cosa abbiamo libero?',
  },
  {
    titolo: 'Calcola preventivo',
    testo: 'Calcola un preventivo per Appartamento 2, dal 15 al 29 luglio, 5 adulti e 2 bambini (8 e 10 anni)',
  },
  {
    titolo: 'Risposta cliente',
    testo: 'Un cliente scrive: "Buongiorno, vorrei sapere se avete disponibilità per la settimana di Ferragosto. Siamo in 6, 4 adulti e 2 bambini. Grazie"',
  },
]

export default function AssistentePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Errore nella risposta')
      }

      const data = await response.json()

      // Estrai eventuali azioni dal messaggio
      const { testoSenzaAzioni, azioni } = estraiAzioniDaMessaggio(data.message)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: testoSenzaAzioni,
        timestamp: new Date(),
        azioni: azioni.length > 0 ? azioni : undefined,
        azioniEseguite: {},
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Errore:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova tra poco.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Esegue un'azione proposta dall'AI dopo conferma dell'utente
  const eseguiAzione = async (messageId: string, azioneIndex: number, azione: AzioneAI) => {
    // Aggiorna lo stato a 'pending'
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          azioniEseguite: { ...m.azioniEseguite, [azioneIndex]: 'pending' }
        }
      }
      return m
    }))

    try {
      const response = await fetch('/api/ai-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione }),
      })

      const data = await response.json()

      // Aggiorna lo stato in base al risultato
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            azioniEseguite: {
              ...m.azioniEseguite,
              [azioneIndex]: data.success ? 'success' : 'error'
            }
          }
        }
        return m
      }))

      // Mostra notifica
      if (data.success) {
        // Aggiungi messaggio di conferma
        const confirmMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ **Azione completata!**\n\n${data.messaggio}`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, confirmMessage])
      }
    } catch (error) {
      console.error('Errore esecuzione azione:', error)
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            azioniEseguite: { ...m.azioniEseguite, [azioneIndex]: 'error' }
          }
        }
        return m
      }))
    }
  }

  const formatMessageContent = (content: string) => {
    // Converti markdown-like in HTML
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-900">
              {line.replace('## ', '')}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold mt-3 mb-1 text-gray-800">
              {line.replace('### ', '')}
            </h3>
          )
        }
        // Bold with emoji headers
        if (line.match(/^[📋🏠💰✉️✅❌⚠️📅👥🔄]/)) {
          return (
            <p key={i} className="font-semibold mt-3 mb-1">
              {line}
            </p>
          )
        }
        // Bold text
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return (
            <p key={i} className="my-1">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          )
        }
        // List items
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 my-0.5">
              {line.replace('- ', '')}
            </li>
          )
        }
        // Horizontal rule
        if (line === '---') {
          return <hr key={i} className="my-4 border-gray-200" />
        }
        // Empty line
        if (!line.trim()) {
          return <br key={i} />
        }
        // Regular text
        return (
          <p key={i} className="my-1">
            {line}
          </p>
        )
      })
  }

  return (
    <>
      <Header title="Assistente AI" subtitle="Il tuo aiutante per le prenotazioni" />

      <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-80px)]">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ciao! Sono il tuo assistente
                </h2>
                <p className="text-gray-600">
                  Posso aiutarti a gestire le prenotazioni, calcolare preventivi e rispondere ai
                  clienti. Incolla il messaggio di un cliente o chiedi quello che ti serve!
                </p>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-500 text-center">
                  Prova con questi esempi:
                </p>
                <div className="grid gap-3">
                  {suggerimentiRapidi.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(sug.testo)}
                      className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sug.titolo}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sug.testo}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-br from-purple-500 to-blue-600'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={cn(
                      'flex-1 max-w-[85%]',
                      message.role === 'user' ? 'text-right' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'inline-block rounded-2xl px-4 py-3 text-left',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-md'
                          : 'bg-white border border-gray-200 rounded-tl-md shadow-sm'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-gray-700 text-sm leading-relaxed">
                          {formatMessageContent(message.content)}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* Azioni proposte dall'AI */}
                    {message.role === 'assistant' && message.azioni && message.azioni.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Azioni disponibili:
                        </p>
                        {message.azioni.map((azione, idx) => {
                          const stato = message.azioniEseguite?.[idx]
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-lg border",
                                stato === 'success' ? 'bg-green-50 border-green-200' :
                                stato === 'error' ? 'bg-red-50 border-red-200' :
                                'bg-blue-50 border-blue-200'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{getIconaAzione(azione.tipo)}</span>
                                    <span className="font-medium text-gray-900">
                                      {getLabelAzione(azione.tipo)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{azione.riepilogo}</p>
                                </div>
                                <div className="flex-shrink-0">
                                  {stato === 'pending' ? (
                                    <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Esecuzione...
                                    </div>
                                  ) : stato === 'success' ? (
                                    <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      Completato
                                    </div>
                                  ) : stato === 'error' ? (
                                    <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                      <XCircle className="w-4 h-4" />
                                      Errore
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => eseguiAzione(message.id, idx, azione)}
                                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                      <Check className="w-4 h-4" />
                                      Conferma
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Copy button for assistant messages */}
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copia risposta
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Sto pensando...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            {messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={clearChat}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Nuova conversazione
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Incolla il messaggio di un cliente o scrivi la tua richiesta..."
                  rows={1}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  'px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                  input.trim() && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-3">
              Premi Invio per inviare, Shift+Invio per andare a capo
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
