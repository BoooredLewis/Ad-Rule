import { memo, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import clsx from 'clsx';
import { MoreHorizontal, Clock } from 'lucide-react';
import type { BlockData } from '../types';
import { useStore } from '../store/useStore';

const CustomNode = ({ id, data, selected }: NodeProps<BlockData>) => {
    const { blockType, label, config } = data;
    const updateNodeConfig = useStore(state => state.updateNodeConfig);
    const updateNodeLabel = useStore(state => state.updateNodeLabel);

    const handleChange = useCallback((key: string, value: any) => {
        updateNodeConfig(id, { [key]: value });
    }, [id, updateNodeConfig]);

    const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeLabel(id, e.target.value);
    }, [id, updateNodeLabel]);

    // Render Logic for Inputs
    const renderContent = () => {
        if (!config || blockType === 'sticky') return null;

        // --- CONDITION NODES ---
        if (blockType === 'condition') {
            const cat = config.conditionCategory;
            const isTimeBased = config.variableType === 'TIME_BASED';

            const renderTimeBadge = () => {
                if (!isTimeBased || !config.timeConfig) return null;
                const { mode, value, startHour, endHour } = config.timeConfig;

                let text = '';
                switch (mode) {
                    case 'X_DAYS_FROM_NOW': text = `+${value} Days`; break;
                    case 'X_DAYS_TILL_NOW': text = `Last ${value} Days`; break;
                    case 'X_HOURS_TILL_NOW': text = `Last ${value} Hrs`; break;
                    case 'WINDOW_DURING_HOURS': text = `+${value}d [${startHour}-${endHour}h]`; break;
                    case 'SPECIFIC_HOUR': text = `+${value}d @ ${startHour}h`; break;
                }

                return (
                    <div className="flex items-center gap-1 text-[9px] text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/50 mb-2 w-fit">
                        <Clock size={10} />
                        <span>{text}</span>
                    </div>
                );
            };

            // --- EXECUTION TIMING NODES (Custom UI) ---
            if (config.variableName === 'Current Hour') {
                const parts = (config.targetValue || '9-17').split('-');
                const start = parts[0] || '9';
                const end = parts[1] || '17';
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">Between</span>
                            <div className="flex items-center gap-1 flex-1">
                                <input
                                    type="number"
                                    min={0} max={23}
                                    className="nodrag w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-1 py-0.5 text-center focus:ring-1 focus:ring-cyan-500 outline-none"
                                    value={start}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        handleChange('targetValue', `${newStart}-${end}`);
                                    }}
                                />
                                <span className="text-slate-500">-</span>
                                <input
                                    type="number"
                                    min={0} max={23}
                                    className="nodrag w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-1 py-0.5 text-center focus:ring-1 focus:ring-cyan-500 outline-none"
                                    value={end}
                                    onChange={(e) => {
                                        const newEnd = e.target.value;
                                        handleChange('targetValue', `${start}-${newEnd}`);
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-400">H</span>
                        </div>
                    </div>
                );
            }

            if (config.variableName === 'Day of Week') {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const selectedDays = (config.targetValue || '').split(',').filter(Boolean);

                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                            <select
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 w-16 focus:ring-1 focus:ring-cyan-500 outline-none"
                                value={config.operator || 'IS'}
                                onChange={(e) => handleChange('operator', e.target.value)}
                            >
                                <option value="IS">IS</option>
                                <option value="IS_NOT">NOT</option>
                            </select>

                            <div className="relative flex-1 group">
                                <div className="nodrag w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-0.5 min-h-[24px] flex items-center overflow-hidden whitespace-nowrap cursor-pointer hover:border-cyan-500/50 transition-colors">
                                    {selectedDays.length > 0 ? selectedDays.join(', ') : <span className="text-slate-500 italic">Select days...</span>}
                                </div>
                                <div className="absolute top-full left-0 w-full pt-1 z-50 hidden group-hover:block">
                                    <div className="bg-slate-800 border border-slate-700 rounded shadow-xl p-1">
                                        {days.map(day => (
                                            <label key={day} className="flex items-center gap-2 p-1 hover:bg-slate-700 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDays.includes(day)}
                                                    onChange={(e) => {
                                                        let newDays;
                                                        if (e.target.checked) {
                                                            newDays = [...selectedDays, day];
                                                        } else {
                                                            newDays = selectedDays.filter(d => d !== day);
                                                        }
                                                        handleChange('targetValue', newDays.join(','));
                                                    }}
                                                    className="w-3 h-3 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-0"
                                                />
                                                <span className="text-[10px] text-slate-300">{day}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            if (config.variableName === 'Current Date') {
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                            <select
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 w-16 focus:ring-1 focus:ring-cyan-500 outline-none"
                                value={config.operator || 'IS'}
                                onChange={(e) => handleChange('operator', e.target.value)}
                            >
                                <option value="IS">IS</option>
                                <option value="IS_NOT">NOT</option>
                                <option value="GT">After</option>
                                <option value="LT">Before</option>
                            </select>
                            <input
                                type="date"
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-0.5 flex-1 min-w-0 focus:ring-1 focus:ring-cyan-500 outline-none"
                                value={config.targetValue || ''}
                                onChange={(e) => handleChange('targetValue', e.target.value)}
                            />
                        </div>
                    </div>
                );
            }

            if (cat === 'ENUM' || cat === 'NUMERIC') {
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        {renderTimeBadge()}
                        <div className="flex gap-2">
                            <select
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 w-16 focus:ring-1 focus:ring-cyan-500 outline-none"
                                value={config.operator || (cat === 'ENUM' ? 'IS' : 'EQ')}
                                onChange={(e) => handleChange('operator', e.target.value)}
                            >
                                {cat === 'ENUM' ? (
                                    <>
                                        <option value="IS">IS</option>
                                        <option value="IS_NOT">NOT</option>
                                        <option value="INCLUDES">IN</option>
                                        <option value="EXCLUDES">NOT IN</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="EQ">==</option>
                                        <option value="GT">&gt;</option>
                                        <option value="GTE">&gt;=</option>
                                        <option value="LT">&lt;</option>
                                        <option value="LTE">&lt;=</option>
                                    </>
                                )}
                            </select>

                            <input
                                type="text"
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-0.5 flex-1 min-w-0 focus:ring-1 focus:ring-cyan-500 outline-none"
                                placeholder="Value"
                                value={config.targetValue || ''}
                                onChange={(e) => handleChange('targetValue', e.target.value)}
                            />
                        </div>
                    </div>
                );
            }

            if (cat === 'COMPUTED' || cat === 'COMBINED') {
                const displayFormula = config.equation || 'No formula';

                return (
                    <div className="flex flex-col gap-2 mt-2">
                        {renderTimeBadge()}
                        <div className="text-[10px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800 break-all">
                            <span className="text-slate-600 mr-1">=</span>
                            {displayFormula}
                        </div>
                        {cat === 'COMBINED' && config.referencedBlockIds && config.referencedBlockIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {config.referencedBlockIds.map((blockId, idx) => {
                                    const block = useStore.getState().customBlocks.find(b => b.id === blockId);
                                    return block ? (
                                        <div key={idx} className="text-[9px] bg-cyan-900/30 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                            {block.label}
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        )}
                        {cat === 'COMBINED' && (
                            <div className="flex gap-2">
                                <select
                                    className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 w-16 focus:ring-1 focus:ring-cyan-500 outline-none"
                                    value={config.operator || 'EQ'}
                                    onChange={(e) => handleChange('operator', e.target.value)}
                                >
                                    <option value="EQ">==</option>
                                    <option value="GT">&gt;</option>
                                    <option value="GTE">&gt;=</option>
                                    <option value="LT">&lt;</option>
                                    <option value="LTE">&lt;=</option>
                                </select>

                                <input
                                    type="text"
                                    className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-0.5 flex-1 min-w-0 focus:ring-1 focus:ring-cyan-500 outline-none"
                                    placeholder="Value"
                                    value={config.targetValue || ''}
                                    onChange={(e) => handleChange('targetValue', e.target.value)}
                                />
                            </div>
                        )}
                        {cat === 'COMPUTED' && (
                            <textarea
                                className="nodrag w-full h-12 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded p-1.5 font-mono resize-none focus:ring-1 focus:ring-cyan-500 outline-none"
                                placeholder="Formula..."
                                value={config.equation || ''}
                                onChange={(e) => handleChange('equation', e.target.value)}
                            />
                        )}
                    </div>
                );
            }
        }

        // --- ACTION NODES ---
        if (blockType === 'action') {
            const cat = config.actionCategory;

            if (cat === 'SET_BID' || cat === 'SET_BUDGET') {
                return (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                            <select
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 w-20 focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={config.adjustmentType || 'PERCENTAGE'}
                                onChange={(e) => handleChange('adjustmentType', e.target.value)}
                            >
                                <option value="PERCENTAGE">%</option>
                                <option value="FIXED_AMOUNT">$</option>
                                <option value="ABSOLUTE">Abs</option>
                                <option value="EQUATION">Eq</option>
                            </select>
                            <input
                                type="text"
                                className="nodrag bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-0.5 flex-1 min-w-0 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder={config.adjustmentType === 'PERCENTAGE' ? "1.2" : "Value"}
                                value={config.adjustmentValue || ''}
                                onChange={(e) => handleChange('adjustmentValue', e.target.value)}
                            />
                        </div>
                    </div>
                );
            }

            if (cat === 'SET_BID_TYPE') {
                return (
                    <div className="mt-2">
                        <select
                            className="nodrag w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={config.bidStrategy || 'AUTO_BID'}
                            onChange={(e) => handleChange('bidStrategy', e.target.value)}
                        >
                            <option value="AUTO_BID">Auto Bid</option>
                            <option value="COST_CAP">Cost Cap</option>
                            <option value="TARGET_CPA">Target CPA</option>
                            <option value="TARGET_ROAS">Target ROAS</option>
                            <option value="AUTO_ROAS">Auto ROAS</option>
                        </select>
                    </div>
                );
            }

            if (cat === 'SET_STATUS' || cat === 'SET_VALUE_RULE_STATUS') {
                return (
                    <div className="mt-2 flex items-center justify-between bg-slate-900/50 p-1 rounded border border-slate-700">
                        <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Status</span>
                        <div className="flex gap-1">
                            <button
                                className={clsx("nodrag px-2 py-0.5 text-[10px] rounded transition-colors", config.statusValue === 'ACTIVE' ? "bg-green-500/20 text-green-400" : "text-slate-500 hover:text-slate-300")}
                                onClick={() => handleChange('statusValue', 'ACTIVE')}
                            >
                                Active
                            </button>
                            <button
                                className={clsx("nodrag px-2 py-0.5 text-[10px] rounded transition-colors", config.statusValue === 'INACTIVE' ? "bg-red-500/20 text-red-400" : "text-slate-500 hover:text-slate-300")}
                                onClick={() => handleChange('statusValue', 'INACTIVE')}
                            >
                                Inactive
                            </button>
                        </div>
                    </div>
                );
            }

            if (cat === 'COPY_AD') {
                return (
                    <div className="mt-2">
                        <select
                            className="nodrag w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={config.copyTarget || 'SAME_PLACE'}
                            onChange={(e) => handleChange('copyTarget', e.target.value)}
                        >
                            <option value="SAME_PLACE">Same Place</option>
                            <option value="EXISTING_CAMPAIGN">Existing Campaign</option>
                            <option value="NEW_CAMPAIGN">New Campaign</option>
                        </select>
                    </div>
                )
            }
        }
    };

    return (
        <div
            className={clsx(
                "relative min-w-[200px] p-2 rounded-lg border backdrop-blur-md transition-all",
                blockType === 'condition' && "bg-slate-800/90 border-cyan-500/30",
                blockType === 'action' && "bg-indigo-900/90 border-indigo-500/30",
                blockType === 'sticky' && "bg-yellow-200/90 border-yellow-400 text-slate-900",
                selected && "ring-2 ring-white/50 border-transparent shadow-[0_0_20px_rgba(99,102,241,0.5)]"
            )}
        >
            {blockType !== 'sticky' && (
                <div className="absolute top-2 right-2 z-10">
                    <MoreHorizontal className="w-4 h-4 text-slate-400 opacity-50 hover:opacity-100 cursor-pointer" />
                </div>
            )}

            {blockType === 'sticky' ? (
                <textarea
                    className="w-full h-full bg-transparent border-none resize-none outline-none text-slate-900 font-medium text-sm placeholder-slate-500/50"
                    value={label}
                    onChange={handleLabelChange}
                    placeholder="Type note here..."
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag when interacting
                />
            ) : (
                <div className="text-sm font-medium mb-2 text-slate-100 pr-6 break-words">
                    {label}
                </div>
            )}

            {renderContent()}

            {/* Inputs/Outputs for Logic Tree */}
            {blockType !== 'sticky' && (
                <>
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="!bg-slate-400 !w-2.5 !h-2.5 !border-none"
                    />

                    <Handle
                        type="source"
                        position={Position.Right}
                        className={clsx(
                            "!w-2.5 !h-2.5 !border-none",
                            blockType === 'condition' ? "!bg-cyan-500" : "!bg-indigo-500"
                        )}
                    />
                </>
            )}
        </div>
    );
};

export default memo(CustomNode);
