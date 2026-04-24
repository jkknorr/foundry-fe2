/**
 * FraggedEmpire system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { FraggedEmpireActor } from "./fragged-empire-actor.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";
import { FraggedEmpireActorSheet } from "./fragged-empire-actor-sheet.js";
import { FraggedEmpireSpacecraftSheet } from "./fragged-empire-spacecraft-sheet.js";
import { FraggedEmpireNPCSheet } from "./fragged-empire-npc-sheet.js";
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireCombat } from "./fragged-empire-combat.js";
import { FraggedEmpireEffect } from "./effects/fragged-empire-effect.js";
import { FraggedEmpireEffectSheet } from "./effects/fragged-empire-effect-sheet.js";
import { CharacterDataModel } from "./actor-character-model.js";
import { NPCDataModel } from "./actor-npc-model.js";
import { SpacecraftDataModel } from "./actor-spacecraft-model.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {
  console.log(`Initializing Fragged Empire`);
  const compTables = await FraggedEmpireUtility.loadCompendium("foundry-fe2.fragged-empire-2-tables");

  game.settings.register("foundry-fe2", "systemMigrationVersion", {
      name: "System Migration Version",
      scope: "world",
      config: false,
      type: String,
      default: ""
  });

  /* -------------------------------------------- */
  // Custom Handlebars helper: resolve item type to localized label
  Handlebars.registerHelper("localizeType", function (type) {
    const key = CONFIG.Item.typeLabels?.[type];
    return key ? game.i18n.localize(key) : type;
  });

  /* -------------------------------------------- */
  // Custom Handlebars helper: numeric stepper component
  Handlebars.registerHelper("numericStepper", function (options) {
    const name = options.hash.name ?? "";
    const rawValue = options.hash.value;
    const strValue = String(rawValue ?? "");
    const isNumeric = strValue.trim() === "" || !isNaN(Number(strValue));
    const value = isNumeric ? Number(strValue) : 0;
    const min = options.hash.min !== undefined ? Number(options.hash.min) : -Infinity;
    const max = options.hash.max !== undefined ? Number(options.hash.max) : Infinity;
    const step = Number(options.hash.step) || 1;
    const disabled = options.hash.disabled;

    // Non-numeric values: fall back to plain display or input
    if (!isNumeric) {
      if (disabled) {
        return new Handlebars.SafeString(
          `<div class="fe2-numeric-stepper fe2-numeric-stepper--disabled"><span class="fe2-stepper-value">${Handlebars.Utils.escapeExpression(strValue)}</span></div>`
        );
      }
      return new Handlebars.SafeString(
        `<input type="text" class="input-numeric-short fe2-stat-input" name="${Handlebars.Utils.escapeExpression(name)}" value="${Handlebars.Utils.escapeExpression(strValue)}" data-dtype="String"/>`
      );
    }

    if (disabled) {
      return new Handlebars.SafeString(
        `<div class="fe2-numeric-stepper fe2-numeric-stepper--disabled"><span class="fe2-stepper-value">${value}</span></div>`
      );
    }

    const downDisabled = value <= min ? ' disabled' : '';
    const upDisabled = value >= max ? ' disabled' : '';
    const downTitle = game.i18n.localize("FE2.Sheet.Common.StepDown");
    const upTitle = game.i18n.localize("FE2.Sheet.Common.StepUp");

    return new Handlebars.SafeString(
      `<div class="fe2-numeric-stepper" data-field="${name}" data-min="${min}" data-max="${max}" data-step="${step}">` +
        `<button type="button" class="fe2-stepper-btn" data-action="stepDown" title="${downTitle}"${downDisabled}><i class="fas fa-minus"></i></button>` +
        `<span class="fe2-stepper-value">${value}</span>` +
        `<button type="button" class="fe2-stepper-btn" data-action="stepUp" title="${upTitle}"${upDisabled}><i class="fas fa-plus"></i></button>` +
      `</div>`
    );
  });

  /* -------------------------------------------- */
  // Custom Handlebars helper: return CSS class name for color-coding modified values
  Handlebars.registerHelper("modColor", function (effective, base) {
    const eff = Number(effective);
    const b = Number(base);
    if (isNaN(eff) || isNaN(b) || eff === b) return "";
    return eff > b ? "fe2-mod-up" : "fe2-mod-down";
  });

  /* -------------------------------------------- */
  // preload handlebars templates
  FraggedEmpireUtility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 1
  };

  /* -------------------------------------------- */
  game.socket.on("system.foundry-fe2", data => {
    FraggedEmpireUtility.onSocketMesssage(data);
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Combat.documentClass = FraggedEmpireCombat;
  CONFIG.Actor.documentClass = FraggedEmpireActor;
  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc: NPCDataModel,
    spacecraft: SpacecraftDataModel
  };
  CONFIG.FraggedEmpire = {
  }

  // Register custom ActiveEffect document class and enable legacy transferral
  CONFIG.ActiveEffect.documentClass = FraggedEmpireEffect;
  CONFIG.ActiveEffect.legacyTransferral = true;

  // Register custom ActiveEffect sheet
  foundry.applications.apps.DocumentSheetConfig.unregisterSheet(ActiveEffect, "core", foundry.applications.sheets.ActiveEffectConfig);
  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "foundry-fe2", FraggedEmpireEffectSheet, {
    makeDefault: true,
    label: "FE2.SheetLabels.Effect"
  });

  /* -------------------------------------------- */
  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireActorSheet, { types: ["character"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireSpacecraftSheet, { types: ["spacecraft"], makeDefault: false });
  foundry.documents.collections.Actors.registerSheet("foundry-fe2", FraggedEmpireNPCSheet, { types: ["npc"], makeDefault: false });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("foundry-fe2", FraggedEmpireItemSheet, { makeDefault: true });

  // Auto-generate keywordId from name for keyword items
  Hooks.on("preCreateItem", (item, data) => {
    if (data.type !== "keyword") return;
    if (!data.system?.keywordId && data.name) {
      item.updateSource({ "system.keywordId": data.name.toLowerCase().replace(/[^a-z0-9]/g, "") });
    }
  });
  Hooks.on("preUpdateItem", (item, changes) => {
    if (item.type !== "keyword") return;
    const newName = changes.name;
    const currentKwId = item.system.keywordId ?? "";
    const incomingKwId = changes.system?.keywordId;
    if (!currentKwId && incomingKwId === undefined && newName) {
      foundry.utils.setProperty(changes, "system.keywordId", newName.toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  });

  FraggedEmpireUtility.init();

  // Localize actor and item type names
  CONFIG.Actor.typeLabels = {
    "character": "FE2.ActorTypes.Character",
    "npc": "FE2.ActorTypes.NPC",
    "spacecraft": "FE2.ActorTypes.Spacecraft"
  };
  CONFIG.Item.typeLabels = {
    "weapon": "FE2.Items.Types.Weapon",
    "skill": "FE2.Items.Types.Skill",
    "trait": "FE2.Items.Types.Trait",
    "outfit": "FE2.Items.Types.Outfit",
    "equipment": "FE2.Items.Types.Equipment",
    "perk": "FE2.Items.Types.Perk",
    "complication": "FE2.Items.Types.Complication",
    "race": "FE2.Items.Types.Race",
    "language": "FE2.Items.Types.Language",
    "utility": "FE2.Items.Types.Utility",
    "tradegood": "FE2.Items.Types.TradeGood",
    "research": "FE2.Items.Types.Research",
    "modification": "FE2.Items.Types.Modification",
    "variation": "FE2.Items.Types.Variation",
    "stronghit": "FE2.Items.Types.StrongHit",
    "spacecraftperk": "FE2.Items.Types.SpacecraftPerk",
    "spacecrafttrait": "FE2.Items.Types.SpacecraftTrait",
    "spacecraftweapon": "FE2.Items.Types.SpacecraftWeapon",
    "spacecraftweaponmodification": "FE2.Items.Types.SpacecraftWeaponMod",
    "spacecraftweaponvariation": "FE2.Items.Types.SpacecraftWeaponVar",
    "variationoutfit": "FE2.Items.Types.VariationOutfit",
    "modificationoutfit": "FE2.Items.Types.ModificationOutfit",
    "keyword": "FE2.Items.Types.Keyword"
  };

});

/* -------------------------------------------- */
function welcomeMessage() {
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div id="welcome-message-fragged-empire"><span class="rdd-roll-part">${game.i18n.localize("FE2.Chat.Results.Welcome")}</div>
    ` });
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", async function () {

  FraggedEmpireUtility.ready();

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info(game.i18n.localize("FE2.Notifications.NoLinkedCharacter"));
    ChatMessage.create({
      content: game.i18n.format("FE2.Notifications.NoLinkedCharacterChat", {name: game.user.name}),
      user: game.user.id
    });
  }

  if (foundry.utils.isNewerVersion("1.01", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      try {
        if (actor.type == 'character') {
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.attributes.mobility = updateData.system.attributes.movement;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
            await actor.update({'system.attributes.-=movement':null})
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  if (foundry.utils.isNewerVersion("1.02", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      try {
        if (actor.type == 'spacecraft') {
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.fight.gritreroll.label = "Grit re-rolls";
          updateData.system.fight.gritreroll.valueonly = true;
          updateData.system.fight.gritreroll.value = 0;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
          }
        }
        if (actor.type == 'character'){
          let updateData = foundry.utils.deepClone(actor.toObject());
          updateData.system.combatordermod = 0;
          if (!foundry.utils.isEmpty(updateData)) {
            await actor.update(updateData, { enforceTypes: false });
          }
        }
      } catch (error) {
        error.message = `Failed migration for Actor ${actor.name}: ${error.message} `;
        console.error(error);
      }
    }
  }

  // Migration 1.03: Replace hardcoded English labels with i18n keys
  if (foundry.utils.isNewerVersion("1.03", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const labelAlreadyI18n = (v) => typeof v === "string" && v.startsWith("FE2.");

    // Actor attribute label maps
    const charAttrMap = { "Strength": "FE2.Attributes.Strength", "Reflexes": "FE2.Attributes.Reflexes", "Mobility": "FE2.Attributes.Mobility", "Focus": "FE2.Attributes.Focus", "Intelligence": "FE2.Attributes.Intelligence", "Grit": "FE2.Attributes.Grit" };
    const scAttrMap = { "Hull": "FE2.SpacecraftAttr.Hull", "Engines": "FE2.SpacecraftAttr.Engines", "Crew": "FE2.SpacecraftAttr.Crew", "Power": "FE2.SpacecraftAttr.Power", "CPU": "FE2.SpacecraftAttr.CPU", "Sensors": "FE2.SpacecraftAttr.Sensors", "Velocity": "FE2.SpacecraftAttr.Velocity" };
    const scStatsMap = { "Cargo": "FE2.Sheet.Spacecraft.Cargo", "Secret Cargo": "FE2.Sheet.Spacecraft.SecretCargo", "Weapons slot": "FE2.Sheet.Spacecraft.WeaponsSlot", "Resupply": "FE2.Sheet.Spacecraft.Resupply" };
    const scFightMap = { "Defence": "FE2.Fight.Spacecraft.Defence", "Armour": "FE2.Fight.Spacecraft.Armour", "Munitions": "FE2.Fight.Spacecraft.Munitions", "Grit re-rolls": "FE2.Fight.Spacecraft.GritRerolls", "Boarded": "FE2.Fight.Spacecraft.Boarded", "Launched Bodies": "FE2.Fight.Spacecraft.LaunchedBodies", "Bodies": "FE2.Fight.Spacecraft.Bodies", "Shield": "FE2.Fight.Spacecraft.Shield" };
    const scFightDerivMap = { "Vs Ordinance": "FE2.Fight.Spacecraft.VsOrdinance", "Vs Boarding": "FE2.Fight.Spacecraft.VsBoarding", "At 0 Shield": "FE2.Fight.Spacecraft.At0Shield", "Regen": "FE2.Fight.Spacecraft.Regen" };
    const npcFightMap = { "Endurance": "FE2.Fight.NPC.Endurance", "Durability": "FE2.Fight.NPC.Durability", "Movement": "FE2.Fight.NPC.Movement", "Armour": "FE2.Fight.NPC.Armour", "Defence": "FE2.Fight.NPC.Defence" };
    const npcDerivMap = { "vs Stealth": "FE2.Fight.NPC.VsStealth", "vs Impair": "FE2.Fight.NPC.VsImpair" };
    const npcSpecMap = { "Bodies": "FE2.Fight.NPC.Bodies", "Average Player Resource": "FE2.Fight.NPC.AveragePlayerResource" };

    // Item stat label maps
    const weaponStatsMap = { "Hit Dice": "FE2.Stats.Weapon.HitDice", "Hit Bonus": "FE2.Stats.Weapon.HitBonus", "Endurance Damage": "FE2.Stats.Weapon.EnduranceDamage", "Critical Damage": "FE2.Stats.Weapon.CriticalDamage", "Range Increment": "FE2.Stats.Weapon.RangeIncrement", "Acquire": "FE2.Stats.Weapon.Acquire", "Resources": "FE2.Stats.Weapon.Resources" };
    const outfitStatsMap = { "Defence": "FE2.Stats.Outfit.Defence", "Endurance": "FE2.Stats.Outfit.Endurance", "Armour": "FE2.Stats.Outfit.Armour", "At 0 Endurance": "FE2.Stats.Outfit.AtZeroEndurance", "Outfit Type": "FE2.Stats.Outfit.OutfitType", "Cost": "FE2.Stats.Outfit.Cost", "Cover": "FE2.Stats.Outfit.Cover", "Front Cover": "FE2.Stats.Outfit.FrontCover", "Equipped Equipment Slots": "FE2.Stats.Outfit.EquippedEquipmentSlots", "Weight": "FE2.Stats.Outfit.Weight" };
    const scWeaponStatsMap = { "Hit Dice": "FE2.Stats.Spacecraft.HitDice", "Hit Bonus": "FE2.Stats.Spacecraft.HitBonus", "Range Increment": "FE2.Stats.Spacecraft.RangeIncrement", "Shield Damage": "FE2.Stats.Spacecraft.ShieldDamage", "Critical Damage": "FE2.Stats.Spacecraft.CriticalDamage", "Mount": "FE2.Stats.Spacecraft.Mount", "Weapon Type": "FE2.Stats.Spacecraft.WeaponType", "Acquire": "FE2.Stats.Spacecraft.Acquire", "Influence": "FE2.Stats.Spacecraft.Influence" };

    // Item keyword label maps
    const weaponKwMap = { "Arc of Fire": "FE2.Keywords.Weapon.ArcOfFire", "Attribute 1d3": "FE2.Keywords.Weapon.Attribute1d3", "Bio Tech": "FE2.Keywords.Weapon.BioTech", "Blunt": "FE2.Keywords.Weapon.Blunt", "Burn": "FE2.Keywords.Weapon.Burn", "Cost Spare TP": "FE2.Keywords.Weapon.CostSpareTP", "Electro-Gravity": "FE2.Keywords.Weapon.ElectroGravity", "Energy": "FE2.Keywords.Weapon.Energy", "For 1 Session Only": "FE2.Keywords.Weapon.For1SessionOnly", "Gauntlet": "FE2.Keywords.Weapon.Gauntlet", "Innate": "FE2.Keywords.Weapon.Innate", "Jam": "FE2.Keywords.Weapon.Jam", "Lock On": "FE2.Keywords.Weapon.LockOn", "Lose": "FE2.Keywords.Weapon.Lose", "Low Tech": "FE2.Keywords.Weapon.LowTech", "Mod. Rolls": "FE2.Keywords.Weapon.ModRolls", "Natural": "FE2.Keywords.Weapon.Natural", "No Var. or Mod.": "FE2.Keywords.Weapon.NoVarOrMod", "Optional": "FE2.Keywords.Weapon.Optional", "Only": "FE2.Keywords.Weapon.Only", "Pen": "FE2.Keywords.Weapon.Pen", "Prototype": "FE2.Keywords.Weapon.Prototype", "Requires": "FE2.Keywords.Weapon.Requires", "Robot": "FE2.Keywords.Weapon.Robot", "Setup ": "FE2.Keywords.Weapon.Setup", "Slow": "FE2.Keywords.Weapon.Slow", "Small": "FE2.Keywords.Weapon.Small", "Splash": "FE2.Keywords.Weapon.Splash", "Stealth": "FE2.Keywords.Weapon.Stealth", "Strong Hit": "FE2.Keywords.Weapon.StrongHit", "Works in Liquid": "FE2.Keywords.Weapon.WorksInLiquid", "Not in the void": "FE2.Keywords.Weapon.NotInTheVoid" };
    const weaponKwYMap = { "Min": "FE2.Keywords.Weapon.Min", "Pull Down": "FE2.Keywords.Weapon.PullDown", "-": "FE2.Keywords.Weapon.Dash" };
    const scWeaponKwMap = { "Cost Spare Time Point": "FE2.Keywords.SpacecraftWeapon.CostSpareTimePoint", "For One Session Only": "FE2.Keywords.SpacecraftWeapon.ForOneSessionOnly", "Modification Rolls": "FE2.Keywords.SpacecraftWeapon.ModificationRolls", "No Variation or Modifications": "FE2.Keywords.SpacecraftWeapon.NoVarOrMod", "Does not work in the void": "FE2.Keywords.SpacecraftWeapon.NotInTheVoid" };
    const outfitKwMap = { "Bio Tech": "FE2.Keywords.Outfit.BioTech", "Communications Short": "FE2.Keywords.Outfit.CommunicationsShort", "Communications Long": "FE2.Keywords.Outfit.CommunicationsLong", "Cost Spare Time Point": "FE2.Keywords.Outfit.CostSpareTimePoint", "Environmental Gear": "FE2.Keywords.Outfit.EnvironmentalGear", "Flight": "FE2.Keywords.Outfit.Flight", "Gauntlet": "FE2.Keywords.Outfit.Gauntlet", "Innate": "FE2.Keywords.Outfit.Innate", "Modification Rolls": "FE2.Keywords.Outfit.ModificationRolls", "Set Up, Pull Down": "FE2.Keywords.Outfit.SetUpPullDown", "Shield": "FE2.Keywords.Outfit.Shield" };

    // Helper to migrate labels in a flat object of {key: {label, ...}}
    function migrateLabels(obj, map, updates, prefix) {
      if (!obj) return;
      for (let key in obj) {
        if (obj[key]?.label && !labelAlreadyI18n(obj[key].label) && map[obj[key].label]) {
          updates[`${prefix}.${key}.label`] = map[obj[key].label];
        }
        if (obj[key]?.labelY && !labelAlreadyI18n(obj[key].labelY) && weaponKwYMap[obj[key].labelY]) {
          updates[`${prefix}.${key}.labelY`] = weaponKwYMap[obj[key].labelY];
        }
      }
    }

    // Helper to migrate derivated sub-labels
    function migrateDerivated(obj, map, updates, prefix) {
      if (!obj?.derivated) return;
      for (let key in obj.derivated) {
        if (obj.derivated[key]?.label && !labelAlreadyI18n(obj.derivated[key].label) && map[obj.derivated[key].label]) {
          updates[`${prefix}.derivated.${key}.label`] = map[obj.derivated[key].label];
        }
      }
    }

    // Migrate actors
    for (let actor of game.actors) {
      try {
        let updates = {};
        if (actor.type === "character") {
          migrateLabels(actor.system.attributes, charAttrMap, updates, "system.attributes");
        } else if (actor.type === "spacecraft") {
          migrateLabels(actor.system.attributes, scAttrMap, updates, "system.attributes");
          migrateLabels(actor.system.stats, scStatsMap, updates, "system.stats");
          if (actor.system.size?.label && !labelAlreadyI18n(actor.system.size.label)) {
            updates["system.size.label"] = "FE2.Sheet.Spacecraft.Size";
          }
          for (let fKey in actor.system.fight) {
            let fStat = actor.system.fight[fKey];
            if (fStat?.label && !labelAlreadyI18n(fStat.label) && scFightMap[fStat.label]) {
              updates[`system.fight.${fKey}.label`] = scFightMap[fStat.label];
            }
            migrateDerivated(fStat, scFightDerivMap, updates, `system.fight.${fKey}`);
          }
        } else if (actor.type === "npc") {
          for (let fKey in actor.system.fight) {
            let fStat = actor.system.fight[fKey];
            if (fStat?.label && !labelAlreadyI18n(fStat.label) && npcFightMap[fStat.label]) {
              updates[`system.fight.${fKey}.label`] = npcFightMap[fStat.label];
            }
            migrateDerivated(fStat, npcDerivMap, updates, `system.fight.${fKey}`);
          }
          migrateLabels(actor.system.spec, npcSpecMap, updates, "system.spec");
          if (actor.system.stats?.Attribute?.label && !labelAlreadyI18n(actor.system.stats.Attribute.label)) {
            updates["system.stats.Attribute.label"] = "FE2.Sheet.NPC.Attribute";
          }
        }
        if (Object.keys(updates).length > 0) {
          await actor.update(updates);
        }
      } catch (error) {
        error.message = `Failed i18n migration for Actor ${actor.name}: ${error.message}`;
        console.error(error);
      }
    }

    // Migrate items (both world items and embedded items on actors)
    const allItems = [...game.items];
    for (let actor of game.actors) {
      for (let item of actor.items) {
        allItems.push(item);
      }
    }
    for (let item of allItems) {
      try {
        let updates = {};
        const t = item.type;
        // Weapon stats
        if (["weapon", "modification", "variation"].includes(t)) {
          migrateLabels(item.system.stats, weaponStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, weaponStatsMap, updates, "system.statstotal");
        }
        // Weapon keywords
        if (t === "weapon") {
          migrateLabels(item.system.keywords, { ...weaponKwMap }, updates, "system.keywords");
        }
        // Outfit/utility stats
        if (["outfit", "variationoutfit", "modificationoutfit", "utility"].includes(t)) {
          migrateLabels(item.system.stats, outfitStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, outfitStatsMap, updates, "system.statstotal");
        }
        // Outfit/utility keywords
        if (["outfit", "utility"].includes(t)) {
          migrateLabels(item.system.keywords, outfitKwMap, updates, "system.keywords");
        }
        // Spacecraft weapon stats
        if (["spacecraftweapon", "spacecraftweaponmodification", "spacecraftweaponvariation"].includes(t)) {
          migrateLabels(item.system.stats, scWeaponStatsMap, updates, "system.stats");
          if (item.system.statstotal) migrateLabels(item.system.statstotal, scWeaponStatsMap, updates, "system.statstotal");
        }
        // Spacecraft weapon keywords (merge both maps)
        if (t === "spacecraftweapon") {
          migrateLabels(item.system.keywords, { ...weaponKwMap, ...scWeaponKwMap }, updates, "system.keywords");
        }
        if (Object.keys(updates).length > 0) {
          await item.update(updates);
        }
      } catch (error) {
        error.message = `Failed i18n migration for Item ${item.name}: ${error.message}`;
        console.error(error);
      }
    }
  }

  // Migration 1.04: Add modifiers and attributemax fields for ActiveEffect support
  if (foundry.utils.isNewerVersion("1.04", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const defaultModifiers = {
      hitbonus: 0, endurancedamage: 0, utilitiesmax: 0,
      movement: 0, acquisitionmod: 0, arcanemod: 0, untrainedskillmod: 0
    };
    const defaultCharAttrMax = {
      strength: 5, reflexes: 5, mobility: 5, focus: 5, intelligence: 5, grit: 5
    };
    const defaultScAttrMax = {
      hull: 10, engines: 10, crew: 10, power: 10, cpu: 10, sensors: 10, velocity: 10
    };

    for (let actor of game.actors) {
      try {
        let updates = {};
        if (actor.type === "character") {
          if (!actor.system.modifiers) updates["system.modifiers"] = defaultModifiers;
          if (!actor.system.attributemax) updates["system.attributemax"] = defaultCharAttrMax;
        } else if (actor.type === "spacecraft") {
          if (!actor.system.attributemax) updates["system.attributemax"] = defaultScAttrMax;
        }
        if (Object.keys(updates).length > 0) {
          await actor.update(updates);
        }
      } catch (error) {
        error.message = `Failed effects migration for Actor ${actor.name}: ${error.message}`;
        console.error(error);
      }
    }
  }

  // Migration 1.05: Zero out bonus fields now driven by Active Effects
  if (foundry.utils.isNewerVersion("1.05", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      if (actor.type !== "character") continue;
      try {
        await actor.update({
          "system.armourbonus.armour": 0,
          "system.armourbonus.zeroendurance": 0,
          "system.defensebonus.defense": 0,
          "system.influence.bonus": 0,
          "system.resources.bonus": 0,
          "system.equipmentslots.bonus": 0,
          "system.endurance.endurancebonus": 0,
          "system.endurance.recoverybonus": 0,
          "system.gritreroll.bonus": 0,
          "system.combatordermod": 0,
          "system.modifiers.hitbonus": 0,
          "system.modifiers.endurancedamage": 0,
          "system.modifiers.utilitiesmax": 0,
          "system.modifiers.movement": 0,
          "system.modifiers.untrainedskillmod": 0,
          "system.modifiers.acquisitionmod": 0,
          "system.modifiers.arcanemod": 0
        }, { enforceTypes: false });
      } catch (err) {
        console.error(`FE2 | Migration 1.05 failed for actor ${actor.name}:`, err);
      }
    }
  }

  // Migration 1.06: Carry states, equipment fields, keyword array format
  if (foundry.utils.isNewerVersion("1.06", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const equippableTypes = new Set(["weapon", "outfit", "utility", "equipment"]);
    const keywordTypes = new Set(["weapon", "outfit", "utility", "equipment", "spacecraftweapon"]);

    // Collect all items: world items + embedded items on actors
    const allItems = [...game.items];
    for (const actor of game.actors) {
      for (const item of actor.items) allItems.push(item);
    }

    for (const item of allItems) {
      try {
        const updates = {};
        const t = item.type;

        // Carry state migration (equippable items only)
        if (equippableTypes.has(t) && !("carryState" in item.system)) {
          if ("equipped" in item.system) {
            if (item.system.equipped) {
              updates["system.carryState"] = (t === "outfit") ? "active" : "inHand";
            } else {
              updates["system.carryState"] = "carried";
            }
          } else {
            updates["system.carryState"] = "carried";
          }
        }

        // Inject default equipment fields if missing
        if (equippableTypes.has(t)) {
          if (item.system.slots === undefined) updates["system.slots"] = 2;
          if (item.system.hands === undefined) updates["system.hands"] = (t === "weapon") ? 2 : 0;
          if (item.system.draw === undefined) updates["system.draw"] = 1;
          if (item.system.reload === undefined) updates["system.reload"] = 2;
        }

        // Keyword migration: nested object → array format
        if (keywordTypes.has(t) && item.system.keywords && !Array.isArray(item.system.keywords)) {
          const kws = [];
          for (const [key, val] of Object.entries(item.system.keywords)) {
            if (!val || typeof val !== "object" || !val.flag) continue;
            const entry = { id: key };
            if (val.X && val.X !== "0" && val.X !== "") entry.X = val.X;
            if (val.Y && val.Y !== "0" && val.Y !== "") entry.Y = val.Y;
            kws.push(entry);
          }
          updates["system.keywords"] = kws;
        }

        if (Object.keys(updates).length > 0) {
          await item.update(updates);
        }
      } catch (error) {
        console.error(`FE2 | Migration 1.06 failed for Item ${item.name}:`, error);
      }
    }
  }

  // Migration 1.07: Add stronghits and keywords arrays to var/mod item types
  if (foundry.utils.isNewerVersion("1.07", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const stronghitTypes = new Set(["weapon", "outfit", "spacecraftweapon", "variation", "modification", "variationoutfit", "modificationoutfit", "spacecraftweaponvariation", "spacecraftweaponmodification"]);
    const varModTypes = new Set(["variation", "modification", "variationoutfit", "modificationoutfit", "spacecraftweaponvariation", "spacecraftweaponmodification"]);

    const allItems = [...game.items];
    for (const actor of game.actors) {
      for (const item of actor.items) allItems.push(item);
    }

    for (const item of allItems) {
      try {
        const updates = {};
        if (stronghitTypes.has(item.type) && item.system.stronghits === undefined) {
          updates["system.stronghits"] = [];
        }
        if (varModTypes.has(item.type) && item.system.keywords === undefined) {
          updates["system.keywords"] = [];
        }
        if (Object.keys(updates).length > 0) {
          await item.update(updates);
        }
      } catch (error) {
        console.error(`FE2 | Migration 1.07 failed for Item ${item.name}:`, error);
      }
    }
  }

  // Migration 1.08: NPC schema additions (Mobility, endurance/durability max, controllerId, notes, gmnotes, type rename)
  if (foundry.utils.isNewerVersion("1.08", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    for (let actor of game.actors) {
      if (actor.type !== "npc") continue;
      try {
        const updates = {};

        // Add Mobility attribute (default from current movement value)
        if (!actor.system.stats?.Mobility) {
          updates["system.stats.Mobility"] = {
            value: actor.system.fight?.movement?.value ?? 0,
            label: "FE2.Attributes.Mobility"
          };
        }

        // Add endurance.max and durability.max
        if (actor.system.fight?.endurance && actor.system.fight.endurance.max === undefined) {
          updates["system.fight.endurance.max"] = actor.system.fight.endurance.value ?? 0;
        }
        if (actor.system.fight?.durability && actor.system.fight.durability.max === undefined) {
          updates["system.fight.durability.max"] = actor.system.fight.durability.value ?? 0;
        }

        // Add controllerId
        if (actor.system.controllerId === undefined) {
          updates["system.controllerId"] = "";
        }

        // Add notes/gmnotes (formalize existing usage)
        if (actor.system.notes === undefined) updates["system.notes"] = "";
        if (actor.system.gmnotes === undefined) updates["system.gmnotes"] = "";

        // Migrate NPC type values
        if (actor.system.npctype === "commander") updates["system.npctype"] = "troop";
        if (actor.system.npctype === "drone") updates["system.npctype"] = "henchman";

        if (Object.keys(updates).length > 0) {
          await actor.update(updates);
        }
      } catch (error) {
        console.error(`FE2 | Migration 1.08 failed for Actor ${actor.name}:`, error);
      }
    }
  }

  // Migration 1.09: Standardize equipment economic fields (acquire/resource), fix utility stats, fix outfit labels
  if (foundry.utils.isNewerVersion("1.09", game.settings.get("foundry-fe2", "systemMigrationVersion"))) {
    const allItems = [...game.items];
    for (const actor of game.actors) {
      for (const item of actor.items) allItems.push(item);
    }

    for (const item of allItems) {
      try {
        const updates = {};
        const t = item.type;

        // Utility items: replace 8 combat stats with acquire/resources, set hands=0
        if (t === "utility") {
          const oldCostVal = item.system.stats?.cost?.value ?? "";
          updates["system.stats"] = {
            acquire: { value: oldCostVal, label: "FE2.Stats.Equipment.Acquire" },
            resources: { value: item.system.stats?.resources?.value ?? "", label: "FE2.Stats.Equipment.Resource" }
          };
          updates["system.statstotal"] = {
            acquire: { value: oldCostVal, label: "FE2.Stats.Equipment.Acquire" },
            resources: { value: item.system.statstotal?.resources?.value ?? "", label: "FE2.Stats.Equipment.Resource" }
          };
          updates["system.hands"] = 0;
        }

        // Equipment items: rename cost→acquire, add resource
        if (t === "equipment") {
          if (item.system.cost !== undefined && item.system.acquire === undefined) {
            updates["system.acquire"] = Number(item.system.cost) || 0;
            updates["system.-=cost"] = null;
          }
          if (item.system.resource === undefined) {
            updates["system.resource"] = 0;
          }
        }

        // Outfit items: add acquire stat, fix resources label
        if (t === "outfit") {
          if (!item.system.stats?.acquire) {
            updates["system.stats.acquire"] = { value: "", label: "FE2.Stats.Equipment.Acquire" };
          }
          if (!item.system.statstotal?.acquire) {
            updates["system.statstotal.acquire"] = { value: "", label: "FE2.Stats.Equipment.Acquire" };
          }
          if (item.system.stats?.resources?.label === "FE2.Stats.Outfit.Cost") {
            updates["system.stats.resources.label"] = "FE2.Stats.Equipment.Resource";
          }
          if (item.system.statstotal?.resources?.label === "FE2.Stats.Outfit.Cost") {
            updates["system.statstotal.resources.label"] = "FE2.Stats.Equipment.Resource";
          }
        }

        if (Object.keys(updates).length > 0) {
          await item.update(updates);
        }
      } catch (error) {
        console.error(`FE2 | Migration 1.09 failed for Item ${item.name}:`, error);
      }
    }
  }

  await game.settings.set("foundry-fe2", "systemMigrationVersion", game.system.version);
  ui.notifications.notify(game.i18n.localize("FE2.Notifications.MigrationComplete"));

  welcomeMessage();
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.toLowerCase().match(regExp);
  }
  return true;
});

Hooks.on("combatRound", (combat, prior, current) => {

  // Notify you that the hook ran
  ui.notifications.info(game.i18n.format("FE2.Combat.NewRound", {round: combat.round}));
  if (combat.combatant?.actor.type == 'spacecraft') {
  }
  combat.turns.forEach((theGuy) => {
    if (theGuy.actor) {
      let npcTypeTrait = theGuy.actor.items.find(item => item.type === "trait" && item.name === "Skilled" || item.name === "Nemesis")
      if (npcTypeTrait) { 
        let munitionsAllowance = 0;
        switch (npcTypeTrait.name) {
          case "Skilled":
            munitionsAllowance = -1;
            break
          case "Nemesis":
            munitionsAllowance = -2;
            break
        }
        let npcWeapons = theGuy.actor.items.filter(item => item.type === "weapon")
        for (let key in npcWeapons) {
          theGuy.actor.updateWeaponMunitions(npcWeapons[key]._id, munitionsAllowance)
        }
      }
    }
    combat.rollInitiative(theGuy.id);
  })
});

Hooks.on("renderChatMessageHTML", async (message, html, data) => {
  const fe2Flags = message.flags?.["foundry-fe2"];
  if (!fe2Flags) return;

  const messageContent = html.querySelector(".message-content");
  if (!messageContent) return;

  if (fe2Flags.rollData) {
    const rendered = await foundry.applications.handlebars.renderTemplate(
      "systems/foundry-fe2/templates/chat-generic-result.html",
      fe2Flags.rollData
    );
    messageContent.innerHTML = rendered;
  } else if (fe2Flags.itemData) {
    const rendered = await foundry.applications.handlebars.renderTemplate(
      "systems/foundry-fe2/templates/post-item.html",
      fe2Flags.itemData
    );
    messageContent.innerHTML = rendered;
  }
});

Hooks.on("modifyTokenAttribute", (data, updates, actor) => {
  // Notify you that the hook ran
  if (data.attribute == "fight.endurance.value" && actor.type == "npc" && actor.system.npctype == "henchman") {
    canvas.scene.tokens.forEach((st) => {
      if (st.name == actor.name && st.id != actor.parent.id) {
        st.actor.system.fight.endurance.value = data.value
      }
    })
  }
});
