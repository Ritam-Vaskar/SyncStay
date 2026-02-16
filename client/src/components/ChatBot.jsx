import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ChatBot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you discover events. Ask me anything!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Convert /microsite/... paths and http URLs into clickable links
  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(\/microsite\/[a-z0-9-]+)/gi;
    const parts = text.split(urlRegex).filter(Boolean);

    return parts.map((part, idx) => {
      // Match internal microsite paths like /microsite/some-slug-123
      if (/^\/microsite\/[a-z0-9-]+$/i.test(part)) {
        return (
          <button
            key={idx}
            onClick={() => navigate(part)}
            className="text-primary-600 underline hover:text-primary-800 font-medium"
          >
            View Event Page
          </button>
        );
      }
      // Match full http(s) URLs
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline hover:text-primary-800 font-medium"
          >
            {part}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/agent/query', { query });

      if (res.success && !res.guardrailBlocked) {
        setMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
      } else if (res.guardrailBlocked) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: res.blockReason || "I can't help with that request." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Something went wrong. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Unable to reach the assistant. Please try later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          /* X icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Chat bubble icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 sm:w-96 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
             style={{ height: '28rem' }}>
          {/* Header */}
          <div className="flex items-center gap-2 bg-primary-600 px-4 py-3 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.375 3.375 0 01-2.386.988H9.856a3.375 3.375 0 01-2.386-.988L5 14.5m14 0V17a3 3 0 01-3 3H8a3 3 0 01-3-3v-2.5" />
            </svg>
            <span className="font-semibold text-sm">SyncStay Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? renderMessageText(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 border border-gray-200 rounded-xl rounded-bl-none px-3 py-2 text-sm shadow-sm flex items-center gap-1">
                  <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about events…"
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
