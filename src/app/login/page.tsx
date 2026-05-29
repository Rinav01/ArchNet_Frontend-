'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  graphqlRequest, 
  LOGIN, 
  SIGNUP 
} from '@/lib/graphql/client';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/notificationStore';
import { 
  Lock, 
  Mail, 
  User, 
  Cpu, 
  Sparkles, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setIsOnline = useProjectStore((state) => state.setIsOnline);
  
  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Interaction State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if token is already present
  useEffect(() => {
    const token = localStorage.getItem('mlbuilder_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !username)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegistering) {
        // SignUp Mutation Flow
        const res = await graphqlRequest(SIGNUP, { email, username, password });
        if (res && res.signup) {
          const { token, user } = res.signup;
          localStorage.setItem('mlbuilder_token', token);
          localStorage.setItem('mlbuilder_username', user.username);
          setIsOnline(true);
          toast.success('Registration Complete', `Welcome to MLBuilder, ${user.username}!`);
          router.push('/');
        }
      } else {
        // Login Mutation Flow
        const res = await graphqlRequest(LOGIN, { email, password });
        if (res && res.login) {
          const { token, user } = res.login;
          localStorage.setItem('mlbuilder_token', token);
          localStorage.setItem('mlbuilder_username', user.username);
          setIsOnline(true);
          toast.success('Login Successful', `Welcome back, ${user.username}!`);
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error('Auth Mutation Exception:', err);
      setErrorMsg(err.message || 'Authentication handshake failed. Verify server configurations.');
      toast.error('Auth Mismatch', 'Invalid credentials or disconnected API endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSandboxBypass = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('mlbuilder_token', 'sandbox_dev_token');
      localStorage.setItem('mlbuilder_username', 'SandboxArchitect');
      setIsOnline(false); // Force offline mode for sandbox local bypass
      toast.success('Demo Sandbox Activated', 'Offline mode enabled. Mock data synced locally.');
      router.push('/');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0b10] relative select-none overflow-hidden font-sans">
      {/* Premium glowing ambient grid backdrops */}
      <div className="absolute inset-0 dot-grid opacity-25 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#8ab4f8]/10 blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#c5a3ff]/10 blur-[130px] pointer-events-none z-0"></div>

      {/* Login Main Container Card */}
      <div className="w-full max-w-[420px] bg-[#1e1f26]/85 border border-[#3f4046]/45 shadow-2xl rounded-3xl backdrop-blur-xl p-8 z-10 flex flex-col items-center relative overflow-hidden">
        {/* Glowing border top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8ab4f8]/50 to-transparent"></div>

        {/* Brand Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] rounded-2xl shadow-md mb-3 hover:scale-105 active:scale-95 transition-transform duration-300">
            <Cpu size={28} />
          </div>
          <h2 className="text-xl font-black text-white tracking-wider font-sans">MLBuilder Visual Workspace</h2>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] mt-1">
            Visual Neural Network Architect
          </p>
        </div>

        {errorMsg && (
          <div className="w-full mb-4.5 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-[10.5px] text-red-300 text-left font-semibold">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block pl-1">
                Username
              </label>
              <div className="relative flex items-center">
                <User size={13} className="absolute left-4 text-[#9aa0a6]" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#1b1c22] border border-[#3f4046]/40 rounded-xl py-3 pl-10.5 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={13} className="absolute left-4 text-[#9aa0a6]" />
              <input
                type="email"
                placeholder="developer@mlbuilder.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1b1c22] border border-[#3f4046]/40 rounded-xl py-3 pl-10.5 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block pl-1">
              Secret Password
            </label>
            <div className="relative flex items-center">
              <Lock size={13} className="absolute left-4 text-[#9aa0a6]" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#1b1c22] border border-[#3f4046]/40 rounded-xl py-3 pl-10.5 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] transition-colors"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3.5 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1a1b20] text-xs font-black rounded-xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 flex items-center justify-center gap-2 border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Configuring Handshake...</span>
                </>
              ) : (
                <span>{isRegistering ? 'Sign Up & Mount' : 'Sign In to Workspace'}</span>
              )}
            </button>

            {/* Offline Sandbox Bypass Switch */}
            <button
              type="button"
              onClick={handleSandboxBypass}
              disabled={isLoading}
              className="w-full py-3 bg-[#202128] hover:bg-[#2b2d36] border border-[#3f4046]/40 text-[#9aa0a6] hover:text-white text-xs font-black rounded-xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={12} className="text-[#ffe082]" />
              <span>Bypass (Demo Sandbox Mode)</span>
            </button>
          </div>
        </form>

        {/* Toggler Register/Login state */}
        <div className="mt-6 text-[10.5px] font-semibold text-[#9aa0a6]">
          {isRegistering ? (
            <span>
              Already have an active account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-[#8ab4f8] hover:underline font-bold bg-transparent border-none cursor-pointer p-0"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New neural network engineer?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-[#8ab4f8] hover:underline font-bold bg-transparent border-none cursor-pointer p-0"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
