import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import Canvas from '../components/Canvas';
import { Save, ArrowLeft, Settings } from 'lucide-react';

export default function Editor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setActiveTree, activeTreeId, trees, updateTreeName, saveActiveTree } = useStore();

    const [name, setName] = useState('');

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
        }
    }, [id, trees]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (id) updateTreeName(id, newName);
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
                    <input
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        className="bg-transparent border-none text-lg font-bold focus:ring-0 px-2 py-1 hover:bg-slate-700/50 rounded transition-colors w-96"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="btn btn-primary text-sm py-1.5 px-3"
                    >
                        <Save size={16} />
                        <span>Save Tree</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <Settings size={20} />
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
