import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Copy, 
  Upload, 
  LogOut, 
  ShieldCheck, 
  Users, 
  AlertCircle,
  Menu,
  X,
  CreditCard,
  User as UserIcon,
  ChevronRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'inactive';
  transferReceipt?: string;
  points: number;
  exactCount: number;
  winnerCount: number;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  round: string;
  group?: string;
  homeScore?: number;
  awayScore?: number;
  isFinished: boolean;
}

interface Prediction {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  pointsEarned?: number;
}

// --- Constants ---
const ALIAS = "NKTECNOLOGIA";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we might show a toast, but throwing crashes the app, especially for logout snapshot cleanup.
}

const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS 
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((email: string) => email.trim()) 
  : [];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'partidos' | 'ranking' | 'mispron' | 'admin'>('partidos');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Subscribe to profile
        const profileRef = doc(db, 'users', u.uid);
        const unsubProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Auto-promote admin
            if (data.email && ADMIN_EMAILS.includes(data.email) && (data.role !== 'admin' || data.status !== 'active')) {
              try {
                await updateDoc(profileRef, { role: 'admin', status: 'active' });
              } catch (e) {
                console.error("Failed to auto-promote admin", e);
              }
            }
            setProfile(data);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if profile exists, if not create pending
      const profileRef = doc(db, 'users', result.user.uid);
      let profileSnap;
      try {
        profileSnap = await getDoc(profileRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${result.user.uid}`);
      }
      
      if (profileSnap && !profileSnap.exists()) {
        const newProfile: UserProfile = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Usuario',
          email: result.user.email || '',
          role: 'user',
          status: 'pending',
          points: 0,
          exactCount: 0,
          winnerCount: 0
        };
        try {
          await setDoc(profileRef, newProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${result.user.uid}`);
        }
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 bg-accent-cyan rounded-2xl flex items-center justify-center shadow-2xl shadow-accent-cyan/20">
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">Prode<span className="text-accent-cyan">Master</span></h1>
            <p className="text-[10px] text-text-slate-500 font-black tracking-[0.3em] uppercase">Cargando...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (profile?.status === 'pending' && (!user?.email || !ADMIN_EMAILS.includes(user.email))) {
    return <WelcomePaymentView profile={profile} onLogout={handleLogout} />;
  }

  if (profile?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-[#0d1f14] flex items-center justify-center p-6 text-center">
        <div className="bg-[#132b1a] border border-red-900/30 p-8 rounded-2xl max-w-md shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Cuenta Inactiva</h2>
          <p className="text-gray-400 mb-8">Tu cuenta ha sido desactivada por un administrador. Contactate con soporte si crees que esto es un error.</p>
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-4 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-slate-200 font-sans">
      {/* Header */}
      <header className="bg-bg-nav border-b border-border-subtle px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent-cyan rounded-lg flex items-center justify-center">
             <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">Prode<span className="text-accent-cyan">Master</span></h1>
            <p className="text-[10px] text-text-slate-500 tracking-[0.2em] font-black">MUNDIAL 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white">{profile?.displayName}</p>
              <p className="text-[10px] text-text-slate-500 uppercase font-black tracking-widest">{profile?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-bg-surface border border-border-strong flex items-center justify-center text-xs font-bold text-accent-cyan">
              {profile?.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 hidden md:block"></div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-bg-nav border-b border-border-subtle sticky top-[72px] z-40 overflow-x-auto">
        <div className="flex px-8 max-w-7xl mx-auto">
          <NavTab active={activeTab === 'partidos'} onClick={() => setActiveTab('partidos')} icon={<Calendar className="w-4 h-4" />} label="Partidos" />
          <NavTab active={activeTab === 'ranking'} onClick={() => setActiveTab('ranking')} icon={<Trophy className="w-4 h-4" />} label="Ranking" />
          <NavTab active={activeTab === 'mispron'} onClick={() => setActiveTab('mispron')} icon={<CheckCircle className="w-4 h-4" />} label="Mis Pronósticos" />
          {(profile?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email))) && (
            <NavTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldCheck className="w-4 h-4" />} label="Admin" />
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'partidos' && <MatchesView key="matches" profile={profile!} />}
          {activeTab === 'ranking' && <RankingView key="ranking" profile={profile!} />}
          {activeTab === 'mispron' && <MyPredictionsView key="my-preds" profile={profile!} />}
          {activeTab === 'admin' && (profile?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email))) && <AdminView key="admin" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-views ---

function NavTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-5 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
        active 
          ? 'text-accent-cyan border-accent-cyan bg-white/5' 
          : 'text-text-slate-400 border-transparent hover:text-white hover:bg-white/[0.02]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-6 text-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-12">
          <div className="w-20 h-20 bg-accent-cyan rounded-2xl flex items-center justify-center font-bold text-3xl text-black mx-auto shadow-2xl mb-6 shadow-accent-cyan/20">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">PRODE<span className="text-accent-cyan">MASTER</span></h1>
          <p className="text-text-slate-500 font-black tracking-[0.2em] uppercase text-xs">Mundial 2026</p>
        </div>

        <div className="bg-bg-surface border border-border-subtle p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-cyan to-transparent opacity-50"></div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Bienvenido</h2>
          <p className="text-text-slate-400 text-sm mb-10">Iniciá sesión para comenzar a ganar puntos con tus pronósticos.</p>
          
          <button 
            onClick={onLogin}
            className="group relative flex items-center justify-center gap-3 w-full p-4 bg-white text-bg-main rounded-2xl font-bold shadow-xl hover:bg-accent-cyan hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Ingresar con Google
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-slate-500 font-black uppercase tracking-widest">
             <ShieldCheck className="w-4 h-4" />
             Acceso seguro vía Google
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WelcomePaymentView({ profile, onLogout }: { profile: UserProfile, onLogout: () => void }) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const copyAlias = () => {
    navigator.clipboard.writeText(ALIAS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate upload - converting to base64 for MVP simplicity within rules limits
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          transferReceipt: base64
        });
        setSuccess(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-bg-main p-6 lg:p-12 flex items-center justify-center font-sans text-text-slate-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl grid md:grid-cols-2 bg-bg-surface rounded-[2rem] overflow-hidden shadow-2xl border border-border-subtle"
      >
        {/* Left Side Info */}
        <div className="p-10 lg:p-14 bg-white/5 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-accent-cyan rounded-lg flex items-center justify-center font-bold text-xl text-black mb-8 shadow-lg shadow-accent-cyan/10">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-white leading-tight mb-6">¡Casi estás dentro!</h1>
            <p className="text-text-slate-400 text-base leading-relaxed mb-8">Para activar tu cuenta en el <strong>Prode Master</strong>, debés completar el pago de la inscripción y subir el comprobante.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-accent-cyan/10 p-4 rounded-xl border border-accent-cyan/20">
                <CheckCircle className="w-6 h-6 text-accent-cyan" />
                <span className="text-xs text-accent-cyan font-bold uppercase tracking-widest">Paso 1: Registro OK</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 opacity-50">
                <div className="w-6 h-6 rounded-full border-2 border-text-slate-500"></div>
                <span className="text-xs text-text-slate-500 font-bold uppercase tracking-widest">Paso 2: Validación</span>
              </div>
            </div>
          </div>
          
          <button onClick={onLogout} className="flex items-center gap-2 text-text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mt-12 w-fit">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="p-10 lg:p-14 border-l border-border-subtle">
          <div className="mb-10">
            <label className="text-[10px] uppercase tracking-widest text-text-slate-500 font-black mb-3 block">Alias de Transferencia</label>
            
            <div className="bg-bg-input border border-border-strong p-6 rounded-2xl flex items-center justify-between shadow-inner">
              <span className="text-xl font-mono font-bold text-accent-cyan">{ALIAS}</span>
              <button 
                onClick={copyAlias}
                className="p-3 bg-white/5 text-text-slate-200 rounded-xl flex items-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-accent-cyan" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-text-slate-500 font-black mb-3 block">Subir Comprobante</label>
            
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent-emerald/10 border border-accent-emerald/30 p-10 rounded-3xl text-center"
              >
                <div className="w-16 h-16 bg-accent-emerald rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-emerald/20">
                  <CheckCircle className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">¡Comprobante Recibido!</h4>
                <p className="text-text-slate-400 text-xs">Un administrador activará tu cuenta en breve.</p>
              </motion.div>
            ) : (
              <label 
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer ${
                  uploading 
                    ? 'bg-white/5 border-border-strong cursor-not-allowed' 
                    : 'bg-bg-nav/50 border-white/10 hover:border-accent-cyan/50 hover:bg-white/[0.02]'
                }`}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept="image/*"
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-black text-accent-cyan uppercase tracking-widest">Subiendo...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 text-text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-white font-bold mb-1 text-sm">Seleccionar Archivo</span>
                    <span className="text-[10px] text-text-slate-500 font-black uppercase tracking-widest">JPG o PNG</span>
                  </>
                )}
              </label>
            )}
            
            {profile.transferReceipt && !success && (
              <p className="text-center mt-6 text-[10px] text-accent-gold font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" /> Ya subiste un comprobante. Podés actualizarlo si es necesario.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Content Components ---

const WORLD_CUP_MATCHES_SEED: Match[] = [
  {id:'g1',round:'Grupos',group:'A',date:'2026-06-11T21:00:00Z',homeTeam:'México',homeFlag:'🇲🇽',awayTeam:'Argentina',awayFlag:'🇦🇷', isFinished: false},
  {id:'g2',round:'Grupos',group:'A',date:'2026-06-11T18:00:00Z',homeTeam:'Marruecos',homeFlag:'🇲🇦',awayTeam:'Portugal',awayFlag:'🇵🇹', isFinished: false},
  {id:'g3',round:'Grupos',group:'B',date:'2026-06-12T21:00:00Z',homeTeam:'Estados Unidos',homeFlag:'🇺🇸',awayTeam:'Brasil',awayFlag:'🇧🇷', isFinished: false},
  {id:'g4',round:'Grupos',group:'B',date:'2026-06-12T18:00:00Z',homeTeam:'Uruguay',homeFlag:'🇺🇾',awayTeam:'Alemania',awayFlag:'🇩🇪', isFinished: false},
  {id:'g5',round:'Grupos',group:'C',date:'2026-06-13T21:00:00Z',homeTeam:'España',homeFlag:'🇪🇸',awayTeam:'Francia',awayFlag:'🇫🇷', isFinished: false},
];

// Mapa de banderas por país (emoji unicode)
const FLAG_MAP: Record<string, string> = {
  'Argentina': '🇦🇷', 'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷',
  'Republica Checa': '🇨🇿', 'Canadá': '🇨🇦', 'Bosnia Herzegovina': '🇧🇦', 'Estados Unidos': '🇺🇸',
  'Paraguay': '🇵🇾', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭', 'Brasil': '🇧🇷', 'Marruecos': '🇲🇦',
  'Haití': '🇭🇹', 'Escocia': '🏴', 'Australia': '🇦🇺', 'Turquía': '🇹🇷', 'Alemania': '🇩🇪',
  'Curazao': '🇨🇼', 'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
  'Suecia': '🇸🇪', 'Túnez': '🇹🇳', 'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Bélgica': '🇧🇪',
  'Egipto': '🇪🇬', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
  'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴', 'Argelia': '🇩🇿',
  'Austria': '🇦🇹', 'Jordania': '🇯🇴', 'Portugal': '🇵🇹', 'RD Congo': '🇨🇩', 'Inglaterra': '🏴',
  'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴'
};

const getFlag = (teamName: string) => FLAG_MAP[teamName] || '⚽';

// Normalizes a string to ASCII-safe characters for use as Firestore document IDs
function normalizeId(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function MatchesView({ profile }: { profile: UserProfile, key?: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [filter, setFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('Fecha 1');

  useEffect(() => {
    // Fetch matches from scraper API (works for both local and firebase mode)
    const fetchMatchesFromScraper = async () => {
      try {
        const response = await fetch('/api/results');
        if (response.ok) {
          const scrapedData = await response.json();
          console.log('[SCRAPER] Loaded', scrapedData.length, 'matches. Sample:', scrapedData[0]?.fecha, scrapedData[0]?.group);
          const mappedMatches: Match[] = scrapedData.map((p: any) => {
            let dateStr = new Date().toISOString();
            if (p.gameState && p.gameState.includes(' ')) {
                const parts = p.gameState.split(' ');
                if (parts.length > 1) {
                   const dateParts = parts[1].split('-');
                   if (dateParts.length === 3) {
                       const [day, month, year] = dateParts;
                       const time = parts[2] || '00:00';
                       dateStr = `${year}-${month}-${day}T${time}:00`;
                   }
                }
            }
            return {
              id: normalizeId(`${p.gamet1}-${p.gamet2}-${p.fecha}`),
              round: p.fecha || 'Grupos',
              group: p.group || '',
              date: dateStr,
              homeTeam: p.gamet1,
              homeFlag: getFlag(p.gamet1),
              awayTeam: p.gamet2,
              awayFlag: getFlag(p.gamet2),
              homeScore: p.gamer1 ? parseInt(p.gamer1) : undefined,
              awayScore: p.gamer2 ? parseInt(p.gamer2) : undefined,
              isFinished: p.gameState ? p.gameState.includes('Fin') : false
            };
          });
          setMatches(mappedMatches);
        } else {
          console.error('[SCRAPER] API error:', response.status);
        }
      } catch (error) {
        console.error('[SCRAPER] Failed to fetch matches:', error);
      }
    };

    fetchMatchesFromScraper();

    // Load predictions for current user (real-time)
    const q = query(collection(db, 'predictions'), where('userId', '==', profile.uid));
    const unsubPreds = onSnapshot(q, (snap) => {
      const preds: Record<string, Prediction> = {};
      snap.docs.forEach(d => {
        const p = d.data() as Prediction;
        preds[p.matchId] = p;
      });
      setPredictions(preds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'predictions');
    });

    return () => {
      unsubPreds();
    };
  }, [profile.uid]);

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'Grupos') return ['Fecha 1', 'Fecha 2', 'Fecha 3'].includes(m.round) && m.round === subFilter;
    return m.round === filter;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'Grupos', 'Octavos', 'Cuartos', 'Semis', 'Final'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2.5 rounded-full text-[10px] font-black transition-all uppercase tracking-[0.2em] border ${
              filter === f 
                ? 'bg-accent-cyan text-black border-accent-cyan shadow-lg shadow-accent-cyan/20' 
                : 'bg-bg-surface text-text-slate-500 border-border-subtle hover:text-white hover:border-white/20'
            }`}
          >
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {filter === 'Grupos' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mb-10 pl-2">
          {['Fecha 1', 'Fecha 2', 'Fecha 3'].map(f => (
            <button 
              key={f}
              onClick={() => setSubFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-[0.1em] border ${
                subFilter === f 
                  ? 'bg-white text-black border-white' 
                  : 'bg-bg-surface text-text-slate-400 border-border-subtle hover:text-white hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>
      )}

      <div className="grid gap-6">
        {filteredMatches.map(m => (
          <MatchCard 
            key={m.id} 
            match={m} 
            prediction={predictions[m.id]} 
            userId={profile.uid}
            onSaved={(matchId, home, away) => {
              setPredictions(prev => ({
                ...prev,
                [matchId]: { userId: profile.uid, matchId, homeScore: home, awayScore: away }
              }));
            }}
          />
        ))}
        {filteredMatches.length === 0 && (
          <div className="text-center py-20 bg-bg-surface rounded-3xl border border-border-subtle">
            <Calendar className="w-12 h-12 text-text-slate-500 mx-auto mb-4 opacity-20" />
            <p className="text-text-slate-500 font-bold uppercase tracking-widest text-xs">No hay partidos para este filtro.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MatchCard({ match, prediction, userId, onSaved }: { 
  match: Match, 
  prediction?: Prediction, 
  userId: string,
  onSaved?: (matchId: string, home: number, away: number) => void,
  key?: string 
}) {
  const [hScore, setHScore] = useState(prediction?.homeScore?.toString() || '');
  const [aScore, setAScore] = useState(prediction?.awayScore?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync inputs with prediction from parent
  useEffect(() => {
    setHScore(prediction?.homeScore?.toString() || '');
    setAScore(prediction?.awayScore?.toString() || '');
  }, [prediction]);

  const isClosed = new Date(match.date).getTime() - 30 * 60 * 1000 < Date.now();

  const handleSave = async () => {
    if (hScore === '' || aScore === '') return;
    setSaving(true);
    try {
      const predId = `${userId}_${match.id}`;
      await setDoc(doc(db, 'predictions', predId), {
        userId,
        matchId: match.id,
        homeScore: parseInt(hScore),
        awayScore: parseInt(aScore),
        updatedAt: serverTimestamp()
      });
      setSaved(true);
      onSaved?.(match.id, parseInt(hScore), parseInt(aScore));
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `predictions/${userId}_${match.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 shadow-xl hover:border-accent-cyan/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-accent-cyan/10 group-hover:bg-accent-cyan transition-colors"></div>
      <div className="flex items-center justify-between mb-8">
        <div className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-text-slate-400 border border-border-subtle">
          {match.round} {match.group && `· Grupo ${match.group}`}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-slate-500">
           <Calendar className="w-3.5 h-3.5" />
           {new Date(match.date).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-10">
        <div className="flex-1 flex flex-col items-center">
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{match.homeFlag}</div>
          <span className="text-sm md:text-base font-black text-white text-center leading-tight uppercase tracking-tight">{match.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center gap-4">
           {match.isFinished ? (
             <div className="flex items-center gap-6">
                <span className="text-5xl font-black text-white tabular-nums">{match.homeScore}</span>
                <span className="text-2xl font-black text-accent-cyan/30">-</span>
                <span className="text-5xl font-black text-white tabular-nums">{match.awayScore}</span>
             </div>
           ) : (
             <div className="bg-bg-input px-6 py-2 rounded-xl border border-border-strong">
                <span className="text-xs font-black text-accent-cyan tracking-widest">VS</span>
             </div>
           )}
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{match.awayFlag}</div>
          <span className="text-sm md:text-base font-black text-white text-center leading-tight uppercase tracking-tight">{match.awayTeam}</span>
        </div>
      </div>

      <div className="pt-8 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-text-slate-500">Tu Pronóstico</div>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              value={hScore}
              onChange={e => setHScore(e.target.value)}
              disabled={isClosed || match.isFinished}
              placeholder="0"
              className="w-16 h-16 bg-bg-input border border-border-strong rounded-2xl text-center text-2xl font-black text-white focus:border-accent-cyan outline-none transition-all disabled:opacity-30 tabular-nums shadow-inner"
            />
            <span className="text-text-slate-500 font-bold">-</span>
            <input 
              type="number" 
              value={aScore}
              onChange={e => setAScore(e.target.value)}
              disabled={isClosed || match.isFinished}
              placeholder="0"
              className="w-16 h-16 bg-bg-input border border-border-strong rounded-2xl text-center text-2xl font-black text-white focus:border-accent-cyan outline-none transition-all disabled:opacity-30 tabular-nums shadow-inner"
            />
          </div>
        </div>

        {!isClosed && !match.isFinished ? (
          <button 
            onClick={handleSave}
            disabled={saving || hScore === '' || aScore === ''}
            className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
              saved 
                ? 'bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20' 
                : 'bg-white text-black hover:bg-accent-cyan hover:scale-[1.02] active:scale-[0.98]'
            } disabled:opacity-50`}
          >
            {saving ? 'Guardando...' : saved ? <><CheckCircle className="w-5 h-5" /> Guardado</> : 'Cargar Pronóstico'}
          </button>
        ) : (
          <div className="text-right">
            {prediction ? (
              <div className="flex items-center gap-4">
                 <div className="text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-slate-500">Puntos Obtenidos</p>
                   <p className="text-xs font-bold text-text-slate-400 italic">Resultado Final: {match.homeScore}-{match.awayScore}</p>
                 </div>
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl ${
                   prediction.pointsEarned === 150 
                    ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30' 
                    : prediction.pointsEarned === 50 
                      ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                 }`}>
                   {prediction.pointsEarned !== undefined ? `+${prediction.pointsEarned}` : '--'}
                 </div>
              </div>
            ) : (
              <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-text-slate-500">
                Pronóstico Cerrado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RankingView({ profile }: { profile: UserProfile, key?: string }) {
  const [rankings, setRankings] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => d.data() as UserProfile);
      setRankings(data.sort((a, b) => b.points - a.points || b.exactCount - a.exactCount));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Jugadores" value={rankings.length.toString()} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Tu Posición" value={`#${rankings.findIndex(r => r.uid === profile.uid) + 1}`} />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Tus Puntos" value={profile.points.toString()} />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Tus Exactos" value={profile.exactCount.toString()} />
      </div>

      <div className="bg-bg-surface rounded-3xl border border-border-subtle overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-white/[0.02]">
           <h3 className="text-xl font-bold flex items-center gap-3">
             <Trophy className="w-6 h-6 text-accent-cyan" /> Tabla de Posiciones
           </h3>
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-slate-500">Live Global Updates</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-text-slate-500 border-b border-white/5">
              <tr>
                <th className="px-8 py-5 text-left">Pos</th>
                <th className="px-8 py-5 text-left">Jugador</th>
                <th className="px-8 py-5 text-center">Puntos</th>
                <th className="px-8 py-5 text-center hidden md:table-cell">Exactos</th>
                <th className="px-8 py-5 text-center hidden md:table-cell">Ganadores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rankings.map((r, i) => {
                const isMe = r.uid === profile.uid;
                return (
                  <tr key={r.uid} className={`${isMe ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan' : 'hover:bg-white/[0.02]'} transition-colors`}>
                    <td className="px-8 py-6">
                      <span className={`text-2xl font-black ${i === 0 ? 'text-accent-cyan' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-text-slate-500'}`}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shadow-inner ${isMe ? 'bg-accent-cyan text-black' : 'bg-bg-input text-text-slate-400'}`}>
                          {r.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <p className={`font-black ${isMe ? 'text-white' : 'text-text-slate-200'}`}>{r.displayName}</p>
                           {isMe && <span className="text-[10px] font-black uppercase text-accent-cyan tracking-widest">Es tu perfil</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-2xl font-black ${isMe ? 'text-accent-cyan' : 'text-white'} tabular-nums`}>{r.points}</span>
                    </td>
                    <td className="px-8 py-6 text-center hidden md:table-cell">
                      <span className="text-lg font-bold text-text-slate-500 tabular-nums">{r.exactCount}</span>
                    </td>
                    <td className="px-8 py-6 text-center hidden md:table-cell">
                      <span className="text-lg font-bold text-text-slate-500 tabular-nums">{r.winnerCount}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 text-text-slate-500 mb-3 uppercase tracking-widest text-[10px] font-black">
        {icon} {label}
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function MyPredictionsView({ profile }: { profile: UserProfile, key?: string }) {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});

  useEffect(() => {
    // Load matches from scraper
    fetch('/api/results').then(r => r.json()).then((scrapedData: any[]) => {
      const ms: Record<string, Match> = {};
      scrapedData.forEach((p: any) => {
        let dateStr = new Date().toISOString();
        if (p.gameState && p.gameState.includes(' ')) {
          const parts = p.gameState.split(' ');
          if (parts.length > 1) {
            const dateParts = parts[1].split('-');
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts;
              const time = parts[2] || '00:00';
              dateStr = `${year}-${month}-${day}T${time}:00`;
            }
          }
        }
        const id = normalizeId(`${p.gamet1}-${p.gamet2}-${p.fecha}`);
        if (id) ms[id] = {
          id,
          round: p.fecha || 'Grupos',
          group: p.group || '',
          date: dateStr,
          homeTeam: p.gamet1,
          homeFlag: FLAG_MAP[p.gamet1] || '⚽',
          awayTeam: p.gamet2,
          awayFlag: FLAG_MAP[p.gamet2] || '⚽',
          homeScore: p.gamer1 ? parseInt(p.gamer1) : undefined,
          awayScore: p.gamer2 ? parseInt(p.gamer2) : undefined,
          isFinished: p.gameState ? p.gameState.includes('Fin') : false
        };
      });
      setMatches(ms);
    }).catch(err => console.error('MyPredictions: failed to load matches', err));

    const q = query(collection(db, 'predictions'), where('userId', '==', profile.uid));
    const unsubPreds = onSnapshot(q, (snap) => {
      setPreds(snap.docs.map(d => d.data() as Prediction));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'predictions');
    });

    return () => {
      unsubPreds();
    };
  }, [profile.uid]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-bg-surface p-10 rounded-[2.5rem] border border-border-subtle flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-cyan/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex-1 flex gap-12">
           <div className="text-center">
             <p className="text-5xl font-black text-white tabular-nums">{preds.length}</p>
             <p className="text-[10px] font-black uppercase text-accent-cyan tracking-[0.2em] mt-2">Registrados</p>
           </div>
           <div className="text-center">
             <p className="text-5xl font-black text-white tabular-nums">{profile.points}</p>
             <p className="text-[10px] font-black uppercase text-accent-emerald tracking-[0.2em] mt-2">Puntos Totales</p>
           </div>
        </div>
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-text-slate-500">
          <CheckCircle className="w-8 h-8" />
        </div>
      </div>

      <div className="space-y-4">
        {preds.length === 0 ? (
          <div className="text-center py-24 bg-bg-surface rounded-3xl border border-border-subtle opacity-50">
            <CheckCircle className="w-16 h-16 text-text-slate-700 mx-auto mb-6" />
            <p className="text-text-slate-500 font-black uppercase tracking-widest text-xs">Aún no cargaste pronósticos.</p>
          </div>
        ) : (
          preds.map(p => {
            const m = matches[p.matchId];
            if (!m) return null;
            return (
              <div key={p.matchId} className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex items-center justify-between group hover:border-accent-cyan/30 transition-all shadow-md">
                <div className="flex items-center gap-8">
                   <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{m.homeFlag} vs {m.awayFlag}</div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-text-slate-500 tracking-widest mb-1">{m.homeTeam} vs {m.awayTeam}</p>
                     <p className="text-xl font-black text-white tabular-nums">{p.homeScore} - {p.awayScore}</p>
                   </div>
                </div>
                
                <div className="text-right">
                  {m.isFinished ? (
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-slate-500">Resultado Real</p>
                        <p className="text-sm font-black text-white italic">{m.homeScore} - {m.awayScore}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl transition-transform group-hover:scale-110 ${
                        p.pointsEarned === 150 
                          ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30' 
                          : p.pointsEarned === 50 
                            ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        +{p.pointsEarned || 0}
                      </div>
                    </div>
                  ) : (
                    <span className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-text-slate-500 border border-border-subtle">En Curso</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function AdminView(props: { key?: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snap) => {
      const ms = snap.docs.map(d => d.data() as Match);
      setMatches(ms.length > 0 ? ms : WORLD_CUP_MATCHES_SEED);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => {
      unsubUsers();
      unsubMatches();
    };
  }, []);

  const toggleUserStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: nextStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSetResult = async (matchId: string, h: number, a: number) => {
    try {
      await setDoc(doc(db, 'matches', matchId), {
        ...matches.find(m => m.id === matchId)!,
        homeScore: h,
        awayScore: a,
        isFinished: true
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }

    const q = query(collection(db, 'predictions'), where('matchId', '==', matchId));
    let predSnap;
    try {
      predSnap = await getDocs(q);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'predictions');
    }
    
    if (predSnap) {
      for (const d of predSnap.docs) {
        const p = d.data() as Prediction;
        let pts = 0;
        if (p.homeScore === h && p.awayScore === a) pts = 150;
        else {
          const pWin = p.homeScore > p.awayScore ? 'H' : p.homeScore < p.awayScore ? 'A' : 'D';
          const rWin = h > a ? 'H' : h < a ? 'A' : 'D';
          if (pWin === rWin) pts = 50;
        }
        
        try {
          await updateDoc(d.ref, { pointsEarned: pts });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, d.ref.path);
        }
        
        const userRef = doc(db, 'users', p.userId);
        let uSnap;
        try {
          uSnap = await getDoc(userRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, userRef.path);
        }

        if (uSnap && uSnap.exists()) {
          const u = uSnap.data() as UserProfile;
          try {
            await updateDoc(userRef, {
              points: (u.points || 0) + pts,
              exactCount: (u.exactCount || 0) + (pts === 150 ? 1 : 0),
              winnerCount: (u.winnerCount || 0) + (pts === 50 ? 1 : 0)
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, userRef.path);
          }
        }
      }
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_450px] gap-8">
      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Gestión de Usuarios</h3>
              <p className="text-xs text-text-slate-500 font-bold uppercase tracking-widest mt-1">Validación de ingresos y acceso</p>
            </div>
            <Users className="w-8 h-8 text-accent-cyan opacity-20" />
          </div>
          
          <div className="bg-bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-text-slate-500 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Comprobante</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr 
                    key={u.uid} 
                    onClick={() => setSelectedUser(u)}
                    className={`group transition-all cursor-pointer ${selectedUser?.uid === u.uid ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${u.status === 'active' ? 'bg-accent-emerald text-black' : 'bg-bg-input text-text-slate-500'}`}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{u.displayName}</p>
                          <p className="text-[10px] text-text-slate-500 font-bold uppercase">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {u.transferReceipt ? (
                        <div className="flex items-center gap-2 text-accent-cyan text-xs font-bold uppercase tracking-widest">
                          <CreditCard className="w-4 h-4" /> Ver Adjunto
                        </div>
                      ) : (
                        <span className="text-xs text-text-slate-600 italic">Sin adjunto</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                         u.status === 'active' ? 'bg-accent-emerald/10 text-accent-emerald' : u.status === 'pending' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-red-500/10 text-red-400'
                       }`}>
                         {u.status}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="flex items-center justify-end">
                         <div 
                          onClick={(e) => { e.stopPropagation(); toggleUserStatus(u); }}
                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${u.status === 'active' ? 'bg-accent-emerald' : 'bg-bg-input border border-white/10'}`}
                         >
                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${u.status === 'active' ? 'right-1' : 'left-1'}`}></div>
                         </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Cargar Resultados</h3>
              <p className="text-xs text-text-slate-500 font-bold uppercase tracking-widest mt-1">Cierre de partidos y suma de puntos</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/results?url=https://www.promiedos.com.ar/league/fifa-world-cup/fjda');
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        // Sincronizar con los partidos de Firestore
                        console.log("Scraped matches:", data);
                        for (const m of matches) {
                           if (!m.isFinished) {
                               // Buscar coincidencia básica
                               const scraped = data.find(d => 
                                   d.gamet1.toLowerCase().includes(m.homeTeam.toLowerCase()) || 
                                   m.homeTeam.toLowerCase().includes(d.gamet1.toLowerCase())
                               );
                               if (scraped && scraped.gameState.toLowerCase().includes("fin")) {
                                   try {
                                       handleSetResult(m.id, parseInt(scraped.gamer1), parseInt(scraped.gamer2));
                                   } catch(e) {}
                               }
                           }
                        }
                    }
                  } catch (e) {
                    console.error("Error fetching results", e);
                  }
                }}
                className="px-4 py-2 border border-accent-emerald text-accent-emerald rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent-emerald hover:text-black transition-all"
              >
                Sincronizar Resultados
              </button>
              <TrendingUp className="w-8 h-8 text-accent-emerald opacity-20" />
            </div>
          </div>
          
          <div className="space-y-4">
            {matches.filter(m => !m.isFinished).map(m => (
              <AdminMatchResultCard key={m.id} match={m} onSave={handleSetResult} />
            ))}
            {matches.every(m => m.isFinished) && (
              <div className="text-center py-12 bg-bg-surface rounded-3xl border border-dashed border-white/10">
                <p className="text-text-slate-500 font-bold text-xs uppercase tracking-widest">Todos los partidos procesados.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-[150px]">
           {selectedUser ? (
             <div className="bg-bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-2xl flex flex-col">
               <div className="p-8 text-center border-b border-border-subtle bg-white/[0.02]">
                 <div className="w-24 h-24 bg-bg-input rounded-2xl flex items-center justify-center text-4xl font-black text-accent-cyan mx-auto mb-6 shadow-2xl border border-border-strong relative">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-accent-emerald rounded-full border-4 border-bg-surface -mr-1 -mt-1"></div>
                   {selectedUser.displayName.charAt(0).toUpperCase()}
                 </div>
                 <h4 className="text-2xl font-black text-white tracking-tight">{selectedUser.displayName}</h4>
                 <p className="text-[10px] text-text-slate-500 font-black uppercase tracking-[0.2em] mt-1">{selectedUser.email}</p>
               </div>

               <div className="p-8 space-y-8">
                 <div>
                   <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-slate-500 mb-4">Comprobante de Pago</h5>
                   {selectedUser.transferReceipt ? (
                     <div className="rounded-2xl overflow-hidden border border-border-strong bg-black/40 p-2 shadow-inner group hover:scale-[1.02] transition-all">
                       <img src={selectedUser.transferReceipt} alt="Comprobante" className="w-full h-auto rounded-xl" />
                       <div className="mt-4 flex gap-2">
                          <button onClick={() => toggleUserStatus(selectedUser)} className="flex-1 py-3 bg-accent-emerald text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-emerald/20">Aprobar</button>
                          <a href={selectedUser.transferReceipt} download className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all"><Upload className="w-4 h-4" /></a>
                       </div>
                     </div>
                   ) : (
                     <div className="py-16 border-2 border-dashed border-white/5 rounded-2xl text-center">
                       <AlertCircle className="w-10 h-10 text-text-slate-800 mx-auto mb-4" />
                       <p className="text-[10px] text-text-slate-600 font-black uppercase tracking-widest">Sin adjunto</p>
                     </div>
                   )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-input p-4 rounded-2xl">
                       <p className="text-[9px] font-black text-text-slate-500 uppercase mb-1">Puntos</p>
                       <p className="text-xl font-black text-white">{selectedUser.points}</p>
                    </div>
                    <div className="bg-bg-input p-4 rounded-2xl">
                       <p className="text-[9px] font-black text-text-slate-500 uppercase mb-1">Status</p>
                       <p className="text-xl font-black text-accent-cyan uppercase">{selectedUser.status}</p>
                    </div>
                 </div>
               </div>
             </div>
           ) : (
             <div className="bg-bg-surface border border-border-subtle border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-6 min-h-[400px]">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-text-slate-700">
                  <UserIcon className="w-8 h-8" />
               </div>
               <p className="text-text-slate-500 font-black tracking-widest uppercase text-[10px] max-w-[200px] leading-relaxed">Seleccioná un usuario para gestionar su activación.</p>
             </div>
           )}
        </div>
      </aside>
    </div>
  );
}

function AdminMatchResultCard({ match, onSave }: { match: Match, onSave: (id: string, h: number, a: number) => Promise<void>, key?: string }) {
  const [h, setH] = useState('');
  const [a, setA] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl flex items-center justify-between gap-6 hover:border-accent-emerald/30 transition-all shadow-lg group">
      <div className="flex items-center gap-6 flex-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-text-slate-500 w-24 truncate">{match.homeTeam}</span>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={h} 
            onChange={e => setH(e.target.value)} 
            className="w-14 h-12 bg-bg-input border border-border-strong rounded-xl text-center text-white font-black text-xl tabular-nums focus:border-accent-emerald outline-none transition-all" 
            placeholder="0"
          />
          <span className="text-text-slate-500 font-bold">-</span>
          <input 
            type="number" 
            value={a} 
            onChange={e => setA(e.target.value)} 
            className="w-14 h-12 bg-bg-input border border-border-strong rounded-xl text-center text-white font-black text-xl tabular-nums focus:border-accent-emerald outline-none transition-all" 
            placeholder="0"
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-text-slate-500 w-24 truncate text-right">{match.awayTeam}</span>
      </div>
      <button 
        onClick={() => { setLoading(true); onSave(match.id, parseInt(h), parseInt(a)).finally(() => setLoading(false)); }}
        disabled={loading || h === '' || a === ''}
        className="px-8 py-3 bg-accent-emerald text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-emerald/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
      >
        {loading ? '...' : 'Procesar'}
      </button>
    </div>
  );
}
