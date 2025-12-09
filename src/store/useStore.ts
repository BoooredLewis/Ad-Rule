import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RuleTree, PersistedNode, PersistedEdge, CustomBlock, NodeType, BlockConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import type {
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    Connection
} from 'reactflow';

interface TreeState {
    trees: RuleTree[];
    activeTreeId: string | null;
    customBlocks: CustomBlock[];

    nodes: Node[];
    edges: Edge[];
    clipboard: { rootId: string; nodes: Node[]; edges: Edge[] } | null;

    // Actions
    createTree: (name: string) => void;
    deleteTree: (id: string) => void;
    importData: (jsonData: string) => boolean;
    getExportData: (selectedTreeIds?: string[]) => string;
    setActiveTree: (id: string | null) => void;
    updateTreeName: (id: string, name: string) => void;
    saveActiveTree: () => void;

    // ReactFlow
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (node: Node) => void;
    addChild: (parentId: string, type: NodeType, label: string) => void;
    removeNode: (id: string) => void;

    // Custom Blocks (Updated signature)
    addCustomBlock: (label: string, type: NodeType, config?: BlockConfig) => void;
    removeCustomBlock: (id: string) => void;
    updateCustomBlock: (id: string, label: string, config?: BlockConfig) => void;

    // Node Updates
    updateNodeConfig: (nodeId: string, config: Partial<BlockConfig>) => void;
    updateNodeLabel: (nodeId: string, label: string) => void;

    // Clipboard
    copySubtree: (nodeId: string) => void;
    pasteSubtree: (targetParentId?: string, position?: { x: number; y: number }) => void;
}

