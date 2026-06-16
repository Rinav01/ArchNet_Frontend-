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
  Loader2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

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
    const token = localStorage.getItem('archnet_token');
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
          localStorage.setItem('archnet_token', token);
          localStorage.setItem('archnet_username', user.username);
          setIsOnline(true);
          toast.success('Registration Complete', `Welcome to ArchNet, ${user.username}!`);
          router.push('/');
        }
      } else {
        // Login Mutation Flow
        const res = await graphqlRequest(LOGIN, { email, password });
        if (res && res.login) {
          const { token, user } = res.login;
          localStorage.setItem('archnet_token', token);
          localStorage.setItem('archnet_username', user.username);
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

  return (
    <div className="min-h-screen w-full flex bg-[#0a0b10] font-sans overflow-hidden">
      
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* LEFT PANEL: Branding & Visuals (Hidden on Mobile)                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between p-12 overflow-hidden border-r border-[#1e1f26]">
        
        {/* Background Visual Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#8ab4f8]/5 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#c5a3ff]/5 blur-[120px]"></div>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] rounded-xl">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider">ArchNet</h1>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] mt-0.5">
              Visual Neural Network Architect
            </p>
          </div>
        </div>

        {/* Center Animated Abstract Neural Graphic */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-[300px]">
          <div className="absolute w-[800px] h-[800px] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#8ab4f8]/20 to-[#c5a3ff]/20 rounded-full blur-3xl opacity-50 animate-pulse scale-75"></div>
            
            {/* Abstract SVG Graphic representing a Neural Network */}
            <svg viewBox="0 0 400 400" className="w-full h-full opacity-80 animate-float-svg scale-125" style={{ filter: 'drop-shadow(0 0 20px rgba(138, 180, 248, 0.2))' }}>
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8ab4f8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#c5a3ff" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              
              {/* Edges */}
              <g stroke="url(#edgeGrad)" strokeWidth="1.5" fill="none" opacity="0.4" className="animated-edge">
                {/* Input to Hidden 1 */}
                <path d="M50 200 Q 150 100 200 150" />
                <path d="M50 200 Q 150 200 200 200" />
                <path d="M50 200 Q 150 300 200 250" />
                {/* Hidden 1 to Hidden 2 */}
                <path d="M200 150 Q 250 100 300 150" />
                <path d="M200 150 Q 250 200 300 200" />
                <path d="M200 200 Q 250 200 300 200" />
                <path d="M200 200 Q 250 250 300 250" />
                <path d="M200 250 Q 250 200 300 200" />
                <path d="M200 250 Q 250 300 300 250" />
                {/* Hidden 2 to Output */}
                <path d="M300 150 Q 330 200 350 200" />
                <path d="M300 200 Q 330 200 350 200" />
                <path d="M300 250 Q 330 200 350 200" />
              </g>

              {/* Glowing animated particles along edges (simulated) */}
              <circle cx="200" cy="200" r="2" fill="#fff" className="animate-ping" style={{ animationDuration: '2s' }} />
              <circle cx="250" cy="180" r="2" fill="#fff" className="animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              <circle cx="150" cy="220" r="2" fill="#fff" className="animate-ping" style={{ animationDuration: '1.8s', animationDelay: '1s' }} />

              {/* Nodes */}
              <g fill="#1e1f26" stroke="#8ab4f8" strokeWidth="2">
                {/* Input Layer */}
                <circle cx="50" cy="200" r="12" />
                {/* Hidden Layer 1 */}
                <circle cx="200" cy="150" r="10" stroke="#c5a3ff" />
                <circle cx="200" cy="200" r="10" stroke="#c5a3ff" />
                <circle cx="200" cy="250" r="10" stroke="#c5a3ff" />
                {/* Hidden Layer 2 */}
                <circle cx="300" cy="150" r="10" stroke="#c5a3ff" />
                <circle cx="300" cy="200" r="10" stroke="#c5a3ff" />
                <circle cx="300" cy="250" r="10" stroke="#c5a3ff" />
                {/* Output Layer */}
                <circle cx="350" cy="200" r="14" stroke="#8ab4f8" />
              </g>

              {/* Inner glowing dots for nodes */}
              <g fill="#fff" className="animate-pulse">
                <circle cx="50" cy="200" r="3" />
                <circle cx="200" cy="150" r="2" />
                <circle cx="200" cy="200" r="2" />
                <circle cx="200" cy="250" r="2" />
                <circle cx="300" cy="150" r="2" />
                <circle cx="300" cy="200" r="2" />
                <circle cx="300" cy="250" r="2" />
                <circle cx="350" cy="200" r="4" />
              </g>
            </svg>
          </div>
        </div>

        {/* Bottom Tagline / Testimonial / Features */}
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-[1px] bg-[#3f4046]"></div>
            <span className="text-xs font-bold text-[#8ab4f8] uppercase tracking-widest">Enterprise Ready</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 leading-snug">
            Design, compile, and validate deep learning models instantly.
          </h3>
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            Stop writing boilerplate boilerplate code. ArchNet's visual compiler bridges the gap between whiteboarding and production PyTorch, TensorFlow, and JAX codepaces.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANEL: Form Container                                        */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center bg-[#0d0e12] relative z-10 px-6 py-12 lg:px-16 overflow-y-auto">
        
        {/* Mobile-only Branding header */}
        <div className="lg:hidden flex items-center gap-3 mb-10 w-full max-w-sm">
          <div className="p-2 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] rounded-xl">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wider">ArchNet</h1>
          </div>
        </div>

        <div className="w-full max-w-sm">
          
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-[#9aa0a6]">
              {isRegistering 
                ? 'Sign up to start building neural architectures visually.' 
                : 'Sign in to access your secure workspace and models.'}
            </p>
          </div>

          {errorMsg && (
            <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-300 font-semibold animate-fade-in">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#e3e3e3] block">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#8ab4f8] text-[#5f6368]">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-[#1b1c22] border border-[#3f4046] hover:border-[#5f6368] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-[#5f6368] focus:outline-none focus:border-[#8ab4f8] focus:bg-[#1e1f26] transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#e3e3e3] block">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#8ab4f8] text-[#5f6368]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="developer@archnet.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#1b1c22] border border-[#3f4046] hover:border-[#5f6368] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-[#5f6368] focus:outline-none focus:border-[#8ab4f8] focus:bg-[#1e1f26] transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#e3e3e3] block">
                  Password
                </label>
                {!isRegistering && (
                  <Link href="#" className="text-xs font-bold text-[#8ab4f8] hover:text-[#a8c7fa] hover:underline transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#8ab4f8] text-[#5f6368]">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#1b1c22] border border-[#3f4046] hover:border-[#5f6368] rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-[#5f6368] focus:outline-none focus:border-[#8ab4f8] focus:bg-[#1e1f26] transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-white hover:bg-gray-100 text-[#0a0b10] text-sm font-black rounded-xl cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing Handshake...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegistering ? 'Create Account' : 'Sign In to Workspace'}</span>
                    <ArrowRight size={16} className="text-[#0a0b10]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Toggle View Link */}
          <div className="mt-8 text-center text-xs font-medium text-[#9aa0a6]">
            {isRegistering ? (
              <p>
                Already have an active account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-white hover:text-[#8ab4f8] font-bold transition-colors cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                New neural network engineer?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-white hover:text-[#8ab4f8] font-bold transition-colors cursor-pointer ml-1"
                >
                  Create Account
                </button>
              </p>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-[#5f6368]">
              By continuing, you agree to ArchNet's <br />
              <Link href="#" className="hover:text-[#9aa0a6] hover:underline">Terms of Service</Link> and <Link href="#" className="hover:text-[#9aa0a6] hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
