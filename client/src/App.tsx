import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const API_URL = 'http://localhost:3000/api/chat/semantic';
const STORAGE_KEY = 'global-chat-messages';

type Lang = 'en' | 'es';

const copy: Record<Lang, {
  greeting: string;
  placeholder: string;
  send: string;
  sending: string;
  statusReady: string;
  statusThinking: string;
  errorServer: string;
  toggleLabel: string;
  you: string;
  ai: string;
}> = {
  en: {
    greeting: "Hi, I'm your assistant. Ask anything about your data.",
    placeholder: 'Ask a question about your company data...',
    send: 'Send',
    sending: 'Sending...',
    statusReady: 'Ready',
    statusThinking: 'Thinking...',
    errorServer: 'Could not reach the server. Is the backend running on http://localhost:3000?',
    toggleLabel: 'English',
    you: 'You',
    ai: 'AI',
  },
  es: {
    greeting: 'Hola, soy tu asistente. Pregunta lo que necesites sobre tus datos.',
    placeholder: 'Haz una pregunta sobre los datos de la empresa...',
    send: 'Enviar',
    sending: 'Enviando...',
    statusReady: 'Listo',
    statusThinking: 'Pensando...',
    errorServer: 'No pude contactar al servidor. ¿Está corriendo el backend en http://localhost:3000?',
    toggleLabel: 'Español',
    you: 'Tú',
    ai: 'IA',
  },
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderMarkdown = (text: string) => {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br />');
  return html;
};

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ChatMessage[];
    } catch {
      // ignore parse errors and fall back to default
    }
    return [
      {
        role: 'assistant',
        content: copy.en.greeting,
      },
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage may be unavailable; ignore
    }
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const payload = [...messages, userMessage].map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done ?? false;
        const chunk = decoder.decode(result.value || new Uint8Array(), { stream: !done });
        if (chunk) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: (updated[lastIdx].content || '') + chunk,
              };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      setError(copy[lang].errorServer);
    } finally {
      setIsLoading(false);
    }
  };

  const t = copy[lang];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">GLOBAL CHAT BOT</div>
        <div className="header-actions">
          <button
            type="button"
            className="lang-toggle"
            onClick={() => setLang((prev) => (prev === 'en' ? 'es' : 'en'))}
          >
            {t.toggleLabel}
          </button>
        </div>
      </header>

      <main className="chat-surface">
        <div className="chat-window">
          <div className="messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <span className="avatar">{msg.role === 'user' ? t.you : t.ai}</span>
                <p dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="composer" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? t.sending : t.send}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      </main>
    </div>
  );
}

export default App;
