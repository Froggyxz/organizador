'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MediaItem {
  id?: string;
  media_id?: string;
  medias?: {
    title: string;
    category: string;
    total_units: number;
    image_url: string;
    url: string;
  };
  status?: string;
  current_progress?: number;
  rating?: number;
  notes?: string;
  is_favorite?: boolean;
  season?: number;
}

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
  const [uploading, setUploading] = useState(false);

  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const hasSeasons = ['tv', 'anime'].includes(category);
  
  let labelProgress = 'Unidade';
  if (isVideo) labelProgress = 'Episódio';
  else if (category === 'manga') labelProgress = 'Capítulo';
  else if (category === 'book') labelProgress = 'Página';

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
      } else if (category === 'manga' || category === 'anime') {
        const resp = await fetch(`https://api.jikan.moe/v4/${category}?q=${encodeURIComponent(q)}&limit=5`);
        const json = await resp.json();
        results = json.data?.map((m: any) => ({
          id: m.mal_id, title: m.title, image: m.images.jpg.image_url, total: m.chapters || m.episodes || 0
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
        const resp = await fetch(`https://api.themoviedb.org/3/tv/${s.id}?language=pt-BR`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  const handleSeasonChange = (newSeason: number) => {
    setSeason(newSeason);
    if (selectedMedia?.all_seasons) {
      const found = selectedMedia.all_seasons.find((sea: any) => sea.season_number === newSeason);
      if (found) setTotalUnits(found.episode_count);
    }
  };

  async function handleSave() {
    if (!query) return alert("Título vazio!");
    setLoading(true);
    try {
      let mediaId = itemToEdit?.media_id;
      const finalImage = selectedMedia ? selectedMedia.image : imageUrl;

      if (!itemToEdit) {
        const { data: media } = await supabase.from('medias').insert([{
          title: selectedMedia ? selectedMedia.title : query,
          category, image_url: finalImage, total_units: totalUnits, is_custom: !selectedMedia
        }]).select().single();
        mediaId = media.id;
      } else {
        await supabase.from('medias').update({ total_units: totalUnits, image_url: finalImage }).eq('id', mediaId);
      }

      const logData = { 
        profile_id: profileId, media_id: mediaId, status, 
        current_progress: Number(progress), rating: Number(rating), 
        season: Number(season), notes, is_favorite: isFavorite 
      };

      if (itemToEdit) await supabase.from('user_logs').update(logData).eq('id', itemToEdit.id);
      else await supabase.from('user_logs').insert([logData]);

      onClose();
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-md my-auto p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-4 text-white relative">
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{itemToEdit ? 'Editar' : 'Adicionar'}</h2>
          <button onClick={() => setIsFavorite(!isFavorite)} className="text-2xl">{isFavorite ? '❤️' : '🤍'}</button>
        </div>

        <select className="w-full bg-slate-800 p-4 rounded-2xl outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="book">📚 Livro</option>
          <option value="manga">📖 Mangá</option>
          <option value="anime">⛩️ Anime</option>
          <option value="movie">🎬 Filme</option>
          <option value="tv">📺 Série</option>
          <option value="fanfic">✍️ Fanfic</option>
        </select>

        <div className="relative">
          <input className="w-full bg-slate-800 p-4 rounded-2xl outline-none text-sm" placeholder="Nome da obra..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-2xl mt-2 overflow-hidden z-50 shadow-2xl">
              {suggestions.map((s: any) => (
                <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-4 flex items-center gap-3 hover:bg-slate-700 text-left border-b border-slate-700 last:border-0">
                  <img src={s.image || 'https://via.placeholder.com/40x60'} className="w-10 h-14 object-cover rounded-lg" />
                  <span className="text-sm font-bold line-clamp-1">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <select className="w-full bg-slate-800 p-4 rounded-2xl outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Planejado">📅 Planejado</option>
          <option value={isVideo ? "Assistindo" : "Lendo"}>{isVideo ? "📺 Assistindo" : "📖 Lendo"}</option>
          <option value="Concluído">✅ Concluído</option>
          <option value="Pausado">⏸️ Pausado</option>
          <option value="Dropado">🗑️ Dropado</option>
        </select>

        {/* PROGRESSO E TEMPORADA */}
        <div className="bg-slate-800/40 p-4 rounded-2xl space-y-4">
          <div className="flex gap-4">
            {hasSeasons && (
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Temp.</label>
                <input type="number" className="w-full bg-slate-800 p-3 rounded-xl outline-none text-blue-400 font-bold" value={season} onChange={(e) => handleSeasonChange(Number(e.target.value))} />
              </div>
            )}
            <div className="flex-[2] space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{labelProgress} Atual</label>
              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
                <input type="number" className="flex-1 bg-transparent p-2 outline-none text-blue-400 font-bold text-center" value={progress} onChange={(e) => setProgress(e.target.value)} />
                <span className="text-slate-600">/</span>
                <input type="number" className="w-16 bg-transparent p-2 outline-none text-slate-400 text-sm text-center" value={totalUnits} onChange={(e) => setTotalUnits(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        {/* NOTA DECIMAL */}
        <div className="bg-slate-800/40 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-sm text-slate-400 font-bold uppercase text-[10px]">Minha Nota (0-5)</span>
          <div className="flex items-center gap-3">
            <span className="text-yellow-500 font-bold">★</span>
            <input type="number" step="0.1" min="0" max="5" className="w-20 bg-slate-800 p-3 rounded-xl outline-none text-center font-bold text-yellow-500 border border-slate-700" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>

        <textarea className="w-full bg-slate-800/40 p-4 rounded-2xl text-sm outline-none border border-slate-800 h-24 resize-none" placeholder="Anotações..." value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-800 rounded-2xl font-bold text-slate-400">Voltar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 p-4 bg-blue-600 rounded-2xl font-bold">{loading ? '...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}