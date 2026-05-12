/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireRoll } from "./fragged-empire-roll-dialog.js";
import { applyModifiers, getRelevantConditionalEffects } from "./effects/fragged-empire-effect-helpers.js";

/* -------------------------------------------- */
/* Schema Helpers                               */
/* -------------------------------------------- */
function _npcStatField(label) {
  const f = foundry.data.fields;
  return new f.SchemaField({
    value: new f.StringField({ initial: "" }),
    label: new f.StringField({ initial: label })
  });
}

function _fightField(label, opts = {}) {
  const f = foundry.data.fields;
  const schema = {
    value: new f.NumberField({ initial: 0 }),
    label: new f.StringField({ initial: label })
  };
  if (opts.hasMax) {
    schema.max = new f.NumberField({ initial: 0 });
  }
  if (opts.derivated) {
    schema.derivated = new f.SchemaField(opts.derivated);
  }
  return new f.SchemaField(schema);
}

function _specField(label) {
  const f = foundry.data.fields;
  return new f.SchemaField({
    value: new f.NumberField({ initial: 0 }),
    max: new f.NumberField({ initial: 0 }),
    label: new f.StringField({ initial: label })
  });
}

/* -------------------------------------------- */
/**
 * NPC-specific data model.
 * Registered via CONFIG.Actor.dataModels.npc.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class NPCDataModel extends foundry.abstract.TypeDataModel {

  /* -------------------------------------------- */
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      npctype: new f.StringField({ initial: "" }),
      description: new f.HTMLField({ initial: "" }),
      notes: new f.HTMLField({ initial: "" }),
      gmnotes: new f.HTMLField({ initial: "" }),
      controllerId: new f.StringField({ initial: "" }),

      spec: new f.SchemaField({
        bodies: _specField("FE2.Fight.NPC.Bodies"),
        avgplayerres: _specField("FE2.Fight.NPC.AveragePlayerResource")
      }),

      fight: new f.SchemaField({
        endurance: _fightField("FE2.Fight.NPC.Endurance", { hasMax: true }),
        durability: _fightField("FE2.Fight.NPC.Durability", { hasMax: true }),
        movement: _fightField("FE2.Fight.NPC.Movement"),
        armour: _fightField("FE2.Fight.NPC.Armour"),
        defence: _fightField("FE2.Fight.NPC.Defence", {
          derivated: {
            vsstealth: new f.SchemaField({
              value: new f.NumberField({ initial: 0 }),
              label: new f.StringField({ initial: "FE2.Fight.NPC.VsStealth" })
            }),
            vsimpair: new f.SchemaField({
              value: new f.NumberField({ initial: 0 }),
              label: new f.StringField({ initial: "FE2.Fight.NPC.VsImpair" })
            })
          }
        })
      }),

      stats: new f.SchemaField({
        Attribute: _npcStatField("FE2.Sheet.NPC.Attribute"),
        Mobility: _npcStatField("FE2.Attributes.Mobility")
      })
    };
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    const actor = this.parent;
    const mods = actor._effectModifiers;

    // Derive base Movement from Mobility stat (1:1 mapping)
    const mobilityValue = Number(this.stats.Mobility.value) || 0;
    this.fight.movement.value = mobilityValue;

    // Store base values for effect indicator comparison
    actor._baseValues.defence = this.fight.defence.value;
    actor._baseValues.armour = this.fight.armour.value;
    actor._baseValues.enduranceMax = this.fight.endurance.max;
    actor._baseValues.movement = mobilityValue;
    actor._baseValues.attribute = Number(this.stats.Attribute.value) || 0;
    actor._baseValues.mobility = mobilityValue;
    actor._baseValues.bodies = this.spec.bodies.max;
    actor._baseValues.durability = this.fight.durability.max;

    // NPC fight values are user-editable, so compute effective values separately.
    // Keys match system.fight keys (British spelling) so templates can use {{lookup}}.
    actor._computed.defence = mods ? Math.round(applyModifiers(this.fight.defence.value, mods.defense)) : this.fight.defence.value;
    actor._computed.armour = mods ? Math.round(applyModifiers(this.fight.armour.value, mods.armour)) : this.fight.armour.value;
    actor._computed.enduranceMax = mods ? Math.round(applyModifiers(this.fight.endurance.max, mods.enduranceMax)) : this.fight.endurance.max;
    actor._computed.movement = mods ? Math.round(applyModifiers(mobilityValue, mods.movement)) : mobilityValue;

    // NPC-specific effect buckets
    const baseAttr = Number(this.stats.Attribute.value) || 0;
    actor._computed.attribute = mods ? Math.round(applyModifiers(baseAttr, mods.npcAttribute)) : baseAttr;
    actor._computed.mobility = mods ? Math.round(applyModifiers(mobilityValue, mods.npcMobility)) : mobilityValue;
    // Mobility effects also feed into movement
    if (mods && mods.npcMobility.length) {
      actor._computed.movement = Math.round(applyModifiers(actor._computed.mobility, mods.movement));
    }
    actor._computed.bodies = mods ? Math.round(applyModifiers(this.spec.bodies.max, mods.npcBodies)) : this.spec.bodies.max;
    actor._computed.durability = mods ? Math.round(applyModifiers(this.fight.durability.max, mods.npcDurability)) : this.fight.durability.max;
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
    return this.fight.defence.value;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    return this.parent._computed?.defence ?? this.fight.defence.value;
  }

  /* -------------------------------------------- */
  getBaseArmour() {
    return this.fight.armour.value;
  }

  /* -------------------------------------------- */
  getTotalArmour() {
    return this.parent._computed?.armour ?? this.fight.armour.value;
  }

  /* -------------------------------------------- */
  getInitiativeScore(phase) {
    // Companion: copy controller's initiative
    if (this.npctype === "companion") {
      const controller = this.getController();
      if (controller) return controller.getInitiativeScore(phase);
    }
    // Henchman/Troop (or companion with no controller): always act last
    return -999;
  }

  /* -------------------------------------------- */
  getGrit() {
    return false;
  }

  /* -------------------------------------------- */
  getController() {
    if (this.npctype === "companion" && this.controllerId) {
      return game.actors.get(this.controllerId) ?? null;
    }
    return null;
  }

  /* -------------------------------------------- */
  getKeywords() {
    return this.parent.items.filter(item => item.type === 'keyword');
  }

  /* -------------------------------------------- */
  getVariations() {
    return this.parent.items.filter(item => item.type === 'variation');
  }

  /* -------------------------------------------- */
  getModifications() {
    return this.parent.items.filter(item => item.type === 'modification');
  }

  /* -------------------------------------------- */
  buildNPCRoFArray() {
    let bodiesBase = Number(this.spec.bodies.value);
    let rofMax = bodiesBase || 1;
    return FraggedEmpireUtility.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  async rollNPCFight() {
    const actor = this.parent;

    let rollData = {
      mode: 'npcfight',
      alias: actor.name,
      actorId: actor.id,
      img: actor.img,
      hasGrit: this.getGrit(),
      npcstats: foundry.utils.deepClone(this.stats),
      rollMode: game.settings.get("core", "rollMode"),
      title: game.i18n.format("FE2.Dialog.AttackTitle", { name: actor.name }),
      weaponRoFOptions: this.buildNPCRoFArray(),
      rofValue: 1,
      shotType: "snap",
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      optionsMunitions: FraggedEmpireUtility.buildListOptions(0, Number(weapon.system.munitions)),
      bonusMalus: 0,
      bMHitDice: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions()
    };
    rollData.effectModifiers = actor._effectModifiers;
    rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode);
    rollData.selectedConditionalEffects = [];
    rollData = FraggedEmpireUtility.calculateRangePenalty(rollData, actor)
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

    // Companion: delegate to controller's roll formula
    if (this.npctype === "companion") {
      const controller = this.getController();
      if (!controller) {
        ui.notifications.warn(game.i18n.localize("FE2.Sheet.NPC.NoController"));
        return;
      }
      if (!weapon) {
        ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
        return;
      }
      actor.updateWeaponStat(weapon);
      // Build rollData using controller's attributes (skills, focus, grit)
      let rollData = {
        mode: 'weapon',
        alias: actor.name,
        actorId: actor.id,
        actorImg: actor.img,
        img: weapon.img,
        target: target.actor,
        hasGrit: controller.getGrit(),
        bMHitDice: 0,
        rollMode: game.settings.get("core", "rollMode"),
        shotType: "snap",
        title: game.i18n.format("FE2.Dialog.AttackTitle", { name: weapon.name }),
        weapon: weapon,
        rofValue: 1,
        cover: 0,
        intmod: 0,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        optionsMunitions: FraggedEmpireUtility.buildListOptions(0, Number(weapon.system.munitions)),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions()
      };
      // Use controller's combat skill
      let weaponSkills = controller.items.filter(item => item.type === 'skill' && item.system.type === 'personalcombat');
      let combatSkill = weaponSkills[0];
      if (weapon.system.defaultskill) {
        combatSkill = controller.items.find(item => item.type === 'skill' && item.system.type === 'personalcombat' && item.name === weapon.system.defaultskill) || combatSkill;
      }
      rollData.weaponSkills = weaponSkills;
      rollData.skillId = combatSkill?.id;
      rollData.skill = combatSkill;
      // Pre-add controller's Focus to weapon endDmg (rollFraggedEmpire adds endDmgAdd=Attribute on top, which is 0 for companion)
      rollData.weapon.system.statstotal.enddmg.value = Number(controller.system.attributes.focus.current) + Number(rollData.weapon.system.statstotal.enddmg.value);
      rollData.useMunitions = false;
      rollData.munitionsUsed = 0;
      rollData.effectModifiers = controller._effectModifiers;
      rollData.effectHitBonus = controller._computed?.hitBonus || 0;
      rollData.effectEndDmg = controller._computed?.enduranceDamage || 0;
      rollData.untrainedSkillMod = controller._computed?.untrainedSkillMod || 0;
      rollData.conditionalEffects = getRelevantConditionalEffects(controller, rollData.mode, { skillType: 'personalcombat', skillId: combatSkill?.id });
      rollData.selectedConditionalEffects = [];
      rollData = FraggedEmpireUtility.calculateRangePenalty(rollData, actor)
      await FraggedEmpireRoll.create(actor, rollData);
      return;
    }

    // Henchman/Troop: standard NPC roll with +2 attack bonus
    if (weapon) {
      actor.updateWeaponStat(weapon);
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
        shotType: "snap",
        title: game.i18n.format("FE2.Dialog.AttackTitle", { name: weapon.name }),
        weapon: weapon,
        rofValue: 1,
        cover: 0,
        intmod: 0,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        optionsMunitions: FraggedEmpireUtility.buildListOptions(0, Number(weapon.system.munitions)),
        bonusMalus: 2,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions()
      };

      // Bodies bonus for non-individual NPCs
      const keywords = this.getKeywords();
      const isIndividual = keywords.some(k => k.name.toLowerCase() === "individual");
      const bodies = Number(this.spec.bodies.value) || 0;
      if (!isIndividual && bodies > 0) {
        rollData.bMHitDice += bodies;
        rollData.weapon.system.statstotal.enddmg.value = Number(rollData.weapon.system.statstotal.enddmg.value) + bodies;
      }

      rollData.effectModifiers = actor._effectModifiers;
      rollData.effectHitBonus = actor._computed?.hitBonus || 0;
      rollData.effectEndDmg = actor._computed?.enduranceDamage || 0;
      rollData.untrainedSkillMod = actor._computed?.untrainedSkillMod || 0;
      rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode);
      rollData.selectedConditionalEffects = [];
      rollData = FraggedEmpireUtility.calculateRangePenalty(rollData, actor)
      await FraggedEmpireRoll.create(actor, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
    }
  }

  /* -------------------------------------------- */
  async rollGenericSkill() {
    const actor = this.parent;

    // Companion: use controller's effect modifiers for the roll
    if (this.npctype === "companion") {
      const controller = this.getController();
      if (!controller) {
        ui.notifications.warn(game.i18n.localize("FE2.Sheet.NPC.NoController"));
        return;
      }
      let rollData = {
        mode: "genericskill",
        alias: actor.name,
        actorImg: actor.img,
        actorId: actor.id,
        img: actor.img,
        hasGrit: controller.getGrit(),
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.localize("FE2.Dialog.GenericSkillRoll"),
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
        difficulty: 0
      };
      rollData.effectModifiers = controller._effectModifiers;
      rollData.conditionalEffects = getRelevantConditionalEffects(controller, rollData.mode);
      rollData.selectedConditionalEffects = [];
      await FraggedEmpireRoll.create(actor, rollData);
      return;
    }

    let rollData = {
      mode: "genericskill",
      alias: actor.name,
      actorImg: actor.img,
      actorId: actor.id,
      img: actor.img,
      hasGrit: this.getGrit(),
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
}
