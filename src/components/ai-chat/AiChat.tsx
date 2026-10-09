import { useEffect, useRef, useState } from 'react'
import styles from './AiChat.module.css'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface AiChatProps {
  onClose: () => void
}

const mockMessages: AiChatMessage[] = [
  {
    id: 'q1',
    role: 'user',
    text: 'Como funciona a previsão de clima atual?',
  },
  {
    id: 'a1',
    role: 'assistant',
    text: 'O app detecta automaticamente sua localização e mostra a temperatura, a condição do tempo e a velocidade do vento atuais na sua região.',
  },
]

const FAB_LABEL = 'Abrir ajuda'

export function AiChat({ onClose }: AiChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const button = dialogRef.current.querySelector('button')
      if (button) {
        firstFocusableRef.current = button
      } else {
        firstFocusableRef.current = dialogRef.current as unknown as HTMLButtonElement
      }
      firstFocusableRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isOpen || event.key !== 'Escape') {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleClose = (): void => {
    setIsOpen(false)
    fabRef.current?.focus()
    onClose()
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className={styles.fab}
        aria-label={FAB_LABEL}
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>

      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleOverlayClick}
          role="presentation"
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-chat-title"
          >
            <div className={styles.header}>
              <h2 id="ai-chat-title" className={styles.title}>
                Ajuda
              </h2>
              <button
                ref={firstFocusableRef}
                type="button"
                className={styles.closeButton}
                aria-label="Fechar ajuda"
                onClick={handleClose}
              >
                ×
              </button>
            </div>
            <div className={styles.thread}>
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    styles[message.role]
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
