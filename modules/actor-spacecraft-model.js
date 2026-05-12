/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireRoll } from "./fragged-empire-roll-dialog.js";
import { applyModifiers, getRelevantConditionalEffects } from "./effects/fragged-empire-effect-helpers.js";
import { SPACECRAFT_ATTRIBUTES } from "./effects/fragged-empire-effect-types.js";

/* -------------------------------------------- */
/* Schema Helpers                               */
/* -------------------------------------------- */
function _scAttrField(label) {
  const f = foundry.data.fields;
  return new f.SchemaField({
    label: new f.StringField({ initial: label }),
    value: new f.NumberField({ initial: 0, integer: true }),
    current: new f.NumberField({ initial: 0, integer: true }),
    traitId: new f.StringField({ initial: "" })
  });
}

function _fightStatField(label, opts = {}) {
  const f = foundry.data.fields;
  const schema = {
    label: new f.StringField({ initial: label })
  };
  if (opts.valueonly) {
    schema.valueonly = new f.BooleanField({ initial: true });
    schema.value = new f.NumberField({ initial: 0 });
  } else {
    schema.total = new f.NumberField({ initial: 0 });
    schema.bonus = new f.NumberField({ initial: 0 });
    if (opts.base !== false) {
      schema.base = new f.NumberField({ initial: 0 });
    }
  }
  if (opts.derivated) {
    schema.derivated = new f.SchemaField(opts.derivated);
  }
  return new f.SchemaField(schema);
}

function _derivatedField(label, valueonly = false) {
  const f = foundry.data.fields;
  if (valueonly) {
    return new f.SchemaField({
      label: new f.StringField({ initial: label }),
      valueonly: new f.BooleanField({ initial: true }),
      value: new f.NumberField({ initial: 0 })
    });
  }
  return new f.SchemaField({
    label: new f.StringField({ initial: label }),
    bonus: new f.NumberField({ initial: 0 }),
    total: new f.NumberField({ initial: 0 })
  });
}

