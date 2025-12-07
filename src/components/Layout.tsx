import { Link, Outlet, useLocation } from 'react-router-dom';
import { Network } from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const isEditor = location.pathname.startsWith('/editor');

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
            <header className="h-14 border-b border-slate-700 bg-slate-900 flex items-center px-4 justify-between shrink-0 z-10 relative">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="p-1.5 bg-indigo-500 rounded-lg group-hover:bg-indigo-400 transition-colors">
                        <Network className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        AdsRule
                    </span>
                </Link>

                <nav className="flex items-center gap-4">
                    <Link
                        to="/"
                        className={`text-sm font-medium hover:text-white transition-colors ${!isEditor ? 'text-white' : 'text-slate-400'}`}
                    >
                        Dashboard
                    </Link>
                </nav>
            </header>

            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
