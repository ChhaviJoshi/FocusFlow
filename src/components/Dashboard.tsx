
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, RefreshCw, Layers, Inbox, Filter, X, CheckCircle, WifiOff, LogOut, Settings } from 'lucide-react';
import { InboxItem, AnalysisResult, CategoryType } from '../types';
import { fetchInbox, analyzeItems, updateTask, logout } from '../services/api';
import { PriorityCard } from './PriorityCard';
import { StreamItem } from './StreamItem';
import { Analytics } from './Analytics';

interface DashboardProps {
  userName: string;
  integrations: Array<{ provider: string; connected: boolean }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ userName, integrations }) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedResult, setCachedResult] = useState<boolean>(false);
  
  // Filtering State
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);

  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch inbox from backend (all sources aggregated server-side)
      const inboxResponse = await fetchInbox();
      const items = inboxResponse.items as InboxItem[];
      setInboxItems(items);

      if (items.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Analyze with Gemini via backend (handles caching + sanitization)
      const analysisResponse = await analyzeItems(items);
      setAnalysis(analysisResponse.result as AnalysisResult);
      setCachedResult(analysisResponse.cached);

    } catch (err: any) {
      console.error("Dashboard Error:", err);
      setError(err.message || "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    initializeData();
  }, []);

  // Navigation Effect: Scroll to stream when category selected
  useEffect(() => {
    if (selectedCategory && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory]);

  const handleCompleteTask = async (id: string) => {
    if (!analysis) return;
    
    try {
      // Persist completion to backend
      await updateTask(id, 'completed');
    } catch {
      // Even if backend save fails, update UI optimistically
      console.warn('Failed to persist task completion');
    }

    const updatedPriorities = analysis.topPriorities.filter(t => t.id !== id);
    setAnalysis({
      ...analysis,
      topPriorities: updatedPriorities
    });
  };

  const handleCategorySelect = (category: CategoryType | null) => {
    setSelectedCategory(category);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch {
      // Force reload even if API call fails
      window.location.href = '/';
    }
  };

  const getFilteredInbox = () => {
    if (!analysis || !selectedCategory) return inboxItems;
    
    const categoryItemIds = new Set(
      analysis.itemClassifications
        .filter(c => c.category === selectedCategory)
        .map(c => c.itemId)
    );

    return inboxItems.filter(item => categoryItemIds.has(item.id));
  };

  const getCategoryForItem = (id: string) => {
    return analysis?.itemClassifications.find(c => c.itemId === id)?.category;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-10 selection:bg-cyan-500/30">
      {/* Navigation / Header */}
      <nav className="bg-[#0b1221]/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/40">
                 <Brain className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">FocusFlow</span>
              {cachedResult && (
                 <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-900 text-[10px] text-emerald-500 font-medium">
                   Cached
                 </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={initializeData}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{loading ? 'Analyzing...' : 'Refresh'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-[#0f172a] border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-300 shadow-inner">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Section: Header text */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Good Morning, {userName.split(' ')[0]}.</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            FocusFlow has analyzed <span className="font-semibold text-cyan-100">{inboxItems.length} items</span> from your connected sources.
          </p>
          {/* Source summary */}
          <div className="flex flex-wrap gap-2 mt-2">
            {integrations.map(i => (
              <span key={i.provider} className="text-[10px] uppercase tracking-wider font-medium text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full">
                {i.provider}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-950/30 border-l-4 border-red-500 p-4 mb-6 rounded-r-md backdrop-blur-sm">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: The Priority Feed */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                 <Layers size={20} className="text-cyan-400" />
                 Top Priorities
               </h2>
               <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-1 rounded-full font-medium">
                 AI Optimized
               </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-48 bg-[#0b1221] rounded-xl animate-pulse shadow-sm border border-slate-800/60" />
                 ))}
              </div>
            ) : analysis?.topPriorities.length === 0 ? (
                <div className="bg-[#0b1221] rounded-xl p-10 text-center shadow-sm border border-slate-800/60">
                    <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-white">All Caught Up!</h3>
                    <p className="text-slate-400">No urgent priorities found in your stream.</p>
                </div>
            ) : (
              analysis?.topPriorities.map((task, index) => {
                const original = inboxItems.find(i => i.id === task.originalItemId);
                return (
                  <PriorityCard 
                    key={task.id} 
                    task={task} 
                    rank={index + 1}
                    originalItem={original}
                    onComplete={handleCompleteTask}
                  />
                );
              })
            )}
          </div>

          {/* Right Column: Context & Stream */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            
            {/* Analytics Card */}
            <div className="h-[380px]">
               {analysis ? (
                 <Analytics 
                    data={analysis.distribution} 
                    score={analysis.productivityScore} 
                    onSelectCategory={handleCategorySelect}
                    selectedCategory={selectedCategory}
                 />
               ) : (
                 <div className="h-full bg-[#0b1221] rounded-xl animate-pulse border border-slate-800/60" />
               )}
            </div>

            {/* Incoming Stream */}
            <div ref={streamEndRef} className="bg-[#0b1221] rounded-xl shadow-lg shadow-black/40 border border-slate-800/60 overflow-hidden flex flex-col max-h-[600px] scroll-mt-24">
               <div className="p-4 border-b border-slate-800/60 bg-[#0f172a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                        <Inbox size={16} className="text-cyan-400" />
                        {selectedCategory ? `${selectedCategory} Items` : 'Incoming Stream'}
                     </h3>
                     {selectedCategory && (
                       <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-cyan-600/80 text-white rounded-full border border-cyan-400/20 shadow-sm">
                         Filtered
                       </span>
                     )}
                  </div>
                  {selectedCategory ? (
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/50 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors"
                    >
                      <X size={12} /> Clear
                    </button>
                  ) : (
                    <button className="text-slate-500 hover:text-cyan-400 transition-colors">
                      <Filter size={14} />
                    </button>
                  )}
               </div>
               
               <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                 {getFilteredInbox().length === 0 ? (
                   <div className="p-8 text-center text-slate-500 text-sm">
                     {selectedCategory ? `No ${selectedCategory.toLowerCase()} items found.` : 'No items in your inbox yet.'}
                   </div>
                 ) : (
                   getFilteredInbox().map(item => (
                     <StreamItem 
                        key={item.id} 
                        item={item} 
                        category={getCategoryForItem(item.id)}
                      />
                   ))
                 )}
               </div>
               
               <div className="p-3 border-t border-slate-800/60 bg-[#0f172a] text-center">
                 <button className="text-xs text-cyan-500/80 font-medium hover:text-cyan-400 transition-colors">View All Integrations</button>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
