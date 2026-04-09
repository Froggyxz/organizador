'use client';
import { useProfile } from '../src/context/profilecontext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Dashboard from '../src/components/Dashboard';
import EditProfileModal from '../src/components/EditProfileModal';

export default function Home() {
  const { activeProfile, setProfile } = useProfile();
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Garante que o componente só renderize no cliente (evita erro de hidratação)
  useEffect(() => {
    setMounted(true);
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('name');
    setProfiles(data || []);
    setLoading(false);
  }

  if (!mounted) return null;

  // Tela de Seleção de Perfil
  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-black tracking-tighter mb-2">TRACKER</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Quem está usando?</p>
        </header>

        {loading ? (
          <div className="animate-pulse text-slate-600 font-bold uppercase text-xs">Carregando perfis...</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-12 gap-y-10 w-full max-w-sm">
            {profiles.map((p) => (
              <div key={p.id} className="relative group">
                {/* Botão Principal de Seleção */}
                <button 
                  onClick={() => setProfile(p)} 
                  className="flex flex-col items-center gap-4 w-full transition-all active:scale-90"
                >
                  <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-transparent group-hover:border-blue-600 transition-all">
                    <img 
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=0f172a&color=fff`} 
                      className="w-full h-full object-cover"
                      alt={p.name}
                    />
                  </div>
                  <span className="font-bold text-slate-400 group-hover:text-white text-sm transition-colors">
                    {p.name}
                  </span>
                </button>

                {/* Botão de Edição (✏️) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }}
                  className="absolute -top-2 -right-2 bg-slate-800 p-2 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors shadow-lg"
                >
                  <span className="text-[10px]">✏️</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Edição de Perfil */}
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

  // Se houver um perfil ativo, mostra o Dashboard
  return <Dashboard />;
}