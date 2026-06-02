/**
 * Effect modifier collection and application helpers.
 * Provides factory, collection, application, and suppression functions.
 */

import { EFFECT_TARGET_TYPES, EFFECT_CATEGORIES, parseEffectKey } from "./fragged-empire-effect-types.js";

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

const ADD = 2;
const MULTIPLY = 1;

/* -------------------------------------------- */
/*  Modifier Map Factory                        */
/* -------------------------------------------- */

/**
 * Create an empty modifiers map with all target type buckets.
 * @returns {object}
 */
export function createEmptyModifiers() {
  return {
    skills: {},
    attributes: {},
    attributeMax: {},
    defense: [],
    armour: [],
    armourZeroEnd: [],
    hitBonus: [],
    enduranceDamage: [],
    enduranceMax: [],
    equipmentMax: [],
    influenceMax: [],
    resourcesMax: [],
    utilitiesMax: [],
    gritReroll: [],
    combatOrder: [],
    movement: [],
    acquisition: [],
    arcane: [],
    untrainedSkill: [],
    allPrimarySkills: [],
    allPersonalCombatSkills: [],
    allSpacecraftSkills: [],
    recovery: [],
    shield: [],
    shieldRegen: [],
    cargoMax: [],
    weaponSlotsMax: [],
    resupplyMax: [],
    handsMax: [],
    weaponsMax: [],
    // NPC-specific
    npcAttribute: [],
    npcMobility: [],
    npcBodies: [],
    npcDurability: [],
    // Attack-specific (stored, applied later)
    attackTargetArmour: [],
    attackTargetArmourCrit: [],
    attackTargetCover: [],
    attackSelfCover: [],
    // Skill tools (stored, applied later)
    skillToolbox: {},
    skillWorkshop: {}
  };
}

/* -------------------------------------------- */
/*  Modifier Collection                         */
/* -------------------------------------------- */

/**
 * Add a modifier entry to the appropriate bucket in the modifiers map.
 * @param {object} modifiers - The modifiers map from createEmptyModifiers()
 * @param {{ targetType: string, targetId: string|null }} parsed - Parsed key result
 * @param {object} change - The effect change object { key, value, type }
 * @param {string} effectName - Display name of the source effect
 * @param {string} effectId - ID of the source effect
 */
export function addModifier(modifiers, parsed, change, effectName, effectId) {
  const entry = {
    value: Number(change.value) || 0,
    // mode: change.mode,
    type: change.type,
    effectName,
    effectId
  };

  switch (parsed.targetType) {
    case EFFECT_TARGET_TYPES.skill:
      if (!modifiers.skills[parsed.targetId]) modifiers.skills[parsed.targetId] = [];
      modifiers.skills[parsed.targetId].push(entry);
      break;
    case EFFECT_TARGET_TYPES.allSkills:
      if (!modifiers.skills.all) modifiers.skills.all = [];
      modifiers.skills.all.push(entry);
      break;
    case EFFECT_TARGET_TYPES.attribute:
      if (!modifiers.attributes[parsed.targetId]) modifiers.attributes[parsed.targetId] = [];
      modifiers.attributes[parsed.targetId].push(entry);
      break;
    case EFFECT_TARGET_TYPES.allAttributes:
      if (!modifiers.attributes.all) modifiers.attributes.all = [];
      modifiers.attributes.all.push(entry);
      break;
    case EFFECT_TARGET_TYPES.attributeMax:
      if (!modifiers.attributeMax[parsed.targetId]) modifiers.attributeMax[parsed.targetId] = [];
      modifiers.attributeMax[parsed.targetId].push(entry);
      break;
    case EFFECT_TARGET_TYPES.skillToolbox: {
      const id = parsed.targetId || "all";
      if (!modifiers.skillToolbox[id]) modifiers.skillToolbox[id] = [];
      modifiers.skillToolbox[id].push(entry);
      break;
    }
    case EFFECT_TARGET_TYPES.skillWorkshop: {
      const id = parsed.targetId || "all";
      if (!modifiers.skillWorkshop[id]) modifiers.skillWorkshop[id] = [];
      modifiers.skillWorkshop[id].push(entry);
      break;
    }
    default: {
      // Simple target types map directly to a bucket array
      const bucket = modifiers[parsed.targetType];
      if (bucket) bucket.push(entry);
      break;
    }
  }
}

