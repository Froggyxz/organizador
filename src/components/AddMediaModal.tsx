'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: any | null }) {
  const [query, setQuery] = useState(itemToEdit?.medias?.title || '');
  const [category, setCategory] = useState(itemToEdit?.medias?.category || 'manga');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(itemToEdit?.medias?.external_id ? { id: itemToEdit.medias.external_id } : null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [status, setStatus] = useState(itemToEdit?.status || 'Planejado');
  const [progress, setProgress] = useState<string | number>(itemToEdit?.current_progress || 0);
  const [season, setSeason] = useState<number>(itemToEdit?.season || 1);
  const [totalUnits, setTotalUnits] = useState(itemToEdit?.medias?.total_units || 0);
  const [rating, setRating] = useState<string | number>(itemToEdit?.rating || 0);
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [isFavorite, setIsFavorite] = useState(itemToEdit?.is_favorite || false);
  const [imageUrl, setImageUrl] = useState(itemToEdit?.medias?.image_url || '');

  const [loading, setLoading] = useState(false);
  const [isAiring, setIsAiring] = useState(false);

  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const hasSeasons = ['tv', 'anime'].includes(category);
  const labelProgress = category === 'manga' ? 'Cap' : category === 'book' ? 'Pág' : 'Ep';

  // Debounce para busca
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 2 && !selectedMedia && category !== 'fanfic' && !itemToEdit) handleSearch(query);
      else setSuggestions([]);
    }, 800);
    return () => clearTimeout(delay);
  }, [query, category]);

  // Reatividade para Temporadas e Lançamentos
  useEffect(() => {
    if (hasSeasons && selectedMedia?.id) {
      updateMediaDetails(selectedMedia.id, season);
    }
  }, [season, category]);

  async function handleSearch(q: string) {
    try {
      let results = [];
      const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
      if (category === 'book') {
        const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`);
        const json = await resp.json();
        results = json.items?.map((m: any) => ({
          id: m.id, title: m.volumeInfo.title, image: m.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'), total: m.volumeInfo.pageCount || 0
        }));
      } else {
        const type = category === 'movie' ? 'movie' : 'tv';
        const resp = await fetch(`https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(q)}&language=pt-BR`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await resp.json();
        results = json.results?.slice(0, 5).map((m: any) => ({
          id: m.id, title: m.title || m.name, image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
        }));
      }
      setSuggestions(results || []);
      setShowSuggestions(true);
    } catch (err) { console.error(err); }
  }

  async function updateMediaDetails(externalId: string | number, seasonNum: number) {
    try {
      const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
      const seriesResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}?language=pt-BR`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const seriesData = await seriesResp.json();
      const airing = seriesData.status === 'Returning Series' || seriesData.status === 'In Production';
      setIsAiring(airing);

      const seasonResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}/season/${seasonNum}?language=pt-BR`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const seasonData = await seasonResp.json();
      if (seasonData.episodes) {
        const today = new Date();
        const airedEpisodes = seasonData.episodes.filter((ep: any) => !ep.air_date || new Date(ep.air_date) <= today);
        setTotalUnits(airing ? airedEpisodes.length : seasonData.episodes.length);
      }
    } catch (e) { console.error("Erro ao sincronizar TMDB:", e); }
  }

  async function handleSelectSuggestion(s: any) {
    setQuery(s.title);
    setImageUrl(s.image);
    setShowSuggestions(false);
    setSelectedMedia(s);
    if (hasSeasons) { setSeason(1); updateMediaDetails(s.id, 1); }
    else { setTotalUnits(s.total || 0); }
  }

  async function handleSave() {
    if (!query) return;
    setLoading(true);
    try {
      let mediaId = itemToEdit?.media_id;
      if (!itemToEdit) {
        const { data: media, error: mError } = await supabase.from('medias').insert([{
          title: selectedMedia?.title || query,
          category, image_url: selectedMedia?.image || imageUrl, 
          total_units: Number(totalUnits), is_custom: !selectedMedia,
          external_id: selectedMedia?.id?.toString()
        }]).select().single();
        if (mError) throw mError;
        mediaId = media.id;
      }
      const logData = { profile_id: profileId, media_id: mediaId, status, current_progress: Number(progress), rating: Number(rating), season: Number(season), notes, is_favorite: isFavorite };
      const { error: lError } = itemToEdit 
        ? await supabase.from('user_logs').update(logData).eq('id', itemToEdit.id)
        : await supabase.from('user_logs').insert([logData]);
      if (lError) throw lError;
      onClose();
    } catch (e: any) { 
        console.error("Erro ao salvar:", e.message);
        alert("Erro ao salvar: " + e.message);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!itemToEdit) return;
    if (!confirm("Tem certeza que deseja remover esta obra da sua lista?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('user_logs').delete().eq('id', itemToEdit.id);
      if (error) throw error;
      onClose();
    } catch (e: any) {
      console.error("Erro ao excluir:", e.message);
      alert("Erro ao excluir: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col justify-end backdrop-blur-md">
      <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" onClick={onClose} />
      <div className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 space-y-6 max-h-[94vh] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-800 relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">{itemToEdit ? 'Editar Obra' : 'Nova Obra'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{category}</span>
              {isAiring && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> lançando
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {itemToEdit && (
              <button onClick={handleDelete} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 active:scale-90 transition-all">
                🗑️
              </button>
            )}
            <button onClick={() => setIsFavorite(!isFavorite)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFavorite ? 'bg-pink-500/10 text-pink-500' : 'bg-slate-800 text-slate-500'}`}>
              {isFavorite ? '❤️' : '🤍'}
            </button>
          </div>
        </div>

        {/* SELETOR DE CATEGORIA */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['book', 'manga', 'anime', 'movie', 'tv', 'fanfic'].map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSelectedMedia(null); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${category === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* BUSCA */}
        <div className="relative z-[110]">
          <input className="w-full bg-slate-800/50 p-5 rounded-2xl outline-none border border-slate-800 focus:border-blue-500/50 transition-all font-bold text-white placeholder:text-slate-600" placeholder="Pesquisar título..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[110%] left-0 w-full bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 z-[120] max-h-64 overflow-y-auto no-scrollbar">
              {suggestions.map((s: any) => (
                <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-4 flex items-center gap-4 hover:bg-blue-600/20 border-b border-white/5 text-left">
                  <img src={s.image || 'https://via.placeholder.com/40x60'} className="w-12 h-16 object-cover rounded-xl shadow-md" alt="" />
                  <span className="text-sm font-bold text-slate-100 truncate">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STATUS */}
        <div className="grid grid-cols-3 gap-2">
          {['Planejado', isVideo ? 'Assistindo' : 'Lendo', 'Concluído'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`p-3 rounded-2xl text-[9px] font-black uppercase text-center border transition-all ${status === s ? 'bg-slate-100 border-white text-slate-950' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* PROGRESSO */}
        <div className="grid grid-cols-2 gap-4">
          {hasSeasons && (
            <div className="bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Temporada</span>
              <input type="number" className="bg-transparent text-2xl font-black text-blue-400 text-center outline-none w-full" value={season} min="1" onChange={(e) => setSeason(Number(e.target.value))} />
            </div>
          )}
          <div className={`bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center ${!hasSeasons ? 'col-span-2' : ''}`}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{labelProgress} Atual / Total</span>
            <div className="flex items-baseline gap-1">
              <input type="number" className="bg-transparent text-2xl font-black text-blue-400 text-right outline-none w-16" value={progress} onChange={(e) => setProgress(e.target.value)} />
              <span className="text-slate-600 font-bold">/</span>
              <input type="number" className="bg-transparent text-sm font-bold text-slate-500 outline-none w-12" value={totalUnits} onChange={(e) => setTotalUnits(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* NOTA */}
        <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-[2rem] flex justify-between items-center">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sua Nota</span>
          <div className="flex items-center gap-3">
            <span className="text-yellow-500 text-xl font-bold">★</span>
            <input type="number" step="0.1" min="0" max="5" className="bg-slate-800 p-3 w-20 rounded-xl text-center font-black text-yellow-500 outline-none border border-slate-700" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>

        {/* ANOTAÇÕES */}
        <textarea className="w-full bg-slate-800/30 p-6 rounded-[2rem] text-sm text-slate-200 outline-none border border-slate-800/50 h-28 resize-none font-medium placeholder:text-slate-700" placeholder="Escreva suas impressões..." value={notes} onChange={(e) => setNotes(e.target.value)} />

        {/* BOTÕES */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 p-5 rounded-2xl font-black uppercase text-[11px] text-slate-500 bg-slate-800/50 active:scale-95 transition-transform">Voltar</button>
          <button onClick={handleSave} disabled={loading} className="flex-[2] p-5 rounded-2xl font-black uppercase text-[11px] bg-blue-600 text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50">
            {loading ? '...' : itemToEdit ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}