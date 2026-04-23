'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '../context/profilecontext';
import AddMediaModal from './AddMediaModal';

export default function Dashboard() {
  const { activeProfile, setProfile } = useProfile();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeProfile) fetchList();
  }, [activeProfile, filter]);

  async function fetchList() {
    setLoading(true);
    try {
      let query = supabase
        .from('user_logs')
        .select('*, medias!inner(*)') 
        .eq('profile_id', activeProfile?.id)
        .order('is_favorite', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('medias.category', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Erro ao buscar lista:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* HEADER ATUALIZADO */}
      <header className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-800 bg-slate-900">
            <img 
              src={(activeProfile as any)?.avatar_url || `https://ui-avatars.com/api/?name=${activeProfile?.name}&background=0f172a&color=fff`} 
              className="w-full h-full object-cover"
              alt="Avatar"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Tracker</h1>
            <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">{activeProfile?.name}</p>
          </div>
        </div>
        <button 
          onClick={() => setProfile(null)} 
          className="text-[10px] font-black bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-all uppercase"
        >
          Sair
        </button>
      </header>

      {/* FILTROS (ABAS) COM LIVROS */}
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
        {['all', 'book', 'manga', 'anime', 'movie', 'tv', 'fanfic'].map(cat => (
          <button 
            key={cat} 
            onClick={() => setFilter(cat)} 
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              filter === cat 
                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {cat === 'all' ? 'TUDO' : cat === 'book' ? 'LIVROS' : cat}
          </button>
        ))}
      </div>

      {/* LISTAGEM DE CARDS */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-20 text-slate-600 animate-pulse font-black text-xs uppercase tracking-widest">Buscando dados...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Nenhum item nesta categoria</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              onClick={() => setEditingItem(item)} 
              className="bg-slate-900/40 border border-slate-900/60 p-4 rounded-[2.2rem] flex gap-4 cursor-pointer hover:border-blue-500/30 hover:bg-slate-900/80 transition-all active:scale-[0.98]"
            >
              <div className="relative shrink-0">
                <img 
                  src={item.medias?.image_url || 'https://via.placeholder.com/150?text=Sem+Capa'} 
                  className="w-20 h-28 object-cover rounded-2xl shadow-2xl bg-slate-800" 
                />
                {item.is_favorite && (
                  <div className="absolute -top-2 -right-2 bg-slate-950 rounded-full p-1.5 text-[10px] shadow-lg border border-slate-800">❤️</div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="font-bold text-base text-slate-100 line-clamp-1">{item.medias?.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-slate-700">
                      {item.status}
                    </span>
                    <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-blue-500/20">
                      {item.medias?.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Progresso</p>
                    <p className="text-sm font-mono font-bold text-blue-400">
                      {item.current_progress} <span className="text-slate-700">/</span> {item.medias?.total_units || '?'}
                    </p>
                  </div>
                  <div className="flex gap-0.5 text-yellow-500 text-[10px]">
                    {Array.from({ length: item.rating || 0 }).map((_, i) => <span key={i}>★</span>)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOTÃO FLUTUANTE */}
      <button 
        onClick={() => setShowAddModal(true)} 
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 rounded-full text-3xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] z-50 transition-transform active:scale-90 hover:scale-110 flex items-center justify-center font-light text-white"
      >
        +
      </button>

      {/* MODAIS */}
      {showAddModal && activeProfile?.id && (
        <AddMediaModal 
          profileId={activeProfile.id} 
          onClose={() => { setShowAddModal(false); fetchList(); }} 
        />
      )}
      
      {editingItem && activeProfile?.id && (
        <AddMediaModal 
          profileId={activeProfile.id} 
          itemToEdit={editingItem} 
          onClose={() => { setEditingItem(null); fetchList(); }} 
        />
      )}
    </div>
  );
}