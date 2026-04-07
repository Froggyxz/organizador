'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '../context/profilecontext';
import AddMediaModal from './AddMediaModal';

export default function Dashboard() {
  const { activeProfile, setProfile } = useProfile();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeProfile) fetchList();
  }, [activeProfile, filter]);

  async function fetchList() {
    setLoading(true);
    try {
      let query = supabase
        .from('user_logs')
        .select('*, medias(*)')
        .eq('profile_id', activeProfile?.id)
        .order('is_favorite', { ascending: false }) // Favoritos primeiro
        .order('updated_at', { ascending: false });

      if (filter !== 'all') {
        // Filtra pela categoria que está dentro da tabela 'medias'
        query = query.filter('medias.category', 'eq', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filtro manual caso o join do supabase traga nulos
      const cleanData = data?.filter(item => item.medias !== null) || [];
      setItems(cleanData);
    } catch (err) {
      console.error("Erro ao carregar lista:", err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { id: 'all', label: 'Tudo' },
    { id: 'manga', label: 'Mangás' },
    { id: 'anime', label: 'Animes' },
    { id: 'movie', label: 'Filmes' },
    { id: 'tv', label: 'Séries' },
    { id: 'fanfic', label: 'Fanfics' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-32">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md p-6 border-b border-slate-900">
        <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Media Tracker</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Perfil: <span className="text-blue-400">{activeProfile?.name}</span>
            </p>
          </div>
          <button 
            onClick={() => setProfile(null)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Trocar Perfil
          </button>
        </div>

        {/* Filtros de Categoria */}
        <div className="flex gap-2 overflow-x-auto mt-6 no-scrollbar max-w-2xl mx-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === cat.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Lista de Mídias */}
      <div className="max-w-2xl mx-auto p-4 mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-600 font-medium">Carregando sua lista...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">Nada encontrado por aqui ainda.</p>
            <button onClick={() => setShowModal(true)} className="text-blue-400 text-sm mt-2 font-bold underline">Adicionar primeira mídia</button>
          </div>
        ) : (
          items.map((item: any) => (
            <div 
              key={item.id} 
              className="relative group bg-slate-900/50 border border-slate-900 hover:border-slate-800 p-4 rounded-[2rem] flex gap-5 transition-all active:scale-[0.98]"
            >
              {/* Badge de Favorito */}
              {item.is_favorite && (
                <div className="absolute -top-2 -right-1 bg-red-600 text-[10px] px-2 py-1 rounded-full shadow-lg font-bold animate-pulse">
                  FAV ❤️
                </div>
              )}

              {/* Imagem da Capa */}
              <div className="relative w-24 h-32 flex-shrink-0">
                {item.medias.image_url ? (
                  <img 
                    src={item.medias.image_url} 
                    className="w-full h-full object-cover rounded-2xl shadow-2xl" 
                    alt={item.medias.title}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">
                    {item.medias.category === 'fanfic' ? '✍️' : '🎬'}
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{item.medias.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[9px] font-black uppercase tracking-tighter bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {item.medias.category}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                      item.status === 'Lendo' || item.status === 'Visto' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Footer do Card (Rating, Progresso, Link) */}
                <div className="mt-4 flex items-end justify-between border-t border-slate-800/50 pt-3">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Progresso</p>
                    <p className="text-sm font-mono font-bold text-slate-200">
                      {item.medias.category === 'movie' ? 'Concluído' : `Cap/Ep ${item.current_progress}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {item.rating > 0 && (
                      <div className="flex text-yellow-500 text-[10px] gap-0.5">
                        {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                      </div>
                    )}
                    {item.medias.url && (
                      <a 
                        href={item.medias.url} 
                        target="_blank" 
                        className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:underline"
                      >
                        ABRIR LINK 🔗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botão Flutuante de Adicionar */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-10 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-4xl shadow-[0_10px_40px_rgba(37,99,235,0.4)] flex items-center justify-center z-50 transition-all active:scale-90 hover:scale-110"
      >
        <span className="mb-1">+</span>
      </button>

      {/* Modal de Adição */}
      {showModal && activeProfile?.id && (
        <AddMediaModal 
          profileId={activeProfile.id} 
          onClose={() => {
            setShowModal(false);
            fetchList(); // Recarrega a lista após salvar
          }} 
        />
      )}
    </div>
  );
}