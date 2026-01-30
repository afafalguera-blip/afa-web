import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Only for sign in
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
        const timer = setTimeout(() => {
            navigate('/botiga');
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            alert('Revisa el teu correu per confirmar el registre!');
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            // Navigation will be handled by useEffect
        }
    } catch (error: any) {
        setErrorMsg(error.message || 'Error autenticant');
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      try {
          const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                  redirectTo: window.location.origin + '/botiga'
              }
          });
          if (error) throw error;
      } catch (error: any) {
          setErrorMsg(error.message);
      }
  };

  if (user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-slate-700">Ja has iniciat sessió!</h2>
                <p className="text-slate-500">Et redirigim a la botiga...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary mb-2">Benvinguts a l'AFA</h1>
            <p className="text-slate-500">{isSignUp ? 'Crea un compte' : 'Inicia sessió'}</p>
        </div>

        {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {errorMsg}
            </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                    type="email" 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contrasenya</label>
                <input 
                    type="password" 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors"
            >
                {loading ? 'Carregant...' : isSignUp ? 'Registrar-se' : 'Iniciar Sessió'}
            </button>
        </form>

        <div className="my-6 flex items-center justify-between">
            <span className="h-px bg-slate-200 flex-1"></span>
            <span className="px-4 text-xs text-slate-400 font-bold uppercase">O continuar amb</span>
            <span className="h-px bg-slate-200 flex-1"></span>
        </div>

        <button 
            onClick={handleGoogleLogin}
            className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-500">
            {isSignUp ? 'Ja tens compte?' : 'No tens compte?'}
            <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 text-primary font-bold hover:underline"
            >
                {isSignUp ? 'Inicia Sessió' : 'Registra\'t'}
            </button>
        </p>
      </div>
    </div>
  );
}
