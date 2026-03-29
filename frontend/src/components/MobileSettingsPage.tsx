'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Droplets, Grid, LogOut, User } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '@/lib/store';

export default function MobileSettingsPage() {
  const { 
    darkMode, 
    setDarkMode,
    musicOceanSettings,
    setMusicOceanDotSize,
    setMusicOceanDotDensity 
  } = usePlayerStore();
  
  const { user, logout, openLoginModal } = useAuthStore();
  
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

        {/* Login/Logout Button */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10">
          {user ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all"
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <button
              onClick={openLoginModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-all shadow-lg"
            >
              <User size={16} />
              Login to Netease
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
