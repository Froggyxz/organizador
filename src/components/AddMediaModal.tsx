'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AddMediaModalProps {
  profileId: string;
  onClose: () => void;
}

interface MediaItem {
  external_id: number;
  title: string;
  image: string | null;
  year: string | number | undefined;
}

export default function AddMediaModal({ profileId, onClose }: AddMediaModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('manga'); // manga, anime, movie, tv, fanfic
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2 && !selectedMedia && category !== 'fanfic') {
        handleSearch(query);
      } else {
        setSuggestions([]);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [query, category]);

  async function handleSearch(q: string) {
    try {
      let results = [];
      
      // LÓGICA JIKAN (ANIME/MANGA)
      if (category === 'anime' || category === 'manga') {
        const resp = await fetch(`https://api.jikan.moe/v4/${category}?q=${q}&limit=5`);
        const json = await resp.json();
        results = json.data?.map((item: any) => ({
          external_id: item.mal_id,
          title: item.title,
          image: item.images?.jpg?.image_url,
          year: item.year || item.published?.prop?.from?.year
        })) || [];
      } 
      
      // LÓGICA TMDB (FILME/SERIE)
      else if (category === 'movie' || category === 'tv') {
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_TOKEN}`
          }
        };
        const resp = await fetch(`https://api.themoviedb.org/3/search/${category}?query=${encodeURIComponent(q)}&language=pt-BR`, options);
        const json = await resp.json();
        results = json.results?.slice(0, 5).map((item: any) => ({
          external_id: item.id,
          title: item.title || item.name,
          image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
          year: (item.release_date || item.first_air_date)?.split('-')[0]
        })) || [];
      }

      setSuggestions(results);
    } catch (err) {
      console.error("Erro na busca:", err);
    }
  }

  async function handleSave() {
    setLoading(true);
    const finalTitle = selectedMedia ? selectedMedia.title : query;
    const finalImage = selectedMedia ? selectedMedia.image : null;

    const { data: media } = await supabase
      .from('medias')
      .insert([{ 
        title: finalTitle, 
        category, 
        image_url: finalImage,
        url: url,
        is_custom: !selectedMedia 
      }])
      .select().single();

    if (media) {
      await supabase.from('user_logs').insert([{
        profile_id: profileId,
        media_id: media.id,
        status: 'Planejado'
      }]);
      onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <div className="bg-slate-900 w-full max-w-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-5">Adicionar à Lista</h2>

        <select 
          className="w-full bg-slate-800 p-3 rounded-xl mb-4 text-white border border-slate-700"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setSuggestions([]); setSelectedMedia(null); }}
        >
          <option value="manga">📖 Mangá / Manhwa</option>
          <option value="anime">⛩️ Anime</option>
          <option value="movie">🎬 Filme</option>
          <option value="tv">📺 Série / TV</option>
          <option value="fanfic">✍️ Fanfic</option>
        </select>

        <div className="relative">
          <input 
            className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 ring-blue-500 transition-all"
            placeholder={category === 'fanfic' ? "Título da Fanfic..." : "Buscar título..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }}
          />

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-xl mt-2 overflow-hidden shadow-2xl z-50">
              {suggestions.map((item) => (
                <button
                  key={item.external_id}
                  onClick={() => { setSelectedMedia(item); setQuery(item.title); setSuggestions([]); }}
                  className="w-full p-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                >
                  {item.image && <img src={item.image} className="w-10 h-14 object-cover rounded shadow" />}
                  <div>
                    <p className="text-sm text-white font-medium line-clamp-1">{item.title}</p>
                    <p className="text-[10px] text-slate-400">{item.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">Link Opcional</label>
          <input 
            className="w-full bg-slate-800/50 p-3 rounded-xl mt-1 text-white text-sm border border-slate-800 focus:border-slate-600 outline-none"
            placeholder="Cole o link (Site de leitura, Wattpad, etc)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-800 text-slate-300 rounded-2xl font-medium">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={loading || query.length < 2}
            className="flex-1 p-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}