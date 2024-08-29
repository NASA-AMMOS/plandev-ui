import {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic';
import type { ActivityOptions, XRangeLayerColorScheme } from '../types/timeline';

export const ViewDefaultActivityOptions: ActivityOptions = {
  activityHeight: 16,
  composition: 'both',
  displayMode: 'compact',
  hierarchyMode: 'flat',
  labelVisibility: 'auto',
};

export const ViewActivityLayerColorPresets: string[] = [
  '#fcdd8f',
  '#CAEBAE',
  '#C9E4F5',
  '#F8CCFF',
  '#ECE0F2',
  '#FFD1D2',
  '#FFCB9E',
  '#E8D3BE',
  '#F5E9DA',
  '#EBEBEB',
  '#A3A3A3',
];

export const ViewLineLayerColorPresets: string[] = [
  '#283593',
  '#e31a1c',
  '#ff7f0e',
  '#DEA917',
  '#75b53b',
  '#3C95C9',
  '#8d41b0',
  '#FF47A9',
  '#a67c52',
  '#7f7f7f',
  '#424242',
];

export const ViewXRangeLayerSchemePresets: Record<XRangeLayerColorScheme, readonly string[]> = {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
};
