import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { CustomBlock, TimeConfig } from '../types';

interface FormulaPart {
    type: 'chip' | 'text';
    content: string;
    chipId?: string;
}

interface FormulaEditorProps {
    value: string;
    onChange: (formula: string, blockIds: string[]) => void;
    availableBlocks: CustomBlock[];
}

const isSameTimeConfig = (c1?: TimeConfig, c2?: TimeConfig): boolean => {
    if (!c1 || !c2) return !c1 && !c2;
    return c1.mode === c2.mode &&
        c1.value === c2.value &&
        c1.startHour === c2.startHour &&
        c1.endHour === c2.endHour;
};

export default function FormulaEditor({ value, onChange, availableBlocks }: FormulaEditorProps) {
    const [parts, setParts] = useState<FormulaPart[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [currentInput, setCurrentInput] = useState('');
    const [matches, setMatches] = useState<CustomBlock[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial value when component mounts or value changes
    useEffect(() => {
        if (!value) {
            setParts([]);
            setCursorPosition(0);
            return;
        }

        const parsedParts: FormulaPart[] = [];
        const chipPattern = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = chipPattern.exec(value)) !== null) {
            if (match.index > lastIndex) {
                const textBefore = value.substring(lastIndex, match.index).trim();
                if (textBefore) {
                    parsedParts.push({ type: 'text', content: textBefore });
                }
            }

            const chipLabel = match[1];
            const block = availableBlocks.find(b => b.label === chipLabel);
            if (block) {
                parsedParts.push({
                    type: 'chip',
                    content: chipLabel,
                    chipId: block.id
                });
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < value.length) {
            const textAfter = value.substring(lastIndex).trim();
            if (textAfter) {
                parsedParts.push({ type: 'text', content: textAfter });
            }
        }

        setParts(parsedParts);
        setCursorPosition(parsedParts.length);
    }, [value, availableBlocks]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        if (newValue.endsWith(' ') && !currentInput.endsWith(' ')) {
            const word = newValue.trim();

            if (word && /[a-zA-Z]/.test(word)) {

                const filtered = availableBlocks.filter(block => {
                    const timeBased = block.config?.variableType === 'TIME_BASED';
                    const cat = block.config?.conditionCategory;
                    const numOrComp = cat === 'NUMERIC' || cat === 'COMPUTED';
                    const labelLower = block.label.toLowerCase();
                    const wordLower = word.toLowerCase();
                    const matches = labelLower.includes(wordLower);

                    // Only show TIME_BASED conditions
                    if (!timeBased) return false;
                    // Only NUMERIC and COMPUTED categories
                    if (!numOrComp) return false;

                    return matches;
                });

                if (filtered.length > 0) {
                    setMatches(filtered);
                    setShowDropdown(true);
                    setCurrentInput(newValue);
                    return;
                }
            }

            // Only add as text if it's an operator (no letters) or purely numeric
            if (word.trim() && !/[a-zA-Z]/.test(word)) {
                insertPart({ type: 'text', content: word });
                setCurrentInput('');
                return;
            }

            // If it contains letters but no matches, keep the input (don't add as text)
            // User can manually clear or continue typing
        }

        setCurrentInput(newValue);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Arrow left: move cursor left
        if (e.key === 'ArrowLeft' && currentInput === '') {
            e.preventDefault();
            setCursorPosition(Math.max(0, cursorPosition - 1));
            return;
        }

        // Arrow right: move cursor right
        if (e.key === 'ArrowRight' && currentInput === '') {
            e.preventDefault();
            setCursorPosition(Math.min(parts.length, cursorPosition + 1));
            return;
        }

        // Backspace: delete part before cursor or from input
        if (e.key === 'Backspace') {
            if (currentInput === '' && cursorPosition > 0) {
                e.preventDefault();
                const newParts = [...parts];
                newParts.splice(cursorPosition - 1, 1);
                setParts(newParts);
                setCursorPosition(cursorPosition - 1);
                notifyChange(newParts);
            }
            return;
        }

        // Delete: delete part after cursor
        if (e.key === 'Delete' && currentInput === '' && cursorPosition < parts.length) {
            e.preventDefault();
            const newParts = [...parts];
            newParts.splice(cursorPosition, 1);
            setParts(newParts);
            notifyChange(newParts);
        }
    };

    const selectBlock = (block: CustomBlock) => {
        insertPart({ type: 'chip', content: block.label, chipId: block.id });
        setCurrentInput('');
        setMatches([]);
        setShowDropdown(false);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const insertPart = (part: FormulaPart) => {
        const newParts = [...parts];
        newParts.splice(cursorPosition, 0, part);
        setParts(newParts);
        setCursorPosition(cursorPosition + 1);
        notifyChange(newParts);
    };

    const removePart = (index: number) => {
        const newParts = parts.filter((_, i) => i !== index);
        setParts(newParts);
        setCursorPosition(Math.min(cursorPosition, newParts.length));
        notifyChange(newParts);
    };

    const moveCursorTo = (position: number) => {
        setCursorPosition(position);
        inputRef.current?.focus();
    };

    const dismissDropdown = () => {
        setShowDropdown(false);
        setMatches([]);
        setCurrentInput('');
    };

    const notifyChange = (currentParts: FormulaPart[]) => {
        const formula = currentParts.map(p =>
            p.type === 'chip' ? `[${p.content}]` : ` ${p.content} `
        ).join('').trim();

        const blockIds = currentParts
            .filter(p => p.type === 'chip' && p.chipId)
            .map(p => p.chipId!);

        onChange(formula, blockIds);
    };

    return (
        <div className="relative">
            <div
                ref={containerRef}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 min-h-[38px] flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-cyan-500"
                onClick={() => inputRef.current?.focus()}
            >
                {parts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-0.5">
                        {/* Show input and cursor at this position */}
                        {cursorPosition === idx && (
                            <>
                                <div className="w-0.5 h-5 bg-cyan-400 animate-pulse" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={currentInput}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder=""
                                    className="w-24 bg-transparent border-none text-sm font-mono text-slate-200 outline-none"
                                    autoFocus
                                />
                            </>
                        )}

                        {part.type === 'chip' ? (
                            <div
                                className="flex items-center gap-1 bg-cyan-900/40 text-cyan-200 px-2 py-0.5 rounded text-xs border border-cyan-500/30 shrink-0 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveCursorTo(idx + 1);
                                }}
                            >
                                <span>{part.content}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removePart(idx);
                                    }}
                                    className="hover:text-cyan-100"
                                    tabIndex={-1}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <div
                                className="text-slate-300 text-sm font-mono cursor-pointer px-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveCursorTo(idx + 1);
                                }}
                            >
                                {part.content}
                            </div>
                        )}
                    </div>
                ))}

                {/* Cursor and input at the end */}
                {cursorPosition === parts.length && (
                    <>
                        <div className="w-0.5 h-5 bg-cyan-400 animate-pulse" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={currentInput}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={parts.length === 0 ? "Type condition name + space" : ""}
                            className="flex-1 min-w-[120px] bg-transparent border-none text-sm font-mono text-slate-200 outline-none placeholder-slate-600"
                            autoFocus
                        />
                    </>
                )}
            </div>

            <div className="text-[10px] text-slate-400 mt-1">
                💡 Type + space to add | ← → arrows to move cursor | Backspace/Delete to remove | Click to position cursor
            </div>

            {/* Dropdown */}
            {showDropdown && matches.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 max-h-40 overflow-y-auto">
                    <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-3 py-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Select condition:</span>
                        <button
                            type="button"
                            onClick={dismissDropdown}
                            className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                            Dismiss
                        </button>
                    </div>
                    {matches.map(block => (
                        <button
                            key={block.id}
                            type="button"
                            onClick={() => selectBlock(block)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-2"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                            <span className="flex-1">{block.label}</span>
                            <span className="text-[10px] text-slate-500">
                                {block.config?.conditionCategory}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
