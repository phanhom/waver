'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Droplets, Grid, LogOut, Send } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '@/lib/store';
import { getSocket, ChatMessage, sendChatMessage } from '@/lib/socket';

export default function MobileSettingsPage() {
  const { 
    darkMode, 
    setDarkMode,
    musicOceanSettings,
    setMusicOceanDotSize,
    setMusicOceanDotDensity 
  } = usePlayerStore();
  
  const { user, logout, requireLogin } = useAuthStore();
  const socket = getSocket();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => {
        const updated = [...prev, message];
        return updated.slice(-200);
      });
    };

    const handleChatHistory = (messageHistory: ChatMessage[]) => {
      setMessages(messageHistory.slice(0, 200));
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('chat_history', handleChatHistory);

    return () => {
      socket.off('chat_message', handleChatMessage);
      socket.off('chat_history', handleChatHistory);
    };
  }, [socket]);

  const sendMessage = (message: string) => {
    if (!message.trim()) return;
    if (!requireLogin()) return;
    if (message.length > 1000) {
      alert('消息长度不能超过1000字符');
      return;
    }
    sendChatMessage(user, message.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputMessage.trim()) {
      sendMessage(inputMessage);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
        <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Settings</h2>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Theme Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
            Theme
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDarkMode(false)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                !darkMode 
                  ? 'border-black dark:border-white bg-black/5 dark:bg-white/5' 
                  : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <Sun size={24} className="text-yellow-500" />
              <span className="text-sm font-medium text-black dark:text-white">Light</span>
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                darkMode 
                  ? 'border-black dark:border-white bg-black/5 dark:bg-white/5' 
                  : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <Moon size={24} className="text-blue-500" />
              <span className="text-sm font-medium text-black dark:text-white">Dark</span>
            </button>
          </div>
        </div>

        {/* Background Animation Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
            Background Animation
          </h3>
          
          {/* Dot Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets size={16} className="text-black/60 dark:text-white/60" />
                <label className="text-sm font-medium text-black dark:text-white">
                  Dot Size
                </label>
              </div>
              <span className="text-sm text-black/60 dark:text-white/60">
                {musicOceanSettings.dotSize}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={musicOceanSettings.dotSize}
              onChange={(e) => setMusicOceanDotSize(Number(e.target.value))}
              className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Dot Density */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid size={16} className="text-black/60 dark:text-white/60" />
                <label className="text-sm font-medium text-black dark:text-white">
                  Dot Density
                </label>
              </div>
              <span className="text-sm text-black/60 dark:text-white/60">
                {musicOceanSettings.dotDensity}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={musicOceanSettings.dotDensity}
              onChange={(e) => setMusicOceanDotDensity(Number(e.target.value))}
              className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Chat Room */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
            Chat Room
          </h3>
          <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 h-[200px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-black/30 dark:text-white/30 text-sm">
                  No messages yet
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <img
                      src={msg.user.avatar || msg.user.avatarUrl || '/default_avatar.png'}
                      alt={msg.user.name || msg.user.nickname}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-black/70 dark:text-white/70">
                        {msg.user.name || msg.user.nickname}
                      </span>
                      <p className="text-xs text-black dark:text-white break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={user ? "Type a message..." : "Login to chat"}
                disabled={!user}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-neutral-800 rounded-lg border border-black/10 dark:border-white/10 focus:outline-none focus:border-black/30 dark:focus:border-white/30 disabled:opacity-50 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
              />
              <button
                onClick={() => sendMessage(inputMessage)}
                disabled={!user || !inputMessage.trim()}
                className="p-2 bg-black dark:bg-white rounded-lg disabled:opacity-30 transition-opacity"
              >
                <Send size={16} className="text-white dark:text-black" />
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
