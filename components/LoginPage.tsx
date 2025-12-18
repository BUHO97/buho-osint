import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulated network delay for effect
    setTimeout(() => {
      // Simple hardcoded check for demo purposes
      // In a real app, this would hit an auth endpoint
      if ((username.toLowerCase() === 'admin' && password === 'osint') || 
          (username.toLowerCase() === 'buho' && password === '1234')) {
        onLogin();
      } else {
        setError('CREDENCIALES INVÁLIDAS // ACCESO DENEGADO');
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-mono flex items-center justify-center">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')] opacity-[0.03] mix-blend-overlay"></div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="mb-8 text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                BUHO <span className="text-cyan-500">OSINT</span>
            </h1>
            <p className="text-xs text-slate-500 tracking-[0.2em] uppercase">Sistema de Inteligencia Digital</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-8 rounded-lg shadow-2xl relative overflow-hidden group">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-500"></div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-700 pb-2">
                Credenciales de Acceso
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">Operador (Usuario)</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors rounded-sm"
                        placeholder="ADMIN"
                        autoComplete="off"
                    />
                </div>

                <div>
                    <label className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">Clave de Acceso</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors rounded-sm"
                        placeholder="•••••"
                    />
                </div>

                {error && (
                    <div className="text-red-500 text-xs font-bold bg-red-950/30 p-2 border border-red-900/50 text-center animate-pulse">
                        ⚠️ {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 text-xs font-bold tracking-widest uppercase transition-all duration-300 relative overflow-hidden
                        ${isLoading 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        }
                    `}
                >
                    {isLoading ? 'VERIFICANDO ENCRIPTACIÓN...' : 'INICIAR SESIÓN'}
                </button>
            </form>

            <div className="mt-6 text-center">
                 <p className="text-[9px] text-slate-600">
                    <span className="block mb-1">ACCESO RESTRINGIDO // SOLO PERSONAL AUTORIZADO</span>
                    <span className="font-mono text-slate-700">Hint: admin / osint OR buho / 1234</span>
                 </p>
            </div>
        </div>
        
        <div className="mt-8 text-center text-[10px] text-slate-600 font-mono">
            SECURE CONNECTION ESTABLISHED v1.2.0
        </div>
      </div>
    </div>
  );
};