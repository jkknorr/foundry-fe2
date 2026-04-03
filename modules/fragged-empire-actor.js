/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { createEmptyModifiers, addModifier, applyModifiers, isEquipSuppressed } from "./effects/fragged-empire-effect-helpers.js";
import { parseEffectKey } from "./effects/fragged-empire-effect-types.js";

/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Shared actor base class. Type-specific logic lives in TypeDataModel subclasses
 * (CharacterDataModel, NPCDataModel, SpacecraftDataModel) registered via
 * CONFIG.Actor.dataModels. This class retains shared item accessors, active effect
 * handling, roll data storage, and thin forwarding methods for backward compatibility.
 * @extends {Actor}
 */
export class FraggedEmpireActor extends Actor {

  /* -------------------------------------------- */
  static async create(data, options) {
    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    if (data.type == 'character') {
      const skills = await FraggedEmpireUtility.loadCompendium(FraggedEmpireUtility.getSkillsCompendiumName());
      data.items = skills.map(i => i.toObject());
    }

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  prepareBaseData() {
    this._baseValues = {};
    this._computed = {};
  }

  /* -------------------------------------------- */
  /**
   * Override applyActiveEffects to collect structured modifiers from fe2.* keys.
   * Populates this._effectModifiers for consumption in prepareDerivedData() and rolls.
   */
  applyActiveEffects() {
    this._effectModifiers = createEmptyModifiers();
    this._conditionalEffects = [];
    for (const effect of this.effects) {
      if (effect.disabled) continue;
      if (isEquipSuppressed(effect, this)) continue;
      if (effect.isConditional) {
        this._conditionalEffects.push(effect);
        continue;
      }
      for (const change of effect.changes) {
        const parsed = parseEffectKey(change.key);
        if (!parsed) continue;
        addModifier(this._effectModifiers, parsed, change, effect.name, effect.id);
      }
    }
  }

  /* -------------------------------------------- */
  async prepareData() {
    super.prepareData();
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    // Compute statstotal for all embedded items before TypeDataModel reads them.
    // statstotal defaults to empty strings in template.json and only gets
    // computed during manual item sheet edits (computeItemStatsTotals).
    // This ensures derived calculations and template display always see correct totals.
    this._initItemStatsTotals();
    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  _initItemStatsTotals() {
    const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim());
    for (const item of this.items) {
      const stats = item.system.stats;
      const statstotal = item.system.statstotal;
      if (!stats || !statstotal) continue;
      for (const key of Object.keys(stats)) {
        if (!statstotal[key]) continue;
        const baseVal = stats[key]?.value ?? "";
        if (!isNumeric(baseVal)) {
          statstotal[key].value = baseVal;
          continue;
        }
        let total = Number(baseVal);
        for (const v of (item.system.variations ?? [])) {
          const vVal = v?.system?.stats?.[key]?.value;
          if (isNumeric(vVal)) total += Number(vVal);
        }
        for (const m of (item.system.modifications ?? [])) {
          const mVal = m?.system?.stats?.[key]?.value;
          if (isNumeric(mVal)) total += Number(mVal);
        }
        statstotal[key].value = String(total);
      }
    }
  }

  /* -------------------------------------------- */
  /**
   * Compute effective attribute values with effect modifiers applied.
   * Shared utility used by CharacterDataModel and SpacecraftDataModel.
   * @param {string[]} attrKeys - Array of attribute key names
   * @param {object|null} mods - Effect modifiers map
   * @param {object} defaultMaxes - Default attribute max values
   * @returns {object} Map of key -> { value, current, max }
   */
  _computeEffectiveAttributes(attrKeys, mods, defaultMaxes) {
    const effective = {};
    for (const key of attrKeys) {
      const attr = this.system.attributes[key];
      if (!attr) continue;
      const baseMax = defaultMaxes[key] ?? 5;
      const effectiveMax = mods ? Math.round(applyModifiers(baseMax, mods.attributeMax[key] || [])) : baseMax;
      const attrMods = mods ? [...(mods.attributes[key] || []), ...(mods.attributes.all || [])] : [];
      effective[key] = {
        value: attrMods.length ? Math.min(Math.round(applyModifiers(attr.value, attrMods)), effectiveMax) : attr.value,
        current: Math.min(attr.current, effectiveMax),
        max: effectiveMax
      };
    }
    return effective;
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {
    if (changed.system?.influence?.value) {
      if (changed.system.influence.value < 0)
        changed.system.influence.value = 0;
      if (changed.system.influence.value > this.system.influence.total)
        changed.system.influence.value = this.system.influence.total;
    }

    // Sync attribute current to value when value changes (character only)
    if (this.type === "character" && changed.system?.attributes) {
      for (const key of Object.keys(changed.system.attributes)) {
        if (changed.system.attributes[key]?.value !== undefined) {
          changed.system.attributes[key].current = changed.system.attributes[key].value;
        }
      }
    }

    super._preUpdate(changed, options, user);
  }

  /* ====================================================================== */
  /*  SHARED ITEM ACCESSORS (genuinely used by multiple actor types)        */
  /* ====================================================================== */

  getPerks() {
    let search = (this.type == 'character') ? 'perk' : 'spacecraftperk';
    return this.items.filter(item => item.type == search);
  }

  getTraits() {
    let search = (this.type == 'character' || this.type == 'npc') ? 'trait' : 'spacecrafttrait';
    return this.items.filter(item => item.type == search);
  }

  getComplications() {
    return this.items.filter(item => item.type == 'complication');
  }

  getSkills() {
    return this.items.filter(item => item.type == 'skill');
  }

  getLanguages() {
    return this.items.filter(item => item.type == 'language');
  }

  getStrongHits() {
    return this.items.filter(item => item.type == 'stronghit');
  }

  getUtilities() {
    return this.items.filter(item => item.type == 'utility');
  }

  getEquipments() {
    return this.items.filter(item => item.type == 'utility' || item.type == 'outfit' || item.type == "weapon" || item.type == "equipment");
  }

  getOutfits() {
    return this.items.filter(item => item.type == 'outfit');
  }

  getRaces() {
    return this.items.filter(item => item.type == 'race');
  }

  getResearch() {
    return this.items.filter(item => item.type == 'research');
  }

  /* -------------------------------------------- */
  updateWeaponStat(weapon) {
    weapon.system.totalHit = weapon.system.stats.hit.value;
    for (let variation of weapon.system.variations) {
      if (!isNaN(variation.system.stats.hit)) {
        weapon.system.totalHit += Number(variation.system.stats.hit.value);
      }
    }
    for (let mod of weapon.system.modifications) {
      if (!isNaN(mod.system.stats.hit)) {
        weapon.system.totalHit += Number(mod.system.stats.hit.value);
      }
    }
  }

  /* -------------------------------------------- */
  async updateWeaponMunitions(weaponId, amountUsed) {
    let item = this.items.find(item => item._id == weaponId);
    let currentMunitions = Number(item.system.munitions);
    let updatedMunitions = currentMunitions - amountUsed;

    let update = { _id: item.id, "system.munitions": String(updatedMunitions) };
    await this.updateEmbeddedDocuments('Item', [update]);
  }

  async updateSpareTime(actorId, amountUsed) {
    console.log(this)
    let decremented = Math.max(0, this.system.sparetimepoints.value - amountUsed);
    this.update({ 'system.sparetimepoints.value': decremented });
  }

  /* ====================================================================== */
  /*  ACTIVE EFFECTS                                                        */
  /* ====================================================================== */

  getActiveEffects(matching = it => true) {
    return Array.from(this.getEmbeddedCollection("ActiveEffect").values()).filter(it => matching(it));
  }

  getEffectByLabel(label) {
    return this.getActiveEffects().find(it => it.name == label);
  }

  getEffectById(id) {
    return this.getActiveEffects().find(it => it.id == id);
  }

  /* ====================================================================== */
  /*  TRAIT LINKING (shared by character and spacecraft)                     */
  /* ====================================================================== */

  prepareTraitSpecific(actorData, key, traitsAttr) {
    let trait = traitsAttr.find(item => item.system.subtype == key);
    if (trait) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }

  prepareSpacecraftTraitSpecific(actorData, key, traitsAttr) {
    let trait = traitsAttr.find(item => item.system.type == key);
    if (trait) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }

  prepareTraitsAttributes() {
    let search = (this.type == 'character') ? 'trait' : 'spacecrafttrait';
    let traitsAttr = this.items.filter(item => item.type == search);
    let actorData = this.system;

    if (this.type == 'character') {
      for (let key in actorData.attributes) {
        this.prepareTraitSpecific(actorData.attributes, key, traitsAttr);
      }
      this.prepareTraitSpecific(actorData, "influence", traitsAttr);
      this.prepareTraitSpecific(actorData, "resources", traitsAttr);
      this.prepareTraitSpecific(actorData, "level", traitsAttr);
    } else {
      for (let key in actorData.attributes) {
        this.prepareSpacecraftTraitSpecific(actorData.attributes, key, traitsAttr);
      }
    }
  }

  /* ====================================================================== */
  /*  SHARED UTILITY                                                        */
  /* ====================================================================== */

  getSkillsTraits() {
    let skills = this.getSkills();
    let skillsTraits = [];
    for (let skill of skills) {
      for (let trait of skill.system.traits) {
        trait.associatedSkill = skill.name;
      }
      skillsTraits = skillsTraits.concat(skill.system.traits);
    }
    return skillsTraits;
  }

  getTrait(traitId) {
    return this.items.find(item => item.id == traitId);
  }

  compareName(a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  }

  /* ====================================================================== */
  /*  ROLL DATA STORAGE                                                     */
  /* ====================================================================== */

  saveRollData(rollData) {
    this.currentRollData = rollData;
  }

  getRollData() {
    return this.currentRollData;
  }

  /* ====================================================================== */
  /*  FORWARDING METHODS (delegate to this.system TypeDataModel)            */
  /* ====================================================================== */

  // Roll methods (safe — no-op if method missing on TypeDataModel)
  rollSkill(skillId) { return this.system.rollSkill?.(skillId); }
  rollWeapon(weaponId) { return this.system.rollWeapon?.(weaponId); }
  rollAcquisition() { return this.system.rollAcquisition?.(); }
  rollGenericSkill() { return this.system.rollGenericSkill?.(); }
  rollNPCFight() { return this.system.rollNPCFight?.(); }
  rollSpacecraftWeapon(weaponId) { return this.system.rollSpacecraftWeapon?.(weaponId); }

  // Combat stats (safe — sensible defaults if method missing)
  getWeapons() { return this.system.getWeapons?.() ?? []; }
  getDefenseBase() { return this.system.getDefenseBase?.() ?? 0; }
  getDefenseTotal() { return this.system.getDefenseTotal?.() ?? 0; }
  getBaseArmour() { return this.system.getBaseArmour?.() ?? 0; }
  getTotalArmour() { return this.system.getTotalArmour?.() ?? 0; }
  getInitiativeScore(phase) { return this.system.getInitiativeScore?.(phase) ?? 0; }
  getGrit() { return this.system.getGrit?.() ?? false; }

  // Character-specific (forwarded, safe)
  equipItem(itemId) { return this.system.equipItem?.(itemId); }
  decrementGritRerolls() { return this.system.decrementGritRerolls?.(); }
  getSortedSkills() { return this.system.getSortedSkills?.() ?? []; }
  prepareSkill(item, type, ea) { return this.system.prepareSkill?.(item, type, ea); }
  getEquipmentSlotsBase() { return this.system.getEquipmentSlotsBase?.() ?? 0; }
  getEquipmentSlotsUsed() { return this.system.getEquipmentSlotsUsed?.() ?? 0; }
  getEquipmentSlotsTotal() { return this.system.getEquipmentSlotsTotal?.() ?? 0; }
  getResourcesAllotted() { return this.system.getResourcesAllotted?.() ?? 0; }

  // Spacecraft-specific (forwarded, safe)
  getSpacecraftWeapons() { return this.system.getSpacecraftWeapons?.() ?? []; }
  getTradeGoods() { return this.system.getTradeGoods?.() ?? []; }
  getCargoSpaceUsed() { return this.system.getCargoSpaceUsed?.() ?? 0; }
  getSubActors() { return this.system.getSubActors?.() ?? []; }
  addSubActor(id) { return this.system.addSubActor?.(id); }
  delSubActor(id) { return this.system.delSubActor?.(id); }
  updateShipMunitions(actorId, amountUsed) { return this.system.updateShipMunitions?.(actorId, amountUsed); }

  // NPC-specific (forwarded, safe)
  buildNPCRoFArray() { return this.system.buildNPCRoFArray?.() ?? []; }
}
