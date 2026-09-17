'use client';

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Image as ImageIcon, Film, HardDrive, ShieldCheck, 
  LogOut, User, Trash2, Lock, Mail, ArrowRight, Search, 
  Star, Download, X, Play, Sparkles, CheckSquare, Square, 
  RefreshCw, Loader2
} from "lucide-react";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  isFavorite: boolean;
  createdAt: string;
}

export default function Home() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Vault state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(10 * 1024 * 1024 * 1024); // 10 GB Default
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // UI Filters & Selections
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check active session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("vault_active_user");
    if (savedUser) {
      setUserEmail(savedUser);
      setIsLoggedIn(true);
      fetchUserMedia(savedUser);
    }
  }, []);

  // Slideshow interval effect
  useEffect(() => {
    let interval: any;
    if (isSlideshowActive && mediaList.length > 0) {
      interval = setInterval(() => {
        setSlideshowIndex(prev => (prev + 1) % mediaList.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSlideshowActive, mediaList]);

  const fetchUserMedia = async (currentUserEmail: string) => {
    setIsLoadingMedia(true);
    try {
      const res = await fetch(`/api/media?email=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setMediaList(data.media || []);
        setStorageUsed(data.storageUsed || 0);
        setStorageLimit(data.storageLimit || 10737418240);
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: isSignup ? 'signup' : 'login' })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Authentication failed");
        setIsLoadingAuth(false);
        return;
      }

      localStorage.setItem("vault_active_user", data.email);
      setUserEmail(data.email);
      setIsLoggedIn(true);
      fetchUserMedia(data.email);
    } catch (err) {
      alert("Network error during authentication.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vault_active_user");
    setIsLoggedIn(false);
    setUserEmail("");
    setMediaList([]);
    setStorageUsed(0);
    setSelectedIds();
  };

  const processAndUploadFile = (file: File) => {
    const reader = new FileReader();
    setIsUploading(true);

    reader.onload = async () => {
      const base64Url = reader.result as string;
      const fileType = file.type.startsWith('video') ? 'video' : 'image';

      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: file.name,
            url: base64Url,
            type: fileType,
            size: file.size
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setMediaList(prev => [data.media, ...prev]);
          setStorageUsed(prev => prev + file.size);
        } else {
          alert(data.error || "Failed to upload file");
        }
      } catch (err) {
        alert("Error uploading file to server.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      processAndUploadFile(files[i]);
    }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMediaList(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMedia = mediaList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'photos') return matchesSearch && item.type === 'image';
    if (activeTab === 'videos') return matchesSearch && item.type === 'video';
    if (activeTab === 'favorites') return matchesSearch && item.isFavorite;
    return matchesSearch;
  });

  // --- AUTH SCREEN ---
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 md:p-12">
        <header className="flex justify-between items-center max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-indigo-500 animate-pulse" />
            <span className="font-bold text-lg tracking-wider">VAULT.IO</span>
          </div>
        </header>

        <div className="max-w-md mx-auto w-full bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl my-auto">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignup ? "Create Database Vault" : "Sign In to Database Vault"}
            </h1>
            <p className="text-zinc-400 text-xs mt-1">Cloud Persistent • Zero Subscription Ransoms • Total Privacy</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Email Identifier</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Secure Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoadingAuth}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoadingAuth ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignup ? "Register Free Account" : "Access Vault")} 
              {!isLoadingAuth && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="text-center mt-6">
            <button 
              onClick={() => setIsSignup(!isSignup)} 
              className="text-xs text-zinc-400 hover:text-indigo-400 transition"
            >
              {isSignup ? "Already have an account? Sign in" : "Need a vault account? Sign up free"}
            </button>
          </div>
        </div>

        <footer className="max-w-6xl mx-auto w-full text-center text-xs text-zinc-600 pt-6">
          © 2026 Vault.io — Defeating the cloud storage subscription pandemic globally.
        </footer>
      </main>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-6 md:p-12 relative">
      {/* Header */}
      <header className="flex justify-between items-center max-w-6xl mx-auto w-full pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-indigo-500" />
          <span className="font-bold text-lg tracking-wider">VAULT.IO</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>{userEmail}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full flex-1 pt-8 space-y-8">
        
        {/* Storage Bar & Hero Banner */}
        <div className="bg-gradient-to-r from-zinc-900/60 to-indigo-950/20 border border-zinc-800/80 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 backdrop-blur-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Database Connected & Secure
            </div>
            <h2 className="text-xl font-bold">Personal Cloud Storage</h2>
            <p className="text-xs text-zinc-400 mt-1">Saved persistently in your database vault with zero subscription fees.</p>
          </div>
          <div className="w-full md:w-80 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Database Quota</span>
              <span className="font-mono text-indigo-400">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300" 
                style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Upload Box */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-3xl p-8 bg-zinc-900/30 transition cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*,video/*" 
            multiple
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <div className="p-4 bg-indigo-500/10 group-hover:bg-indigo-500/20 rounded-2xl text-indigo-400 transition">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {isUploading ? "Uploading to Cloud Database..." : "Click or Drag & Drop photos or videos"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Persistent database backend ingestion</p>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              All Files ({mediaList.length})
            </button>
            <button 
              onClick={() => setActiveTab('photos')} 
              className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${activeTab === 'photos' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Photos
            </button>
            <button 
              onClick={() => setActiveTab('videos')} 
              className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${activeTab === 'videos' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Videos
            </button>
            <button 
              onClick={() => setActiveTab('favorites')} 
              className={`px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${activeTab === 'favorites' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Favorites
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {mediaList.length > 0 && (
              <button 
                onClick={() => { setSlideshowIndex(0); setIsSlideshowActive(true); }}
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-indigo-400 px-4 py-2.5 rounded-xl transition whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Slideshow
              </button>
            )}

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database files..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div>
          {isLoadingMedia ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Loading vault records from database...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-20 border border-zinc-900 rounded-3xl bg-zinc-900/10">
              <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No media stored in database.</p>
              <p className="text-xs text-zinc-600 mt-1">Upload memories above to secure them!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedMedia(item)}
                  className="group relative bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden aspect-square flex flex-col justify-between cursor-pointer transition"
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )}

                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`p-2 rounded-xl transition ${item.isFavorite ? 'bg-amber-500 text-white' : 'bg-zinc-950/80 text-zinc-300 hover:text-amber-400'}`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent p-3 pt-6 flex flex-col justify-end">
                    <p className="text-xs font-medium truncate text-zinc-200">{item.name}</p>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-0.5">
                      <span>{formatBytes(item.size)}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- LIGHTBOX MODAL --- */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-6 md:p-12">
          <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
            <div>
              <p className="text-sm font-bold text-zinc-100 truncate max-w-xs md:max-w-md">{selectedMedia.name}</p>
              <p className="text-xs text-zinc-400">{formatBytes(selectedMedia.size)}</p>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={selectedMedia.url} 
                download={selectedMedia.name}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-200 px-3.5 py-2 rounded-xl transition"
              >
                <Download className="w-4 h-4 text-indigo-400" /> Download
              </a>
              <button 
                onClick={() => setSelectedMedia(null)}
                className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto max-h-[70vh] flex items-center justify-center my-auto overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {selectedMedia.type === 'image' ? (
              <img src={selectedMedia.url} alt={selectedMedia.name} className="max-h-[70vh] object-contain w-full" />
            ) : (
              <video src={selectedMedia.url} controls autoPlay className="max-h-[70vh] object-contain w-full" />
            )}
          </div>
        </div>
      )}

      {/* --- SLIDESHOW MODAL --- */}
      {isSlideshowActive && mediaList.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6">
          <div className="flex justify-between items-center max-w-6xl mx-auto w-full text-zinc-400 text-xs">
            <span>Slideshow ({slideshowIndex + 1} / {mediaList.length})</span>
            <button 
              onClick={() => setIsSlideshowActive(false)}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center max-w-5xl mx-auto w-full overflow-hidden my-4">
            {mediaList[slideshowIndex].type === 'image' ? (
              <img src={mediaList[slideshowIndex].url} alt="slide" className="max-h-[80vh] object-contain" />
            ) : (
              <video src={mediaList[slideshowIndex].url} autoPlay muted className="max-h-[80vh] object-contain" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
