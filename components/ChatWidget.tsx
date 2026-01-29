
import React, { useRef, useEffect, useState } from 'react';

interface ChatWidgetProps {
  messages: string[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onSendMessage: (msg: string) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ messages, isOpen, onToggle, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when open
  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  if (!isOpen) {
    return (
      // Positioned higher (bottom-48) to avoid overlap with the virtual joystick in the bottom-left corner
      <div className="absolute bottom-48 left-5 pointer-events-auto z-50">
        <button 
          onClick={() => onToggle(true)}
          className="w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 rounded-full shadow-lg text-white hover:bg-black/80 transition-all active:scale-95"
        >
          <span className="text-emerald-400 text-lg">💬</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-fade-in-up">
      {/* Click outside to close (top part) */}
      <div className="flex-1" onClick={() => onToggle(false)} />
      
      {/* Chat Panel */}
      <div className="bg-slate-900 border-t border-white/10 shadow-2xl flex flex-col max-h-[50vh] pb-safe-bottom">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-white/5 bg-white/5">
           <h3 className="text-white font-bold text-sm flex items-center gap-2">
             <span>📡</span> 区域频道
           </h3>
           <button 
             onClick={() => onToggle(false)}
             className="text-gray-400 hover:text-white px-2 font-bold"
           >
             ✕
           </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
           {messages.map((msg, idx) => {
             const isSystem = msg.startsWith('系统:') || msg.startsWith('System:');
             return (
               <div key={idx} className={`text-xs ${isSystem ? 'text-yellow-400 italic' : 'text-white'}`}>
                 {msg}
               </div>
             );
           })}
           <div ref={endRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-3 bg-black/20 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button 
            type="submit"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWidget;
