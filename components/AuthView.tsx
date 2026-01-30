
import React, { useState } from 'react';
import { server } from '../services';
import { Popup } from '../types';

interface AuthViewProps {
  popups?: Popup[];
}

const AuthView: React.FC<AuthViewProps> = ({ popups = [] }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    if (isRegister) {
      server.register(username, password);
    } else {
      server.login(username, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
       {/* Background Effects */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-900 to-black z-0"></div>
       <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
       <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

       {/* Popups Layer */}
       <div className="absolute top-10 left-0 right-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
          {popups.map((p) => (
              <div key={p.id} className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl animate-fade-in-up">
                  {p.icon && <span className="text-lg">{p.icon}</span>}
                  <span className="font-medium text-sm">{p.text}</span>
              </div>
          ))}
       </div>

       <div className="w-full max-w-sm bg-gray-800/60 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10 animate-bounce-in">
          <div className="text-center mb-8">
            <div className="text-5xl mb-2">🌍</div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              EcoExplore
            </h1>
            <p className="text-gray-400 text-sm mt-1">开始你的荒野生存之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">用户名</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600"
                placeholder="你的名字..."
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-600"
                placeholder="••••••"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/50 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
            >
              {isRegister ? '注册并开始' : '登 录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-gray-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              {isRegister ? '已有账号? 去登录' : '没有账号? 注册一个'}
            </button>
          </div>
       </div>
    </div>
  );
};

export default AuthView;