/* -------------------------------------------- */
/*  Modifier Application                        */
/* -------------------------------------------- */

/**
 * Apply a list of modifiers to a base value.
 * Additions are summed first, then multiplications are compounded.
 * Stat totals (default) are clamped to 0; pure bonuses/penalties pass clamp=false.
 * @param {number} baseValue - The starting value
 * @param {Array} modifiers - Array of { value, mode } modifier entries
 * @param {boolean} [clamp=true] - Clamp result at 0 (false for pure modifiers like hitBonus)
 * @returns {number}
 */
export function applyModifiers(baseValue, modifiers, clamp = true) {
  if (!modifiers || modifiers.length === 0) return baseValue;

  let sumAdds = 0;
  let productMultiplies = 1;

  for (const mod of modifiers) {
    if (mod.mode === ADD) {
      sumAdds += mod.value;
    } else if (mod.mode === MULTIPLY) {
      productMultiplies *= mod.value;
    }
  }

  const result = (baseValue + sumAdds) * productMultiplies;
  return clamp ? Math.max(0, result) : result;
}

/* -------------------------------------------- */
/*  Equip Suppression                           */
/* -------------------------------------------- */

const EQUIPPABLE_TYPES = new Set(["weapon", "outfit", "utility", "spacecraftweapon", "equipment"]);

/**
 * Check if an effect should be suppressed because its origin item is unequipped.
 * @param {ActiveEffect} effect - The effect to check
 * @param {Actor} actor - The owning actor
 * @returns {boolean} True if the effect should be suppressed
 */
export function isEquipSuppressed(effect, actor) {
  if (!effect.origin) return false;

  // NPC items are always active — NPCs have no equip/carry mechanic
  if (actor.type === "npc") return false;

  // Find the origin item on the actor
  const originId = effect.origin.split(".").pop();
  const item = actor.items.get(originId);
  if (!item) return false;

  // Only suppress for equippable item types
  if (!EQUIPPABLE_TYPES.has(item.type)) return false;

  // Suppress if item is in "carried" state (only active/inHand items apply effects)
  // Spacecraft weapons still use the legacy equipped boolean
  if ("carryState" in item.system) return item.system.carryState === "carried";
  if ("equipped" in item.system) return item.system.equipped === false;

  return false;
}

/* -------------------------------------------- */
/*  Conditional Effects — Roll Relevance        */
/* -------------------------------------------- */

/**
 * Maps roll modes to the set of effect target types relevant for that roll.
 * Category-specific types are included but dynamically filtered at runtime.
 */
export const ROLL_RELEVANCE_MAP = {
  skill: new Set([
    "skill", "allSkills", "allPrimarySkills", "allPersonalCombatSkills",
    "allSpacecraftSkills", "skillToolbox", "skillWorkshop",
    "untrainedSkill", "arcane"
  ]),
  weapon: new Set([
    "skill", "allSkills", "allPersonalCombatSkills", "hitBonus",
    "enduranceDamage", "attackTargetArmour", "attackTargetArmourCrit",
    "attackTargetCover", "attackSelfCover", "skillToolbox",
    "skillWorkshop", "untrainedSkill"
  ]),
  npcfight: new Set([
    "hitBonus", "enduranceDamage", "npcAttribute", "npcMobility"
  ]),
  genericskill: new Set([
    "allSkills", "allPrimarySkills", "allPersonalCombatSkills",
    "allSpacecraftSkills", "untrainedSkill", "arcane"
  ]),
  spacecraftweapon: new Set([
    "hitBonus", "enduranceDamage", "attackTargetArmour",
    "attackTargetArmourCrit", "allSpacecraftSkills"
  ])
};

