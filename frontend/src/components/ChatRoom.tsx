'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Music } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '@/lib/store';
import { getSocket, ChatMessage, sendChatMessage, requestChatHistory } from '@/lib/socket';

export default function ChatRoom() {
  const { user, requireLogin } = useAuthStore();
  const { activeListeners } = usePlayerStore();
  const socket = getSocket();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return;

    const upsertMessage = (message: ChatMessage) => {
      setMessages(prev => {
        if (message.id) {
          const idx = prev.findIndex(m => m.id === message.id);
          if (idx >= 0) {
            const merged = [...prev];
            merged[idx] = { ...merged[idx], ...message };
            return merged.slice(-200);
          }
        }
        return [...prev, message].slice(-200);
      });
    };

    const handleChatMessage = (message: ChatMessage) => {
      upsertMessage(message);
    };

    const handleChatStatus = (message: ChatMessage) => {
      upsertMessage(message);
    };

    const handleChatHistory = (messageHistory: ChatMessage[]) => {
      // Ensure max 200 messages from history too
      setMessages(messageHistory.slice(-200));
    };

    const handleChatError = (_data: { message?: string }) => {
      // 审核未通过 / 限流等：不弹 alert，状态已在气泡上展示（block / 审核中等）
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('chat_message_status', handleChatStatus);
    socket.on('chat_history', handleChatHistory);
    socket.on('chat_error', handleChatError);

    const pullHistory = () => requestChatHistory();
    pullHistory();
    socket.on('connect', pullHistory);

    return () => {
      socket.off('connect', pullHistory);
      socket.off('chat_message', handleChatMessage);
      socket.off('chat_message_status', handleChatStatus);
      socket.off('chat_history', handleChatHistory);
      socket.off('chat_error', handleChatError);
    };
  }, [socket]);

  const sendMessage = (message: string) => {
    if (!message.trim()) return;
    if (cooldown > 0) return;
    if (!requireLogin()) return;
    
    if (message.length > 200) {
      alert('消息长度不能超过200字符');
      return;
    }
    sendChatMessage(user, message.trim());
    setInputMessage('');
    setCooldown(5); // 5 seconds cooldown
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputMessage.trim()) {
      sendMessage(inputMessage);
    }
  };

  // Helper to find what a user is listening to
  const getUserListening = (userId: string) => {
    const listener = activeListeners.find(l => String(l.user?.userId) === String(userId));
    if (listener && listener.song && listener.state === 'playing') {
      return listener.song.name;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-black/5 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 overflow-hidden">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-black/20 dark:text-white/20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No messages yet</p>
            <p className="text-[8px] font-bold uppercase tracking-widest mt-2">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isConsecutive = prevMsg && String(prevMsg.user?.userId) === String(msg.user?.userId);
            
            const listeningSong = getUserListening(msg.user.userId);
            const isOwn = String(msg.user?.userId) === String(user?.userId);
            const status = msg.status || 'pass';
            const statusStyles =
              status === 'pending'
                ? 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/50'
                : status === 'block'
                ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
            const statusLabel =
              status === 'pending' ? '审核中' : status === 'block' ? '未通过' : '通过';
            
            return (
              <div key={index} className={`flex items-start gap-2 group animate-in fade-in slide-in-from-bottom-1 duration-200 ${isConsecutive ? 'mt-0.5' : 'mt-1'}`}>
                <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0">
                  {!isConsecutive ? (
                    <img
                      src={msg.user.avatar || msg.user.avatarUrl}
                      alt={msg.user.name || msg.user.nickname}
                      className="w-full h-full rounded-full object-cover border border-black/10 dark:border-white/10"
                    />
                  ) : (
                    <div className="w-full h-full opacity-0" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {!isConsecutive && (
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wide text-black/80 dark:text-white/80">
                        {msg.user.name || msg.user.nickname}
                      </span>
                      {isOwn && status !== 'pass' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${statusStyles}`}>
                          {statusLabel}
                        </span>
                      )}
                      {listeningSong && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded-md">
                          <Music size={8} className="text-black/40 dark:text-white/40" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 truncate max-w-[120px]">
                            {listeningSong}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative group/bubble max-w-full inline-block">
                    <div className={`px-2.5 py-1.5 bg-white/50 dark:bg-black/50 rounded-2xl border border-black/5 dark:border-white/5 inline-block max-w-full shadow-sm ${isConsecutive ? 'rounded-tl-2xl' : 'rounded-tl-none'}`}>
                      <p className="text-[13px] text-black dark:text-white break-words whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.message}
                      </p>
                    </div>
                    {isConsecutive && isOwn && status !== 'pass' && (
                      <span className={`absolute -right-12 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase opacity-50 ${status === 'block' ? 'text-red-500' : ''}`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/30 backdrop-blur-sm">
        <div className="relative flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={!user ? "Login to chat" : cooldown > 0 ? `Wait ${cooldown}s...` : "Type a message..."}
            className="flex-1 px-5 py-3 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 focus:outline-none focus:border-black/30 dark:focus:border-white/30 text-sm text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 transition-all font-medium disabled:opacity-50"
            disabled={!user || cooldown > 0}
          />
          <button
            onClick={() => sendMessage(inputMessage)}
            disabled={!user || !inputMessage.trim() || cooldown > 0}
            className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg flex-shrink-0"
          >
            {cooldown > 0 ? <span className="text-[10px] font-black">{cooldown}s</span> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
