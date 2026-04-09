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
}

export default function AddMediaModal({ profileId, onClose, itemToEdit = null }: { profileId: string; onClose: () => void; itemToEdit?: MediaItem | null }) {
  const [query, setQuery] = useState(itemToEdit?.medias?.title || '');
  const [category, setCategory] = useState(itemToEdit?.medias?.category || 'manga');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [status, setStatus] = useState(itemToEdit?.status || 'Planejado');
  const [progress, setProgress] = useState(itemToEdit?.current_progress || 0);
  const [totalUnits, setTotalUnits] = useState(itemToEdit?.medias?.total_units || 0);
  const [rating, setRating] = useState(itemToEdit?.rating || 0);
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [isFavorite, setIsFavorite] = useState(itemToEdit?.is_favorite || false);
  const [imageUrl, setImageUrl] = useState(itemToEdit?.medias?.image_url || '');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isVideo = ['anime', 'movie', 'tv'].includes(category);
  const labelProgress = isVideo ? 'Episódio' : 'Capítulo';
  const labelAction = isVideo ? 'Assistindo' : 'Lendo';

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
      if (category === 'manga' || category === 'anime') {
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

  async function handleFileUpload(event: any) {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `covers/${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media-covers').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('media-covers').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error) {
      alert('Erro ao subir imagem');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!itemToEdit) return;
    if (!confirm("Remover da lista?")) return;
    setLoading(true);
    await supabase.from('user_logs').delete().eq('id', itemToEdit.id);
    onClose();
  }

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
        await supabase.from('medias').update({
          total_units: totalUnits, image_url: finalImage
        }).eq('id', mediaId);
      }

      const logData = { profile_id: profileId, media_id: mediaId, status, current_progress: progress, rating, notes, is_favorite: isFavorite };
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{itemToEdit ? 'Editar' : 'Adicionar'}</h2>
            {itemToEdit && <button onClick={handleDelete} className="text-red-500 p-2 bg-red-500/10 rounded-full">🗑️</button>}
          </div>
          <button onClick={() => setIsFavorite(!isFavorite)} className="text-2xl">{isFavorite ? '❤️' : '🤍'}</button>
        </div>

        <select className="w-full bg-slate-800 p-4 rounded-2xl outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="manga">📖 Mangá</option><option value="anime">⛩️ Anime</option>
          <option value="movie">🎬 Filme</option><option value="tv">📺 Série</option>
          <option value="fanfic">✍️ Fanfic</option>
        </select>

        <div className="relative">
          <input className="w-full bg-slate-800 p-4 rounded-2xl outline-none" placeholder="Nome..." value={query} onChange={(e) => { setQuery(e.target.value); setSelectedMedia(null); }} />
          {showSuggestions && suggestions.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
              <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-2xl mt-2 overflow-hidden z-50">
                {suggestions.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelectedMedia(s); setQuery(s.title); setImageUrl(s.image); setTotalUnits(s.total); setShowSuggestions(false); }} className="w-full p-4 flex items-center gap-3 hover:bg-slate-700 text-left border-b border-slate-700">
                    <img src={s.image} className="w-10 h-14 object-cover rounded-lg" />
                    <span className="text-sm font-medium">{s.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!selectedMedia && (
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 ml-2">Foto da Capa</label>
            <div className="flex gap-3 items-center">
              {imageUrl && <img src={imageUrl} className="w-12 h-16 object-cover rounded-lg" />}
              <label className="flex-1 bg-slate-800 border-2 border-dashed border-slate-700 p-3 rounded-2xl text-center cursor-pointer text-xs">
                {uploading ? 'Subindo...' : 'Escolher do Aparelho'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}

        <select className="w-full bg-slate-800 p-4 rounded-2xl outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Planejado">📅 Planejado</option>
          <option value={isVideo ? "Assistindo" : "Lendo"}>{isVideo ? "📺 Assistindo" : "📖 Lendo"}</option>
          <option value="Concluído">✅ Concluído</option>
          <option value="Pausado">⏸️ Pausado</option>
          <option value="Dropado">🗑️ Dropado</option>
        </select>

        <div className="bg-slate-800/40 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">{labelProgress} Atual</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setProgress(Math.max(0, progress - 1))} className="w-10 h-10 bg-slate-700 rounded-full font-bold">-</button>
              <span className="font-bold text-blue-400 text-lg w-6 text-center">{progress}</span>
              <button onClick={() => { if (totalUnits > 0 && progress >= totalUnits) return; setProgress(progress + 1); }} className="w-10 h-10 bg-slate-700 rounded-full font-bold">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-slate-700 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total de {labelProgress}s</span>
            <input type="number" className="bg-transparent text-right font-bold text-blue-200 outline-none w-16" value={totalUnits} onChange={(e) => setTotalUnits(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl">
          <span className="text-sm text-slate-400">Nota</span>
          <div className="flex gap-1 text-yellow-500 text-xl">
            {[1, 2, 3, 4, 5].map(i => <button key={i} onClick={() => setRating(i)}>{rating >= i ? '★' : '☆'}</button>)}
          </div>
        </div>
        {/* SEÇÃO DE NOTAS / DESCRIÇÃO */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-2">
            Anotações / Descrição
          </label>
          <textarea
            className="w-full bg-slate-800/40 p-4 rounded-2xl text-sm outline-none border border-slate-800 focus:border-blue-500/50 min-h-[100px] resize-none transition-all text-slate-200"
            placeholder="O que achou desta obra? Algum detalhe importante..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-800 rounded-2xl font-bold text-slate-400 text-sm">Voltar</button>
          <button onClick={handleSave} disabled={loading || uploading} className="flex-1 p-4 bg-blue-600 rounded-2xl font-bold text-sm shadow-lg">
            {loading ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}