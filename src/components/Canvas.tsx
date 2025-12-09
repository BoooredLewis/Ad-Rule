import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    useReactFlow,
    Panel,
} from 'reactflow';
import type { Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import CustomNode from './CustomNode';
import { getLayoutedElements } from '../utils/layout';

const nodeTypes = {
    customNode: CustomNode,
};

function CanvasContent() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        addNode, setNodes, setEdges,
        copySubtree, pasteSubtree, addChild, removeNode, clipboard
    } = useStore();
    const { project, getNodes, getEdges } = useReactFlow();

    // Context Menu State
    const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current) return;

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/label');

            if (!type) return;

            const configStr = event.dataTransfer.getData('application/config');
            const config = configStr ? JSON.parse(configStr) : undefined;

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode: Node = {
                id: uuidv4(),
                type: 'customNode',
                position,
                data: { label: label, blockType: type, config },
            };

            addNode(newNode);
        },
        [project, addNode]
    );

    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            getNodes(),
            getEdges()
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [getNodes, getEdges, setNodes, setEdges]);

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            const pane = reactFlowWrapper.current?.getBoundingClientRect();
            if (pane) {
                setMenu({
                    id: node.id,
                    top: event.clientY - pane.top,
                    left: event.clientX - pane.left,
                });
            }
        },
        []
    );

    const onPaneClick = useCallback(() => setMenu(null), []);

    return (
        <div className="h-full w-full relative" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={() => true}  // Allow all connections including sticky notes
                onEdgeDoubleClick={(_, edge) => {
                    setEdges(getEdges().filter(e => e.id !== edge.id));
                }}
                nodeTypes={nodeTypes}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                fitView
            >
                <Background color="#334155" gap={24} size={1} />
                <Controls showInteractive={false} />
                <Panel position="top-right">
                    <button onClick={onLayout} className="btn btn-primary shadow-lg">
                        Auto Layout (LR)
                    </button>
                </Panel>
            </ReactFlow>

            {menu && (
                <div
                    className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 flex flex-col gap-1 w-56 animate-in fade-in zoom-in duration-100"
                    style={{ top: menu.top, left: menu.left }}
                >
                    <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700 font-bold mb-1">
                        Actions
                    </div>

                    <button
                        className="text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors flex items-center justify-between group"
                        onClick={() => { addChild(menu.id, 'condition', 'New Condition'); setMenu(null); }}
                    >
                        <span>Add Condition</span>
                        <span className="text-xs text-slate-600 group-hover:text-slate-500">Child</span>
                    </button>
                    <button
                        className="text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors flex items-center justify-between group"
                        onClick={() => { addChild(menu.id, 'action', 'New Action'); setMenu(null); }}
                    >
                        <span>Add Action</span>
                        <span className="text-xs text-slate-600 group-hover:text-slate-500">Child</span>
                    </button>

                    <div className="h-px bg-slate-700 my-1"></div>

                    <button
                        className="text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
                        onClick={() => { copySubtree(menu.id); setMenu(null); }}
                    >
                        Copy Subtree
                    </button>

                    <button
                        className="text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => { pasteSubtree(menu.id); setMenu(null); }}
                        disabled={!clipboard}
                    >
                        Paste Subtree
                    </button>

                    <div className="h-px bg-slate-700 my-1"></div>

                    <button
                        className="text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        onClick={() => { removeNode(menu.id); setMenu(null); }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Canvas() {
    return (
        <ReactFlowProvider>
            <CanvasContent />
        </ReactFlowProvider>
    )
}
