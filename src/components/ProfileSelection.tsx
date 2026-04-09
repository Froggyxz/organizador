'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '../context/profilecontext'; // Ajuste conforme seu contexto
import EditProfileModal from './EditProfileModal';

export default function ProfileSelection() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const { setProfile } = useProfile();
  const [editingProfile, setEditingProfile] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-white mb-12">Quem está usando?</h1>
      
      <div className="flex flex-wrap justify-center gap-8">
        {profiles.map((p: any) => (
          <div key={p.id} className="relative group">
            <button 
              onClick={() => setProfile(p)}
              className="flex flex-col items-center gap-3 transition-transform active:scale-95"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-transparent group-hover:border-blue-500 transition-all shadow-xl">
                <img 
                  src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=random`} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-slate-400 group-hover:text-white transition-colors">
                {p.name}
              </span>
            </button>

            {/* Botão para Editar Perfil */}
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }}
              className="absolute top-0 right-0 bg-slate-800 p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
            >
              ✏️
            </button>
          </div>
        ))}
      </div>

      {editingProfile && (
        <EditProfileModal 
          profile={editingProfile} 
          onClose={() => setEditingProfile(null)} 
          onUpdate={fetchProfiles} 
        />
      )}
    </div>
  );
}