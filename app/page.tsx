'use client';
import { useProfile } from '../src/context/profilecontext';
import { useState, useEffect } from 'react';
import Dashboard from '../src/components/Dashboard';

export default function Home() {
  const { activeProfile, setProfile } = useProfile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <h1 className="text-3xl font-bold mb-12 tracking-tight">Quem está usando?</h1>
        <div className="grid grid-cols-2 gap-8 w-full max-w-md">
          <button onClick={() => setProfile({ id: '6a542cce-4d0d-46c9-85b8-10eff976d329', name: 'isntnsoopy' })} className="flex flex-col items-center gap-4 group">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg group-active:scale-90 transition-all">🐶</div>
            <span className="font-medium text-blue-400">isntnsoopy</span>
          </button>
          <button onClick={() => setProfile({ id: 'eb51c3be-4f14-4cab-81a6-dff7469b8404', name: 'omiomi' })} className="flex flex-col items-center gap-4 group">
            <div className="w-24 h-24 bg-pink-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg group-active:scale-90 transition-all">🌸</div>
            <span className="font-medium text-pink-400">omiomi</span>
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}