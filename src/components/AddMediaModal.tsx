'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AddMediaModalProps {
  profileId: string;
  onClose: () => void;
}

export default function AddMediaModal({ profileId, onClose }: AddMediaModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('manga');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  
  // Campos de acompanhamento detalhado
  const [status, setStatus] = useState('Planejado');
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [url, setUrl] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Busca com Debounce
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 2 && !selectedMedia && category !== 'fanfic') handleSearch(query);
      else setSuggestions([]);
    }, 800);
    return () => clearTimeout(delay);
  }, [query, category]);

  async function handleSearch(q: string) {
    try {
      let results = [];
      if (category === 'manga' || category === 'anime') {
        const resp = await fetch(`https://api.jikan.moe/v4/${category}?q=${encodeURIComponent(q)}&limit=5`);
        const json = await resp.json();
        results = json.data?.map((m: any) => ({ id: m.mal_id, title: m.title, image: m.images.jpg.image_url }));
      } else if (category === 'movie' || category === 'tv') {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN; 
        
        if (!token) {
          console.error("ERRO: Variável NEXT_PUBLIC_TMDB_TOKEN não encontrada!");
          return;
        }

        const type = category === 'movie' ? 'movie' : 'tv';
        const urlApi = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(q)}&language=en-US`;

        const resp = await fetch(urlApi, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.trim()}`
          }
        });

        const json = await resp.json();
        
        if (json.results) {
          results = json.results.slice(0, 5).map((m: any) => ({
            id: m.id,
            title: m.title || m.name,
            image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
          }));
        }
      }
      setSuggestions(results || []);
    } catch (err) { console.error("Busca falhou", err); }
  }

  async function handleSave() {
    if (!query && !selectedMedia) return alert("Dê um título à mídia!");
    setLoading(true);

    try {
      // 1. Salva a mídia na tabela geral
      const { data: media, error: mError } = await supabase.from('medias').insert([{
        title: selectedMedia ? selectedMedia.title : query,
        category,
        image_url: selectedMedia ? selectedMedia.image : null,
        url,
        is_custom: !selectedMedia
      }]).select().single();

      if (mError) throw mError;

      // 2. Salva o log específico do usuário (isntnsoopy ou omiomi)
      const { error: lError } = await supabase.from('user_logs').insert([{ 
        profile_id: profileId, 
        media_id: media.id,
        status,
        current_progress: progress,
        rating,
        notes,
        is_favorite: isFavorite
      }]);

      if (lError) throw lError;
      onClose(); 
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-md my-auto p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-5">
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Adicionar à Lista</h2>
          <button onClick={() => setIsFavorite(!isFavorite)} className={`text-2xl transition-all ${isFavorite ? 'text-red-500 scale-125' : 'text-slate-600'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Categoria e Título */}
        <div className="space-y-3">
          <select className="w-full bg-slate-800 p-4 rounded-2xl text-white outline-none" value={category} onChange={(e) => { setCategory(e.target.value); setSuggestions([]); setSelectedMedia(null); }}>
            <option value="manga">📖 Mangá / Manhwa</option>
            <option value="anime">⛩️ Anime</option>
            <option value="movie">🎬 Filme</option>
            <option value="tv">📺 Série</option>
            <option value="fanfic">✍️ Fanfic</option>
          </select>

          <div className="relative">
            <input className="w-full bg-slate-800 p-4 rounded-2xl text-white outline-none ring-blue-500 focus:ring-2" placeholder="Nome da obra..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-2xl mt-2 overflow-hidden z-50">
                {suggestions.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelectedMedia(s); setQuery(s.title); setSuggestions([]); }} className="w-full p-4 flex items-center gap-3 hover:bg-slate-700 border-b border-slate-700 last:border-0">
                    <img src={s.image} className="w-10 h-14 object-cover rounded-lg" />
                    <span className="text-sm font-medium text-white">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status e Progresso */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-2xl">
          {['Planejado', 'Lendo', 'Visto'].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${status === s ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{s}</button>
          ))}
        </div>

        <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl">
          <span className="text-sm text-slate-400">Progresso (Cap/Ep)</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setProgress(Math.max(0, progress - 1))} className="w-8 h-8 bg-slate-700 rounded-full">-</button>
            <span className="font-bold text-blue-400 min-w-[20px] text-center">{progress}</span>
            <button onClick={() => setProgress(progress + 1)} className="w-8 h-8 bg-slate-700 rounded-full">+</button>
          </div>
        </div>

        {/* Rating e Link */}
        <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl">
          <span className="text-sm text-slate-400">Nota</span>
          <div className="flex gap-1 text-yellow-500">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setRating(i)} className="text-xl">{rating >= i ? '★' : '☆'}</button>
            ))}
          </div>
        </div>

        <input className="w-full bg-slate-800/50 p-4 rounded-2xl text-white text-xs outline-none border border-slate-800" placeholder="Link (ex: Wattpad, Crunchyroll, Scan)" value={url} onChange={(e) => setUrl(e.target.value)} />

        {/* Anotações */}
        <textarea className="w-full bg-slate-800 p-4 rounded-2xl text-white text-sm outline-none border border-slate-800 min-h-[80px]" placeholder="Anotações pessoais..." value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-800 rounded-2xl font-bold text-slate-400">Voltar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 p-4 bg-blue-600 rounded-2xl font-bold text-white disabled:opacity-50 shadow-lg shadow-blue-900/40">
            {loading ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}