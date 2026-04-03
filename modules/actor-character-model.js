/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireRoll } from "./fragged-empire-roll-dialog.js";
import { applyModifiers, getRelevantConditionalEffects } from "./effects/fragged-empire-effect-helpers.js";
import { CHARACTER_ATTRIBUTES } from "./effects/fragged-empire-effect-types.js";
import { computeEffectiveItemStats, findKeywordOnItem } from "./keyword-config.js";

/* -------------------------------------------- */
const coverBonusTable = { "nocover": 0, "lightcover": 1, "heavycover": 2, "entrenchedcover": 3 };

/* -------------------------------------------- */
/* Schema Helpers                               */
/* -------------------------------------------- */
function _attrField(label) {
  const f = foundry.data.fields;
  return new f.SchemaField({
    label: new f.StringField({ initial: label }),
    value: new f.NumberField({ initial: 0, integer: true }),
    current: new f.NumberField({ initial: 0, integer: true }),
    traitId: new f.StringField({ initial: "" })
  });
}

/* -------------------------------------------- */
/**
 * Character-specific data model.
 * Registered via CONFIG.Actor.dataModels.character.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel {

  /* -------------------------------------------- */
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      // ----- biodata template -----
      biodata: new f.SchemaField({
        name: new f.StringField({ initial: "" }),
        age: new f.NumberField({ initial: 0 }),
        size: new f.NumberField({ initial: 0 }),
        weight: new f.NumberField({ initial: 0 }),
        description: new f.HTMLField({ initial: "" }),
        notes: new f.HTMLField({ initial: "" }),
        gmnotes: new f.HTMLField({ initial: "" })
      }),

      // ----- core template -----
      subactors: new f.ArrayField(new f.StringField()),

      level: new f.SchemaField({
        value: new f.NumberField({ initial: 0, integer: true }),
        traitId: new f.StringField({ initial: "" })
      }),

      resources: new f.SchemaField({
        value: new f.NumberField({ initial: 0 }),
        alloted: new f.NumberField({ initial: 0 }),
        bonus: new f.NumberField({ initial: 0 }),
        total: new f.NumberField({ initial: 0 }),
        traitId: new f.StringField({ initial: "" })
      }),

      influence: new f.SchemaField({
        value: new f.NumberField({ initial: 0 }),
        bonus: new f.NumberField({ initial: 0 }),
        total: new f.NumberField({ initial: 0 }),
        traitId: new f.StringField({ initial: "" })
      }),

      knowledge: new f.SchemaField({
        value: new f.NumberField({ initial: 0 })
      }),

      sparetimepoints: new f.SchemaField({
        value: new f.NumberField({ initial: 0 })
      }),

      attributes: new f.SchemaField({
        strength: _attrField("FE2.Attributes.Strength"),
        reflexes: _attrField("FE2.Attributes.Reflexes"),
        mobility: _attrField("FE2.Attributes.Mobility"),
        focus: _attrField("FE2.Attributes.Focus"),
        intelligence: _attrField("FE2.Attributes.Intelligence"),
        grit: _attrField("FE2.Attributes.Grit")
      }),

      gritreroll: new f.SchemaField({
        value: new f.NumberField({ initial: 0 }),
        bonus: new f.NumberField({ initial: 0 }),
        max: new f.NumberField({ initial: 0 }),
        traitId: new f.StringField({ initial: "" })
      }),

      defensebonus: new f.SchemaField({
        defense: new f.NumberField({ initial: 0 }),
        total: new f.NumberField({ initial: 0 }),
        vsimpair: new f.NumberField({ initial: 0 }),
        vsimpairbonus: new f.NumberField({ initial: 0 }),
        vspsionic: new f.NumberField({ initial: 0 }),
        vspsionicbonus: new f.NumberField({ initial: 0 }),
        vsstealth: new f.NumberField({ initial: 0 }),
        ally: new f.NumberField({ initial: 0 }),
        cover: new f.StringField({ initial: "nocover" })
      }),

      armourbonus: new f.SchemaField({
        armour: new f.NumberField({ initial: 0 }),
        total: new f.NumberField({ initial: 0 }),
        vsenergy: new f.NumberField({ initial: 0 }),
        vsslow: new f.NumberField({ initial: 0 }),
        zeroendurance: new f.NumberField({ initial: 0 })
      }),

      endurance: new f.SchemaField({
        endurancebonus: new f.NumberField({ initial: 0 }),
        value: new f.NumberField({ initial: 0 }),
        max: new f.NumberField({ initial: 0 }),
        recoverybonus: new f.NumberField({ initial: 0 }),
        recovery: new f.NumberField({ initial: 0 })
      }),

      combatordermod: new f.NumberField({ initial: 0 }),

      stealthbonus: new f.SchemaField({
        stealth: new f.NumberField({ initial: 0 })
      }),

      equipmentslots: new f.SchemaField({
        bonus: new f.NumberField({ initial: 0 }),
        current: new f.NumberField({ initial: 0 })
      }),

      modifiers: new f.SchemaField({
        hitbonus: new f.NumberField({ initial: 0 }),
        endurancedamage: new f.NumberField({ initial: 0 }),
        utilitiesmax: new f.NumberField({ initial: 0 }),
        movement: new f.NumberField({ initial: 0 }),
        acquisitionmod: new f.NumberField({ initial: 0 }),
        arcanemod: new f.NumberField({ initial: 0 }),
        untrainedskillmod: new f.NumberField({ initial: 0 })
      }),

      attributemax: new f.SchemaField({
        strength: new f.NumberField({ initial: 5 }),
        reflexes: new f.NumberField({ initial: 5 }),
        mobility: new f.NumberField({ initial: 5 }),
        focus: new f.NumberField({ initial: 5 }),
        intelligence: new f.NumberField({ initial: 5 }),
        grit: new f.NumberField({ initial: 5 })
      })
    };
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    const actor = this.parent;
    const mods = actor._effectModifiers;

    // Compute effective attributes (not persisted, avoids form-binding compound bug)
    const defaultMaxes = this.attributemax || {};
    actor._baseValues.attributeMaxes = { ...defaultMaxes };
    actor._effectiveAttributes = actor._computeEffectiveAttributes(CHARACTER_ATTRIBUTES, mods, defaultMaxes);
    const ea = actor._effectiveAttributes;

    // Resources total
    let restotal = this.level.value + 3;
    actor._baseValues.resourcesTotal = restotal;
    if (mods) restotal = Math.round(applyModifiers(restotal, mods.resourcesMax));
    if (restotal != this.resources.total) {
      this.resources.total = restotal;
      actor.update({ 'system.resources.total': restotal });
    }
    // Resources available (acquired from play, somewhere between 0 and max)
    let resavail = this.resources.value;

    // Resources allotted (sum from embedded equipment) and current (available - allotted)
    actor._computed.resourcesAllotted = this.getResourcesAllotted();
    actor._computed.resourcesCurrent = resavail - actor._computed.resourcesAllotted;
    console.log(actor._computed.resourcesCurrent)

    // Influence total
    let inftotal = this.level.value + 3;
    actor._baseValues.influenceTotal = inftotal;
    if (mods) inftotal = Math.round(applyModifiers(inftotal, mods.influenceMax));
    if (inftotal != this.influence.total) {
      this.influence.total = inftotal;
      actor.update({ 'system.influence.total': inftotal });
    }

    // Endurance max (uses effective strength + active outfit endurance bonus)
    let endmax = 10 + (ea.strength.value * 5);
    let activeOutfits = actor.items.filter(item => (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried");
    for (let item of activeOutfits) {
      if (!isNaN(item.system.statstotal?.endurance?.value)) {
        endmax += Number(item.system.statstotal.endurance.value);
      }
    }
    actor._baseValues.enduranceMax = endmax;
    if (mods) endmax = Math.round(applyModifiers(endmax, mods.enduranceMax));
    if (endmax != this.endurance.max) {
      this.endurance.max = endmax;
      actor.update({ 'system.endurance.max': endmax });
    }

    // Defense total (uses effective reflexes, intelligence)
    let coverBonus = coverBonusTable[this.defensebonus.cover] * this.attributes.intelligence.current;
    let outfitDefBonus = 0;
    for (let item of activeOutfits) {
      if (!isNaN(item.system.statstotal?.defence?.value)) {
        outfitDefBonus += Number(item.system.statstotal.defence.value);
      }
    }
    let defBase = 10 + this.attributes.reflexes.current + outfitDefBonus;
    actor._baseValues.defenseBase = defBase;
    let defTotal = defBase + coverBonus;
    actor._baseValues.defenseTotal = defTotal;
    if (mods) defTotal = Math.round(applyModifiers(defTotal, mods.defense));
    if (defTotal != this.defensebonus.total) {
      this.defensebonus.total = defTotal;
      actor.update({ 'system.defensebonus.total': defTotal });
    }

    // Recovery (uses current grit)
    let recovery = this.attributes.grit.current;
    actor._baseValues.recovery = recovery;
    if (mods) recovery = Math.round(applyModifiers(recovery, mods.recovery));
    if (recovery != this.endurance.recovery) {
      this.endurance.recovery = recovery;
      actor.update({ 'system.endurance.recovery': recovery });
    }

    // Grit rerolls (uses effective grit)
    let gritreroll = ea.grit.value;
    actor._baseValues.gritRerollMax = gritreroll;
    if (mods) gritreroll = Math.round(applyModifiers(gritreroll, mods.gritReroll));
    if (gritreroll != this.gritreroll.max) {
      this.gritreroll.max = gritreroll;
      actor.update({ 'system.gritreroll.max': gritreroll });
    }

    // Computed modifier values (not persisted, for rolls and display — base is 0, only effects contribute)
    // Pure bonuses/penalties use clamp=false since their results can be negative
    actor._computed.hitBonus = mods ? Math.round(applyModifiers(0, mods.hitBonus, false)) : 0;
    actor._computed.enduranceDamage = mods ? Math.round(applyModifiers(0, mods.enduranceDamage, false)) : 0;
    actor._computed.utilitiesMax = mods ? Math.round(applyModifiers(1, mods.utilitiesMax)) : 1;
    actor._baseValues.movementBase = this.attributes.mobility.current;
    actor._computed.movement = mods ? Math.round(applyModifiers(this.attributes.mobility.current, mods.movement)) : this.attributes.mobility.current;
    actor._computed.acquisitionMod = mods ? Math.round(applyModifiers(0, mods.acquisition, false)) : 0;
    actor._computed.arcaneMod = mods ? Math.round(applyModifiers(0, mods.arcane, false)) : 0;
    actor._computed.untrainedSkillMod = mods ? Math.round(applyModifiers(0, mods.untrainedSkill, false)) : 0;
    actor._computed.primarySkillMod = mods ? Math.round(applyModifiers(0, mods.allPrimarySkills, false)) : 0;
    actor._computed.personalCombatSkillMod = mods ? Math.round(applyModifiers(0, mods.allPersonalCombatSkills, false)) : 0;
    actor._computed.spacecraftSkillMod = mods ? Math.round(applyModifiers(0, mods.allSpacecraftSkills, false)) : 0;
    actor._computed.combatOrder = mods ? Math.round(applyModifiers(0, mods.combatOrder, false)) : 0;
    // Armour at zero endurance (base from active outfits + AE modifiers)
    let armourZeroEndBase = 0;
    for (let item of activeOutfits) {
      if (!isNaN(item.system.statstotal?.zeroend?.value)) {
        armourZeroEndBase += Number(item.system.statstotal.zeroend.value);
      }
    }
    actor._computed.armourZeroEnd = mods ? Math.round(applyModifiers(armourZeroEndBase, mods.armourZeroEnd)) : armourZeroEndBase;

    // Hands max (base 2 + AE modifiers)
    actor._baseValues.handsMax = 2;
    actor._computed.handsMax = mods ? Math.round(applyModifiers(2, mods.handsMax)) : 2;

    // Hands used (sum of effective hands from items in "inHand" state)
    actor._computed.handsUsed = 0;
    for (const item of actor.items) {
      if (item.system.carryState === "inHand") {
        const effective = computeEffectiveItemStats(item);
        actor._computed.handsUsed += effective.hands;
      }
    }

    // Weapons max (base 3 + AE modifiers)
    actor._baseValues.weaponsMax = 3;
    actor._computed.weaponsMax = mods ? Math.round(applyModifiers(3, mods.weaponsMax)) : 3;

    // Weapons count (companions count as weapons)
    actor._computed.weaponsCount = actor.items.filter(item => item.type === "weapon").length
      + (this.subactors?.length || 0);
  }

  /* -------------------------------------------- */
  prepareSkill(item, type, effectiveAttributes) {
    if (item.type == 'skill' && item.system.type == type) {
      item.system.trainedValue = (item.system.trained) ? 1 : -2;
      if (item.system.attribute != "") {
        if (effectiveAttributes[item.system.attribute].value >= 4) {
          item.system.bonus = 1;
        }
        if (effectiveAttributes[item.system.attribute].value <= 1) {
          item.system.bonus = -1;
        }
      }
      item.system.total = item.system.trainedValue + item.system.bonus;
      if (item.system.staticmod) { item.system.total = item.system.total + item.system.staticmod; }

      // Inject effect modifiers for display (transient, not persisted)
      const actor = this.parent;
      const skillMods = actor._effectModifiers?.skills?.[item.id] || [];
      const allSkillMods = actor._effectModifiers?.skills?.all || [];
      const combinedMods = [...skillMods, ...allSkillMods];
      item.system._effectMod = combinedMods.length ? Math.round(applyModifiers(0, combinedMods, false)) : 0;
      if (!item.system.trained) {
        item.system._effectMod += actor._computed?.untrainedSkillMod || 0;
      }
      // Apply skill-category modifiers
      const categoryModKey = {
        primary: 'primarySkillMod',
        personalcombat: 'personalCombatSkillMod',
        spaceshipcombat: 'spacecraftSkillMod'
      }[type];
      if (categoryModKey) {
        item.system._effectMod += actor._computed?.[categoryModKey] || 0;
      }
      item.system._effectiveStaticMod = (item.system.staticmod || 0) + item.system._effectMod;
      item.system._effectiveTotal = item.system.total + item.system._effectMod;

      item.system.isTrait = item.system.traits.length > 0;
      return item;
    }
  }

  /* -------------------------------------------- */
  getSortedSkills() {
    const actor = this.parent;
    let comp = {};
    const defaultMaxes = this.attributemax || {};
    const mods = actor._effectModifiers;
    actor._effectiveAttributes = actor._computeEffectiveAttributes(CHARACTER_ATTRIBUTES, mods, defaultMaxes);
    const ea = actor._effectiveAttributes;
    comp['primary'] = actor.items.filter(item => this.prepareSkill(item, 'primary', ea));
    comp['personalcombat'] = actor.items.filter(item => this.prepareSkill(item, 'personalcombat', ea));
    comp['spaceshipcombat'] = actor.items.filter(item => this.prepareSkill(item, 'spaceshipcombat', ea));
    return comp;
  }

  /* -------------------------------------------- */
  async equipItem(itemId) {
    const actor = this.parent;
    const item = actor.items.find(i => i.id === itemId);
    if (!item?.system) return;

    const currentState = item.system.carryState || "carried";

    if (item.type === "outfit") {
      if (currentState === "carried") {
        const updates = [];
        const activeOutfit = actor.items.find(i => i.type === "outfit" && i.id !== item.id && i.system.carryState === "active");
        if (activeOutfit) {
          updates.push({ _id: activeOutfit.id, "system.carryState": "carried" });
        }
        updates.push({ _id: item.id, "system.carryState": "active" });
        await actor.updateEmbeddedDocuments('Item', updates);
      } else {
        await actor.updateEmbeddedDocuments('Item', [{ _id: item.id, "system.carryState": "carried" }]);
      }
    } else if (item.type === "weapon" || item.type === "utility" || item.type === "equipment") {
      const newState = currentState === "carried" ? "inHand" : "carried";
      await actor.updateEmbeddedDocuments('Item', [{ _id: item.id, "system.carryState": newState }]);
    }
  }

  /* -------------------------------------------- */
  getEquipmentSlotsBase() {
    const actor = this.parent;
    let activeGear = actor.items.filter(item =>
      (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried"
    );

    const defaultMaxes = this.attributemax || {};
    const mods = actor._effectModifiers;
    actor._effectiveAttributes = actor._computeEffectiveAttributes(CHARACTER_ATTRIBUTES, mods, defaultMaxes);
    const ea = actor._effectiveAttributes;

    let equipmentSlots = 6 + ea.strength.value;
    for (let equip of activeGear) {
      if (equip.system.statstotal?.equipmentslots?.value && !isNaN(equip.system.statstotal.equipmentslots.value)) {
        equipmentSlots += Number(equip.system.statstotal.equipmentslots.value);
      }
    }
    return equipmentSlots;
  }

  /* -------------------------------------------- */
  getEquipmentSlotsUsed() {
    const actor = this.parent;
    const equippableItems = actor.items.filter(item =>
      item.type === 'outfit' || item.type === 'utility' || item.type === 'weapon' || item.type === 'equipment'
    );
    let slotsUsed = 0;
    let trinketCount = 0;
    for (const item of equippableItems) {
      const state = item.system.carryState || "carried";
      if (state === "inHand" || state === "active") continue;
      if (findKeywordOnItem(item, "trinket")) {
        trinketCount++;
        continue;
      }
      const slots = (item.type === "outfit") ? 4 : computeEffectiveItemStats(item).slots;
      slotsUsed += slots;
    }
    if (trinketCount > 0) slotsUsed += Math.ceil(trinketCount / 5);
    return slotsUsed;
  }

  /* -------------------------------------------- */
  getEquipmentSlotsTotal() {
    const actor = this.parent;
    const base = this.getEquipmentSlotsBase();
    actor._baseValues.equipmentSlotsBase = base;
    const mods = actor._effectModifiers;
    return mods ? Math.round(applyModifiers(base, mods.equipmentMax)) : base;
  }

  /* -------------------------------------------- */
  getResourcesAllotted() {
    const actor = this.parent;
    let allotted = 0;
    const equipItems = actor.items.filter(item =>
      item.type === 'weapon' || item.type === 'outfit' || item.type === 'utility' || item.type === 'equipment'
    );
    for (const item of equipItems) {
      let cost = 0;
      if (item.type === 'equipment') {
        cost = Number(item.system.acquire) || 0;
      } else if (item.type === 'utility') {
        cost = Number(item.system.statstotal?.resources?.value || item.system.stats?.resources?.value) || 0;
      } else {
        cost = Number(item.system.statstotal?.resources?.value || item.system.stats?.resources?.value) || 0;
      }
      allotted += cost;
    }
    return allotted;
  }

  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.subactors) {
      subActors.push(foundry.utils.deepClone(game.actors.get(id)));
    }
    return subActors;
  }

  /* -------------------------------------------- */
  async addSubActor(subActorId) {
    const actor = this.parent;
    let subActors = foundry.utils.deepClone(this.subactors);
    subActors.push(subActorId);
    await actor.update({ 'system.subactors': subActors });
  }

  /* -------------------------------------------- */
  async delSubActor(subActorId) {
    const actor = this.parent;
    let newArray = [];
    for (let id of this.subactors) {
      if (id != subActorId) {
        newArray.push(id);
      }
    }
    await actor.update({ 'system.subactors': newArray });
  }

  /* -------------------------------------------- */
  getWeapons() {
    const actor = this.parent;
    let weapons = actor.items.filter(item => item.type == 'weapon');
    for (let weapon of weapons) {
      actor.updateWeaponStat(weapon);
    }
    return weapons;
  }

  /* -------------------------------------------- */
  getDefenseBase() {
    return this.parent._baseValues?.defenseBase ?? 0;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    return this.defensebonus.total;
  }

  /* -------------------------------------------- */
  getBaseArmour() {
    const actor = this.parent;
    let armour = 0;
    let outfits = actor.items.filter(item => (item.type === 'outfit' || item.type === 'utility') && item.system.carryState !== "carried");
    for (let item of outfits) {
      if (!isNaN(item.system.statstotal?.armour?.value)) {
        armour += Number(item.system.statstotal.armour.value);
      }
    }
    return armour;
  }

  /* -------------------------------------------- */
  getTotalArmour() {
    const actor = this.parent;
    let total = this.getBaseArmour();
    actor._baseValues.armourTotal = total;
    const mods = actor._effectModifiers;
    if (mods) total = Math.round(applyModifiers(total, mods.armour));
    this.armourbonus.total = total;
    return total;
  }

  /* -------------------------------------------- */
  getInitiativeScore(phase) {
    const actor = this.parent;
    const ea = actor._effectiveAttributes || {};
    const intCur = ea.intelligence?.current ?? this.attributes.intelligence.current;
    const refCur = ea.reflexes?.current ?? this.attributes.reflexes.current;
    const combatOrder = actor._computed?.combatOrder ?? this.combatordermod;
    return intCur + (refCur / 10) + combatOrder;
  }

  /* -------------------------------------------- */
  getGrit() {
    if (this.gritreroll.value > 0) {
      return this.gritreroll.value;
    }
    return false;
  }

  /* -------------------------------------------- */
  decrementGritRerolls() {
    const actor = this.parent;
    if (this.gritreroll.value > 0) {
      let newGritReroll = this.gritreroll.value - 1;
      this.gritreroll.value = newGritReroll;
      actor.update({ 'system.gritreroll.value': newGritReroll });
      return newGritReroll;
    }
    return false;
  }

  /* -------------------------------------------- */
  async rollSkill(competenceId) {
    const actor = this.parent;
    let skill = actor.items.find(item => item.type == 'skill' && item.id == competenceId);
    if (skill) {
      // Check effect modifiers for toolbox/workshop bonuses
      const skillEffectMods = actor._effectModifiers || {};
      const hasEffectToolbox = !!(skillEffectMods.skillToolbox?.[skill.id]?.length || skillEffectMods.skillToolbox?.all?.length);
      const hasEffectWorkshop = !!(skillEffectMods.skillWorkshop?.[skill.id]?.length || skillEffectMods.skillWorkshop?.all?.length);

      let rollData = {
        mode: "skill",
        alias: actor.name,
        actorImg: actor.img,
        actorId: actor.id,
        img: skill.img,
        hasFate: this.getGrit(),
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.format("FE2.Dialog.SkillTitle", { name: skill.name, total: skill.system.total }),
        skill: skill,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
        difficulty: 0,
        useToolbox: false,
        useDedicatedworkshop: false,
        toolsAvailable: skill.system.toolbox || skill.system.dedicatedworkshop || hasEffectToolbox || hasEffectWorkshop,
        hasToolbox: skill.system.toolbox || hasEffectToolbox,
        hasWorkshop: skill.system.dedicatedworkshop || hasEffectWorkshop
      };
      if (skill.system.staticmod) { rollData.bonusMalus += skill.system.staticmod; }
      if (skill.system.toolbox || hasEffectToolbox) { rollData.useToolbox = true; }
      if (hasEffectWorkshop) { rollData.useDedicatedworkshop = true; }
      rollData.effectModifiers = actor._effectModifiers;
      rollData.untrainedSkillMod = actor._computed?.untrainedSkillMod || 0;
      rollData.arcaneMod = actor._computed?.arcaneMod || 0;
      rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode, { skillType: skill.system.type, skillId: skill.id });
      rollData.selectedConditionalEffects = [];
      await FraggedEmpireRoll.create(actor, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.SkillNotFound"));
    }
  }

  /* -------------------------------------------- */
  async rollAcquisition() {
    const actor = this.parent;
    let primarySkills = actor.items.filter(item => item.type == 'skill' && item.system.type == 'primary');
    let skill = primarySkills.find(s => s.name.toLowerCase().includes('wealth')) || primarySkills[0];
    if (!skill) {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.SkillNotFound"));
      return;
    }
    const acqMods = actor._effectModifiers || {};
    const acqHasEffectToolbox = !!(acqMods.skillToolbox?.[skill.id]?.length || acqMods.skillToolbox?.all?.length);
    const acqHasEffectWorkshop = !!(acqMods.skillWorkshop?.[skill.id]?.length || acqMods.skillWorkshop?.all?.length);

    let rollData = {
      mode: "skill",
      alias: actor.name,
      actorImg: actor.img,
      actorId: actor.id,
      img: skill.img,
      hasFate: this.getGrit(),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.localize("FE2.Dialog.AcquisitionRoll"),
      skill: skill,
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
      difficulty: 0,
      useToolbox: false,
      useDedicatedworkshop: false,
      toolsAvailable: skill.system.toolbox || skill.system.dedicatedworkshop || acqHasEffectToolbox || acqHasEffectWorkshop,
      hasToolbox: skill.system.toolbox || acqHasEffectToolbox,
      hasWorkshop: skill.system.dedicatedworkshop || acqHasEffectWorkshop,
      acquisitionMod: actor._computed?.acquisitionMod || 0
    };
    if (skill.system.staticmod) rollData.bonusMalus += skill.system.staticmod;
    if (skill.system.toolbox || acqHasEffectToolbox) rollData.useToolbox = true;
    if (acqHasEffectWorkshop) rollData.useDedicatedworkshop = true;
    rollData.effectModifiers = actor._effectModifiers;
    rollData.untrainedSkillMod = actor._computed?.untrainedSkillMod || 0;
    rollData.arcaneMod = actor._computed?.arcaneMod || 0;
    rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode, { skillType: skill.system.type, skillId: skill.id });
    rollData.selectedConditionalEffects = [];
    await FraggedEmpireRoll.create(actor, rollData);
  }

  /* -------------------------------------------- */
  async rollGenericSkill() {
    const actor = this.parent;
    let rollData = {
      mode: "genericskill",
      alias: actor.name,
      actorImg: actor.img,
      actorId: actor.id,
      img: actor.img,
      hasFate: this.getGrit(),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.localize("FE2.Dialog.GenericSkillRoll"),
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
      difficulty: 0
    };
    rollData.effectModifiers = actor._effectModifiers;
    rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode);
    rollData.selectedConditionalEffects = [];
    await FraggedEmpireRoll.create(actor, rollData);
  }

  /* -------------------------------------------- */
  async rollWeapon(weaponId) {
    const actor = this.parent;
    let weapon = actor.items.find(item => item.id == weaponId);
    const target = game.user.targets.first();
    if (Object.is(target, undefined)) {
      ui.notifications.error(game.i18n.localize("FE2.Notifications.TargetNotFound"));
      return;
    }

    let intstat = 0;
    if (target.actor.type == 'npc' && target.actor.system.npctype == 'henchman') {
      intstat = target.actor.system.stats.Attribute.value;
    } else {
      intstat = target.actor.system.attributes.intelligence.current;
    }

    actor.updateWeaponStat(weapon);
    if (weapon) {
      let rollData = {
        mode: 'weapon',
        alias: actor.name,
        actorId: actor.id,
        actorImg: actor.img,
        img: weapon.img,
        target: target.actor,
        hasGrit: this.getGrit(),
        bMHitDice: 0,
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.format("FE2.Dialog.AttackTitle", { name: weapon.name }),
        weapon: weapon,
        distance: 0,
        rofValue: 1,
        cover: 0,
        intmod: 0,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        optionsMunitions: FraggedEmpireUtility.buildListOptions(0, Number(weapon.system.munitions)),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions()
      };
      // Character-specific: add skill selection
      let weaponSkills = actor.items.filter(item => item.type == 'skill' && item.system.type == 'personalcombat');
      rollData.weaponSkills = weaponSkills;
      let combatSkill = weaponSkills[0];
      if (weapon.system.defaultskill != "") {
        combatSkill = actor.items.find(item => item.type == 'skill' && item.system.type == 'personalcombat' && item.name == weapon.system.defaultskill);
      }
      rollData.skillId = combatSkill.id;
      rollData.skill = combatSkill;
      rollData.useMunitions = false;
      rollData.munitionsUsed = 0;
      rollData.effectModifiers = actor._effectModifiers;
      rollData.effectHitBonus = actor._computed?.hitBonus || 0;
      rollData.effectEndDmg = actor._computed?.enduranceDamage || 0;
      rollData.untrainedSkillMod = actor._computed?.untrainedSkillMod || 0;
      rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode, { skillType: 'personalcombat', skillId: combatSkill?.id });
      rollData.selectedConditionalEffects = [];
      let shotpath = canvas.grid.measurePath([target.actor.getActiveTokens()[0].center, actor.getActiveTokens()[0].center])
      rollData.distance = shotpath.distance
      rollData.rangepenalty = ((Math.ceil(shotpath.distance / weapon.system.statstotal.range.value) -1 ) *2)
      await FraggedEmpireRoll.create(actor, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
    }
  }
}
