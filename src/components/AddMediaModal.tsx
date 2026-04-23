'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: any | null }) {
  const [query, setQuery] = useState(itemToEdit?.medias?.title || '');
  const [category, setCategory] = useState(itemToEdit?.medias?.category || 'manga');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
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

  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const hasSeasons = ['tv', 'anime'].includes(category);
  const labelProgress = category === 'manga' ? 'Cap' : category === 'book' ? 'Pág' : 'Ep';

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 2 && !selectedMedia && category !== 'fanfic' && !itemToEdit) handleSearch(query);
      else setSuggestions([]);
    }, 800);
    return () => clearTimeout(delay);
  }, [query, category]);

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
      } else if (category === 'movie' || category === 'tv') {
        const type = category === 'movie' ? 'movie' : 'tv';
        const resp = await fetch(`https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(q)}&language=pt-BR`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await resp.json();
        results = json.results?.slice(0, 5).map((m: any) => ({
          id: m.id, title: m.title || m.name, image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null, total: category === 'movie' ? 1 : 0
        }));
      }
      setSuggestions(results || []);
      setShowSuggestions(true);
    } catch (err) { console.error(err); }
  }

  async function handleSelectSuggestion(s: any) {
    setQuery(s.title);
    setImageUrl(s.image);
    setShowSuggestions(false);
    if (category === 'tv') {
      try {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
        const resp = await fetch(`https://api.themoviedb.org/3/tv/${s.id}?language=pt-BR`, { headers: { Authorization: `Bearer ${token}` } });
        const details = await resp.json();
        const firstSeason = details.seasons?.find((sea: any) => sea.season_number === 1);
        setTotalUnits(firstSeason?.episode_count || 0);
        setSeason(1);
        setSelectedMedia({ ...s, all_seasons: details.seasons });
      } catch (e) { setSelectedMedia(s); }
    } else {
      setTotalUnits(s.total);
      setSelectedMedia(s);
    }
  }

  async function handleSave() {
    if (!query) return;
    setLoading(true);
    try {
      let mediaId = itemToEdit?.media_id;
      if (!itemToEdit) {
        const { data: media } = await supabase.from('medias').insert([{
          title: selectedMedia ? selectedMedia.title : query,
          category, image_url: selectedMedia ? selectedMedia.image : imageUrl, total_units: totalUnits, is_custom: !selectedMedia
        }]).select().single();
        mediaId = media.id;
      }
      const logData = { profile_id: profileId, media_id: mediaId, status, current_progress: Number(progress), rating: Number(rating), season: Number(season), notes, is_favorite: isFavorite };
      if (itemToEdit) await supabase.from('user_logs').update(logData).eq('id', itemToEdit.id);
      else await supabase.from('user_logs').insert([logData]);
      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col justify-end">
      {/* Botão de Fechar no topo para facilitar o swipe down visual */}
      <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" onClick={onClose} />
      
      <div className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-slate-800">
        
        {/* HEADER E FAVORITO */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{itemToEdit ? 'Editar Obra' : 'Nova Obra'}</h2>
            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">{category}</p>
          </div>
          <button 
            onClick={() => setIsFavorite(!isFavorite)} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFavorite ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* BUSCA E CATEGORIA */}
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['book', 'manga', 'anime', 'movie', 'tv', 'fanfic'].map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <input 
              className="w-full bg-slate-800/50 p-5 rounded-2xl outline-none border border-slate-800 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-600" 
              placeholder="Digite o nome..." 
              value={query} 
              onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} 
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute bottom-full left-0 w-full bg-slate-800 rounded-3xl mb-2 overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                {suggestions.map((s: any) => (
                  <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-4 flex items-center gap-4 hover:bg-slate-700 active:bg-slate-600 border-b border-slate-700/50 last:border-0">
                    <img src={s.image || 'https://via.placeholder.com/40x60'} className="w-12 h-16 object-cover rounded-xl shadow-lg" />
                    <span className="text-sm font-bold truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STATUS SELECTOR (Cards horizontais) */}
        <div className="grid grid-cols-3 gap-2">
          {['Planejado', isVideo ? 'Assistindo' : 'Lendo', 'Concluído'].map(s => (
            <button 
              key={s} 
              onClick={() => setStatus(s)}
              className={`p-3 rounded-2xl text-[9px] font-black uppercase text-center border transition-all ${status === s ? 'bg-slate-100 border-white text-slate-950' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* GRID DE PROGRESSO E TEMPORADA */}
        <div className="grid grid-cols-2 gap-4">
          {hasSeasons && (
            <div className="bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Temporada</span>
              <input 
                type="number" 
                className="bg-transparent text-2xl font-black text-blue-400 text-center outline-none w-full" 
                value={season} 
                onChange={(e) => setSeason(Number(e.target.value))} 
              />
            </div>
          )}
          <div className={`bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center ${!hasSeasons ? 'col-span-2' : ''}`}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{labelProgress} Atual / Total</span>
            <div className="flex items-baseline gap-1">
              <input 
                type="number" 
                className="bg-transparent text-2xl font-black text-blue-400 text-right outline-none w-16" 
                value={progress} 
                onChange={(e) => setProgress(e.target.value)} 
              />
              <span className="text-slate-600 font-bold">/</span>
              <input 
                type="number" 
                className="bg-transparent text-sm font-bold text-slate-500 outline-none w-12" 
                value={totalUnits} 
                onChange={(e) => setTotalUnits(Number(e.target.value))} 
              />
            </div>
          </div>
        </div>

        {/* NOTA E COMENTÁRIO */}
        <div className="space-y-4">
          <div className="bg-blue-600/5 border border-blue-500/10 p-5 rounded-[2rem] flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sua Nota</span>
            <div className="flex items-center gap-3">
              <span className="text-yellow-500 text-xl font-bold">★</span>
              <input 
                type="number" step="0.1" max="5" 
                className="bg-slate-800 p-3 w-16 rounded-xl text-center font-black text-yellow-500 outline-none border border-slate-700" 
                value={rating} onChange={(e) => setRating(e.target.value)} 
              />
            </div>
          </div>
          
          <textarea 
            className="w-full bg-slate-800/30 p-6 rounded-[2rem] text-sm outline-none border border-slate-800/50 focus:border-blue-500/30 h-28 resize-none font-medium placeholder:text-slate-700" 
            placeholder="Escreva algo sobre..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 p-5 rounded-2xl font-black uppercase text-[11px] text-slate-500 bg-slate-800/50 transition-active active:scale-95">Voltar</button>
          <button 
            onClick={handleSave} 
            disabled={loading} 
            className="flex-[2] p-5 rounded-2xl font-black uppercase text-[11px] bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-active active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processando...' : itemToEdit ? 'Atualizar' : 'Salvar na Lista'}
          </button>
        </div>
      </div>
    </div>
  );
}