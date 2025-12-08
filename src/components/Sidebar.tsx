import { useState } from 'react';
import type { DragEvent } from 'react';
import { FileCode2, GitFork, Plus, Clock, Activity, DollarSign, Copy, MousePointerClick, Settings, ChevronDown, ChevronRight, StickyNote, Package, Download, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from './Modal';
import FormulaEditor from './FormulaEditor';
import type {
    ConditionCategory,
    ActionCategory,
    BlockConfig,
    TimeMode,
    TimeConfig,
    CustomBlock
} from '../types';

// Collapsible Section Component
const SidebarCategory = ({ title, count, icon: Icon, children, defaultOpen = true }: { title: string, count?: number, icon?: any, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-800 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold uppercase text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <div className="flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-slate-500" />}
                        {title}
                    </div>
                </div>
                {count !== undefined && (
                    <span className="bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                )}
            </button>
            {isOpen && (
                <div className="p-3 pt-0 flex flex-col gap-2">
                    {children}
                </div>
            )}
        </div>
    );
};

const PREBUILT_CONDITIONS: { label: string; icon: any; config: BlockConfig }[] = [
    {
        label: 'Hours Window',
        icon: Clock,
        config: {
            conditionCategory: 'NUMERIC', // Treating it as numeric range
            variableName: 'Current Hour',
            operator: 'BETWEEN',
            targetValue: '9-17' // Default window
        }
    },
    {
        label: 'Day of Week',
        icon: Activity, // Reuse Activity or another appropriate icon
        config: {
            conditionCategory: 'ENUM',
            variableName: 'Day of Week',
            operator: 'IS',
            targetValue: 'Monday'
        }
    },
    {
        label: 'Absolute Date',
        icon: Clock, // Reuse Clock
        config: {
            conditionCategory: 'NUMERIC', // Changed to NUMERIC to match logic
            variableName: 'Current Date',
            operator: 'IS',
            targetValue: new Date().toISOString().split('T')[0] // Default to today YYYY-MM-DD
        }
    }
];

// Static Pre-built Actions
const PREBUILT_ACTIONS: { label: string; category: ActionCategory; icon: any }[] = [
    { label: 'Set Bid', category: 'SET_BID', icon: DollarSign },
    { label: 'Set Budget', category: 'SET_BUDGET', icon: DollarSign },
    { label: 'Set Bid Strategy', category: 'SET_BID_TYPE', icon: Settings },
    { label: 'Set Status', category: 'SET_STATUS', icon: Activity },
    { label: 'Set Value Rule', category: 'SET_VALUE_RULE_STATUS', icon: MousePointerClick },
    { label: 'Copy Ad', category: 'COPY_AD', icon: Copy },
];

export default function Sidebar() {
    const { customBlocks, addCustomBlock, removeCustomBlock, updateCustomBlock } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Logic Config State
    const [condCategory, setCondCategory] = useState<ConditionCategory>('ENUM');
    const [varName, setVarName] = useState('');

    // Combined Condition State
    const [combinedFormula, setCombinedFormula] = useState('');
    const [referencedBlockIds, setReferencedBlockIds] = useState<string[]>([]);

    // Edit Mode State
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Time Config State
    const [isTimeBased, setIsTimeBased] = useState(false);
    const [timeMode, setTimeMode] = useState<TimeMode>('X_DAYS_FROM_NOW');
    const [timeValue, setTimeValue] = useState<number>(0);
    const [startHour, setStartHour] = useState<number>(0);
    const [endHour, setEndHour] = useState<number>(23);

    // Categorize Blocks
    const conditionBlocks = customBlocks.filter(b => b.blockType === 'condition');

    const resetForm = () => {
        setCondCategory('ENUM');
        setVarName('');
        setCombinedFormula('');
        setReferencedBlockIds([]);
        setIsTimeBased(false);
        setTimeMode('X_DAYS_FROM_NOW');
        setTimeValue(0);
        setTimeValue(0);
        setStartHour(0);
        setEndHour(23);
        setEditingBlockId(null);
        setIsEditMode(false);
    };

    const onDragStart = (event: DragEvent, nodeType: string, label: string, config?: BlockConfig) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/label', label);
        if (config) {
            event.dataTransfer.setData('application/config', JSON.stringify(config));
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleExport = async () => {
        const data = { customBlocks };
        const jsonString = JSON.stringify(data, null, 2);

        try {
            // @ts-ignore
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'custom_conditions.json',
                    types: [{
                        description: 'JSON File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                return;
            }
        } catch (err) {
            // Ignore abort errors
            if (err instanceof Error && err.name === 'AbortError') return;
            console.warn('File save picker failed, falling back to download', err);
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "custom_conditions.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const json = event.target?.result as string;
            if (json) {
                useStore.getState().importData(json);
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handleEditBlock = (block: CustomBlock) => {
        setEditingBlockId(block.id);
        setIsEditMode(true);
        setVarName(block.label);
        setCondCategory(block.config?.conditionCategory || 'ENUM');

        // Populate time-based settings if applicable
        if (block.config?.variableType === 'TIME_BASED') {
            setIsTimeBased(true);
            const tc = block.config.timeConfig;
            if (tc) {
                setTimeMode(tc.mode);
                setTimeValue(tc.value || 0);
                setStartHour(tc.startHour || 0);
                setEndHour(tc.endHour || 23);
            }
        } else {
            setIsTimeBased(false);
        }

        // Populate combined formula if applicable
        if (block.config?.conditionCategory === 'COMBINED') {
            setCombinedFormula(block.config.equation || '');
            setReferencedBlockIds(block.config.referencedBlockIds || []);
        }

        setIsModalOpen(true);
    };

    const handleCreateCondition = (e: React.FormEvent) => {
        e.preventDefault();
        if (!varName.trim()) return;

        let finalName = varName;

        const config: BlockConfig = {
            conditionCategory: condCategory,
            variableType: isTimeBased ? 'TIME_BASED' : 'STATIC',
        };

        if (condCategory === 'COMBINED') {
            // Validate: must have at least one referenced block
            if (referencedBlockIds.length === 0) {
                alert('Combined condition must reference at least one condition block. Make sure to select conditions from the dropdown, not just type text.');
                return;
            }

            // Validate: formula should only contain chips and operators, not plain text
            const chipPattern = /\[([^\]]+)\]/g;
            const formulaWithoutChips = combinedFormula.replace(chipPattern, '').trim();
            if (formulaWithoutChips && /[a-zA-Z]/.test(formulaWithoutChips)) {
                alert('Invalid formula: Contains plain text. Please select conditions from the dropdown instead of typing condition names. Only operators (+, -, *, /, parentheses) and condition chips are allowed.');
                return;
            }

            // For combined, inherit time config from first referenced block
            config.equation = combinedFormula;
            config.referencedBlockIds = referencedBlockIds;

            if (referencedBlockIds.length > 0) {
                const firstBlock = customBlocks.find(b => b.id === referencedBlockIds[0]);
                if (firstBlock?.config?.variableType === 'TIME_BASED') {
                    config.variableType = 'TIME_BASED';
                    config.timeConfig = firstBlock.config.timeConfig;

                    // Generate time suffix for COMBINED condition name
                    const tc = firstBlock.config.timeConfig;
                    if (tc) {
                        let suffix = '';
                        if (tc.mode === 'X_DAYS_FROM_NOW') {
                            if (tc.value === 0) {
                                suffix = ' - Today';
                            } else if (tc.value && tc.value > 0) {
                                suffix = ` - ${tc.value} days ago`;
                            }
                        } else if (tc.mode === 'X_HOURS_TILL_NOW') {
                            suffix = ` - Last ${tc.value} Hours`;
                        }

                        if (tc.mode === 'WINDOW_DURING_HOURS') {
                            suffix += ` [${tc.startHour}h-${tc.endHour}h]`;
                        }
                        if (tc.mode === 'SPECIFIC_HOUR') {
                            suffix += ` @ ${tc.startHour}h`;
                        }

                        finalName = `${varName}${suffix}`;
                    }
                }
            }
        } else if (isTimeBased) {
            const tConfig: TimeConfig = { mode: timeMode };

            // Format Name based on selection
            let suffix = '';

            tConfig.value = timeValue;

            // Logic per user request:
            // If X_DAYS_FROM_NOW (or similar relative modes): 
            // value 0 => Today
            // value > 0 => X days ago
            if (timeMode === 'X_DAYS_FROM_NOW' || timeMode === 'X_DAYS_TILL_NOW') {
                if (timeValue === 0) {
                    suffix = ' - Today';
                } else if (timeValue > 0) {
                    suffix = ` - ${timeValue} days ago`;
                }
            } else if (timeMode === 'X_HOURS_TILL_NOW') {
                suffix = ` - Last ${timeValue} Hours`;
            }

            if (timeMode === 'WINDOW_DURING_HOURS') {
                tConfig.startHour = startHour;
                tConfig.endHour = endHour;
                suffix += ` [${startHour}h-${endHour}h]`;
            }
            if (timeMode === 'SPECIFIC_HOUR') {
                tConfig.startHour = startHour;
                suffix += ` @ ${startHour}h`;
            }
            config.timeConfig = tConfig;
            finalName = `${varName}${suffix}`;
        }

        config.variableName = finalName;

        // Update or create based on edit mode
        if (isEditMode && editingBlockId) {
            updateCustomBlock(editingBlockId, finalName, config);
        } else {
            addCustomBlock(finalName, 'condition', config);
        }

        resetForm();
        setIsModalOpen(false);
    };

    return (
        <>
            <aside className="w-64 border-r border-slate-800 bg-slate-900/95 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <span className="font-semibold text-slate-200">Library</span>
                    <div className="flex gap-2">
                        <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors shadow-sm border border-slate-700" title="Import Conditions">
                            <Upload size={14} />
                            <input type="file" onChange={handleImport} accept=".json" className="hidden" />
                        </label>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors shadow-sm border border-slate-700"
                            title="Export Conditions"
                        >
                            <Download size={14} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
                            title="Create New Condition"
                        >
                            <Plus size={14} />
                            <span>New</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Conditions */}
                    <SidebarCategory title="Conditions" count={conditionBlocks.length} icon={GitFork}>
                        {conditionBlocks.length === 0 ? (
                            <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-lg">
                                <p className="text-xs text-slate-600">No custom conditions.</p>
                                <button onClick={() => setIsModalOpen(true)} className="text-[10px] text-indigo-400 hover:underline mt-1">Create one</button>
                            </div>
                        ) : (
                            conditionBlocks.map(block => (
                                <div
                                    key={block.id}
                                    className="flex items-center justify-between gap-3 p-2 rounded border border-slate-800 bg-slate-800/20 cursor-grab hover:bg-slate-800 hover:border-cyan-500/30 transition-all group"
                                    onDragStart={(event) => onDragStart(event, block.blockType, block.label, block.config)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleEditBlock(block);
                                    }}
                                    draggable
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 rounded bg-cyan-900/30 text-cyan-400">
                                            {block.config?.variableType === 'TIME_BASED' ? <Clock size={14} /> : <GitFork size={14} />}
                                        </div>
                                        <span className="text-sm text-slate-300 truncate">{block.label}</span>
                                    </div>
                                    <button
                                        onClick={() => removeCustomBlock(block.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                    >
                                        <Plus size={14} className="rotate-45" />
                                    </button>
                                </div>
                            ))
                        )
                        }
                    </SidebarCategory >

                    {/* Actions */}
                    < SidebarCategory title="Actions" count={PREBUILT_ACTIONS.length} icon={FileCode2} >
                        {
                            PREBUILT_ACTIONS.map((action, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between gap-3 p-2 rounded border border-slate-800 bg-slate-800/20 cursor-grab hover:bg-slate-800 hover:border-indigo-500/30 transition-all group"
                                    onDragStart={(event) => onDragStart(event, 'action', action.label, { actionCategory: action.category })}
                                    draggable
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 rounded bg-indigo-900/30 text-indigo-400">
                                            <action.icon size={14} />
                                        </div>
                                        <span className="text-sm text-slate-300 truncate">{action.label}</span>
                                    </div>
                                </div>
                            ))
                        }
                    </SidebarCategory >

                    <SidebarCategory title="Execution Timing" count={PREBUILT_CONDITIONS.length} icon={Clock}>
                        {PREBUILT_CONDITIONS.map((cond, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-3 p-2 rounded border border-slate-800 bg-slate-800/20 cursor-grab hover:bg-slate-800 hover:border-amber-500/30 transition-all group"
                                onDragStart={(event) => onDragStart(event, 'condition', cond.label, cond.config)}
                                draggable
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-1.5 rounded bg-amber-900/30 text-amber-400">
                                        <cond.icon size={14} />
                                    </div>
                                    <span className="text-sm text-slate-300 truncate">{cond.label}</span>
                                </div>
                            </div>
                        ))}
                    </SidebarCategory>

                    {/* Tools */}
                    < SidebarCategory title="Tools" defaultOpen={false} icon={Package} >
                        <div
                            className="flex items-center gap-3 p-2 rounded border border-slate-800 bg-slate-800/20 cursor-grab hover:bg-slate-800 hover:border-yellow-500/30 transition-all group"
                            onDragStart={(event) => onDragStart(event, 'sticky', 'Note')}
                            draggable
                        >
                            <div className="p-1.5 rounded bg-yellow-900/30 text-yellow-400">
                                <StickyNote size={14} />
                            </div>
                            <span className="text-sm text-slate-300">Sticky Note</span>
                        </div>
                    </SidebarCategory >
                </div >
            </aside >

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? "Edit Condition" : "New Condition"}
            >
                <form onSubmit={handleCreateCondition} className="flex flex-col gap-4">

                    <div className="space-y-4">
                        {/* Condition Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
                                <select value={condCategory} onChange={e => setCondCategory(e.target.value as any)} className="w-full text-sm">
                                    <option value="ENUM">Text / Enum</option>
                                    <option value="NUMERIC">Numeric</option>
                                    <option value="COMPUTED">Computed</option>
                                    <option value="COMBINED">Combined (Advanced)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Variable</label>
                                <input
                                    type="text"
                                    value={varName}
                                    onChange={e => setVarName(e.target.value)}
                                    placeholder={condCategory === 'COMBINED' ? "e.g. ROI" : "e.g. Sales"}
                                    className="w-full text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-800"></div>

                        {/* COMBINED Formula Editor */}
                        {condCategory === 'COMBINED' && (
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                        Formula
                                    </label>
                                    <FormulaEditor
                                        value={combinedFormula}
                                        onChange={(formula, blockIds) => {
                                            setCombinedFormula(formula);
                                            setReferencedBlockIds(blockIds);
                                        }}
                                        availableBlocks={conditionBlocks}
                                        timeConfig={referencedBlockIds.length > 0
                                            ? customBlocks.find(b => b.id === referencedBlockIds[0])?.config?.timeConfig
                                            : undefined
                                        }
                                    />
                                </div>
                                <div className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
                                    <span className="font-bold">ℹ️ How it works:</span>
                                    <ul className="mt-1 space-y-0.5 ml-3 list-disc">
                                        <li>Type condition names and press space</li>
                                        <li>Select from dropdown to insert as block</li>
                                        <li>All blocks must have same time config</li>
                                        <li>Only +-*/() operators allowed</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Time Sensitive Toggle */}
                        {condCategory !== 'COMBINED' && (
                            <>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isTimeBased}
                                            onChange={e => setIsTimeBased(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200">Time Sensitive</span>
                                            <span className="text-[10px] text-slate-500">Variable changes with time</span>
                                        </div>
                                    </label>
                                </div>

                                {isTimeBased && (
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div>
                                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Time Mode</label>
                                            <select value={timeMode} onChange={e => setTimeMode(e.target.value as any)} className="w-full text-xs">
                                                <option value="X_DAYS_FROM_NOW">📅 X Days From Now (Offset)</option>
                                                <option value="X_DAYS_TILL_NOW">⏪ X Days Till Now (Last X)</option>
                                                <option value="X_HOURS_TILL_NOW">⏱️ X Hours Till Now</option>
                                                <option value="WINDOW_DURING_HOURS">🕒 X Days + Hour Window</option>
                                                <option value="SPECIFIC_HOUR">⌚ X Days @ Specific Hour</option>
                                            </select>
                                        </div>

                                        {/* Dynamic Inputs based on Mode */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 mb-1 block">
                                                    Value (X)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={timeValue}
                                                    onChange={e => setTimeValue(Number(e.target.value))}
                                                    className="w-full text-xs"
                                                />
                                                <span className="text-[10px] text-slate-600">0 = Today/Now</span>
                                            </div>

                                            {(timeMode === 'WINDOW_DURING_HOURS' || timeMode === 'SPECIFIC_HOUR') && (
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">
                                                        {timeMode === 'SPECIFIC_HOUR' ? 'At Hour (0-23)' : 'Start Hour'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0} max={23}
                                                        value={startHour}
                                                        onChange={e => setStartHour(Number(e.target.value))}
                                                        className="w-full text-xs"
                                                    />
                                                </div>
                                            )}

                                            {timeMode === 'WINDOW_DURING_HOURS' && (
                                                <div>
                                                    <label className="text-[10px] text-slate-400 mb-1 block">End Hour</label>
                                                    <input
                                                        type="number"
                                                        min={0} max={23}
                                                        value={endHour}
                                                        onChange={e => setEndHour(Number(e.target.value))}
                                                        className="w-full text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div >
                                )
                                }
                            </>
                        )}
                    </div >

                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!varName.trim()}
                            className="btn btn-primary"
                        >
                            {isEditMode ? "Update" : "Create"}
                        </button>
                    </div>
                </form >
            </Modal >
        </>
    );
}
