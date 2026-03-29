'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sun, Moon, Droplets, Grid, LogOut, Send } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '@/lib/store';
import { getSocket, ChatMessage, sendChatMessage } from '@/lib/socket';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
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

  // Scroll to bottom when new messages arrive or when panel opens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Scroll to bottom when panel opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isOpen]);

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // 添加新消息到末尾
        const updated = [...prev, message];
        // 只保留最多200条消息
        return updated.slice(-200);
      });
    };

    const handleChatHistory = (messageHistory: ChatMessage[]) => {
      // 确保历史消息按正确顺序显示（最旧到最新）
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[800px] max-w-[90vw] shadow-2xl border border-black/5 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-black dark:text-white">Settings & Chat (Maintained by Phanhom)</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-black/60 dark:text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Settings */}
          <div>
            {/* Theme Settings */}
            <div className="space-y-4 mb-6">
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

            {/* MusicOcean Settings */}
            <div className="space-y-4">
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
                  className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer slider"
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
                  className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 space-y-4">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all"
              >
                <LogOut size={16} />
                Logout
              </button>
              <p className="text-xs text-black/40 dark:text-white/40 text-center">
                Settings are saved automatically
              </p>
            </div>
          </div>

          {/* Right Column: Chat */}
          <div className="flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
                Chat Room
              </h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-black/5 dark:bg-white/5 p-4 space-y-4 border border-black/10 dark:border-white/10">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-black/40 dark:text-white/40 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <img
                      src={msg.user.avatar || msg.user.avatarUrl}
                      alt={msg.user.name || msg.user.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-black dark:text-white">
                          {msg.user.name || msg.user.nickname}
                        </span>
                        {/* 移除时间戳 */}
                      </div>
                      <p className="text-sm text-black/80 dark:text-white/80 mt-1 break-words whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-sm text-black dark:text-white"
                disabled={!user}
              />
              <button
                onClick={() => sendMessage(inputMessage)}
                className="p-2 bg-black hover:bg-gray-800 text-white rounded-full transition-colors"
                disabled={!inputMessage.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
