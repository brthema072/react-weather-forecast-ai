import { useEffect, useRef, useState } from 'react'
import {
  getGeminiApiKey,
  sendChatMessage,
  type ChatTurn,
  type GeminiContext,
} from '../../services/geminiClient.ts'
import { isWeatherRelated, OUT_OF_SCOPE_REPLY } from '../../services/chatScope.ts'
import styles from './AiChat.module.css'

export interface AiChatMessage extends ChatTurn {
  id: string
}

export interface AiChatProps {
  /** Current weather and place context handed to the assistant. */
  context: GeminiContext
  /** Called when the user closes the chat. */
  onClose?: () => void
}

const WELCOME_MESSAGE: AiChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Olá! Sou o assistente do Weather Forecast. Pergunte sobre o clima na sua região ou sobre meteorologia.',
}

/**
 * Distance from the bottom of the thread, in pixels, within which the view
 * still counts as "following the conversation". Scrolling further up means
 * the user is reading earlier messages, so new ones must not yank the view.
 */
const SCROLL_THRESHOLD_PX = 80

const FAB_LABEL = 'Abrir ajuda'

let messageCounter = 0

function nextMessageId(): string {
  messageCounter += 1
  return `m${messageCounter}`
}

export function AiChat({ context, onClose }: AiChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME_MESSAGE])
  const [draft, setDraft] = useState('')
  const [isPending, setIsPending] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Synchronous guard: state updates are batched, so two events fired in the
  // same tick could both see `isPending === false` and send twice.
  const isSubmittingRef = useRef(false)

  // Tracks whether the thread is scrolled close enough to the bottom for the
  // next message to be shown automatically.
  const isNearBottomRef = useRef(true)

  const hasApiKey = getGeminiApiKey() !== ''

  useEffect(() => {
    if (!isOpen) {
      return
    }
    // Without an API key the footer (and its input) is not rendered, so focus
    // the panel itself rather than leaving focus on the FAB.
    const focusTarget = inputRef.current ?? dialogRef.current
    focusTarget?.focus()
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isOpen || event.key !== 'Escape') {
        return
      }
      handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => {
    return (): void => {
      abortRef.current?.abort()
    }
  }, [])

  // Keep the "near the bottom" flag in sync with the user's scroll position.
  useEffect(() => {
    const thread = threadRef.current
    if (!thread) {
      return
    }

    const handleScroll = (): void => {
      const distanceFromBottom =
        thread.scrollHeight - thread.scrollTop - thread.clientHeight
      isNearBottomRef.current = distanceFromBottom <= SCROLL_THRESHOLD_PX
    }

    handleScroll()
    thread.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => {
      thread.removeEventListener('scroll', handleScroll)
    }
  }, [isOpen])

  // Scroll the latest message into view, unless the user is reading earlier
  // messages further up the thread.
  useEffect(() => {
    const thread = threadRef.current
    if (!thread) {
      return
    }
    if (isNearBottomRef.current) {
      thread.scrollTop = thread.scrollHeight
    }
  }, [messages])

  function handleClose(): void {
    abortRef.current?.abort()
    setIsOpen(false)
    fabRef.current?.focus()
    onClose?.()
  }

  const sendDraft = async (): Promise<void> => {
    const text = draft.trim()
    if (text === '' || isPending || isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true

    const userMessage: AiChatMessage = {
      id: nextMessageId(),
      role: 'user',
      text,
    }

    const history: AiChatMessage[] = [...messages, userMessage]

    setDraft('')

    // Messages outside the weather scope are declined here, before any
    // request is made: the fixed reply is answered locally, so no API call
    // is made and no quota is spent. `isPending` is never set, so the
    // typing indicator does not appear either.
    if (!isWeatherRelated(text, messages)) {
      setMessages(history)
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: OUT_OF_SCOPE_REPLY },
      ])
      isSubmittingRef.current = false
      return
    }

    setMessages(history)
    setIsPending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const reply = await sendChatMessage(history, context, controller.signal)
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: reply },
      ])
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível falar com o assistente. Tente novamente.'
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: 'assistant', text: message },
      ])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      isSubmittingRef.current = false
      setIsPending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault()
    void sendDraft()
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      // Submit on Enter without inserting a line break.
      event.preventDefault()
      void sendDraft()
    }
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className={styles.fab}
        aria-label={FAB_LABEL}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'ai-chat-panel' : undefined}
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          id="ai-chat-panel"
          className={styles.panel}
          role="dialog"
          aria-labelledby="ai-chat-title"
          tabIndex={-1}
        >
          <div className={styles.header}>
            <h2 id="ai-chat-title" className={styles.title}>
              Assistente
            </h2>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Fechar assistente"
              onClick={handleClose}
            >
              ×
            </button>
          </div>

          <div
            ref={threadRef}
            className={styles.thread}
            aria-live="polite"
            aria-busy={isPending}
            aria-label="Conversa com o assistente"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${styles[message.role]}`}
              >
                {message.text}
              </div>
            ))}

            {isPending && (
              <div className={styles.typing} role="status">
                <span className={styles.typingLabel}>Digitando</span>
                <span className={styles.typingDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
          </div>

          {hasApiKey ? (
            <form className={styles.footer} onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Pergunte sobre o clima…"
                aria-label="Mensagem para o assistente"
                disabled={isPending}
              />
              <button
                type="submit"
                className={styles.sendButton}
                aria-label="Enviar mensagem"
                disabled={isPending || draft.trim() === ''}
              >
                <svg
                  className={styles.sendIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12h15" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </form>
          ) : (
            <p className={styles.configNotice} role="status">
              O assistente precisa de uma chave da API. Defina
              <code> VITE_GEMINI_API_KEY </code> no arquivo <code>.env.local</code>{' '}
              e reinicie o servidor.
            </p>
          )}
        </div>
      )}
    </>
  )
}
