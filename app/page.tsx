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

  useEffect(() => {
    setMounted(true);
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error("Erro ao buscar perfis:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
            TRACKER
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
            Quem está usando?
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Carregando...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-12 gap-y-12 w-full max-w-sm">
            {profiles.map((p) => (
              <div key={p.id} className="relative group">
                <button 
                  onClick={() => setProfile(p)} 
                  className="flex flex-col items-center gap-5 w-full transition-all active:scale-95"
                >
                  <div className="relative">
                    <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-transparent group-hover:border-blue-600 group-hover:scale-105 transition-all duration-300">
                      <img 
                        src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=0f172a&color=fff`} 
                        className="w-full h-full object-cover"
                        alt={p.name}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-slate-500 group-hover:text-white text-sm transition-colors tracking-tight">
                    {p.name}
                  </span>
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }}
                  className="absolute -top-2 -right-2 bg-slate-900 p-2.5 rounded-full border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all shadow-xl z-10"
                >
                  <span className="text-[10px] grayscale group-hover:grayscale-0">✏️</span>
                </button>
              </div>
            ))}
            
            {/* Botão de Feedback caso esteja vazio */}
            {profiles.length === 0 && (
              <div className="col-span-2 text-center py-10 border-2 border-dashed border-slate-900 rounded-[2.5rem]">
                <p className="text-slate-600 text-xs font-bold uppercase mb-4">Nenhum perfil criado</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-blue-500 text-[10px] font-black uppercase tracking-widest"
                >
                  Atualizar Página
                </button>
              </div>
            )}
          </div>
        )}

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

  return <Dashboard />;
}