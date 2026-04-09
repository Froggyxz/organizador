'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditProfileModal({ profile, onClose, onUpdate }: { profile: any; onClose: () => void; onUpdate: () => void }) {
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [uploading, setUploading] = useState(false);

  async function handleAvatarUpload(event: any) {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media-covers').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('media-covers').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      alert('Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    try {
      await supabase.from('profiles').update({ name, avatar_url: avatarUrl }).eq('id', profile.id);
      onUpdate();
      onClose();
    } catch (e) { alert("Erro ao atualizar"); }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-sm p-8 rounded-[2.5rem] border border-slate-800 space-y-6 text-white text-center">
        <h2 className="text-xl font-bold">Editar Perfil</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img src={avatarUrl || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-full object-cover border-4 border-slate-800" />
            <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full cursor-pointer">
              📷<input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
        </div>
        <input className="w-full bg-slate-800 p-4 rounded-2xl text-center outline-none" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-800 rounded-2xl font-bold">Sair</button>
          <button onClick={handleSave} disabled={uploading} className="flex-1 p-4 bg-blue-600 rounded-2xl font-bold">Salvar</button>
        </div>
      </div>
    </div>
  );
}