/**
 * Datasworn Asset Lookup
 *
 * Loads asset definitions from Datasworn packages and provides
 * lookup functionality for rendering asset cards.
 */

import starforgedData from '@datasworn/starforged/json/starforged.json';
import sunderedIslesData from '@datasworn/sundered-isles/json/sundered_isles.json';
import ironswornData from '@datasworn/ironsworn-classic/json/classic.json';

// Types for asset data
export interface AssetAbility {
  text: string;
  enabled: boolean;
  _id: string;
}

export interface AssetControl {
  label: string;
  field_type: string;
  value: number | boolean;
  min?: number;
  max?: number;
  controls?: Record<string, { label?: string; value?: boolean }>;
}

export interface AssetOption {
  label: string;
  field_type: string;
  value: string | null;
}

export interface AssetDefinition {
  _id: string;
  name: string;
  type: string;
  category: string;
  color?: string;
  shared?: boolean;
  abilities: AssetAbility[];
  controls?: Record<string, AssetControl>;
  options?: Record<string, AssetOption>;
  count_as_impact?: boolean;
  _source?: {
    title: string;
  };
}

// Character's asset state from frontmatter
export interface CharacterAsset {
  id: string;
  abilities: boolean[];
  controls: Record<string, number | boolean>;
  options: Record<string, string>;
}

// Merged asset for rendering
export interface MergedAsset {
  definition: AssetDefinition;
  state: CharacterAsset;
}

// Build a flat lookup map of all assets by ID
const assetMap = new Map<string, AssetDefinition>();

function indexAssets(data: {
  assets?: Record<string, { contents?: Record<string, AssetDefinition> }>;
}) {
  if (!data.assets) return;

  for (const category of Object.values(data.assets)) {
    if (category.contents) {
      for (const asset of Object.values(category.contents)) {
        if (asset._id) {
          assetMap.set(asset._id, asset);
        }
      }
    }
  }
}

// Index all assets from all rulesets
indexAssets(
  starforgedData as { assets?: Record<string, { contents?: Record<string, AssetDefinition> }> }
);
indexAssets(
  sunderedIslesData as { assets?: Record<string, { contents?: Record<string, AssetDefinition> }> }
);
indexAssets(
  ironswornData as { assets?: Record<string, { contents?: Record<string, AssetDefinition> }> }
);

/**
 * Look up an asset definition by its ID
 */
export function getAssetById(id: string): AssetDefinition | undefined {
  return assetMap.get(id);
}

/**
 * Merge a character's asset state with the full asset definition
 */
export function mergeAssetWithState(characterAsset: CharacterAsset): MergedAsset | null {
  const definition = getAssetById(characterAsset.id);
  if (!definition) {
    console.warn(`Asset not found: ${characterAsset.id}`);
    return null;
  }

  return {
    definition,
    state: characterAsset,
  };
}

/**
 * Get all merged assets for a character
 */
export function getCharacterAssets(assets: CharacterAsset[]): MergedAsset[] {
  return assets.map(mergeAssetWithState).filter((a): a is MergedAsset => a !== null);
}

/**
 * Convert Datasworn markdown links to HTML
 * e.g., [Advance](datasworn:move:starforged/legacy/advance) -> <a>Advance</a>
 */
export function convertDataswornLinks(text: string): string {
  // Convert [text](datasworn:...) to just the text as a span (since we don't have move pages)
  return text.replace(/\[([^\]]+)\]\(datasworn:[^)]+\)/g, '<span class="datasworn-link">$1</span>');
}
