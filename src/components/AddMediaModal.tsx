'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: any | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS ---
  const [query, setQuery] = useState(itemToEdit?.medias?.title || '');
  const [category, setCategory] = useState(itemToEdit?.medias?.category || 'manga');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(itemToEdit?.medias?.external_id ? { id: itemToEdit.medias.external_id } : null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageUrl, setImageUrl] = useState(itemToEdit?.medias?.image_url || '');
  const [status, setStatus] = useState(itemToEdit?.status || 'Planejado');
  const [progress, setProgress] = useState<string | number>(itemToEdit?.current_progress || 0);
  const [season, setSeason] = useState<number>(itemToEdit?.season || 1);
  const [totalUnits, setTotalUnits] = useState(itemToEdit?.medias?.total_units || 0);
  const [rating, setRating] = useState<string | number>(itemToEdit?.rating || 0);
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [isFavorite, setIsFavorite] = useState(itemToEdit?.is_favorite || false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAiring, setIsAiring] = useState(false);

  // --- LÓGICA DE UI ---
  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const isMovie = category === 'movie';
  const hasSeasons = ['tv', 'anime'].includes(category);
  const labelProgress = category === 'manga' ? 'Cap' : category === 'book' ? 'Pág' : 'Ep';

  // --- REATIVIDADE DE TEMPORADAS (A FUNCIONALIDADE NOVA) ---
  useEffect(() => {
    if (hasSeasons && (selectedMedia?.id || itemToEdit?.medias?.external_id)) {
      updateMediaDetails(selectedMedia?.id || itemToEdit?.medias?.external_id, season);
    }
  }, [season, category, selectedMedia]);

  async function updateMediaDetails(externalId: string | number, seasonNum: number) {
    try {
      const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
      const seriesResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}?language=pt-BR`, { headers: { Authorization: `Bearer ${token}` } });
      const seriesData = await seriesResp.json();
      setIsAiring(seriesData.status === 'Returning Series' || seriesData.status === 'In Production');

      const seasonResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}/season/${seasonNum}?language=pt-BR`, { headers: { Authorization: `Bearer ${token}` } });
      const seasonData = await seasonResp.json();
      if (seasonData.episodes) {
        const today = new Date();
        const aired = seasonData.episodes.filter((ep: any) => !ep.air_date || new Date(ep.air_date) <= today);
        setTotalUnits(seriesData.status === 'Returning Series' ? aired.length : seasonData.episodes.length);
      }
    } catch (e) { console.error(e); }
  }

  // --- BUSCA E UPLOAD ---
  async function handleSearch(q: string) {
    try {
      const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
      let results = [];
      if (category === 'book') {
        const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`);
        const json = await resp.json();
        results = json.items?.map((m: any) => ({
          id: m.id, title: m.volumeInfo.title, image: m.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'), total: m.volumeInfo.pageCount || 0
        }));
      } else {
        const type = isMovie ? 'movie' : 'tv';
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('media-covers').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('media-covers').getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
      setSelectedMedia(null);
    } catch (error: any) { alert(error.message); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    try {
      setLoading(true);
      if (!query.trim()) return alert('Título vazio!');
      let mediaId = itemToEdit?.media_id ?? itemToEdit?.medias?.id ?? null;

      const mediaPayload = {
        title: query.trim(), category, image_url: imageUrl,
        external_id: selectedMedia?.id?.toString() ?? itemToEdit?.medias?.external_id ?? null,
        total_units: Number(totalUnits)
      };

      if (mediaId) {
        await supabase.from('medias').update(mediaPayload).eq('id', mediaId);
      } else {
        const { data: createdMedia, error: mError } = await supabase.from('medias').insert(mediaPayload).select('id').single();
        if (mError) throw mError;
        mediaId = createdMedia.id;
      }

      const logData = {
        profile_id: profileId, media_id: mediaId, status,
        current_progress: Number(progress), season: Number(season),
        rating: Number(rating), notes, is_favorite: isFavorite
      };

      const { error: lError } = itemToEdit?.id 
        ? await supabase.from('profile_media').update(logData).eq('id', itemToEdit.id)
        : await supabase.from('profile_media').insert(logData);

      if (lError) throw lError;
      onClose();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col justify-end backdrop-blur-md" onClick={onClose}>
      <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" />
      
      <div ref={modalContentRef} className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 space-y-6 max-h-[94vh] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-800 relative" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER COM O VISUAL ORIGINAL (COMPACTO) */}
        <div className="flex gap-4 items-start">
          <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
            <img src={imageUrl || 'https://via.placeholder.com/150x220?text=Capa'} className={`w-20 h-28 object-cover rounded-xl shadow-xl border border-white/5 ${uploading ? 'opacity-40' : ''}`} alt="Capa" />
            {uploading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

          <div className="flex-1">
            <h2 className="text-xl font-black text-white">{itemToEdit ? 'Editar' : 'Novo'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{category}</span>
              {isAiring && <span className="text-[9px] font-black text-emerald-500 uppercase animate-pulse">Lançando</span>}
            </div>
            <div className="mt-3 flex gap-2">
               <button onClick={() => setIsFavorite(!isFavorite)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isFavorite ? 'bg-pink-500/10 text-pink-500' : 'bg-slate-800 text-slate-500'}`}>
                {isFavorite ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORIAS - O FILTRO HORIZONTAL */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['book', 'manga', 'anime', 'movie', 'tv', 'fanfic'].map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSelectedMedia(null); }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${category === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* BUSCA COM O VISUAL ORIGINAL */}
        <div className="relative">
          <input className="w-full bg-slate-800/50 p-4 rounded-2xl outline-none border border-slate-800 text-white font-bold" placeholder="Título..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[110%] left-0 w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-white/5 z-[120]">
              {suggestions.map((s: any) => (
                <button key={s.id} onClick={() => { setQuery(s.title); setImageUrl(s.image); setShowSuggestions(false); setSelectedMedia(s); if(!isMovie) setTotalUnits(s.total || 0); }} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-left text-white text-sm font-bold">
                  <img src={s.image} className="w-8 h-10 object-cover rounded-md" /> {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STATUS GRID (O QUADRADINHO QUE VOCÊ GOSTA) */}
        <div className="grid grid-cols-3 gap-2">
          {['Planejado', isVideo ? 'Assistindo' : 'Lendo', 'Concluído'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`p-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${status === s ? 'bg-white text-slate-950 border-white' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* INPUTS DE PROGRESSO E NOTA (REATIVO) */}
        <div className="grid grid-cols-2 gap-3">
          {!isMovie && (
            <>
              {hasSeasons && (
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Temp</span>
                  <input type="number" className="bg-transparent text-xl font-black text-blue-400 w-full outline-none" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
                </div>
              )}
              <div className={`bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50 ${!hasSeasons ? 'col-span-1' : ''}`}>
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">{labelProgress}</span>
                <input type="number" className="bg-transparent text-xl font-black text-blue-400 w-full outline-none" value={progress} onChange={(e) => setProgress(e.target.value)} />
              </div>
            </>
          )}
          <div className={`bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50 ${isMovie ? 'col-span-2' : ''}`}>
            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Nota</span>
            <input type="number" step="0.1" className="bg-transparent text-xl font-black text-yellow-500 w-full outline-none" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>

        {/* NOTAS */}
        <textarea className="w-full bg-slate-800/30 p-4 rounded-2xl text-sm text-slate-200 outline-none border border-slate-800/50 h-24 resize-none" placeholder="Anotações..." value={notes} onChange={(e) => setNotes(e.target.value)} />

        <button onClick={handleSave} disabled={loading || uploading} className="w-full p-6 rounded-3xl font-black uppercase text-[12px] bg-blue-600 text-white active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-blue-600/10">
          {loading ? 'Salvando...' : 'Salvar na Lista'}
        </button>
      </div>
    </div>
  );
}