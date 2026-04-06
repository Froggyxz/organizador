'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '../context/profilecontext';
import AddMediaModal from './AddMediaModal';

export default function Dashboard() {
  const { activeProfile, setProfile } = useProfile();
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { if (activeProfile) fetchList(); }, [activeProfile]);

  async function fetchList() {
    const { data } = await supabase
      .from('user_logs')
      .select('*, medias(*)')
      .eq('profile_id', activeProfile?.id)
      .order('updated_at', { ascending: false });
    setItems(data || []);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <header className="flex justify-between items-center mb-8 px-2">
        <div>
          <h2 className="text-2xl font-bold">Olá, {activeProfile?.name}</h2>
          <p className="text-slate-500 text-sm">Sua lista de mídias</p>
        </div>
        <button onClick={() => setProfile(null)} className="p-2 bg-slate-800 rounded-lg text-xs">Sair</button>
      </header>

      <div className="grid gap-4">
        {items.map((item: any) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-4">
            {item.medias.image_url && <img src={item.medias.image_url} className="w-16 h-24 object-cover rounded-lg" />}
            <div className="flex-1">
              <h3 className="font-bold">{item.medias.title}</h3>
              <p className="text-xs text-blue-400 uppercase">{item.medias.category}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm px-2 py-0.5 bg-slate-800 rounded-md text-slate-300">{item.status}</span>
                {item.medias.url && <a href={item.medias.url} target="_blank" className="text-xs text-green-400 underline">Link 🔗</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-blue-500 rounded-full text-4xl shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform">+</button>
      {showModal && activeProfile?.id && <AddMediaModal profileId={activeProfile.id} onClose={() => { setShowModal(false); fetchList(); }} />}
    </div>
  );
}