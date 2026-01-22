
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Event, Category, UserInteraction, Recommendation } from './types';
import { MOCK_EVENTS, EVENT_CATEGORIES } from './constants';
import { getAIRecommendations } from './services/geminiService';

// --- Shared Components ---

const Navbar: React.FC<{ 
  user: User | null; 
  onLogout: () => void; 
  onLoginClick: () => void; 
  onDashboardClick: () => void;
  onHomeClick: () => void;
}> = ({ user, onLogout, onLoginClick, onDashboardClick, onHomeClick }) => (
  <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-2 cursor-pointer" onClick={onHomeClick}>
      <div className="bg-indigo-600 p-2 rounded-lg">
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
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            My Events
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="text-sm text-slate-500">Hi, <span className="font-semibold text-slate-800">{user.name}</span></span>
            <button 
              onClick={onLogout}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={onLoginClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95"
        >
          Sign In
        </button>
      )}
    </div>
  </nav>
);

const EventCard: React.FC<{ 
  event: Event; 
  onView: (id: string) => void;
  onSave: (id: string) => void;
  isSaved: boolean;
  isAI?: boolean;
  aiReason?: string;
  aiConfidence?: number;
}> = ({ event, onView, onSave, isSaved, isAI, aiReason, aiConfidence }) => (
  <div className={`group relative bg-white rounded-2xl border ${isAI ? 'border-indigo-200 shadow-indigo-50 shadow-xl' : 'border-slate-200 shadow-sm'} overflow-hidden hover:shadow-lg transition-all duration-300`}>
    <div className="relative h-48 overflow-hidden">
      <img 
        src={event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`} 
        alt={event.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-4 left-4">
        <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-700 uppercase tracking-wider">
          {event.category}
        </span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onSave(event.id); }}
        className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all ${isSaved ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-600 hover:bg-white'}`}
      >
        <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>
    
    <div className="p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 mb-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {new Date(event.dateTime).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
        {event.title}
      </h3>
      <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {event.location}
      </div>

      {isAI && aiReason && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-lg">✨</span>
            <div className="flex-1">
              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                {aiReason}
              </p>
              {aiConfidence !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-indigo-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${aiConfidence * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">
                    {(aiConfidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => onView(event.id)}
        className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold rounded-xl text-sm transition-all border border-slate-100 hover:border-indigo-100"
      >
        View Details
      </button>
    </div>
  </div>
);

// --- Pages ---

const Home: React.FC<{
  user: User | null;
  events: Event[];
  recommendations: Recommendation[];
  onInteract: (eventId: string, type: 'view' | 'save' | 'share') => void;
  isLoadingRecs: boolean;
}> = ({ user, events, recommendations, onInteract, isLoadingRecs }) => {
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
      <div className="mb-12 text-center py-12 px-6 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-50"></div>
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Discover Events in SA</h2>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">
            Experience the best local South African events curated just for you using cutting-edge AI.
          </p>
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search braais, summits, jazz..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl text-slate-800 shadow-xl focus:ring-4 focus:ring-indigo-300 outline-none"
              />
              <svg className="absolute right-4 top-4 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="sm:w-1/3 relative">
              <input 
                type="text" 
                placeholder="Anywhere in SA" 
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl text-slate-800 shadow-xl focus:ring-4 focus:ring-indigo-300 outline-none"
              />
              <svg className="absolute right-4 top-4 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations Section */}
      {user && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 rounded-lg">✨</span>
                AI Picks For You
              </h3>
              <p className="text-slate-500 mt-1">Based on your interests in {user.interests.join(', ')}</p>
            </div>
          </div>
          
          {isLoadingRecs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white border border-slate-200 h-96 rounded-2xl"></div>
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
                  isSaved={user.savedEvents.includes(event.id)}
                  isAI
                  aiReason={reason}
                  aiConfidence={confidence}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 p-12 rounded-3xl text-center">
              <p className="text-slate-500">Add more interests or interact with local events to get better recommendations!</p>
            </div>
          )}
        </section>
      )}

      {/* Categories Filter */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
        <button 
          onClick={() => setFilter('All')}
          className={`px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all shadow-sm ${filter === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
        >
          All Events
        </button>
        {EVENT_CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all shadow-sm ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Events Grid */}
      <section>
        <h3 className="text-2xl font-bold text-slate-800 mb-8">What's Near You</h3>
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onView={(id) => onInteract(id, 'view')}
                onSave={(id) => onInteract(id, 'save')}
                isSaved={user?.savedEvents.includes(event.id) || false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.054.585l-1.335 1.335a1 1 0 01-1.66-.707V15a2 2 0 012-2h.001l.89-.89a2 2 0 011.414-.586h1.226a2 2 0 001.414-.586l.89-.89H9a2 2 0 012-2v-.001l.89-.89a2 2 0 011.414-.586h1.226a2 2 0 001.414-.586l.89-.89H17a2 2 0 012 2v2a2 2 0 01-2 2h-1.226a2 2 0 00-1.414.586l-.89.89H14a2 2 0 01-2 2v2a2 2 0 012 2h1.226a2 2 0 001.414-.586l.89-.89H17a2 2 0 012-2v2a2 2 0 01-2 2h-1.226a2 2 0 00-1.414.586l-.89.89h1.226a2 2 0 011.414.586l.89.89z" />
            </svg>
            <p className="text-slate-500 font-medium">No events found in this category or location.</p>
          </div>
        )}
      </section>
    </div>
  );
};

const EventDetail: React.FC<{
  event: Event;
  onBack: () => void;
  onSave: (id: string) => void;
  isSaved: boolean;
}> = ({ event, onBack, onSave, isSaved }) => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 font-semibold mb-8 hover:translate-x-[-4px] transition-transform">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Search
    </button>
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100">
      <div className="h-96 relative">
        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-12">
          <div>
            <span className="inline-block bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
              {event.category}
            </span>
            <h2 className="text-4xl font-extrabold text-white leading-tight">{event.title}</h2>
          </div>
        </div>
      </div>
      <div className="p-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-slate-800 mb-4">About this Event</h3>
            <p className="text-slate-600 leading-relaxed text-lg mb-8">{event.description}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => onSave(event.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${isSaved ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isSaved ? 'Event Saved' : 'Save for Later'}
              </button>
              <button className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                Get Tickets
              </button>
            </div>
          </div>
          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Details</p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">When</p>
                    <p className="font-bold text-slate-800">{new Date(event.dateTime).toLocaleDateString('en-ZA', { dateStyle: 'full' })}</p>
                    <p className="text-slate-500">{new Date(event.dateTime).toLocaleTimeString('en-ZA', { timeStyle: 'short' })}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Where</p>
                    <p className="font-bold text-slate-800">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Organizer</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold">
                  {event.organizer.charAt(0)}
                </div>
                <p className="font-bold text-slate-800">{event.organizer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<{
  user: User;
  onUpdateInterests: (interests: Category[]) => void;
  onAddEvent: (event: Omit<Event, 'id' | 'organizer' | 'organizerId'>) => void;
}> = ({ user, onUpdateInterests, onAddEvent }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', dateTime: '', category: 'Tech' as Category
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent(formData);
    setShowForm(false);
    setFormData({ title: '', description: '', location: '', dateTime: '', category: 'Tech' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-extrabold text-slate-800">Your Pulse Dashboard</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Host Event
        </button>
      </div>

      {showForm && (
        <div className="mb-12 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Create New Event</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Event Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-600">Description</label>
              <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Location</label>
              <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Date & Time</label>
              <input required type="datetime-local" value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-slate-500 font-semibold">Cancel</button>
              <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-semibold shadow-lg">Publish Event</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 rounded-lg">🎯</span>
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
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
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <p className="mt-6 text-xs text-slate-400 italic">Changing your interests updates your AI recommendations instantly.</p>
          </div>
        </section>

        <section>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-full">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 rounded-lg">❤️</span>
              Saved for Later
            </h3>
            {user.savedEvents.length > 0 ? (
              <ul className="space-y-4">
                {user.savedEvents.map(id => (
                  <li key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 line-clamp-1">Event #{id}</p>
                      <p className="text-xs text-slate-400">Saved by you</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">No saved events yet.</p>
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
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Initialize data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('pulse_user');
    const savedEvents = localStorage.getItem('pulse_events');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
  }, []);

  // Sync state with localStorage
  useEffect(() => {
    if (user) localStorage.setItem('pulse_user', JSON.stringify(user));
    localStorage.setItem('pulse_events', JSON.stringify(events));
  }, [user, events]);

  // Handle case where view is 'Detail' but no event is selected
  useEffect(() => {
    if (view === 'Detail' && !selectedEventId) {
      setView('Home');
    }
  }, [view, selectedEventId]);

  // AI Recommendation Logic
  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setIsLoadingRecs(true);
    const recs = await getAIRecommendations(user, events);
    setRecommendations(recs);
    setIsLoadingRecs(false);
  }, [user, events]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user?.interests, user?.savedEvents.length, fetchRecommendations]);

  const handleLogin = () => {
    const mockUser: User = {
      id: 'u1',
      name: 'Thabo Mbeki',
      email: 'thabo@localpulse.co.za',
      location: 'Johannesburg, Gauteng',
      interests: ['Tech', 'Music', 'Food'],
      savedEvents: [],
      interactions: []
    };
    setUser(mockUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pulse_user');
    setView('Home');
    setSelectedEventId(null);
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
    const updatedSaved = type === 'save' 
      ? user.savedEvents.includes(eventId)
        ? user.savedEvents.filter(id => id !== eventId)
        : [...user.savedEvents, eventId]
      : user.savedEvents;

    setUser({
      ...user,
      interactions: [...user.interactions, newInteraction],
      savedEvents: updatedSaved
    });
  };

  const handleUpdateInterests = (newInterests: Category[]) => {
    if (!user) return;
    setUser({ ...user, interests: newInterests });
  };

  const handleAddEvent = (eventData: Omit<Event, 'id' | 'organizer' | 'organizerId'>) => {
    if (!user) return;
    const newEvent: Event = {
      ...eventData,
      id: Math.random().toString(36).substr(2, 9),
      organizer: user.name,
      organizerId: user.id,
      imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600`
    };
    setEvents([newEvent, ...events]);
  };

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  return (
    <div className="min-h-screen pb-20">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onLoginClick={handleLogin}
        onDashboardClick={() => { setView('Dashboard'); setSelectedEventId(null); }}
        onHomeClick={() => { setView('Home'); setSelectedEventId(null); }}
      />
      
      <main className="animate-in fade-in duration-500">
        {view === 'Home' || !user ? (
          <Home 
            user={user} 
            events={events} 
            recommendations={recommendations} 
            onInteract={handleInteraction}
            isLoadingRecs={isLoadingRecs}
          />
        ) : view === 'Dashboard' ? (
          <Dashboard 
            user={user} 
            onUpdateInterests={handleUpdateInterests} 
            onAddEvent={handleAddEvent}
          />
        ) : selectedEvent ? (
          <EventDetail 
            event={selectedEvent}
            onBack={() => setView('Home')}
            onSave={(id) => handleInteraction(id, 'save')}
            isSaved={user.savedEvents.includes(selectedEvent.id)}
          />
        ) : (
          null
        )}
      </main>

      <footer className="mt-20 py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">© 2026 TBangCode Solution South Africa</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