/* -------------------------------------------- */
/**
 * Spacecraft-specific data model.
 * Registered via CONFIG.Actor.dataModels.spacecraft.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class SpacecraftDataModel extends foundry.abstract.TypeDataModel {

  /* -------------------------------------------- */
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      size: new f.SchemaField({
        label: new f.StringField({ initial: "FE2.Sheet.Spacecraft.Size" }),
        value: new f.NumberField({ initial: 3, integer: true })
      }),

      fightActorId: new f.StringField({ initial: "" }),
      description: new f.HTMLField({ initial: "" }),
      notes: new f.HTMLField({ initial: "" }),
      influence: new f.NumberField({ initial: 0 }),
      build: new f.StringField({ initial: "" }),
      munitions: new f.NumberField({ initial: 0 }),

      // Spacecraft also uses subactors for crew management
      subactors: new f.ArrayField(new f.StringField()),

      attributes: new f.SchemaField({
        hull: _scAttrField("FE2.SpacecraftAttr.Hull"),
        engines: _scAttrField("FE2.SpacecraftAttr.Engines"),
        crew: _scAttrField("FE2.SpacecraftAttr.Crew"),
        power: _scAttrField("FE2.SpacecraftAttr.Power"),
        cpu: _scAttrField("FE2.SpacecraftAttr.CPU"),
        sensors: _scAttrField("FE2.SpacecraftAttr.Sensors"),
        velocity: _scAttrField("FE2.SpacecraftAttr.Velocity")
      }),

      stats: new f.SchemaField({
        cargo: new f.SchemaField({
          label: new f.StringField({ initial: "FE2.Sheet.Spacecraft.Cargo" }),
          value: new f.NumberField({ initial: 0 }),
          bonus: new f.NumberField({ initial: 0 }),
          max: new f.NumberField({ initial: 0 })
        }),
        secretcargo: new f.SchemaField({
          label: new f.StringField({ initial: "FE2.Sheet.Spacecraft.SecretCargo" }),
          value: new f.NumberField({ initial: 0 })
        }),
        weaponsslot: new f.SchemaField({
          label: new f.StringField({ initial: "FE2.Sheet.Spacecraft.WeaponsSlot" }),
          value: new f.NumberField({ initial: 0 }),
          bonus: new f.NumberField({ initial: 0 }),
          max: new f.NumberField({ initial: 0 })
        }),
        resupply: new f.SchemaField({
          label: new f.StringField({ initial: "FE2.Sheet.Spacecraft.Resupply" }),
          value: new f.NumberField({ initial: 0 }),
          max: new f.NumberField({ initial: 0 }),
          bonus: new f.NumberField({ initial: 0 })
        })
      }),

      attributemax: new f.SchemaField({
        hull: new f.NumberField({ initial: 10 }),
        engines: new f.NumberField({ initial: 10 }),
        crew: new f.NumberField({ initial: 10 }),
        power: new f.NumberField({ initial: 10 }),
        cpu: new f.NumberField({ initial: 10 }),
        sensors: new f.NumberField({ initial: 10 }),
        velocity: new f.NumberField({ initial: 10 })
      }),

      fight: new f.SchemaField({
        defence: _fightStatField("FE2.Fight.Spacecraft.Defence", {
          derivated: {
            vsordinance: _derivatedField("FE2.Fight.Spacecraft.VsOrdinance"),
            vsboarding: _derivatedField("FE2.Fight.Spacecraft.VsBoarding")
          }
        }),
        armour: _fightStatField("FE2.Fight.Spacecraft.Armour", {
          derivated: {
            vsboarding: _derivatedField("FE2.Fight.Spacecraft.VsBoarding"),
            at0shield: _derivatedField("FE2.Fight.Spacecraft.At0Shield")
          }
        }),
        munitions: _fightStatField("FE2.Fight.Spacecraft.Munitions", { valueonly: true }),
        gritreroll: _fightStatField("FE2.Fight.Spacecraft.GritRerolls", { valueonly: true }),
        boarded: _fightStatField("FE2.Fight.Spacecraft.Boarded", { valueonly: true }),
        launchedbodies: _fightStatField("FE2.Fight.Spacecraft.LaunchedBodies", { valueonly: true }),
        bodies: _fightStatField("FE2.Fight.Spacecraft.Bodies", { valueonly: true }),
        shield: _fightStatField("FE2.Fight.Spacecraft.Shield", {
          derivated: {
            regen: _derivatedField("FE2.Fight.Spacecraft.Regen", true)
          }
        })
      })
    };
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    const actor = this.parent;
    const mods = actor._effectModifiers;

    // Compute effective attributes for spacecraft
    const defaultMaxes = this.attributemax || {};
    actor._baseValues.attributeMaxes = { ...defaultMaxes };
    actor._effectiveAttributes = actor._computeEffectiveAttributes(SPACECRAFT_ATTRIBUTES, mods, defaultMaxes);
    const ea = actor._effectiveAttributes;

    // Initialize sub-objects for base values
    actor._baseValues.statMaxes = {};
    actor._baseValues.fightTotals = {};

    // Cargo max
    let cargomax = (this.size.value * 4) + ea.hull.value - 10 + this.stats.cargo.bonus;
    actor._baseValues.statMaxes.cargo = cargomax;
    if (mods) cargomax = Math.round(applyModifiers(cargomax, mods.cargoMax));
    if (cargomax != this.stats.cargo.max) {
      this.stats.cargo.max = cargomax;
      actor.update({ 'system.stats.cargo.max': cargomax });
    }

    // Weapon slots max
    let slotmax = this.size.value + this.stats.weaponsslot.bonus;
    actor._baseValues.statMaxes.weaponsslot = slotmax;
    if (mods) slotmax = Math.round(applyModifiers(slotmax, mods.weaponSlotsMax));
    if (slotmax != this.stats.weaponsslot.max) {
      this.stats.weaponsslot.max = slotmax;
      actor.update({ 'system.stats.weaponsslot.max': slotmax });
    }

    // Resupply max
    let resupmax = (this.size.value * 2) + this.stats.resupply.bonus;
    actor._baseValues.statMaxes.resupply = resupmax;
    if (mods) resupmax = Math.round(applyModifiers(resupmax, mods.resupplyMax));
    if (resupmax != this.stats.resupply.max) {
      this.stats.resupply.max = resupmax;
      actor.update({ 'system.stats.resupply.max': resupmax });
    }

    // Velocity max
    let velomax = 6;
    if (velomax != this.attributes.velocity.value) {
      this.attributes.velocity.value = velomax;
      actor.update({ 'system.attributes.velocity.value': velomax });
    }

    // Defence base and total
    let defenceb = this.getDefenseBase();
    if (defenceb != this.fight.defence.base) {
      this.fight.defence.base = defenceb;
      actor.update({ 'system.fight.defence.base': defenceb });
    }
    let defencet = defenceb + this.fight.defence.bonus;
    actor._baseValues.fightTotals.defence = defencet;
    if (mods) defencet = Math.round(applyModifiers(defencet, mods.defense));
    if (defencet != this.fight.defence.total) {
      this.fight.defence.total = defencet;
      actor.update({ 'system.fight.defence.total': defencet });
    }

    // Armour base and total
    let armourb = this.getBaseArmour();
    if (armourb != this.fight.armour.base) {
      this.fight.armour.base = armourb;
      actor.update({ 'system.fight.armour.base': armourb });
    }
    let armourt = armourb + this.fight.armour.bonus;
    actor._baseValues.fightTotals.armour = armourt;
    if (mods) armourt = Math.round(applyModifiers(armourt, mods.armour));
    if (armourt != this.fight.armour.total) {
      this.fight.armour.total = armourt;
      actor.update({ 'system.fight.armour.total': armourt });
    }

    // Shield base and total
    let shieldb = 10 + (ea.power.value * this.size.value);
    if (shieldb != this.fight.shield.base) {
      this.fight.shield.base = shieldb;
      actor.update({ 'system.fight.shield.base': shieldb });
    }
    let shieldt = shieldb + this.fight.shield.bonus;
    actor._baseValues.fightTotals.shield = shieldt;
    if (mods) shieldt = Math.round(applyModifiers(shieldt, mods.shield));
    if (shieldt != this.fight.shield.total) {
      this.fight.shield.total = shieldt;
      actor.update({ 'system.fight.shield.total': shieldt });
    }

    // Shield regen
    if (mods && mods.shieldRegen.length) {
      actor._computed.shieldRegen = Math.round(applyModifiers(this.fight.shield.derivated.regen.value, mods.shieldRegen));
    }

    // Vs ordinance
    let vsordinance = this.fight.defence.total + this.fight.defence.derivated.vsordinance.bonus;
    if (vsordinance != this.fight.defence.derivated.vsordinance.total) {
      this.fight.defence.derivated.vsordinance.total = vsordinance;
      actor.update({ 'system.fight.defence.derivated.vsordinance.total': vsordinance });
    }

    // Vs boarding (uses effective crew)
    let vsboarding = 10 + this.size.value + ea.crew.value + this.fight.defence.derivated.vsboarding.bonus;
    if (vsboarding != this.fight.defence.derivated.vsboarding.total) {
      this.fight.defence.derivated.vsboarding.total = vsboarding;
      actor.update({ 'system.fight.defence.derivated.vsboarding.total': vsboarding });
    }

    // At 0 shield
    let at0shield = -1 + this.fight.armour.derivated.at0shield.bonus;
    if (at0shield != this.fight.armour.derivated.at0shield.total) {
      this.fight.armour.derivated.at0shield.total = at0shield;
      actor.update({ 'system.fight.armour.derivated.at0shield.total': at0shield });
    }
  }

  /* -------------------------------------------- */
  getDefenseBase() {
    return 12 - this.size.value + this.attributes.engines.value;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    return this.fight.defence.total;
  }

  /* -------------------------------------------- */
  getBaseArmour() {
    return 3;
  }

  /* -------------------------------------------- */
  getTotalArmour() {
    return this.fight.armour.total;
  }

  /* -------------------------------------------- */
  getInitiativeScore(phase) {
    const actor = this.parent;
    const ea = actor._effectiveAttributes || {};
    if (phase == 1) {
      const veloCur = ea.velocity?.current ?? this.attributes.velocity.current;
      const crewCur = ea.crew?.current ?? this.attributes.crew.current;
      return veloCur + (crewCur / 10);
    } else {
      const cpuCur = ea.cpu?.current ?? this.attributes.cpu.current;
      const crewCur = ea.crew?.current ?? this.attributes.crew.current;
      return cpuCur + (crewCur / 10);
    }
  }

  /* -------------------------------------------- */
  getGrit() {
    return this.fight.gritreroll.value;
  }

  /* -------------------------------------------- */
  getSpacecraftWeapons() {
    return this.parent.items.filter(item => item.type == 'spacecraftweapon');
  }

  /* -------------------------------------------- */
  getTradeGoods() {
    let tradeGoods = this.parent.items.filter(item => item.type == 'tradegood');
    for (let good of tradeGoods) {
      if (good.system.type == "money") {
        good.system.cargoSpace = 0;
      }
      if (good.system.type == "loot") {
        good.system.cargoSpace = .25;
      }
      if (good.system.type == "freight") {
        good.system.cargoSpace = 1;
      }
    }
    return tradeGoods;
  }

  /* -------------------------------------------- */
  getCargoSpaceUsed() {
    let tradeGoods = this.parent.items.filter(item => item.type == 'tradegood');
    let cargoSpaceUsed = 0;
    for (let good of tradeGoods) {
      cargoSpaceUsed = cargoSpaceUsed + good.system.cargoSpace;
    }
    return cargoSpaceUsed;
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
  async updateShipMunitions(actorId, amountUsed) {
    const actor = this.parent;
    let decremented = Math.max(0, this.fight.munitions.value - amountUsed);
    actor.update({ 'system.fight.munitions.value': decremented });
  }

  /* -------------------------------------------- */
  async rollSpacecraftWeapon(weaponId) {
    const actor = this.parent;
    let weapon = actor.items.find(item => item.id == weaponId);
    const target = game.user.targets.first();

    // Build available actor/skills
    let actorList = [];
    if (game.user.isGM) {
      let actorNPCship = actor.items.filter(item => item.name == 'Rival' || item.name == 'Outclassed' || item.name == 'Outgunned');
      if (actorNPCship.length != 0) {
      } else {
        for (let a of game.actors) {
          actorList.push({ id: a.id, name: a.name, skills: a.items.filter(item => item.type == 'skill' && item.system.type == 'spaceshipcombat') });
        }
      }
    } else {
      let actorWeapon = game.user.character;
      actorList.push({ id: actorWeapon.id, name: actorWeapon.name, skills: actorWeapon.items.filter(item => item.type == 'skill' && item.system.type == 'spaceshipcombat') });
    }

    // Skill prepare
    if (actorList.length != 0) {
      let skill = actorList[0].skills[0];
      skill.system.trainedValue = (skill.system.trained) ? 1 : -2;
      skill.system.total = skill.system.trainedValue + skill.system.bonus;
      skill.system.isTrait = skill.system.traits.length > 0;
    } else {
      actorList.push({ id: 0, name: game.i18n.localize("FE2.Sheet.NPC.Commander"), skills: [{ id: 99, name: "NPC Combat", system: { total: 0 } }] });
    }
    console.log(actor)
    if (weapon) {
      let rollData = {
        mode: 'spacecraftweapon',
        alias: actor.name,
        actorId: actor.id,
        actorList: actorList,
        img: weapon.img,
        rollMode: game.settings.get("core", "rollMode"),
        title: game.i18n.format("FE2.Dialog.SpacecraftAttackTitle", { name: weapon.name }),
        weapon: weapon,
        optionsMunitions: FraggedEmpireUtility.buildListOptions(0, Number(actor.system.fight.munitions.value)),
        hasGrit: this.getGrit(),
        skillId: actorList[0].skills[0].id,
        skill: actorList[0].skills[0],
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions(),
        bonusMalus: 0,
        bMHitDice: 0,
        isGM: game.user.isGM,
        target: target.actor
      };
      let rofMax = 1;
      rollData.rofValue = rofMax;
      rollData.effectModifiers = actor._effectModifiers;
      rollData.conditionalEffects = getRelevantConditionalEffects(actor, rollData.mode);
      rollData.selectedConditionalEffects = [];

      await FraggedEmpireRoll.create(actor, rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("FE2.Notifications.WeaponNotFound"), weaponId);
    }
  }
}
