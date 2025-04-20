// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Send, X, MessageSquareText, Loader } from 'lucide-react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  id: string;
  imageUrl?: string;
}

const initialMessage: ChatMessage = {
  role: 'bot',
  text: `Hello! How can I help you with your property today? Upload a photo of an issue or ask a tenancy question.\n\nFor example, you can ask:\n* How do I report a leaking faucet?\n* What are the rules about pets?\n\`\`\`javascript\nconsole.log("Or show some code!");\n\`\`\``,
  id: 'initial-bot-message',
};

const LoadingIndicator = () => (
  <motion.div
    className="flex items-center justify-center p-2"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.3 }}
  >
    <Loader className="h-5 w-5 text-slate-500 animate-spin" />
  </motion.div>
);

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error("Failed to parse messages from localStorage:", error);
        setMessages([initialMessage]);
        localStorage.removeItem('chatMessages');
      }
    } else {
      setMessages([initialMessage]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].id !== 'initial-bot-message')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const messagesToSave = messages.map(({ imageUrl: _imageUrl, ...rest }) => rest);
        localStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
      } catch (error) {
        console.error("Failed to save messages to localStorage:", error);
      }
    }
  }, [messages]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages, isLoading]);

  const handleFile = (f: File | null) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    } else {
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const currentUrl = imagePreview;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [imagePreview]);

  async function send() {
    if ((!input.trim() && !file) || isLoading) return;

    const textToSend = input;
    const fileToSend = file;
    const currentImagePreview = imagePreview;

    const userMsg: ChatMessage = {
      role: 'user',
      text: textToSend || '',
      id: crypto.randomUUID(),
      imageUrl: currentImagePreview ?? undefined,
    };

    const botMessageId = crypto.randomUUID();
    
    // Get current messages BEFORE adding the new ones
    const currentMessages = messages;

    // Add user message and bot placeholder
    setMessages((m) => [
      ...m,
      userMsg,
      { role: 'bot', text: '', id: botMessageId }
    ]);

    setInput('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsLoading(true);

    // --- Prepare History for API --- 
    // Map history to the format expected by the backend (simple role/text pairs)
    // Filter out the initial message if it's the default one and no other messages exist?
    // Or just send all previous messages.
    const historyForApi = currentMessages.map(msg => ({
      role: msg.role,
      // Send only text part of history for now
      text: msg.text 
    })); 

    // --- API Call & Stream Handling --- 
    const body = new FormData();
    if (fileToSend) body.append('image', fileToSend);
    if (textToSend) body.append('text', textToSend);
    // Add history as a JSON string
    body.append('history', JSON.stringify(historyForApi)); 

    try {
      const res = await fetch('/api/chat', { method: 'POST', body });

      if (!res.ok) {
        // Handle non-streaming errors (e.g., 400, 500 from API route before streaming starts)
        let errorPayload = { message: `HTTP error! status: ${res.status}` };
        try {
          const errorJson = await res.json(); 
          errorPayload = errorJson.error || errorPayload; 
        } catch (parseError) { 
          console.error("Failed to parse error response body:", parseError);
        }
        throw new Error(errorPayload.message); 
      }
      
      // --- Process Stream --- 
      if (!res.body) { 
        throw new Error("Response body is null"); 
      }
      
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let accumulatedResponse = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // Exit loop when stream is finished
        
        accumulatedResponse += value;
        // Update the specific bot message with the accumulated text
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === botMessageId ? { ...msg, text: accumulatedResponse } : msg
          )
        );
        // Optional: Small delay to allow UI to update smoothly
        // await new Promise(resolve => setTimeout(resolve, 10)); 
      }
      // Stream finished successfully
      
    } catch (e: unknown) {
      console.error('API call or stream processing failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      // Update the placeholder bot message with the error
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === botMessageId ? { ...msg, text: `⚠️ Error: ${errorMessage}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
      // Clear temporary preview state only if it wasn't changed by user
      if (imagePreview === currentImagePreview) {
        setImagePreview(null);
      }
    }
  }

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add('border-teal-400', 'bg-teal-50');
    },
    onDragLeave: (e: React.DragEvent) => {
        e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50');
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50');
      const f = e.dataTransfer.files?.[0];
      if (f?.type.startsWith('image/')) handleFile(f);
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdownComponents: Options['components'] = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    code({ node: _node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-sm ${className || ''}`} {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    p: ({ node: _node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    ul: ({ node: _node, ...props }: any) => <ul className="list-disc list-inside mb-2 pl-4" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    ol: ({ node: _node, ...props }: any) => <ol className="list-decimal list-inside mb-2 pl-4" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    blockquote: ({ node: _node, ...props }: any) => <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-600 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    a: ({ node: _node, ...props }: any) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  };

  return (
    <>
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 text-slate-700">
        <MessageSquareText size={28} strokeWidth={1.5} className="sm:size-8" />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Chat with Assistant
        </h1>
      </div>

      <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl overflow-hidden bg-white border border-slate-200 flex flex-col h-[80vh] sm:h-[85vh]">
        <div className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.3 }}
                layout
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-lg shadow-md max-w-[80%] sm:max-w-[85%] text-sm transition-transform duration-150 hover:scale-[1.01] break-words ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {msg.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.imageUrl}
                      alt="User upload"
                      className="max-w-full h-auto rounded-md mb-2 border border-slate-300 shadow-sm"
                      onLoad={() => {
                        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    />
                  )}
                  {msg.role === 'bot' ? (
                    <div className="prose prose-sm max-w-none prose-p:last-of-type:mb-0 prose-headings:my-2 prose-pre:bg-transparent prose-pre:p-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text && <p>{msg.text}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                key="loading"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex justify-start"
              >
                <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 shadow-md border border-slate-200 flex items-center">
                  <LoadingIndicator />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef}></div>
        </div>

        <div
          {...dropHandlers}
          className="p-2 sm:p-3 bg-slate-50 border-t border-slate-200 transition-colors duration-200 ease-in-out mt-auto shrink-0"
        >
          {imagePreview && (
            <div className="relative group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="size-8 sm:size-9 rounded border border-slate-300 object-cover" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-1 -right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center p-0.5"
                onClick={() => handleFile(null)}
                aria-label="Clear image selection"
              >
                <X size={10} strokeWidth={3}/>
              </Button>
            </div>
          )}

          <div className="flex gap-2 items-end bg-white rounded-lg shadow-md px-2 py-1.5 sm:px-3 sm:py-2 border border-slate-300 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all duration-200 ease-in-out">
            <label
              htmlFor="file-upload"
              className={`cursor-pointer rounded-md p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-500 transition self-center ${imagePreview ? 'hidden' : ''}`}
              title="Upload Image"
            >
              <Upload className="w-5 h-5" />
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or describe the image..."
              className="flex-1 bg-transparent outline-none resize-none border-0 p-0 text-sm placeholder:text-slate-400 pr-1 mx-1 max-h-24 sm:max-h-28 scroll-smooth"
              rows={1}
              style={{ height: 'auto' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={isLoading || (!input.trim() && !file)}
              className="self-end bg-blue-500 hover:bg-blue-600 text-white rounded-md sm:rounded-lg size-8 sm:size-9 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out flex items-center justify-center active:scale-95 hover:shadow-md shrink-0"
              aria-label="Send message"
              title="Send message"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                   <motion.div key="loader" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                     <Loader className="w-4 h-4 animate-spin" />
                   </motion.div>
                ) : (
                   <motion.div key="send" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                     <Send size={16} strokeWidth={2} />
                   </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