export const useStore = create<TreeState>()(
    persist(
        (set, get) => ({
            trees: [],
            activeTreeId: null,
            customBlocks: [],
            nodes: [],
            edges: [],
            clipboard: null,

            createTree: (name) => {
                const newTree: RuleTree = {
                    id: uuidv4(),
                    name,
                    nodes: [],
                    edges: [],
                    updatedAt: Date.now(),
                };
                set((state) => ({
                    trees: [...state.trees, newTree],
                    activeTreeId: newTree.id,
                    nodes: [],
                    edges: []
                }));
            },

            deleteTree: (id) => {
                set((state) => ({
                    trees: state.trees.filter((t) => t.id !== id),
                    activeTreeId: state.activeTreeId === id ? null : state.activeTreeId,
                    nodes: state.activeTreeId === id ? [] : state.nodes,
                    edges: state.activeTreeId === id ? [] : state.edges,
                }));
            },

            importData: (jsonData) => {
                try {
                    const data = JSON.parse(jsonData);
                    let hasUpdates = false;
                    const state = get();

                    // Import Trees with Conflict Resolution
                    if (data.trees && Array.isArray(data.trees)) {
                        const newTrees = data.trees.map((importedTree: RuleTree) => {
                            let name = importedTree.name;
                            let attempt = 1;
                            while (state.trees.some(t => t.name === name)) {
                                name = `${importedTree.name} (${attempt})`;
                                attempt++;
                            }
                            return { ...importedTree, id: uuidv4(), name, updatedAt: Date.now() }; // New ID for imported tree
                        });

                        set((current) => ({
                            trees: [...current.trees, ...newTrees]
                        }));
                        hasUpdates = true;
                    }

                    // Import Custom Blocks with Conflict Resolution
                    if (data.customBlocks && Array.isArray(data.customBlocks)) {
                        const existingNames = new Set(state.customBlocks.map(b => b.config?.variableName || b.label));

                        // Build ID mapping: old ID -> new ID
                        const idMapping = new Map<string, string>();

                        // First pass: create blocks with new IDs and build mapping
                        const newBlocks = data.customBlocks.map((importedBlock: CustomBlock) => {
                            const newId = uuidv4();
                            idMapping.set(importedBlock.id, newId);

                            const blockName = importedBlock.config?.variableName || importedBlock.label;

                            if (!existingNames.has(blockName)) {
                                return { ...importedBlock, id: newId };
                            }

                            let name = blockName;
                            let attempt = 1;
                            while (existingNames.has(name)) {
                                name = `${blockName} (${attempt})`;
                                attempt++;
                            }

                            const newConfig = importedBlock.config ? { ...importedBlock.config, variableName: name } : undefined;
                            return { ...importedBlock, id: newId, label: name, config: newConfig };
                        });

                        // Second pass: update referencedBlockIds in COMBINED conditions
                        newBlocks.forEach((block: CustomBlock) => {
                            if (block.config?.conditionCategory === 'COMBINED' && block.config.referencedBlockIds) {
                                block.config.referencedBlockIds = block.config.referencedBlockIds.map(
                                    (oldId: string) => idMapping.get(oldId) || oldId
                                );
                            }
                        });

                        set((current) => ({
                            customBlocks: [...current.customBlocks, ...newBlocks]
                        }));
                        hasUpdates = true;
                    }

                    return hasUpdates;
                } catch (e) {
                    console.error("Import failed", e);
                    return false;
                }
            },

            getExportData: (selectedTreeIds?: string[]) => {
                const { trees, customBlocks } = get();
                // Ensure nodes/edges are up to date for active tree before export
                const activeId = get().activeTreeId;
                let currentTrees = trees;

                // Sync active tree state
                if (activeId) {
                    currentTrees = trees.map(t =>
                        t.id === activeId
                            ? { ...t, nodes: get().nodes as PersistedNode[], edges: get().edges as PersistedEdge[], updatedAt: Date.now() }
                            : t
                    );
                }

                // Filter if selection provided
                if (selectedTreeIds) {
                    currentTrees = currentTrees.filter(t => selectedTreeIds.includes(t.id));
                }

                return JSON.stringify({ trees: currentTrees, customBlocks }, null, 2);
            },

            setActiveTree: (id) => {
                const state = get();
                if (!id) {
                    set({ activeTreeId: null, nodes: [], edges: [] });
                    return;
                }
                const tree = state.trees.find(t => t.id === id);
                if (tree) {
                    set({
                        activeTreeId: id,
                        nodes: tree.nodes as Node[],
                        edges: tree.edges as Edge[]
                    });
                }
            },

            updateTreeName: (id, name) => {
                set((state) => ({
                    trees: state.trees.map(t => t.id === id ? { ...t, name } : t)
                }));
            },

            saveActiveTree: () => {
                const { activeTreeId, nodes, edges, trees } = get();
                if (!activeTreeId) return;
                set({
                    trees: trees.map(t =>
                        t.id === activeTreeId
                            ? {
                                ...t,
                                nodes: nodes as PersistedNode[],
                                edges: edges as PersistedEdge[],
                                updatedAt: Date.now()
                            }
                            : t
                    )
                });
            },

            onNodesChange: (changes) => {
                set({ nodes: applyNodeChanges(changes, get().nodes) });
            },

            onEdgesChange: (changes) => {
                set({ edges: applyEdgeChanges(changes, get().edges) });
            },

            onConnect: (connection) => {
                set({ edges: addEdge(connection, get().edges) });
            },

            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),

            addNode: (node) => {
                set((state) => ({ nodes: [...state.nodes, node] }));
            },

            addChild: (parentId, type, label) => {
                const { nodes, edges } = get();
                const parent = nodes.find(n => n.id === parentId);
                if (!parent) return;

                const newNodeId = uuidv4();
                const newNode: Node = {
                    id: newNodeId,
                    type: 'customNode',
                    position: { x: parent.position.x + 250, y: parent.position.y },
                    data: { label, blockType: type }
                };

                const newEdge: Edge = {
                    id: uuidv4(),
                    source: parentId,
                    target: newNodeId,
                };

                set({
                    nodes: [...nodes, newNode],
                    edges: [...edges, newEdge]
                });
            },

            removeNode: (id) => {
                const { nodes, edges } = get();
                const nodesToRemove = new Set<string>();
                const edgesToRemove = new Set<string>();

                const traverse = (currentId: string) => {
                    nodesToRemove.add(currentId);
                    const childrenEdges = edges.filter(e => e.source === currentId);
                    childrenEdges.forEach(edge => {
                        edgesToRemove.add(edge.id);
                        traverse(edge.target);
                    });
                };
                traverse(id);
                edges.filter(e => e.target === id).forEach(e => edgesToRemove.add(e.id));

                set({
                    nodes: nodes.filter(n => !nodesToRemove.has(n.id)),
                    edges: edges.filter(e => !edgesToRemove.has(e.id))
                });
            },

            addCustomBlock: (label, type, config) => {
                set((state) => ({
                    customBlocks: [...state.customBlocks, { id: uuidv4(), label, blockType: type, config }]
                }));
            },

            removeCustomBlock: (id) => {
                set((state) => ({
                    customBlocks: state.customBlocks.filter(b => b.id !== id)
                }));
            },

            updateCustomBlock: (id, label, config) => {
                set((state) => {
                    // Update the custom block
                    const updatedBlocks = state.customBlocks.map(block =>
                        block.id === id
                            ? { ...block, label, config }
                            : block
                    );

                    // Also update any nodes on canvas using this block
                    const updatedNodes = state.nodes.map(node => {
                        if (node.data?.customBlockId === id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    label,
                                    config
                                }
                            };
                        }
                        return node;
                    });

                    return {
                        customBlocks: updatedBlocks,
                        nodes: updatedNodes
                    };
                });
            },

            updateNodeConfig: (nodeId, partialConfig) => {
                set((state) => ({
                    nodes: state.nodes.map(node => {
                        if (node.id === nodeId) {
                            const currentConfig = node.data.config || {};
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    config: { ...currentConfig, ...partialConfig }
                                }
                            };
                        }
                        return node;
                    })
                }));
            },

            updateNodeLabel: (nodeId, label) => {
                set((state) => ({
                    nodes: state.nodes.map(node => {
                        if (node.id === nodeId) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    label
                                }
                            };
                        }
                        return node;
                    })
                }));
            },

            copySubtree: (nodeId) => {
                const { nodes, edges } = get();
                const nodesToCopy: Node[] = [];
                const edgesToCopy: Edge[] = [];
                const visited = new Set<string>();

                const traverse = (currentId: string) => {
                    if (visited.has(currentId)) return;
                    visited.add(currentId);
                    const node = nodes.find(n => n.id === currentId);
                    if (node) nodesToCopy.push(node);

                    const outgoing = edges.filter(e => e.source === currentId);
                    outgoing.forEach(edge => {
                        edgesToCopy.push(edge);
                        traverse(edge.target);
                    });
                };

                traverse(nodeId);
                set({ clipboard: { rootId: nodeId, nodes: nodesToCopy, edges: edgesToCopy } });
            },

            pasteSubtree: (targetParentId, position) => {
                const { clipboard, nodes, edges } = get();
                if (!clipboard) return;

                const { rootId, nodes: clipNodes, edges: clipEdges } = clipboard;

                const idMap = new Map<string, string>();
                clipNodes.forEach(n => idMap.set(n.id, uuidv4()));

                // Smart positioning: find non-overlapping position
                let offset = { x: 0, y: 0 };

                if (!position) {
                    // Calculate bounding box of clipboard nodes
                    const clipBounds = {
                        minX: Math.min(...clipNodes.map(n => n.position.x)),
                        maxX: Math.max(...clipNodes.map(n => n.position.x + 300)), // NODE_WIDTH
                        minY: Math.min(...clipNodes.map(n => n.position.y)),
                        maxY: Math.max(...clipNodes.map(n => n.position.y + 160))  // NODE_HEIGHT
                    };
                    const clipWidth = clipBounds.maxX - clipBounds.minX;
                    const clipHeight = clipBounds.maxY - clipBounds.minY;

                    // Check if a position has overlap with existing nodes
                    const hasOverlap = (testX: number, testY: number) => {
                        const testBounds = {
                            minX: clipBounds.minX + testX,
                            maxX: clipBounds.maxX + testX,
                            minY: clipBounds.minY + testY,
                            maxY: clipBounds.maxY + testY
                        };

                        return nodes.some(node => {
                            const nodeBounds = {
                                minX: node.position.x,
                                maxX: node.position.x + 300,
                                minY: node.position.y,
                                maxY: node.position.y + 160
                            };

                            return !(testBounds.maxX < nodeBounds.minX ||
                                testBounds.minX > nodeBounds.maxX ||
                                testBounds.maxY < nodeBounds.minY ||
                                testBounds.minY > nodeBounds.maxY);
                        });
                    };

                    // Try positions prioritizing below the original subtree
                    const spacing = 100;
                    const attempts = [
                        { x: 0, y: clipHeight + spacing },          // Directly below
                        { x: clipWidth / 2, y: clipHeight + spacing }, // Below-right
                        { x: -(clipWidth / 2), y: clipHeight + spacing }, // Below-left
                        { x: clipWidth + spacing, y: clipHeight + spacing }, // Bottom-right diagonal
                        { x: -(clipWidth + spacing), y: clipHeight + spacing }, // Bottom-left diagonal
                        { x: clipWidth + spacing, y: 0 },           // Right (fallback)
                        { x: -(clipWidth + spacing), y: 0 },        // Left (fallback)
                    ];

                    // Find first non-overlapping position
                    let found = false;
                    for (const attempt of attempts) {
                        if (!hasOverlap(attempt.x, attempt.y)) {
                            offset = attempt;
                            found = true;
                            break;
                        }
                    }

                    // If all positions overlap, use directly below with extra spacing
                    if (!found) {
                        offset = { x: 0, y: clipHeight + spacing * 2 };
                    }
                }

                const newNodes = clipNodes.map(n => {
                    const newId = idMap.get(n.id)!;
                    let x = n.position.x + offset.x;
                    let y = n.position.y + offset.y;

                    if (n.id === rootId && position) {
                        x = position.x;
                        y = position.y;
                    }

                    return {
                        ...n,
                        id: newId,
                        selected: false,
                        position: { x, y }
                    };
                });

                const newEdges = clipEdges.map(e => ({
                    ...e,
                    id: uuidv4(),
                    source: idMap.get(e.source)!,
                    target: idMap.get(e.target)!
                }));

                const finalEdges = [...edges, ...newEdges];

                if (targetParentId) {
                    const newRootId = idMap.get(rootId);
                    if (newRootId) {
                        finalEdges.push({
                            id: uuidv4(),
                            source: targetParentId,
                            target: newRootId
                        });
                    }
                }

                set({
                    nodes: [...nodes, ...newNodes],
                    edges: finalEdges
                });
            },
        }),
        {
            name: 'ads-rule-storage',
            partialize: (state) => ({
                trees: state.trees,
                customBlocks: state.customBlocks
            }),
        }
    )
);
