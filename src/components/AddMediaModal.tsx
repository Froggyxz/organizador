'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: any | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- ESTADOS DE MÍDIA E BUSCA ---
  const [query, setQuery] = useState(itemToEdit?.medias?.title || '');
  const [category, setCategory] = useState(itemToEdit?.medias?.category || 'manga');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(itemToEdit?.medias?.external_id ? { id: itemToEdit.medias.external_id } : null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageUrl, setImageUrl] = useState(itemToEdit?.medias?.image_url || '');

  // --- ESTADOS DE PROGRESSO E STATUS ---
  const [status, setStatus] = useState(itemToEdit?.status || 'Planejado');
  const [progress, setProgress] = useState<string | number>(itemToEdit?.current_progress || 0);
  const [season, setSeason] = useState<number>(itemToEdit?.season || 1);
  const [totalUnits, setTotalUnits] = useState(itemToEdit?.medias?.total_units || 0);
  const [rating, setRating] = useState<string | number>(itemToEdit?.rating || 0);
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [isFavorite, setIsFavorite] = useState(itemToEdit?.is_favorite || false);

  // --- ESTADOS DE CONTROLE ---
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAiring, setIsAiring] = useState(false);

  // --- LÓGICA DE INTERFACE ---
  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const isMovie = category === 'movie';
  const hasSeasons = ['tv', 'anime'].includes(category);
  const labelProgress = category === 'manga' ? 'Cap' : category === 'book' ? 'Pág' : 'Ep';

  // Debounce para busca nas APIs
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 2 && !selectedMedia && category !== 'fanfic' && !itemToEdit) handleSearch(query);
      else setSuggestions([]);
    }, 800);
    return () => clearTimeout(delay);
  }, [query, category]);

  // Reatividade para temporadas
  useEffect(() => {
    if (hasSeasons && selectedMedia?.id) {
      updateMediaDetails(selectedMedia.id, season);
    }
  }, [season, category]);

  // --- FUNÇÕES DE BUSCA ---
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
      setIsAiring(seriesData.status === 'Returning Series' || seriesData.status === 'In Production');

      const seasonResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}/season/${seasonNum}?language=pt-BR`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const seasonData = await seasonResp.json();
      if (seasonData.episodes) {
        const today = new Date();
        const aired = seasonData.episodes.filter((ep: any) => !ep.air_date || new Date(ep.air_date) <= today);
        setTotalUnits(isAiring ? aired.length : seasonData.episodes.length);
      }
    } catch (e) { console.error("Erro sincronização:", e); }
  }

  async function handleSelectSuggestion(s: any) {
    setQuery(s.title);
    setImageUrl(s.image);
    setShowSuggestions(false);
    setSelectedMedia(s);
    if (hasSeasons) { setSeason(1); updateMediaDetails(s.id, 1); }
    else { setTotalUnits(s.total || 0); }
  }

  // --- UPLOAD DE IMAGEM ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media-covers').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('media-covers').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      setSelectedMedia(null);
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  // --- SALVAR E EXCLUIR ---
  async function handleSave() {
    if (!query) return;
    setLoading(true);
    try {
      let mediaId = itemToEdit?.media_id;
      if (!itemToEdit) {
        const { data: media, error: mError } = await supabase.from('medias').insert([{
          title: selectedMedia?.title || query,
          category, image_url: imageUrl, 
          total_units: isMovie ? 1 : Number(totalUnits), 
          is_custom: !selectedMedia,
          external_id: selectedMedia?.id?.toString()
        }]).select().single();
        if (mError) throw mError;
        mediaId = media.id;
      }
      
      const logData = { 
        profile_id: profileId, 
        media_id: mediaId, 
        status, 
        current_progress: isMovie ? (status === 'Concluído' ? 1 : 0) : Number(progress), 
        rating: Number(rating), 
        season: isMovie ? 1 : Number(season), 
        notes, 
        is_favorite: isFavorite 
      };

      const { error: lError } = itemToEdit 
        ? await supabase.from('user_logs').update(logData).eq('id', itemToEdit.id)
        : await supabase.from('user_logs').insert([logData]);
      if (lError) throw lError;
      onClose();
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col justify-end backdrop-blur-md">
      <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" onClick={onClose} />
      <div className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 space-y-6 max-h-[94vh] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-800 relative">
        
        {/* HEADER COM PREVIEW E FAVORITO */}
        <div className="flex justify-between items-start gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img src={imageUrl || 'https://via.placeholder.com/150x220?text=Upload'} className={`w-20 h-28 object-cover rounded-2xl border border-white/5 shadow-xl ${uploading ? 'opacity-50 animate-pulse' : ''}`} alt="" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-2xl transition-all">
              <span className="text-[9px] font-black text-white uppercase">Mudar Capa</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-black text-white leading-tight">{itemToEdit ? 'Editar Obra' : 'Nova Obra'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{category}</span>
              {isAiring && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full animate-pulse">lançando</span>}
            </div>
          </div>

          <button onClick={() => setIsFavorite(!isFavorite)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFavorite ? 'bg-pink-500/10 text-pink-500' : 'bg-slate-800 text-slate-500'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* SELETOR DE CATEGORIA */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['book', 'manga', 'anime', 'movie', 'tv', 'fanfic'].map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSelectedMedia(null); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${category === cat ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* BUSCA / TÍTULO */}
        <div className="relative z-[110]">
          <input className="w-full bg-slate-800/50 p-5 rounded-2xl outline-none border border-slate-800 focus:border-blue-500/50 text-white font-bold placeholder:text-slate-600" placeholder="Pesquisar ou digitar título..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[110%] left-0 w-full bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 z-[120] max-h-60 overflow-y-auto no-scrollbar">
              {suggestions.map((s: any) => (
                <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-4 flex items-center gap-4 hover:bg-blue-600/20 border-b border-white/5 text-left">
                  <img src={s.image || 'https://via.placeholder.com/40x60'} className="w-10 h-14 object-cover rounded-lg shadow-md" alt="" />
                  <span className="text-sm font-bold text-slate-100 truncate">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STATUS */}
        <div className="grid grid-cols-3 gap-2">
          {['Planejado', isVideo ? 'Assistindo' : 'Lendo', 'Concluído'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`p-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${status === s ? 'bg-slate-100 border-white text-slate-950' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* PROGRESSO E NOTA (DINÂMICO PARA FILME) */}
        <div className="grid grid-cols-2 gap-4">
          {!isMovie && (
            <>
              {hasSeasons && (
                <div className="bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Temp</span>
                  <input type="number" className="bg-transparent text-2xl font-black text-blue-400 text-center outline-none w-full" value={season} min="1" onChange={(e) => setSeason(Number(e.target.value))} />
                </div>
              )}
              <div className={`bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center ${!hasSeasons ? 'col-span-1' : ''}`}>
                <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{labelProgress} Atual</span>
                <input type="number" className="bg-transparent text-2xl font-black text-blue-400 text-center outline-none w-full" value={progress} onChange={(e) => setProgress(e.target.value)} />
              </div>
            </>
          )}
          
          <div className={`bg-slate-800/30 p-5 rounded-[2rem] border border-slate-800/50 flex flex-col items-center ${isMovie ? 'col-span-2' : ''}`}>
            <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Sua Nota</span>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 text-xl">★</span>
              <input type="number" step="0.1" max="5" min="0" className="bg-transparent text-2xl font-black text-yellow-500 text-center outline-none w-20" value={rating} onChange={(e) => setRating(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ANOTAÇÕES */}
        <div className="space-y-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Minhas Impressões</span>
          <textarea className="w-full bg-slate-800/30 p-6 rounded-[2rem] text-sm text-slate-200 outline-none border border-slate-800/50 h-28 resize-none font-medium placeholder:text-slate-700" placeholder="O que achou?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* BOTÃO SALVAR */}
        <button onClick={handleSave} disabled={loading || uploading} className="w-full p-6 rounded-[2rem] font-black uppercase text-[11px] bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50">
          {loading ? 'Processando...' : uploading ? 'Subindo Imagem...' : itemToEdit ? 'Atualizar Obra' : 'Salvar na Lista'}
        </button>
      </div>
    </div>
  );
}