/** Maps skill system.type to the category-specific effect target type. */
export const SKILL_CATEGORY_TYPES = {
  primary: "allPrimarySkills",
  personalcombat: "allPersonalCombatSkills",
  spaceshipcombat: "allSpacecraftSkills"
};

const CATEGORY_TYPE_VALUES = new Set(Object.values(SKILL_CATEGORY_TYPES));

/**
 * Filter conditional effects relevant to a roll type.
 * @param {Actor} actor
 * @param {string} rollMode - e.g., "skill", "weapon", "npcfight"
 * @param {Object} [rollContext={}] - optional context for dynamic filtering
 * @param {string} [rollContext.skillType] - skill category for category-aware filtering
 * @returns {Array<Object>} Array of { effectId, name, img, summary, changes }
 */
export function getRelevantConditionalEffects(actor, rollMode, rollContext = {}) {
  if (!actor._conditionalEffects?.length) return [];
  const relevantTypes = ROLL_RELEVANCE_MAP[rollMode];
  if (!relevantTypes) return [];

  const matchingCategoryType = rollContext.skillType ? SKILL_CATEGORY_TYPES[rollContext.skillType] : null;

  return actor._conditionalEffects
    .filter(effect => {
      return effect.changes.some(change => {
        const parsed = parseEffectKey(change.key);
        if (!parsed || !relevantTypes.has(parsed.targetType)) return false;
        if (CATEGORY_TYPE_VALUES.has(parsed.targetType) && matchingCategoryType && parsed.targetType !== matchingCategoryType) return false;
        // Skill-specific: only match if this change targets the rolled skill
        if (parsed.targetType === "skill" && parsed.targetId && rollContext.skillId && parsed.targetId !== rollContext.skillId) return false;
        return true;
      });
    })
    .map(effect => ({
      effectId: effect.id,
      name: effect.name,
      img: effect.img,
      summary: summarizeEffectChanges(effect, relevantTypes, matchingCategoryType, rollContext),
      changes: effect.changes
    }));
}

/**
 * Build a human-readable summary of an effect's changes, filtered to only
 * show modifiers relevant to the current roll.
 * @param {ActiveEffect} effect
 * @param {Set<string>} [relevantTypes] - target types relevant to the roll mode
 * @param {string|null} [matchingCategoryType] - category-specific type that matches the rolled skill
 * @param {Object} [rollContext={}] - optional context for dynamic filtering
 * @returns {string}
 */
function summarizeEffectChanges(effect, relevantTypes, matchingCategoryType, rollContext = {}) {
  return effect.changes.map(c => {
    const parsed = parseEffectKey(c.key);
    if (!parsed) return null;
    // Filter to only roll-relevant changes
    if (relevantTypes) {
      if (!relevantTypes.has(parsed.targetType)) return null;
      if (CATEGORY_TYPE_VALUES.has(parsed.targetType) && matchingCategoryType && parsed.targetType !== matchingCategoryType) return null;
    }
    // Skill-specific: only show changes targeting the rolled skill
    if (parsed.targetType === "skill" && parsed.targetId && rollContext.skillId && parsed.targetId !== rollContext.skillId) return null;
    const sign = Number(c.value) >= 0 ? "+" : "";
    // Skip redundant label for skill-specific changes (the rolled skill is obvious from context)
    if (parsed.targetType === "skill" && parsed.targetId && rollContext.skillId) return `${sign}${c.value}`;
    const label = getTargetTypeLabel(parsed.targetType);
    return `${sign}${c.value} ${label}`;
  }).filter(Boolean).join(", ");
}

/**
 * Look up a human-readable label for a target type from EFFECT_CATEGORIES.
 * @param {string} targetType
 * @returns {string}
 */
function getTargetTypeLabel(targetType) {
  for (const cat of Object.values(EFFECT_CATEGORIES)) {
    const found = cat.types.find(t => t.type === targetType);
    if (found) return game.i18n.localize(found.label);
  }
  return targetType;
}
