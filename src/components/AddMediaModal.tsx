'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: any | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lógica de UI condicional
  const isMovie = category === 'movie';
  const hasSeasons = ['tv', 'anime'].includes(category);
  const labelProgress = category === 'manga' ? 'Cap' : category === 'book' ? 'Pág' : 'Ep';

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-covers')
        .upload(filePath, file);

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

  async function handleSave() {
    if (!query) return;
    setLoading(true);
    try {
      let mediaId = itemToEdit?.media_id;
      if (!itemToEdit) {
        const { data: media, error: mError } = await supabase.from('medias').insert([{
          title: query,
          category, 
          image_url: imageUrl, 
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
    } catch (e: any) { alert("Erro: " + e.message); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[100] flex flex-col justify-end backdrop-blur-md">
      <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" onClick={onClose} />
      <div className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 space-y-6 max-h-[94vh] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-800 relative">
        
        {/* HEADER COM UPLOAD */}
        <div className="flex gap-4 items-start">
          <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
            <img src={imageUrl || 'https://via.placeholder.com/150x220?text=Capa'} className={`w-20 h-28 object-cover rounded-xl shadow-xl border border-white/5 ${uploading ? 'opacity-40' : ''}`} alt="Capa" />
            {uploading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

          <div className="flex-1">
            <h2 className="text-xl font-black text-white">{itemToEdit ? 'Editar' : 'Novo'}</h2>
            <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{category}</span>
            <div className="mt-3 flex gap-2">
               <button onClick={() => setIsFavorite(!isFavorite)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isFavorite ? 'bg-pink-500/10 text-pink-500' : 'bg-slate-800 text-slate-500'}`}>
                {isFavorite ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </div>

        {/* BUSCA */}
        <input className="w-full bg-slate-800/50 p-4 rounded-2xl outline-none border border-slate-800 text-white font-bold" placeholder="Título..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {suggestions.map((s: any) => (
              <button key={s.id} onClick={() => { setQuery(s.title); setImageUrl(s.image); setShowSuggestions(false); setSelectedMedia(s); if(!isMovie) setTotalUnits(s.total || 0); }} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-left text-white text-sm font-bold">
                <img src={s.image} className="w-8 h-10 object-cover rounded-md" /> {s.title}
              </button>
            ))}
          </div>
        )}

        {/* STATUS */}
        <div className="grid grid-cols-3 gap-2">
          {['Planejado', isMovie ? 'Assistindo' : (['anime', 'tv'].includes(category) ? 'Assistindo' : 'Lendo'), 'Concluído'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`p-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${status === s ? 'bg-white text-slate-950 border-white' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* INPUTS CONDICIONAIS: Só mostra progresso se NÃO for filme */}
        <div className="grid grid-cols-2 gap-3">
          {!isMovie && (
            <>
              {hasSeasons && (
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Temporada</span>
                  <input type="number" className="bg-transparent text-xl font-black text-blue-400 w-full outline-none" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
                </div>
              )}
              <div className={`bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50 ${!hasSeasons ? 'col-span-2' : ''}`}>
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">{labelProgress} Atual</span>
                <input type="number" className="bg-transparent text-xl font-black text-blue-400 w-full outline-none" value={progress} onChange={(e) => setProgress(e.target.value)} />
              </div>
            </>
          )}

          {/* Nota sempre aparece, mas ocupa as duas colunas se for filme */}
          <div className={`bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50 ${isMovie ? 'col-span-2' : ''}`}>
            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Nota (0-5)</span>
            <input type="number" step="0.1" className="bg-transparent text-xl font-black text-yellow-500 w-full outline-none" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || uploading} className="w-full p-6 rounded-3xl font-black uppercase text-[12px] bg-blue-600 text-white active:scale-95 transition-all disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}