export type NodeType = 'condition' | 'action' | 'sticky';

// --- Enums for Advanced Logic ---

export type ConditionCategory = 'ENUM' | 'NUMERIC' | 'COMPUTED' | 'GENERIC' | 'COMBINED';
export type ActionCategory =
    | 'SET_BID'
    | 'SET_BUDGET'
    | 'SET_BID_TYPE'
    | 'SET_STATUS'
    | 'COPY_AD'
    | 'SET_VALUE_RULE_STATUS'
    | 'GENERIC';

export type Operator =
    // Enum/String Ops
    | 'IS' | 'INCLUDES' | 'EXCLUDES' | 'IS_NOT'
    // Numeric Ops
    | 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN';

export type BidStrategy = 'COST_CAP' | 'TARGET_CPA' | 'AUTO_BID' | 'TARGET_ROAS' | 'AUTO_ROAS';
export type AdjustmentType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'EQUATION' | 'ABSOLUTE';
export type StatusValue = 'ACTIVE' | 'INACTIVE';

export type TimeMode =
    | 'X_DAYS_FROM_NOW'      // 0 = Today
    | 'X_DAYS_TILL_NOW'      // Last X Days
    | 'X_HOURS_TILL_NOW'     // Last X Hours
    | 'WINDOW_DURING_HOURS'  // X Days from now + Hour Range
    | 'SPECIFIC_HOUR';       // X Days from now + Specific Hour

export interface TimeConfig {
    mode: TimeMode;
    value?: number;          // primary 'x' value
    startHour?: number;      // AA or CC
    endHour?: number;        // BB
}

// --- Block Configuration Shapes ---

export interface BlockConfig {
    // Common
    description?: string;

    // Condition Specifics
    conditionCategory?: ConditionCategory;
    variableType?: 'STATIC' | 'TIME_BASED';
    timeConfig?: TimeConfig;

    variableName?: string; // e.g. "Impressions" or "Country"
    operator?: Operator;
    targetValue?: string; // e.g. "1000", "US, UK"
    equation?: string; // e.g. "A / B" for Computed
    referencedBlockIds?: string[]; // IDs of blocks used in COMBINED formulas

    // Action Specifics
    actionCategory?: ActionCategory;
    adjustmentType?: AdjustmentType; // e.g. "%" or "$"
    adjustmentValue?: string; // e.g. "1.2" for 20%, or "5" for $5
    bidStrategy?: BidStrategy;
    statusValue?: StatusValue;
    copyTarget?: 'SAME_PLACE' | 'EXISTING_CAMPAIGN' | 'NEW_CAMPAIGN';
    targetCampaignId?: string; // For copy to existing
}

// --- Main Data Structures ---

export interface BlockData {
    label: string;
    isCustom?: boolean;
    blockType: NodeType;
    config?: BlockConfig; // New field for complex logic
    [key: string]: any;
}

export interface PersistedNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: BlockData;
}

export interface PersistedEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    type?: string;
}

export interface RuleTree {
    id: string;
    name: string;
    description?: string;
    nodes: PersistedNode[];
    edges: PersistedEdge[];
    updatedAt: number;
}

export interface CustomBlock {
    id: string;
    label: string;
    blockType: NodeType;
    config?: BlockConfig; // Save the config with the preset
}
