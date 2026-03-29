'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sun, Moon, Droplets, Grid, LogOut, User } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '@/lib/store';

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
  
  const { user, logout, openLoginModal } = useAuthStore();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[450px] max-w-[90vw] shadow-2xl border border-black/5 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-black dark:text-white">Settings (Maintained by Phanhom)</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-black/60 dark:text-white/60" />
          </button>
        </div>

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
            {user ? (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  openLoginModal();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-all shadow-lg"
              >
                <User size={16} />
                Login to Netease
              </button>
            )}
            <p className="text-xs text-black/40 dark:text-white/40 text-center">
              Settings are saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
