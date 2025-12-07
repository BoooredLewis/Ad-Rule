import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Plus, Trash2, FileJson, Clock, Network, Upload, Download } from 'lucide-react';
import { useRef, useState } from 'react';

const formatDate = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString();

export default function Dashboard() {
    const { trees, createTree, deleteTree, getExportData, importData } = useStore();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleCreate = () => {
        const name = `New Campaign Rule ${trees.length + 1}`;
        createTree(name);
        setTimeout(() => {
            const state = useStore.getState();
            const newTree = state.trees[state.trees.length - 1];
            if (newTree) {
                navigate(`/editor/${newTree.id}`);
            }
        }, 100);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleExportClick = async () => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            return;
        }

        // Perform Export
        const data = getExportData(Array.from(selectedIds));

        try {
            // @ts-ignore
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: `ads-rules-export-${new Date().toISOString().slice(0, 10)}.json`,
                    types: [{
                        description: 'JSON File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(data);
                await writable.close();

                // Reset
                setIsSelectionMode(false);
                setSelectedIds(new Set());
                return;
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.warn(err);
        }

        // Fallback
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ads-rules-export-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                if (importData(result)) {
                    // Success feedback handled by UI update
                } else {
                    alert('Import failed. Invalid JSON format.');
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Rule Trees</h1>
                    <p className="text-slate-400">Manage your campaign decision logic.</p>
                </div>
                <div className="flex gap-2">
                    {isSelectionMode ? (
                        <>
                            <span className="flex items-center text-sm text-slate-400 mr-2">
                                {selectedIds.size} selected
                            </span>
                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="btn btn-ghost text-slate-400">
                                Cancel
                            </button>
                            <button onClick={handleExportClick} className="btn bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 border-none">
                                <Download size={18} />
                                Confirm Export
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleImportClick} className="btn btn-ghost border border-slate-700">
                                <Upload size={18} />
                                Import
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".json"
                            />

                            <button onClick={handleExportClick} className="btn btn-ghost border border-slate-700">
                                <Download size={18} />
                                Export
                            </button>
                            <button onClick={handleCreate} className="btn btn-primary shadow-lg hover:shadow-indigo-500/20">
                                <Plus size={20} />
                                New Rule Tree
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trees.map((tree) => (
                    <div
                        key={tree.id}
                        onClick={() => isSelectionMode ? toggleSelection(tree.id) : null}
                        className={`glass p-6 rounded-xl flex flex-col gap-4 group transition-all relative
                            ${isSelectionMode
                                ? 'cursor-pointer hover:bg-slate-800/80 border-2'
                                : 'hover:border-indigo-500/30 hover:translate-y-[-2px]'}
                            ${isSelectionMode && selectedIds.has(tree.id) ? 'border-cyan-500 bg-cyan-900/10' : 'border-transparent'}
                        `}
                    >
                        {isSelectionMode && (
                            <div className={`absolute top-4 right-4 w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.has(tree.id) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-900'}`}>
                                {selectedIds.has(tree.id) && <Download size={12} className="text-white" />}
                            </div>
                        )}

                        <div className="flex items-start justify-between">
                            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <FileJson size={24} />
                            </div>
                            {!isSelectionMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteTree(tree.id); }}
                                    className="p-2 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                                    title="Delete Tree"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                                {tree.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock size={12} />
                                <span>Updated {formatDate(tree.updatedAt)}</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 flex gap-2">
                            <button
                                disabled={isSelectionMode}
                                onClick={() => navigate(`/editor/${tree.id}`)}
                                className="btn btn-primary w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Open Editor
                            </button>
                        </div>
                    </div>
                ))}

                {!isSelectionMode && trees.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                        <div className="p-4 rounded-full bg-slate-800 mb-4">
                            <Network size={32} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium mb-1">No rule trees yet</p>
                        <p className="text-sm">Create your first decision tree or Import from JSON.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
