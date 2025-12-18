import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export enum NodeType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  SOCIAL = 'social',
  UNKNOWN = 'unknown',
  EVENT = 'event'
}

export interface OsintNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  heat: number; // 0 to 100, determines color intensity/relevance
  url?: string;
  extendedDetails?: string; // New field for detailed analysis
  // D3 Simulation optional properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface OsintLink extends SimulationLinkDatum<OsintNode> {
  source: string | OsintNode;
  target: string | OsintNode;
  relationship: string;
}

export interface GraphData {
  nodes: OsintNode[];
  links: OsintLink[];
}

export interface SearchCriteria {
  query: string;
  country?: string;
  ageOrDob?: string;
  additionalInfo?: string;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: GraphData | null;
}