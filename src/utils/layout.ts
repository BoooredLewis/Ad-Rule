import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Default dimensions for layout
const NODE_WIDTH = 300;
const NODE_HEIGHT = 160;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 100,
        nodesep: 50
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Dagre node position is the center, ReactFlow needs top-left
        const x = nodeWithPosition.x - (NODE_WIDTH / 2);
        const y = nodeWithPosition.y - (NODE_HEIGHT / 2);

        return {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: { x, y },
        };
    });

    return { nodes: layoutedNodes, edges };
};
