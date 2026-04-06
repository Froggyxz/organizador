'use client';
import { useProfile } from '../src/context/profilecontext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Certifique-se de ter seu cliente supabase aqui
import AddMediaModal from '@/src/components/AddMediaModal';

export default function Home() {
  const { activeProfile, setProfile } = useProfile();
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Carregar dados do perfil ativo
  useEffect(() => {
    if (activeProfile) {
      fetchData();
    }
  }, [activeProfile]);

  async function fetchData() {
    if (!activeProfile) return;
    const { data } = await supabase
      .from('user_logs')
      .select('*, medias(*)')
      .eq('profile_id', activeProfile.id)
      .order('updated_at', { ascending: false });
    setItems(data || []);
  }

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <h1 className="text-3xl font-bold mb-10">Quem é você?</h1>
        <div className="flex gap-6">
          <button onClick={() => setProfile({id: 'ID-DO-SEU-PERFIL', name: 'Gabi'})} className="p-8 bg-blue-600 rounded-2xl text-xl font-bold active:scale-95 transition">Gabi</button>
          <button onClick={() => setProfile({id: 'ID-DA-AMIGA', name: 'Amiga'})} className="p-8 bg-pink-600 rounded-2xl text-xl font-bold active:scale-95 transition">Amiga</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Minha Lista ({activeProfile.name})</h1>
        <button onClick={() => setProfile(null)} className="text-xs text-slate-400 underline">Trocar Perfil</button>
      </header>

      {/* Listagem Estilo App */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
            <div>
              <p className="font-semibold">{item.medias.title}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{item.medias.category}</p>
            </div>
            <div className="text-right">
              <span className="text-green-400 text-sm">{item.status}</span>
              <p className="text-xs text-slate-400">Progresso: {item.current_progress}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Flutuante de + */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-green-500 rounded-full text-4xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50"
      >
        +
      </button>

      {showModal && <AddMediaModal profileId={activeProfile.id} onClose={() => { setShowModal(false); fetchData(); }} />}
    </div>
  );
}