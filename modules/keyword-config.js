/**
 * Keyword helpers and constants for the FE2 system.
 * Keywords are now full Item documents — this module provides utility functions
 * for reading keyword data and computing stat modifiers.
 */

/* -------------------------------------------- */
/*  Keyword Categories                          */
/* -------------------------------------------- */

export const KEYWORD_CATEGORIES = {
  narrative: "narrative",
  itemProperty: "itemProperty",
  rollModifier: "rollModifier",
  munition: "munition",
  complex: "complex"
};

/* -------------------------------------------- */
/*  Var/Mod → Parent Type Mapping               */
/* -------------------------------------------- */

/**
 * Maps variation/modification item types to their parent item type.
 * Used to resolve keyword eligibility: a variation of a weapon
 * should offer the same keywords as a weapon.
 */
export const VAR_MOD_PARENT_MAP = Object.freeze({
  variation: "weapon",
  modification: "weapon",
  variationoutfit: "outfit",
  modificationoutfit: "outfit",
  spacecraftweaponvariation: "spacecraftweapon",
  spacecraftweaponmodification: "spacecraftweapon",
  trait: "trait"
});

/* -------------------------------------------- */
/*  Keyword Helpers                             */
/* -------------------------------------------- */

/**
 * Resolve a keyword's ID from either format.
 * New format: kw.system.keywordId; Old format: kw.id
 * @param {object} kw - Keyword entry (either format)
 * @returns {string} The keyword ID
 */
export function getKeywordId(kw) {
  return kw.system?.keywordId || kw.id || "";
}

/**
 * Resolve a keyword's parameter value from either format.
 * New format: kw.system.params.X; Old format: kw.X
 * @param {object} kw - Keyword entry (either format)
 * @param {string} param - Parameter key ("X" or "Y")
 * @returns {string} The parameter value
 */
export function getKeywordParam(kw, param) {
  return kw.system?.params?.[param] ?? kw[param] ?? "";
}

/**
 * Find a keyword on an item by its keywordId.
 * Supports both new embedded item format and old lightweight format.
 * @param {object} item - The item document
 * @param {string} keywordId - The keyword ID to search for
 * @returns {object|undefined} The keyword entry, or undefined
 */
export function findKeywordOnItem(item, keywordId) {
  if (item) {
    const keywords = Array.isArray(item.system?.keywords) ? item.system.keywords : [];
    return keywords.find(kw => getKeywordId(kw) === keywordId);
  } else {
    return null;
  }
}

/**
 * Compute effective slots/hands/draw/reload for an item after applying keyword modifiers.
 * Reads stat modifiers from embedded keyword item objects (kw.system.statModifiers).
 * @param {object} itemData - The item document (needs .system.slots, .system.hands, etc.)
 * @returns {{slots: number, hands: number, draw: number, reload: number}}
 */
export function computeEffectiveItemStats(itemData) {
  let slots = Number(itemData.system.slots ?? 2);
  let hands = Number(itemData.system.hands ?? 0);
  let draw = Number(itemData.system.draw ?? 1);
  let reload = Number(itemData.system.reload ?? 2);

  const keywords = Array.isArray(itemData.system.keywords) ? itemData.system.keywords : [];

  // Apply "set" modifiers first, then "add" modifiers
  const setMods = { slots: null, hands: null, draw: null, reload: null };
  const addMods = { slots: 0, hands: 0, draw: 0, reload: 0 };

  for (const kw of keywords) {
    const sm = kw.system?.statModifiers;
    if (!sm) continue;
    const kwParams = kw.system?.params ?? {};
    for (const stat of ["slots", "hands", "draw", "reload"]) {
      const entry = sm[stat];
      if (!entry || !entry.mode) continue;
      // Resolve parameter references: {X} or {Y} → actual param value
      const rawVal = String(entry.value ?? "").trim();
      const resolved = rawVal.replace(/\{([XY])\}/g, (_, key) => kwParams[key] ?? "");
      const val = Number(resolved) || 0;
      if (entry.mode === "set") setMods[stat] = val;
      else if (entry.mode === "add") addMods[stat] += val;
    }
  }

  if (setMods.slots !== null) slots = setMods.slots;
  if (setMods.hands !== null) hands = setMods.hands;
  if (setMods.draw !== null) draw = setMods.draw;
  if (setMods.reload !== null) reload = setMods.reload;

  slots += addMods.slots;
  hands += addMods.hands;
  draw += addMods.draw;
  reload += addMods.reload;

  return { slots: Math.max(0, slots), hands: Math.max(0, hands), draw: Math.max(0, draw), reload: Math.max(0, reload) };
}
