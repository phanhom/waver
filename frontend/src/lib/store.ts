import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  url?: string;
}

interface PlayerStore {
  currentSong: Song | null;
  playlist: Song[];
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  progress: number;
  sharedWaves: any[];
  activeListeners: any[];
  userPlaylists: any[];
  followingSid: string | null;
  darkMode: boolean;
  currentTime: number;
  duration: number;
  musicOceanSettings: {
    dotSize: number;
    dotDensity: number;
  };

  setCurrentSong: (song: Song | null) => void;
  setPlaylist: (playlist: Song[]) => void;
  setUserPlaylists: (playlists: any[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setSharedWaves: (waves: any[]) => void;
  setActiveListeners: (listeners: any[]) => void;
  addSharedWave: (wave: any) => void;
  updateSharedWaveLikes: (wave: any) => void;
  setFollowingSid: (sid: string | null) => void;
  nextSong: () => void;
  prevSong: () => void;
  shareSong: (song: Song) => void;
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setMusicOceanDotSize: (size: number) => void;
  setMusicOceanDotDensity: (density: number) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      currentSong: null,
      playlist: [],
      isPlaying: false,
      isLoading: false,
      volume: 0.7,
      progress: 0,
      sharedWaves: [],
      activeListeners: [],
      userPlaylists: [],
      followingSid: null,
      darkMode: false,
      currentTime: 0,
      duration: 0,
      musicOceanSettings: {
        dotSize: 15,
        dotDensity: 35,
      },

      setCurrentSong: (song) => set({ currentSong: song }),
      setPlaylist: (playlist) => set({ playlist }),
      setUserPlaylists: (playlists) => set({ userPlaylists: playlists }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setSharedWaves: (waves) => set({ sharedWaves: waves }),
      setActiveListeners: (listeners) => set({ activeListeners: listeners }),
      addSharedWave: (wave) => set((state) => ({
        sharedWaves: [wave, ...state.sharedWaves.filter(w => (w.playlist?.id || w.song?.id) !== (wave.playlist?.id || wave.song?.id))].slice(0, 50)
      })),
      updateSharedWaveLikes: (wave) => set((state) => ({
        sharedWaves: state.sharedWaves.map(w => {
          if ((w.playlist?.id || w.song?.id) === (wave.playlist?.id || wave.song?.id)) {
            return { ...w, likes: wave.likes, likeCount: wave.likeCount };
          }
          return w;
        })
      })),
      setFollowingSid: (sid) => set({ followingSid: sid }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (darkMode) => set({ darkMode }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setMusicOceanDotSize: (dotSize) => set((state) => ({
        musicOceanSettings: { ...state.musicOceanSettings, dotSize }
      })),
      setMusicOceanDotDensity: (dotDensity) => set((state) => ({
        musicOceanSettings: { ...state.musicOceanSettings, dotDensity }
      })),

      shareSong: (song) => {
        // This will be handled by the component/socket helper
      },

      nextSong: () => {
        const { currentSong, playlist } = get();
        if (!currentSong || playlist.length === 0) return;
        const index = playlist.findIndex(s => s.id === currentSong.id);
        if (index !== -1 && index < playlist.length - 1) {
          const nextTrack = playlist[index + 1];
          set({ currentSong: nextTrack });
          // Import here to avoid circular dependencies
          import('./audio').then(({ playSong }) => {
            playSong(nextTrack);
          });
        }
      },

      prevSong: () => {
        const { currentSong, playlist } = get();
        if (!currentSong || playlist.length === 0) return;
        const index = playlist.findIndex(s => s.id === currentSong.id);
        if (index > 0) {
          const prevTrack = playlist[index - 1];
          set({ currentSong: prevTrack });
          // Import here to avoid circular dependencies
          import('./audio').then(({ playSong }) => {
            playSong(prevTrack);
          });
        }
      },
    }),
    {
      name: 'waver-player',
      partialize: (state) => ({ 
        darkMode: state.darkMode,
        musicOceanSettings: state.musicOceanSettings
      }),
    }
  )
);

interface AuthStore {
  user: any | null;
  token: string | null;
  setUser: (user: any | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ user: null, token: null });
      }
    }),
    {
      name: 'waver-auth',
    }
  )
);
