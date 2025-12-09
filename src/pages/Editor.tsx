import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import Canvas from '../components/Canvas';
import { Save, ArrowLeft, Settings, ChevronDown } from 'lucide-react';
import type { ApplicationLevel } from '../types';

export default function Editor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setActiveTree, activeTreeId, trees, updateTreeName, saveActiveTree } = useStore();

    const [name, setName] = useState('');
    const [showLevelDropdown, setShowLevelDropdown] = useState(false);
    const [level, setLevel] = useState<ApplicationLevel | undefined>(undefined);

    const levels: ApplicationLevel[] = [
        'Platform',
        'Account',
        'Campaign',
        'Ad Set',
        'Ad',
        'Creative Package',
        'Goods Catalog',
        'Goods SKU'
    ];

    // Sync ID from URL with Store
    useEffect(() => {
        if (id) {
            setActiveTree(id);
        }
        return () => setActiveTree(null); // cleanup
    }, [id, setActiveTree]);

    // Sync local name state with tree data
    useEffect(() => {
        const tree = trees.find(t => t.id === id);
        if (tree) {
            setName(tree.name);
            setLevel(tree.level);
        }
    }, [id, trees]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (id) updateTreeName(id, newName);
    };

    const handleLevelChange = (newLevel: ApplicationLevel) => {
        setLevel(newLevel);
        const tree = trees.find(t => t.id === id);
        if (tree && id) {
            useStore.setState(state => ({
                trees: state.trees.map(t =>
                    t.id === id ? { ...t, level: newLevel } : t
                )
            }));
        }
        setShowLevelDropdown(false);
    };

    const handleSave = () => {
        saveActiveTree();
        // Maybe show toast
    };

    if (!id || activeTreeId !== id) {
        return <div className="h-full flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex h-full flex-col">
            {/* Editor Toolbar */}
            <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            className="bg-transparent border-none text-lg font-bold focus:ring-0 px-2 py-1 hover:bg-slate-700/50 rounded transition-colors w-96"
                        />
                        <div className="relative">
                            <button
                                onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg flex items-center gap-1"
                                title="Set Application Level"
                            >
                                <Settings size={18} />
                                <ChevronDown size={14} />
                            </button>
                            {showLevelDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[180px]">
                                    <div className="px-3 py-1 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-700">
                                        Application Level
                                    </div>
                                    {levels.map(lvl => (
                                        <button
                                            key={lvl}
                                            onClick={() => handleLevelChange(lvl)}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${level === lvl ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-300'
                                                }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {level && (
                            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                                {level}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="btn btn-primary text-sm py-1.5 px-3"
                    >
                        <Save size={16} />
                        <span>Save Tree</span>
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="flex-1 bg-slate-900 relative">
                    <Canvas />
                </div>
            </div>
        </div>
    );
}
