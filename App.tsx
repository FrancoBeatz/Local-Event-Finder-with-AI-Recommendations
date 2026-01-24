
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Event, Category, UserInteraction, Recommendation, UserRole, EventStatus } from './types';
import { MOCK_EVENTS, EVENT_CATEGORIES } from './constants';
import { getAIRecommendations } from './services/geminiService';
import { apiService } from './services/apiService';

// --- Utils ---

const formatCalendarDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, '');
  } catch (e) {
    return new Date().toISOString().replace(/-|:|\.\d+/g, '');
  }
};

const exportToICal = (event: Event) => {
  const startDate = formatCalendarDate(event.dateTime);
  const endDate = formatCalendarDate(new Date(new Date(event.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString());
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPulse//Local Event Finder//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const getGoogleCalendarUrl = (event: Event) => {
  const startDate = formatCalendarDate(event.dateTime);
  const endDate = formatCalendarDate(new Date(new Date(event.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString());
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&dates=${startDate}/${endDate}`;
};

// --- Shared Components ---

const Toast: React.FC<{ message: string; visible: boolean; type?: 'info' | 'success' | 'error' }> = ({ message, visible, type = 'info' }) => (
  <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl transition-all duration-300 pointer-events-none flex items-center gap-3 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
    {type === 'success' ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
    ) : type === 'error' ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )}
    <span className="font-bold text-sm tracking-tight">{message}</span>
  </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Navbar: React.FC<{ 
  user: User | null; 
  onLogout: () => void; 
  onLoginClick: (role?: UserRole) => void; 
  onDashboardClick: () => void;
  onHomeClick: () => void;
}> = ({ user, onLogout, onLoginClick, onDashboardClick, onHomeClick }) => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-2 cursor-pointer" onClick={onHomeClick}>
      <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">EventPulse</h1>
    </div>
    
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-4">
          <button 
            onClick={onDashboardClick}
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Dashboard
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="flex flex-col items-end">
              <span className="text-sm text-slate-500">Hi, <span className="font-bold text-slate-800">{user.name}</span></span>
              {user.role === 'admin' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>}
            </div>
            <button 
              onClick={onLogout}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => onLoginClick('user')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
          >
            Sign In
          </button>
          <button 
            onClick={() => onLoginClick('admin')}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 hidden sm:block"
          >
            Admin
          </button>
        </div>
      )}
    </div>
  </nav>
);

const EventCard: React.FC<{ 
  event: Event; 
  onView: (id: string) => void;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
  onModerate?: (id: string, action: 'approve' | 'flag' | 'delete') => void;
  isSaved: boolean;
  isAdmin?: boolean;
  isAI?: boolean;
  aiReason?: string;
  aiConfidence?: number;
}> = ({ event, onView, onSave, onShare, onModerate, isSaved, isAdmin, isAI, aiReason, aiConfidence }) => {
  const [imgSrc, setImgSrc] = useState(event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`);

  return (
    <div className={`group relative bg-white rounded-3xl border ${isAI ? 'border-indigo-200 shadow-indigo-50 shadow-xl' : 'border-slate-200 shadow-sm'} overflow-hidden hover:shadow-xl transition-all duration-500 ${event.status === 'flagged' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      <div className="relative h-52 overflow-hidden">
        <img 
          src={imgSrc} 
          alt={event.title}
          onError={() => setImgSrc(`https://picsum.photos/seed/${event.id}_fallback/800/600`)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-indigo-700 uppercase tracking-widest shadow-sm">
            {event.category}
          </span>
          {event.status === 'flagged' && <span className="bg-rose-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Flagged</span>}
        </div>
        <div className="absolute top-4 right-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(event.id); }}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg ${isSaved ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-600 hover:bg-white'}`}
          >
            <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {new Date(event.dateTime).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
          {event.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-5">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
          {event.location}
        </div>

        {isAI && aiReason && (
          <div className="mb-5 p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-900 leading-relaxed font-semibold line-clamp-2">{aiReason}</p>
                {aiConfidence !== undefined && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 bg-indigo-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${aiConfidence * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">{(aiConfidence * 100).toFixed(0)}% Match</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={() => onView(event.id)}
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-all shadow-md active:scale-95"
          >
            Details
          </button>
          
          {isAdmin && onModerate && (
            <div className="flex gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); onModerate(event.id, 'flag'); }}
                className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-colors"
                title="Flag Event"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Pages ---

const Home: React.FC<{
  user: User | null;
  events: Event[];
  recommendations: Recommendation[];
  onInteract: (eventId: string, type: 'view' | 'save' | 'share') => void;
  onModerate?: (id: string, action: 'approve' | 'flag' | 'delete') => void;
  isLoadingRecs: boolean;
  userLocation: { lat: number; lng: number } | null;
}> = ({ user, events, recommendations, onInteract, onModerate, isLoadingRecs, userLocation }) => {
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [search, setSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchCat = filter === 'All' || e.category === filter;
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.description.toLowerCase().includes(search.toLowerCase());
      const matchLoc = e.location.toLowerCase().includes(locSearch.toLowerCase());
      return matchCat && matchSearch && matchLoc;
    });
  }, [events, filter, search, locSearch]);

  const recommendedEvents = useMemo(() => {
    return recommendations
      .map(rec => ({
        event: events.find(e => e.id === rec.eventId),
        reason: rec.reason,
        confidence: rec.confidenceScore
      }))
      .filter(item => item.event !== undefined) as { event: Event; reason: string; confidence: number }[];
  }, [recommendations, events]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center py-16 px-6 rounded-[3rem] bg-indigo-600 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] -mr-48 -mt-48 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-[120px] -ml-48 -mb-48 opacity-60"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-none">Find Your Next Pulse in SA</h2>
          <p className="text-xl text-indigo-100 mb-10 font-medium">
            South Africa's smartest event platform. Powered by Gemini AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 bg-white/10 backdrop-blur-xl p-3 rounded-[2.5rem] border border-white/20 shadow-2xl">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="What are you looking for?" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-[2rem] text-slate-800 focus:ring-4 focus:ring-indigo-300 outline-none font-semibold placeholder:text-slate-400"
              />
              <svg className="absolute left-5 top-4 w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="sm:w-1/3 relative">
              <input 
                type="text" 
                placeholder="City or Area" 
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-[2rem] text-slate-800 focus:ring-4 focus:ring-indigo-300 outline-none font-semibold placeholder:text-slate-400"
              />
              <svg className="absolute left-5 top-4 w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>
          {userLocation && (
            <p className="mt-4 text-xs text-indigo-200 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Location Pulses Active
            </p>
          )}
        </div>
      </div>

      {/* AI Recommendations Section */}
      {user && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <span className="p-2 bg-indigo-100 rounded-2xl shadow-inner shadow-indigo-200">✨</span>
                AI Recommendations
              </h3>
              <p className="text-slate-500 mt-2 font-medium">Curated for your interests in <span className="text-indigo-600 font-bold">{user.interests.join(', ')}</span></p>
            </div>
          </div>
          
          {isLoadingRecs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white border border-slate-200 h-[450px] rounded-[2rem]"></div>
              ))}
            </div>
          ) : recommendedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendedEvents.map(({ event, reason, confidence }) => (
                <EventCard 
                  key={`rec-${event.id}`} 
                  event={event} 
                  onView={(id) => onInteract(id, 'view')}
                  onSave={(id) => onInteract(id, 'save')}
                  onShare={(id) => onInteract(id, 'share')}
                  onModerate={user.role === 'admin' ? onModerate : undefined}
                  isSaved={user.savedEvents.includes(event.id)}
                  isAdmin={user.role === 'admin'}
                  isAI
                  aiReason={reason}
                  aiConfidence={confidence}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 p-16 rounded-[3rem] text-center">
              <p className="text-slate-400 font-bold text-lg">Keep exploring and saving events to unlock AI picks!</p>
            </div>
          )}
        </section>
      )}

      {/* Categories Filter */}
      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
        <button 
          onClick={() => setFilter('All')}
          className={`px-8 py-3.5 rounded-full whitespace-nowrap text-sm font-black transition-all shadow-sm ${filter === 'All' ? 'bg-slate-900 text-white scale-105 shadow-xl' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
        >
          Explore All
        </button>
        {EVENT_CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-8 py-3.5 rounded-full whitespace-nowrap text-sm font-black transition-all shadow-sm ${filter === cat ? 'bg-indigo-600 text-white scale-105 shadow-xl shadow-indigo-100' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Events Grid */}
      <section>
        <h3 className="text-3xl font-black text-slate-800 mb-10">Trending Events</h3>
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onView={(id) => onInteract(id, 'view')}
                onSave={(id) => onInteract(id, 'save')}
                onShare={(id) => onInteract(id, 'share')}
                onModerate={user?.role === 'admin' ? onModerate : undefined}
                isSaved={user?.savedEvents.includes(event.id) || false}
                isAdmin={user?.role === 'admin'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-200 shadow-sm">
            <p className="text-slate-400 font-black text-xl">No pulses found in this range. Try adjusting your search!</p>
          </div>
        )}
      </section>
    </div>
  );
};

const EventDetail: React.FC<{
  event: Event;
  user: User | null;
  onBack: () => void;
  onSave: (id: string) => void;
  onReminder: (id: string) => void;
  isSaved: boolean;
  hasReminder: boolean;
}> = ({ event, user, onBack, onSave, onReminder, isSaved, hasReminder }) => {
  const [showCalOptions, setShowCalOptions] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <button onClick={onBack} className="group flex items-center gap-3 text-indigo-600 font-black mb-10 hover:translate-x-[-8px] transition-transform">
        <div className="bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </div>
        Back to Pulse
      </button>
      
      <div className="bg-white rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="h-[450px] relative">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent flex items-end p-12">
            <div className="max-w-3xl">
              <span className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-xl">
                {event.category}
              </span>
              <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight mb-4">{event.title}</h2>
              <p className="text-indigo-200 font-bold text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.location}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-800">Experience</h3>
                <div className="relative">
                  <button 
                    onClick={() => setShowCalOptions(!showCalOptions)}
                    className="flex items-center gap-2.5 bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-200 transition-all shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Sync to Calendar
                  </button>
                  {showCalOptions && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 z-10 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noreferrer" className="block px-6 py-3 text-sm text-slate-700 hover:bg-indigo-50 font-bold transition-colors">Google Calendar</a>
                      <button onClick={() => exportToICal(event)} className="w-full text-left block px-6 py-3 text-sm text-slate-700 hover:bg-indigo-50 font-bold transition-colors">Apple / Outlook (.ics)</button>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-slate-600 leading-relaxed text-xl mb-12 font-medium">{event.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button 
                  onClick={() => onSave(event.id)}
                  className={`flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl active:scale-95 ${isSaved ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <svg className="w-7 h-7" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {isSaved ? 'Saved to Heart' : 'Heart this Event'}
                </button>
                <button 
                  onClick={() => onReminder(event.id)}
                  className={`flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl active:scale-95 ${hasReminder ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <svg className="w-7 h-7" fill={hasReminder ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {hasReminder ? 'Pulse Alert On' : 'Set Pulse Alert'}
                </button>
              </div>
            </div>
            
            <div className="space-y-10">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Event Logisitics</p>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Date</p>
                      <p className="font-black text-slate-800 text-lg leading-tight">{new Date(event.dateTime).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</p>
                      <p className="text-indigo-600 font-bold">{new Date(event.dateTime).toLocaleTimeString('en-ZA', { timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Venue</p>
                      <p className="font-black text-slate-800 text-lg leading-tight">{event.location}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200">
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">Organized By</p>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-900/40">
                    {event.organizer.charAt(0)}
                  </div>
                  <p className="font-black text-white text-xl">{event.organizer}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{
  user: User;
  events: Event[];
  onUpdateInterests: (interests: Category[]) => void;
  onAddEvent: (event: Omit<Event, 'id' | 'organizer' | 'organizerId'>) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: Event) => void;
  userCreatedEvents: Event[];
}> = ({ user, events, onUpdateInterests, onAddEvent, onDeleteEvent, onEditEvent, userCreatedEvents }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'edit'; id: string | null }>({ type: 'delete', id: null });
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', dateTime: '', category: 'Tech' as Category
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEventId) {
      onEditEvent({ ...formData, id: editingEventId, organizer: user.name, organizerId: user.id });
      setEditingEventId(null);
    } else {
      onAddEvent(formData);
    }
    setShowForm(false);
    setFormData({ title: '', description: '', location: '', dateTime: '', category: 'Tech' });
  };

  const startEdit = (e: Event) => {
    setFormData({ title: e.title, description: e.description, location: e.location, dateTime: e.dateTime, category: e.category });
    setEditingEventId(e.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Modal 
        isOpen={confirmAction.id !== null} 
        onClose={() => setConfirmAction({ ...confirmAction, id: null })} 
        title={confirmAction.type === 'delete' ? 'Delete Permanently?' : 'Modify Event?'}
      >
        <p className="text-slate-600 mb-8 font-medium leading-relaxed">This action will update the persistent database. Are you absolutely sure?</p>
        <div className="flex justify-end gap-4">
          <button onClick={() => setConfirmAction({ ...confirmAction, id: null })} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700">Go Back</button>
          <button 
            onClick={() => {
              if (confirmAction.type === 'delete' && confirmAction.id) {
                onDeleteEvent(confirmAction.id);
              }
              setConfirmAction({ type: 'delete', id: null });
            }} 
            className={`px-8 py-3 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 ${confirmAction.type === 'delete' ? 'bg-rose-500 shadow-rose-100' : 'bg-indigo-600 shadow-indigo-100'}`}
          >
            Confirm
          </button>
        </div>
      </Modal>

      <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Your Dashboard</h2>
          <p className="text-slate-500 font-medium mt-2">Manage your events and preferences with full persistence</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingEventId(null); setFormData({ title: '', description: '', location: '', dateTime: '', category: 'Tech' }); }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl transition-all flex items-center gap-3 active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          Host New Event
        </button>
      </div>

      {showForm && (
        <div className="mb-20 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] animate-in slide-in-from-top-10 duration-500">
          <h3 className="text-2xl font-black text-slate-800 mb-8">{editingEventId ? 'Edit Your Pulse' : 'Create New Pulse'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 outline-none font-bold transition-all" placeholder="e.g. Cape Town Tech Week" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-200 transition-all">
                {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Description</label>
              <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold focus:ring-4 focus:ring-indigo-200 transition-all resize-none" placeholder="What should people expect? Be detailed!" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Venue / Location</label>
              <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold focus:ring-4 focus:ring-indigo-200 transition-all" placeholder="City, Area or Full Address" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">When is it happening?</label>
              <input required type="datetime-local" value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold focus:ring-4 focus:ring-indigo-200 transition-all" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 pt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 font-black hover:text-slate-600">Discard</button>
              <button type="submit" className="bg-indigo-600 text-white px-12 py-4 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 transition-all active:scale-95">{editingEventId ? 'Update Pulse' : 'Go Live'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-1 space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden relative">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 relative">
              <span className="p-2 bg-amber-100 rounded-2xl">🎯</span>
              Interests
            </h3>
            <div className="flex flex-wrap gap-2 relative">
              {EVENT_CATEGORIES.map(cat => {
                const isActive = user.interests.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      const newInterests = isActive 
                        ? user.interests.filter(i => i !== cat)
                        : [...user.interests, cat];
                      onUpdateInterests(newInterests);
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <span className="p-2 bg-indigo-500 rounded-2xl">🏗️</span>
              Hosted Pulses
            </h3>
            {userCreatedEvents.length > 0 ? (
              <ul className="space-y-5">
                {userCreatedEvents.map(ev => (
                  <li key={ev.id} className="group flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-black text-lg line-clamp-1">{ev.title}</p>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">{new Date(ev.dateTime).toLocaleDateString('en-ZA')}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(ev)} className="p-2.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => setConfirmAction({ type: 'delete', id: ev.id })} className="p-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-500 font-bold text-sm text-center py-6">Ready to host your first event?</p>}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm min-h-[500px]">
            <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
              <span className="p-2 bg-rose-100 rounded-2xl">❤️</span>
              Hearted Pulses
            </h3>
            {user.savedEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.savedEvents.map(id => {
                  const event = events.find(e => e.id === id);
                  if (!event) return null;
                  return (
                    <div key={id} className="flex items-center gap-5 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        <img src={event.imageUrl} className="w-full h-full object-cover" alt={event.title} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 line-clamp-1 text-lg group-hover:text-indigo-600 transition-colors">{event.title}</p>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{event.location}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <p className="text-slate-400 font-bold text-center">No hearted events yet. Start exploring!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'Home' | 'Dashboard' | 'Detail'>('Home');
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'info' | 'success' | 'error' }>({ message: '', visible: false });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      try {
        const fetchedEvents = await apiService.fetchEvents();
        setEvents(fetchedEvents);
      } catch (e) {
        console.error("Critical error in data initialization:", e);
        setEvents(MOCK_EVENTS);
      } finally {
        setIsLoadingEvents(false);
      }

      const savedUser = localStorage.getItem('pulse_user_v3');
      if (savedUser) setUser(JSON.parse(savedUser));
    };
    init();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Location denied", err)
      );
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('pulse_user_v3', JSON.stringify(user));
  }, [user]);

  const fetchRecommendations = useCallback(async () => {
    if (!user || events.length === 0) return;
    setIsLoadingRecs(true);
    try {
      const recs = await getAIRecommendations(user, events);
      setRecommendations(recs);
    } catch (e) {
      console.error("AI Recommendations failed", e);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [user, events]);

  useEffect(() => {
    if (user) fetchRecommendations();
  }, [user?.interests, user?.savedEvents.length, fetchRecommendations]);

  const handleLogin = (role: UserRole = 'user') => {
    const mockUser: User = {
      id: role === 'admin' ? 'u_admin' : 'u_1',
      name: role === 'admin' ? 'Thabo (Admin)' : 'Lerato Mokoena',
      email: role === 'admin' ? 'admin@pulse.co.za' : 'lerato@pulse.co.za',
      location: 'South Africa',
      interests: ['Tech', 'Music', 'Art'],
      savedEvents: [],
      interactions: [],
      role: role,
      reminders: []
    };
    setUser(mockUser);
    setView('Home');
    showToast(`Hello ${mockUser.name}!`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pulse_user_v3');
    setView('Home');
    showToast("Logged out successfully.");
  };

  const handleInteraction = (eventId: string, type: 'view' | 'save' | 'share') => {
    if (!user) {
      handleLogin();
      return;
    }
    
    if (type === 'view') {
      setSelectedEventId(eventId);
      setView('Detail');
    }

    const newInteraction: UserInteraction = { eventId, type, timestamp: Date.now() };
    let updatedSaved = [...user.savedEvents];
    if (type === 'save') {
      const isCurrentlySaved = user.savedEvents.includes(eventId);
      updatedSaved = isCurrentlySaved
        ? user.savedEvents.filter(id => id !== eventId)
        : [...user.savedEvents, eventId];
      showToast(isCurrentlySaved ? "Removed from hearts." : "Pulse hearted!", 'success');
    }

    setUser({
      ...user,
      interactions: [...user.interactions, newInteraction],
      savedEvents: updatedSaved
    });
  };

  const handleUpdateInterests = (newInterests: Category[]) => {
    if (!user) return;
    setUser({ ...user, interests: newInterests });
    showToast("Preferences updated.");
  };

  const handleAddEvent = async (data: Omit<Event, 'id' | 'organizer' | 'organizerId'>) => {
    if (!user) return;
    const newEvent: Event = {
      ...data,
      id: 'e_' + Date.now(),
      organizer: user.name,
      organizerId: user.id,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
      status: 'pending'
    };
    try {
      const saved = await apiService.createEvent(newEvent);
      setEvents([saved, ...events]);
      showToast("Pulse live and persistent!", 'success');
    } catch (e) {
      setEvents([newEvent, ...events]);
      showToast("Saved with persistence fallback.", 'info');
    }
  };

  const handleEditEvent = async (ev: Event) => {
    try {
      const updated = await apiService.updateEvent(ev.id, ev);
      setEvents(events.map(e => e.id === ev.id ? updated : e));
      showToast("Pulse updated.", 'success');
    } catch (e) {
      setEvents(events.map(e => e.id === ev.id ? ev : e));
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiService.deleteEvent(id);
      setEvents(events.filter(e => e.id !== id));
      showToast("Pulse removed.");
    } catch (e) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleModeration = async (id: string, action: 'approve' | 'flag' | 'delete') => {
    if (action === 'delete') {
      await handleDeleteEvent(id);
    } else {
      const status = action === 'approve' ? 'approved' : 'flagged';
      try {
        const updated = await apiService.updateEvent(id, { status } as Partial<Event>);
        setEvents(events.map(e => e.id === id ? updated : e));
        showToast(`Pulse ${action}d.`);
      } catch (e) {
        showToast("Moderation update failed.", 'error');
      }
    }
  };

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);
  const userCreatedEvents = useMemo(() => user ? events.filter(e => e.organizerId === user.id) : [], [events, user]);

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-100 overflow-x-hidden">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onLoginClick={handleLogin}
        onDashboardClick={() => { setView('Dashboard'); setSelectedEventId(null); }}
        onHomeClick={() => { setView('Home'); setSelectedEventId(null); }}
      />
      
      {isLoadingEvents ? (
        <div className="flex items-center justify-center h-screen">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <main className="animate-in fade-in duration-700">
          {(view === 'Home' || !user) ? (
            <Home 
              user={user} 
              events={events} 
              recommendations={recommendations} 
              onInteract={handleInteraction}
              onModerate={handleModeration}
              isLoadingRecs={isLoadingRecs}
              userLocation={userLocation}
            />
          ) : view === 'Dashboard' ? (
            <Dashboard 
              user={user} 
              events={events}
              onUpdateInterests={handleUpdateInterests} 
              onAddEvent={handleAddEvent}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              userCreatedEvents={userCreatedEvents}
            />
          ) : selectedEvent ? (
            <EventDetail 
              event={selectedEvent}
              user={user}
              onBack={() => setView('Home')}
              onSave={(id) => handleInteraction(id, 'save')}
              onReminder={() => showToast("Pulse alert set!")}
              isSaved={user.savedEvents.includes(selectedEvent.id)}
              hasReminder={false}
            />
          ) : null}
        </main>
      )}

      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </div>
  );
};

export default App;
