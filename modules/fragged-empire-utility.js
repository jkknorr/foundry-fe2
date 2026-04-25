/* -------------------------------------------- */
import { applyModifiers, SKILL_CATEGORY_TYPES } from "./effects/fragged-empire-effect-helpers.js";
import { parseEffectKey } from "./effects/fragged-empire-effect-types.js";
import { findKeywordOnItem, getKeywordParam } from "./keyword-config.js";

/* -------------------------------------------- */
export class FraggedEmpireUtility  {
  

  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => FraggedEmpireUtility.chatListeners(html));
  }

  /* -------------------------------------------- */
  static getSkillsCompendiumName() {
    const lang = game.i18n.lang;
    if (lang === "pt-BR") return "foundry-fe2.skills-pt-br";
    return "foundry-fe2.skills";
  }

  /* -------------------------------------------- */
  static async ready() {
    const skills = await FraggedEmpireUtility.loadCompendium(FraggedEmpireUtility.getSkillsCompendiumName());
    this.compendiumSkills  = skills.map(i => i.toObject());
  }

  /* -------------------------------------------- */
  static getSkillsType( skillType ) {
    let filtered = this.compendiumSkills.filter( skill => skill.system.type == skillType );
    return filtered;
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {

    html.addEventListener("click", event => {
      if (event.target.className == 'dice-image-reroll chat-dice') {
        const diceIndex = event.target.parentElement.dataset.diceIndex;
        const actorId = event.target.parentElement.dataset.actorId;
        FraggedEmpireUtility.rerollDice(actorId, diceIndex)
      }
      if (event.target.className == 'grit-reroll') {
        const actorId = event.target.dataset.actorId;
        FraggedEmpireUtility.rerollGrit(actorId)
      }
      if (event.target.className == 'stronghit-use') {
        const actorId = event.target.dataset.actorId;
        const hitId = event.target.dataset.hitId;
        FraggedEmpireUtility.invokeStrongHit(actorId,hitId);
      }
    });
  }
  
  /* -------------------------------------------- */  
  static async preloadHandlebarsTemplates() {
    
    const templatePaths = [
      'systems/foundry-fe2/templates/actor-sheet.html',
      'systems/foundry-fe2/templates/editor-notes-gm.html',
      'systems/foundry-fe2/templates/weapon-stats-section.html',
      'systems/foundry-fe2/templates/variations-section.html',
      'systems/foundry-fe2/templates/modifications-section.html',
      'systems/foundry-fe2/templates/skill-traits-section.html',
      'systems/foundry-fe2/templates/weapon-stats-section-tchat.html',
      'systems/foundry-fe2/templates/partial-skill-list-header.html',
      'systems/foundry-fe2/templates/chat-generic-result.html',
      'systems/foundry-fe2/templates/post-item.html',
      'systems/foundry-fe2/templates/effects-section.html',
      'systems/foundry-fe2/templates/effects/effect-changes-tab.html',
      'systems/foundry-fe2/templates/partial-keywords-section.html',
      'systems/foundry-fe2/templates/partial-item-tabs-nav.html',
      'systems/foundry-fe2/templates/partial-item-stats-vertical.html',
      'systems/foundry-fe2/templates/partial-stronghits-section.html',
      'systems/foundry-fe2/templates/item-keyword-sheet.html',
      'systems/foundry-fe2/templates/partial-item-keywords-row.html',
      'systems/foundry-fe2/templates/partial-weapon-summary-dialog.html',
      'systems/foundry-fe2/templates/partials/roll-conditional-effects.html',
      'systems/foundry-fe2/templates/race-subitem-section.html'
    ]
    return foundry.applications.handlebars.loadTemplates(templatePaths);    
  }

  /* -------------------------------------------- */
  static templateData(it) {
    return FraggedEmpireUtility.data(it)?.system ?? {}
  }

  /* -------------------------------------------- */
  static data(it) {
    if (it instanceof Actor || it instanceof Item || it instanceof Combatant) {
      return it.system;
    }
    return it;
  }

  /* -------------------------------------------- */
  static createDirectOptionList( min, max) {
    let options = {};
    for(let i=min; i<=max; i++) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static buildListOptions(min, max) {
    return this.createDirectOptionList(min, max);
  }

  /* -------------------------------------------- */
  // Choice builders for {{selectOptions}} migration
  /* -------------------------------------------- */

  static buildNPCTypeChoices() {
    return {
      henchman: game.i18n.localize("FE2.Sheet.NPC.Henchman"),
      troop: game.i18n.localize("FE2.Sheet.NPC.Troop"),
      companion: game.i18n.localize("FE2.Sheet.NPC.Companion")
    };
  }

  static buildWeaponTypeChoices() {
    return {
      gun: game.i18n.localize("FE2.Items.Types.Gun"),
      shell: game.i18n.localize("FE2.Items.Types.Shell"),
      melee: game.i18n.localize("FE2.Items.Types.Melee"),
      companion: game.i18n.localize("FE2.Items.Types.Companion"),
      special: game.i18n.localize("FE2.Items.Types.Special")
    };
  }

  static buildWeaponTypeWithAllChoices() {
    return {
      all: game.i18n.localize("FE2.Items.Types.All"),
      ...this.buildWeaponTypeChoices()
    };
  }

  static buildModificationTypeChoices() {
    return {
      weapon: game.i18n.localize("FE2.Items.Types.WeaponModification"),
      melee: game.i18n.localize("FE2.Items.Types.MeleeModification"),
      drone: game.i18n.localize("FE2.Items.Types.DroneCompanionModification")
    };
  }

  static buildVariationTypeChoices() {
    return {
      gun: game.i18n.localize("FE2.Items.Types.GunVariation"),
      shell: game.i18n.localize("FE2.Items.Types.ShellVariation"),
      melee: game.i18n.localize("FE2.Items.Types.MeleeVariation"),
      companion: game.i18n.localize("FE2.Items.Types.CompanionVariation"),
      special: game.i18n.localize("FE2.Items.Types.SpecialVariation")
    };
  }

  static buildTraitTypeChoices() {
    return {
      advancement: game.i18n.localize("FE2.Items.Types.Advancement"),
      attribute: game.i18n.localize("FE2.Items.Types.Attribute"),
      primaryskill: game.i18n.localize("FE2.Items.Types.PrimarySkill"),
      personalcombat: game.i18n.localize("FE2.Items.Types.PersonalCombat"),
      spaceshipcombat: game.i18n.localize("FE2.Items.Types.SpaceshipCombat"),
      npc: game.i18n.localize("FE2.Items.Types.NPC")
    };
  }

  static buildTradeGoodTypeChoices() {
    return {
      money: game.i18n.localize("FE2.Items.Types.Money"),
      loot: game.i18n.localize("FE2.Items.Types.Loot"),
      freight: game.i18n.localize("FE2.Items.Types.Freight")
    };
  }

  static buildPerkTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.Perk.Minor"),
      moderate: game.i18n.localize("FE2.Items.Perk.Moderate"),
      major: game.i18n.localize("FE2.Items.Perk.Major")
    };
  }

  static buildComplicationTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.Complication.Minor"),
      moderate: game.i18n.localize("FE2.Items.Complication.Moderate"),
      major: game.i18n.localize("FE2.Items.Complication.Major")
    };
  }

  static buildSpacecraftPerkTypeChoices() {
    return {
      minor: game.i18n.localize("FE2.Items.SpacecraftPerk.Optional"),
      moderate: game.i18n.localize("FE2.Items.SpacecraftPerk.Automatic")
    };
  }

  static buildSpacecraftTraitTypeChoices() {
    return {
      build: game.i18n.localize("FE2.Items.Types.Build"),
      npc: game.i18n.localize("FE2.Items.Types.NPCBuild"),
      hull: game.i18n.localize("FE2.Items.Types.Hull"),
      engines: game.i18n.localize("FE2.Items.Types.Engines"),
      crew: game.i18n.localize("FE2.Items.Types.Crew"),
      power: game.i18n.localize("FE2.Items.Types.Power"),
      cpu: game.i18n.localize("FE2.Items.Types.CPU"),
      sensors: game.i18n.localize("FE2.Items.Types.Sensors"),
      size: game.i18n.localize("FE2.Items.Types.Size")
    };
  }

  static buildResearchGainChoices() {
    return {
      none: game.i18n.localize("FE2.Items.Research.None"),
      secret: game.i18n.localize("FE2.Items.Research.SecretKnowledge"),
      perk: game.i18n.localize("FE2.Items.Research.MinorPerk")
    };
  }

  static buildDifficultyChoices() {
    return {
      "0": game.i18n.localize("FE2.Difficulty.None"),
      "8": game.i18n.localize("FE2.Difficulty.Easy"),
      "12": game.i18n.localize("FE2.Difficulty.Moderate"),
      "16": game.i18n.localize("FE2.Difficulty.Difficult"),
      "18": game.i18n.localize("FE2.Difficulty.VeryDifficult")
    };
  }

  static buildCoverChoices() {
    return {
      "0": game.i18n.localize("FE2.Roll.Cover.NoCover"),
      "1": game.i18n.localize("FE2.Roll.Cover.LightCover"),
      "2": game.i18n.localize("FE2.Roll.Cover.HeavyCover"),
      "3": game.i18n.localize("FE2.Roll.Cover.EntrenchedCover")
    };
  }

  static buildSkillDiffChoices() {
    return {
      "10": game.i18n.localize("FE2.Roll.SkillDifficulty.Assist"),
      "12": game.i18n.localize("FE2.Roll.SkillDifficulty.Moderate"),
      "14": game.i18n.localize("FE2.Roll.SkillDifficulty.Default"),
      "16": game.i18n.localize("FE2.Roll.SkillDifficulty.Very"),
      "18": game.i18n.localize("FE2.Roll.SkillDifficulty.Extreme"),
      "26": game.i18n.localize("FE2.Roll.SkillDifficulty.Unreasonable")
    };
  }

  static buildShotTypeChoices(ref, focus) {
    return {
      "overwatch": game.i18n.localize("FE2.Roll.ShotType.Overwatch") + ref + ")",
      "snap": game.i18n.localize("FE2.Roll.ShotType.SnapShot"),
      "sighted": game.i18n.localize("FE2.Roll.ShotType.SightedShot") + ref + " Hit +" + focus + ")"
    };
  }

  /* -------------------------------------------- */
  static async getTraitFromCompendium( itemId) {
    let trait = game.items.find( item => item.type == 'trait' && item.id == itemId );
    if ( !trait ) {
      let traits = await this.loadCompendium('world.traits', item => item.id == itemId );
      let traitsObj = traits.map(i => i.toObject());
      trait = traitsObj[0];
    } else {
      trait = foundry.utils.deepClone( trait);
    }
    return trait;
  }

  /* -------------------------------------------- */
  static async getTraitAttributeList( attr ) {
    let traits1 = game.items.filter( item => item.type == 'trait' && item.system.subtype == attr );
    let traits2 = await this.loadCompendium('world.traits', item => item.type == 'trait' && item.system.subtype == attr );
    return traits1.concat( traits2);
  }

  /* -------------------------------------------- */
  static onSocketMesssage( msg ) {
    if( !game.user.isGM ) return; // Only GM

    if (msg.name == 'msg_attack' ) {
      this.performAttack( msg.data );
    }
  }

  /* -------------------------------------------- */
  static chatDataSetup(content, modeOverride, isRoll = false, forceWhisper) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) { // Final force !
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }
  
  /* -------------------------------------------- */
  static async loadCompendiumData(compendium) {
    const pack = game.packs.get(compendium);
    return await pack?.getDocuments() ?? [];
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = item => true) {
    let compendiumData = await this.loadCompendiumData(compendium);
    return compendiumData.filter(filter);
  }
  
  /* -------------------------------------------- */
  static async showDiceSoNice(roll, rollMode) {
    if (game.modules.get("dice-so-nice")?.active) {
      if (game.dice3d) {
        let whisper = null;
        let blind = false;
        rollMode = rollMode ?? game.settings.get("core", "rollMode");
        switch (rollMode) {
          case "blindroll": //GM only
            blind = true;
          case "gmroll": //GM + rolling player
            whisper = this.getUsers(user => user.isGM);
            break;
          case "roll": //everybody
            whisper = this.getUsers(user => user.active);
            break;
          case "selfroll":
            whisper = [game.user.id];
            break;
        }
        await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
      }
    }
  }


  /* -------------------------------------------- */
   static async rollFraggedEmpire( rollData ) {

    let skillLevel = rollData.skill?.system.total ||  0;
    let nbDice = 3;
    let actor = game.actors.get(rollData.actorId);
    rollData.endDmgAdd = 0;
    // Apply skill effect modifiers
    if (rollData.effectModifiers) {
      const mods = rollData.effectModifiers;
      const skillId = rollData.skill?.id;
      const skillMods = [...(mods.skills[skillId] || []), ...(mods.skills.all || [])];
      if (skillMods.length) {
        skillLevel = Math.round(applyModifiers(skillLevel, skillMods));
      }
      if (rollData.skill && !rollData.skill.system.trained && rollData.untrainedSkillMod) {
        skillLevel += rollData.untrainedSkillMod;
      }
    }

    // Apply selected conditional effects
    if (rollData.selectedConditionalEffects?.length && rollData.conditionalEffects?.length) {
      const applied = FraggedEmpireUtility.applySelectedConditionalEffects(rollData);
      rollData.appliedConditionalEffects = applied;
    }

    // Bonus/Malus total
    rollData.weaponHit = 0;
    rollData.finalBM = rollData.bonusMalus;
    if (rollData.isAcquisition) rollData.finalBM += actor._computed.acquisitionMod;
    if (rollData.isArcane) {
      let arcanePenalty = 2 + (rollData.arcaneMod || 0);
      if (arcanePenalty < 0) arcanePenalty = 0;
      rollData.finalBM -= arcanePenalty;
    }
    if ( rollData.useToolbox) rollData.finalBM += 1;
    if ( rollData.useDedicatedworkshop) rollData.finalBM += 2;
    if ( rollData.mode == 'weapon' || rollData.mode == 'spacecraftweapon') {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.weapon.system.statstotal.hit.value) + (rollData.effectHitBonus || 0);
      nbDice = Number(rollData.weapon.system.statstotal.hitdice.value.substring(0,1));
    }
    if ( rollData.shotType == 'sighted') {
      rollData.finalBM += actor.system.attributes.focus.current
    }
    
    if ( rollData.mode == "skill" || rollData.mode == "genericskill") {
      rollData.strongHitAvailable = ( rollData.nbStrongHitUsed < rollData.nbStrongHit);
    }

    if ( rollData.bMHitDice ) {
      nbDice += rollData.bMHitDice 
    }
    if ( rollData.munHitDice) {
      nbDice += rollData.munHitDice
      let munBoosts = rollData.weapon.system.keywords.filter(keyword => keyword.name.includes('Munition Boost'))
      for (const munBoost of munBoosts) {
        switch (munBoost.name) {
          case 'Munition Boost Xd6':
            nbDice += Number(munBoost.system.params.X)
            break
          case 'Munition Boost +X End/Shield Dmg':
            rollData.endDmgAdd = Number(munBoost.system.params.X)
            break
        }
      }
    }
    if ( rollData.mode == 'npcfight' ) {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.npcstats.hit.value);
      rollData.rofBonus = rollData.rofValue - 1;
      nbDice += rollData.rofBonus;
    }
    if (actor.items.find(item => item.type === "trait" && item.name === "Killer")) {
      if (rollData.target.isAttributeDamaged()) { nbDice++ }
    }
    let myRoll = rollData.roll;
    if ( !myRoll ) { // New rolls only of no rerolls
      let formula = nbDice+"d6+"+rollData.weaponHit+"+"+rollData.finalBM+"+"+skillLevel;
      myRoll = new Roll(formula);

      await myRoll.evaluate();
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );
      rollData.roll = myRoll
      rollData.nbStrongHitUsed = 0;
    }
    
    let minStrongHit = 6;
    let maxStrongHit = 6;
    if (rollData.weapon) {
      const strongHit = findKeywordOnItem(rollData.weapon, "stronghit");
      if (strongHit) {
        minStrongHit = Number(getKeywordParam(strongHit, "X")) || 6;
        maxStrongHit = Number(getKeywordParam(strongHit, "Y")) || 6;
      }
    }
    rollData.diceResults = [];
    let nbStrongHit = 0;
    rollData.rollTotal  = 0;
    for (let i=0; i< nbDice; i++) {
      rollData.diceResults[i] = myRoll.dice[0].results[i].result
      if ( myRoll.dice[0].results[i].result >= minStrongHit && myRoll.dice[0].results[i].result <= maxStrongHit) {
        nbStrongHit++;
      }
      rollData.rollTotal += Number(myRoll.dice[0].results[i].result); // Update result
    }
    rollData.rollTotal += Number(rollData.weaponHit) + Number(rollData.finalBM) + Number(skillLevel);

    // Stockage resultats
    rollData.nbStrongHit = nbStrongHit;
    rollData.nbDice = nbDice;
    //if ( rollData.mode == "skill" || rollData.mode == "genericskill") {
      rollData.strongHitAvailable = ( rollData.nbStrongHitUsed < rollData.nbStrongHit);
    //} else {
    //  rollData.strongHitAvailable = true;
    //}
    
    
    switch (actor.type) {
      case "npc":
        rollData.endDmgAdd += Number(actor.system.stats.Attribute.value)
        break;
      case "character":
        rollData.endDmgAdd += Number(actor.system.attributes.focus.current)
        break;
      case "spacecraft":
        rollData.endDmgAdd += Number(actor.system.attributes.sensors.current)
        break;
    }
    switch (actor.type) {
      case "character":
        rollData.gritRerollsLeft = actor.system.gritreroll.value
        rollData.gritRerollsMax = actor.system.gritreroll.max
        break;
      case "spacecraft":
        rollData.gritRerollsLeft = actor.system.fight.gritreroll.value
        rollData.gritRerollsMax = 2
        break;
    }

    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      let effectiveRange = rollData.weapon.system.statstotal.range.value;
      if (rollData.shotType == 'overwatch' || rollData.shotType == 'sighted') { effectiveRange += actor.system.attributes.reflexes.current}
      rollData.rollTotal = rollData.rollTotal - ((Math.ceil(rollData.distance / effectiveRange) -1 ) *2)
      if (rollData.target.type == "npc"){
        rollData.targetDefence = (rollData.target._computed?.defence ?? rollData.target.system.fight.defence.value) + (rollData.intmod * rollData.cover)
        rollData.targetArmor = rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value
        rollData.targetEnd = rollData.target._computed?.endurance ?? rollData.target.system.fight.endurance.value
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + Number(actor.system.attributes.focus.current) + (rollData.effectEndDmg || 0)
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - (rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value)
      } else if (rollData.target.type == "spacecraft") {
        rollData.targetDefence = rollData.target.system.fight.defence.total
        rollData.targetArmor = rollData.target.system.fight.armour.total
        rollData.targetEnd = rollData.target.system.fight.shield.total
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.shielddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.fight.armour.total
      } else {
        rollData.targetDefence = rollData.target.system.defensebonus.total + (rollData.intmod * rollData.cover)
        rollData.targetArmor = rollData.target.system.armourbonus.total
        rollData.targetEnd = rollData.target.system.endurance.value
        rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.armourbonus.total
        rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
      }
    }

    if (findKeywordOnItem(rollData.weapon, "disruptor")) {
      console.log(rollData.weapon.name,'is a disruptor!')
      rollData.nbStrongHit += this.checkDisruptorVulnerable(rollData.target);
    }


    
    actor.saveRollData( rollData );

    if (game.modules.get("sequencer")?.active && game.modules.get("JB2A_DnD5e")?.active && rollData.mode != "skill" && rollData.mode != "genericskill") {
      const fxSource = canvas.tokens.controlled[0]
      const fxTarget = game.user.targets.first();

      new Sequence()
        .effect()
            .file("jb2a.bullet")
            .attachTo(fxSource)
            .stretchTo(fxTarget, { attachTo: true })
        .play()
    }
    console.log(rollData)
    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.weapon.system.keywords.find(keyword => keyword.name === 'Build Momentum')) {
        console.log("This is a Build Momentum attack")
        rollData.munHitDice += -1
      }
      if (rollData.munHitDice) {
        if (rollData.mode == "spacecraftweapon") {
          actor.updateShipMunitions(rollData.actorId, rollData.munHitDice);
        } else {
          actor.updateWeaponMunitions(rollData.weapon._id, rollData.munHitDice);
        }
      }
    }

    if (rollData.strongHitAvailable) {
      rollData.hitsAvailable = actor.getStrongHits();
      rollData.hitsAvailable.push(game.items.find(item => (item.name === 'Critical Hit')));
      if ((rollData.targetEnd - rollData.totalEndDmg) < 1) {
        rollData.hitsAvailable.push(game.items.find(item => (item.name === 'Critical Boost')));
      }
      console.log(rollData.hitsAvailable);
    }

    let chatRollFlags = FraggedEmpireUtility.buildRollChatFlags(rollData);
    this.createChatWithRollMode( rollData.alias, {
      content: await foundry.applications.handlebars.renderTemplate(`systems/foundry-fe2/templates/chat-generic-result.html`, rollData),
      flags: { "foundry-fe2": { rollData: chatRollFlags } }
    });

    if (rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.target.type == "npc"){
        if (rollData.weapon.system.statstotal.crit.value >= rollData.target.system.fight.durability.value) { }
      } else { if (rollData.target.type == "spacecraft") {
        if (rollData.weapon.system.statstotal.shielddmg.value >= rollData.target.system.fight.shield.total || rollData.nbStrongHit > 0) {
          let table = game.tables.find( t => t.name === 'Spacecraft Hit Location' );
          let draw = await table.draw();
        }
        } else { 
          if (rollData.totalEndDmg >= rollData.target.system.endurance.value) {
            let table = game.tables.find( t => t.name === 'Hit Location' );
            let draw = await table.draw();
          }
        }
      }
    }
    if (rollData.mode == "skill") {
      if (rollData.useSTP) {
        actor.updateSpareTime(rollData.actorId, 1);
      }
      if (rollData.rollTotal >= rollData.difficulty + 4) {
        let table = game.tables.find( t => t.name === 'Positive Consequences' );
        let draw = await table.draw();
      }
      if (rollData.rollTotal < rollData.difficulty - 4) {
        let table = game.tables.find( t => t.name === 'Negative Consequences' );
        let draw = await table.draw();
      }
    }
  }
  /* -------------------------------------------- */
  /**
   * Apply selected conditional effects to roll variables.
   * @param {object} rollData - The roll data with conditionalEffects and selectedConditionalEffects
   * @returns {Array<{name: string, summary: string}>} Applied effects for chat display
   */
  static applySelectedConditionalEffects(rollData) {
    const applied = [];
    const skillType = rollData.skill?.system?.type;
    const CATEGORY_TYPE_VALUES = new Set(Object.values(SKILL_CATEGORY_TYPES));

    for (const effectId of rollData.selectedConditionalEffects) {
      const ce = rollData.conditionalEffects.find(e => e.effectId === effectId);
      if (!ce) continue;

      let effectApplied = false;
      for (const change of ce.changes) {
        const parsed = parseEffectKey(change.key);
        if (!parsed) continue;
        const val = Number(change.value) || 0;

        // Category-specific skill types: only apply if rolled skill's category matches
        if (CATEGORY_TYPE_VALUES.has(parsed.targetType)) {
          const matchingType = skillType ? SKILL_CATEGORY_TYPES[skillType] : null;
          if (matchingType !== parsed.targetType) continue;
        }

        switch (parsed.targetType) {
          case "skill":
          case "allSkills":
          case "allPrimarySkills":
          case "allPersonalCombatSkills":
          case "allSpacecraftSkills":
          case "untrainedSkill":
          case "arcane":
            rollData.bonusMalus = (rollData.bonusMalus || 0) + val;
            effectApplied = true;
            break;
          case "hitBonus":
            rollData.effectHitBonus = (rollData.effectHitBonus || 0) + val;
            effectApplied = true;
            break;
          case "enduranceDamage":
            rollData.effectEndDmg = (rollData.effectEndDmg || 0) + val;
            effectApplied = true;
            break;
          case "npcAttribute":
          case "npcMobility":
            rollData.bonusMalus = (rollData.bonusMalus || 0) + val;
            effectApplied = true;
            break;
          case "attackTargetArmour":
          case "attackTargetArmourCrit":
          case "attackTargetCover":
          case "attackSelfCover":
            rollData.bonusMalus = (rollData.bonusMalus || 0) + val;
            effectApplied = true;
            break;
          default:
            rollData.bonusMalus = (rollData.bonusMalus || 0) + val;
            effectApplied = true;
            break;
        }
      }

      if (effectApplied) {
        applied.push({ name: ce.name, summary: ce.summary });
      }
    }

    return applied;
  }
  /* -------------------------------------------- */
  static calculateRangePenalty (rollData, actor ) {
    let rangemult = 1;
    let weaponRange = Number(rollData.weapon.system.statstotal.range.value);
    console.log(rollData.shotType);
    if ( rollData.shotType != "snap" ) { weaponRange += Number(actor.system.attributes.reflexes.current) }
    let shotpath = canvas.grid.measurePath([rollData.target.getActiveTokens()[0].center, actor.getActiveTokens()[0].center])
    if (findKeywordOnItem(rollData.target.items.find(outfit => outfit.system.carryState === 'active'), 'deflctfield')) { rangemult = 2 };
    rollData.distance = shotpath.distance * rangemult;
    console.log('Distance is ',rollData.distance,'range is',weaponRange)
    rollData.rangepenalty = ((Math.ceil(shotpath.distance / weaponRange) -1 ) *2)
    let newRollData = rollData
    return newRollData
  }
  /* -------------------------------------------- */

  /* -------------------------------------------- */
  static checkDisruptorVulnerable (actor) {
    let disruptorCount = 0;
    console.log('Checking for potential disruptor effects on',actor)
    switch (actor.getRaces()[0].name) {
      case "Mechonid": disruptorCount++;  break;
      case "Palantor": disruptorCount++;  break;
      case "Twi-Far": disruptorCount++;  break;
    }
    let vulnDisadString = game.i18n.localize("FE2.Keywords.DisruptorVulnerable")
    let actorTraits = actor.getTraits()
    for (let actorTrait of actorTraits) {
      if (actorTrait.system.disadvantages.includes(vulnDisadString)) { disruptorCount++; }
    }
    const equippableItems = actor.items.filter(item =>
      item.type === 'outfit' || item.type === 'utility' || item.type === 'weapon' || item.type === 'equipment'
    );
    for (const item of equippableItems) {
      const state = item.system.carryState || "carried";
      if (state === "inHand" || state === "active") {
        if (findKeywordOnItem(item, "disruptorvulnerable")) { disruptorCount++;}
      }
    }
    return disruptorCount;
  }
  /* -------------------------------------------- */

  /* -------------------------------------------- */
  static async rerollDice( actorId, diceIndex=-1 ) {
    let actor = game.actors.get(actorId);
    let rollData = actor.getRollData();
    

    if ( diceIndex != -1) {
      let myRoll = new Roll("1d6");
      await myRoll.evaluate();
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );

      rollData.roll.dice[0].results[diceIndex].result = myRoll.total; // Patch
      rollData.gritreroll= actor.decrementGritRerolls();
    } else {
      rollData.gritRerollsLeft = actor.decrementGritRerolls();
      rollData.roll = undefined;
    }
    rollData.nbStrongHitUsed++
    this.rollFraggedEmpire( rollData );
  }

  static async rerollGrit( actorId ) {
    let actor = game.actors.get(actorId);
    let rollData = actor.getRollData();
    let newFormula = rollData.diceResults.length + "d6"
    let newRoll = new Roll(newFormula)
    
    await newRoll.evaluate();
    await this.showDiceSoNice(newRoll, game.settings.get("core", "rollMode") );
    actor.decrementGritRerolls();
    rollData.roll = newRoll;
    this.rollFraggedEmpire( rollData );
  }

  static async invokeStrongHit( actorId, hitId ) {
    let actor = game.actors.get(actorId);
    let rollData = actor.getRollData();
    let strongHit = game.items.find(item => (item.id === hitId));

    let strongHitBanner = 'Strong hit ' + strongHit.name + ' used by ' + actor.name
    ui.notifications.info(strongHitBanner);
    //this.rollFraggedEmpire( rollData );
  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.id);
  }
  /* -------------------------------------------- */
  static getWhisperRecipients(rollMode, name) {
    switch (rollMode) {
      case "blindroll": return this.getUsers(user => user.isGM);
      case "gmroll": return this.getWhisperRecipientsAndGMs(name);
      case "selfroll": return [game.user.id];
    }
    return undefined;
  }
  /* -------------------------------------------- */
  static getWhisperRecipientsAndGMs(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1.concat(ChatMessage.getWhisperRecipients('GM'));
  }

  /* -------------------------------------------- */
  static blindMessageToGM(chatOptions) {
    let chatGM = foundry.utils.deepClone(chatOptions);
    chatGM.whisper = this.getUsers(user => user.isGM);
    chatGM.content = game.i18n.format("FE2.Chat.Results.BlindMessage", {name: game.user.name}) + "<br>" + chatOptions.content;
    game.socket.emit("system.foundry-fe2", { msg: "msg_gm_chat_message", data: chatGM });
  }

  /* -------------------------------------------- */
  static buildRoFArray( item ) {
    if (item.type != "weapon") return false;
    
    let rofMax = Number(item.system.statstotal.rof.value) || 1;
    return this.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  static buildRollChatFlags(rollData) {
    let flags = {
      mode: rollData.mode,
      actorId: rollData.actorId,
      actorImg: rollData.actorImg,
      alias: rollData.alias,
      diceResults: rollData.diceResults.slice(),
      strongHitAvailable: rollData.strongHitAvailable,
      nbStrongHit: rollData.nbStrongHit,
      nbStrongHitUsed: rollData.nbStrongHitUsed,
      finalBM: rollData.finalBM,
      difficulty: rollData.difficulty,
      rollTotal: rollData.rollTotal,
      targetDefence: rollData.targetDefence,
      targetArmor: rollData.targetArmor,
      targetEnd: rollData.targetEnd,
      totalEndDmg: rollData.totalEndDmg,
      critDmg: rollData.critDmg,
      gritRerollsLeft: rollData.gritRerollsLeft,
      gritRerollsMax: rollData.gritRerollsMax,
      hitsAvailable: rollData.hitsAvailable
    };
    if (rollData.skill) {
      flags.skill = { name: rollData.skill.name, system: { total: rollData.skill.system.total } };
    }
    if (rollData.weapon) {
      flags.weapon = {
        name: rollData.weapon.name,
        system: { statstotal: {
          hit: { value: rollData.weapon.system.statstotal.hit.value },
          crit: { value: rollData.weapon.system.statstotal.crit.value }
        }}
      };
    }
    if (rollData.target) {
      flags.target = { name: rollData.target.name, img: rollData.target.img, type: rollData.target.type };
    }
    if (rollData.npc) {
      flags.npc = { name: rollData.npc.name };
    }
    if (rollData.npcstats) {
      flags.npcstats = { hit: { value: rollData.npcstats.hit.value } };
    }
    return flags;
  }

  /* -------------------------------------------- */
  static createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          this.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = game.i18n.localize("FE2.Chat.Results.GMOnly");
          if (chatOptions.flags) delete chatOptions.flags["foundry-fe2"];
        }
        else {
          chatOptions.whisper = this.getUsers(user => user.isGM);
        }
        break;
      default:
        chatOptions.whisper = this.getWhisperRecipients(rollMode, name);
        break;
    }
    chatOptions.alias = chatOptions.alias || name;
    ChatMessage.create(chatOptions);
  }

  /* -------------------------------------------- */
  static createChatWithRollMode(name, chatOptions) {
    this.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions);
  }

  /* -------------------------------------------- */
  static buildDifficultyOptions( ) {
    return this.buildDifficultyChoices();
  }
  
  /* -------------------------------------------- */
  /**
   * Categorize actor effects into Passive, Temporary, and Inactive groups.
   * @param {Actor} actor
   * @returns {Object} Categories with label and effects array
   */
  static categorizeEffects(actor) {
    const passive = [];
    const conditional = [];
    const temporary = [];
    const inactive = [];

    for (const effect of actor.effects) {
      const d = {
        _id: effect.id,
        name: effect.name,
        img: effect.img,
        tint: effect.tint ?? "#ffffff",
        disabled: effect.disabled,
        duration: effect.duration,
        active: !effect.disabled && !effect.isSuppressed,
        isSuppressed: effect.isSuppressed,
        isConditional: effect.isConditional,
        sourceName: effect.originItem?.name ?? "",
        effect: effect
      };

      if (effect.disabled || effect.isSuppressed) {
        inactive.push(d);
      } else if (effect.isConditional) {
        conditional.push(d);
      } else if (effect.duration?.rounds || effect.duration?.seconds || effect.duration?.turns) {
        temporary.push(d);
      } else {
        passive.push(d);
      }
    }

    return {
      passive: { label: "FE2.Effects.Categories.Passive", effects: passive },
      conditional: { label: "FE2.Effects.Categories.Conditional", effects: conditional },
      temporary: { label: "FE2.Effects.Categories.Temporary", effects: temporary },
      inactive: { label: "FE2.Effects.Categories.Inactive", effects: inactive }
    };
  }

  /* -------------------------------------------- */
  /**
   * Compute statstotal for an item from its base stats + variation + modification stats.
   * Returns a flat update object like { "system.statstotal.hitdice.value": "3", ... }.
   * @param {Item} item             The item document (weapon, outfit, spacecraftweapon, or utility)
   * @param {Object} pendingChanges Optional flat object of pending form changes (e.g. {"system.stats.hitdice.value": "3"})
   * @returns {Object}              Flat update data for item.update()
   */
  static computeItemStatsTotals(item, pendingChanges = {}) {
    const stats = item.system.stats;
    if (!stats) return {};

    const variations = item.system.variations ?? [];
    const modifications = item.system.modifications ?? [];
    const updates = {};

    // Regex for strictly numeric values (integers and decimals, optionally negative).
    // parseFloat("3d6") returns 3, so we must NOT rely on it for detection.
    const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim());

    for (const key of Object.keys(stats)) {
      // Use pending form value if available, otherwise current value
      const pendingKey = `system.stats.${key}.value`;
      const baseVal = pendingChanges[pendingKey] ?? stats[key]?.value;

      // Non-numeric fields (outfittype, weapontype, mount, hitdice "3d6") pass through unchanged
      if (!isNumeric(baseVal)) {
        updates[`system.statstotal.${key}.value`] = baseVal ?? "";
        continue;
      }

      let total = Number(baseVal);

      // Add variation stats (max 1 variation, but iterate safely)
      for (const variation of variations) {
        const varVal = variation?.system?.stats?.[key]?.value;
        if (isNumeric(varVal)) total += Number(varVal);
      }

      // Add modification stats
      for (const mod of modifications) {
        const modVal = mod?.system?.stats?.[key]?.value;
        if (isNumeric(modVal)) total += Number(modVal);
      }

      updates[`system.statstotal.${key}.value`] = String(total);
    }

    return updates;
  }

  /* -------------------------------------------- */
  /*  Propagation Helpers                         */
  /* -------------------------------------------- */

  /**
   * Build propagation data from a var/mod's keywords and stronghits.
   * Each entry gets a sourceId pointing back to the var/mod.
   * @param {object} varModData - The cloned var/mod data object
   * @param {string} varModId - The _id of the var/mod in the parent's array
   * @returns {{ keywords: object[], stronghits: object[] }}
   */
  static buildPropagationData(varModData, varModId) {
    const keywords = (varModData.system?.keywords ?? []).map(kw => {
      const cloned = foundry.utils.deepClone(kw);
      // Assign new _id to avoid collisions; new-format keywords always have _id
      if (cloned._id || cloned.system) cloned._id = foundry.utils.randomID();
      cloned.sourceId = varModId;
      return cloned;
    });
    const stronghits = (varModData.system?.stronghits ?? []).map(sh => ({
      ...foundry.utils.deepClone(sh),
      _id: foundry.utils.randomID(),
      sourceId: varModId
    }));
    return { keywords, stronghits };
  }

  /**
   * Build removal data — filters out all propagated entries for a given sourceId.
   * @param {Item} parentItem - The parent item document
   * @param {string} removedId - The _id of the var/mod being removed
   * @returns {{ keywords: object[], stronghits: object[], effectIdsToDelete: string[] }}
   */
  static buildRemovalData(parentItem, removedId) {
    const keywords = (parentItem.system.keywords ?? []).filter(k => k.sourceId !== removedId);
    const stronghits = (parentItem.system.stronghits ?? []).filter(sh => sh.sourceId !== removedId);
    const effectIdsToDelete = parentItem.effects
      .filter(e => e.flags?.["foundry-fe2"]?.sourceId === removedId)
      .map(e => e.id);
    return { keywords, stronghits, effectIdsToDelete };
  }

  /**
   * Clone ActiveEffects from a source item onto a parent item with sourceId flag.
   * @param {Item} parentItem - The parent item to receive cloned effects
   * @param {Item} sourceItem - The source Item document (the dropped var/mod)
   * @param {string} varModId - The _id of the var/mod in the parent's array
   */
  static async propagateActiveEffects(parentItem, sourceItem, varModId, params) {
    if (!sourceItem.effects.size) return;
    const clonedEffects = sourceItem.effects.map(e => {
      const data = e.toObject();
      delete data._id;
      foundry.utils.setProperty(data, "flags.foundry-fe2.sourceId", varModId);
      // Store original change templates for later param resolution
      if (params && data.changes?.some(c => /\{[XY]\}/.test(c.value))) {
        foundry.utils.setProperty(data, "flags.foundry-fe2.changeTemplates", data.changes.map(c => c.value));
        // Resolve current param values
        data.changes = data.changes.map(c => ({
          ...c,
          value: String(c.value ?? "").replace(/\{([XY])\}/g, (_, key) => params[key] ?? "")
        }));
      }
      return data;
    });
    await parentItem.createEmbeddedDocuments("ActiveEffect", clonedEffects);
  }

  /**
   * Update propagated ActiveEffects to resolve {X}/{Y} parameter references.
   * Called when a keyword's param value changes on the parent item.
   * @param {Item} parentItem - The item owning the keyword
   * @param {string} sourceId - The _id of the keyword entry
   * @param {object} params - The keyword's current params {X: "2", Y: ""}
   */
  static async updatePropagatedEffectParams(parentItem, sourceId, params) {
    const effects = parentItem.effects.filter(e => e.flags?.["foundry-fe2"]?.sourceId === sourceId);
    if (!effects.length) return;
    const updates = [];
    for (const effect of effects) {
      const templates = effect.flags?.["foundry-fe2"]?.changeTemplates;
      if (!templates) continue;
      const changes = effect.changes.map((c, i) => {
        const template = templates[i] ?? c.value;
        const resolved = String(template).replace(/\{([XY])\}/g, (_, key) => params[key] ?? "");
        return { ...c, value: resolved };
      });
      const changed = changes.some((c, i) => c.value !== effect.changes[i].value);
      if (changed) updates.push({ _id: effect.id, changes });
    }
    if (updates.length) {
      await parentItem.updateEmbeddedDocuments("ActiveEffect", updates);
    }
  }

  /**
   * Delete all propagated ActiveEffects for a given sourceId.
   * @param {Item} parentItem - The parent item to clean up
   * @param {string} removedId - The _id of the var/mod being removed
   */
  static async cleanupPropagatedEffects(parentItem, removedId) {
    const effectIds = parentItem.effects
      .filter(e => e.flags?.["foundry-fe2"]?.sourceId === removedId)
      .map(e => e.id);
    if (effectIds.length) {
      await parentItem.deleteEmbeddedDocuments("ActiveEffect", effectIds);
    }
  }

  /* -------------------------------------------- */
  static handleStepperAction(sheet, button, direction, event) {
    const wrapper = button.closest(".fe2-numeric-stepper");
    if (!wrapper) return;
    const fieldName = wrapper.dataset.field;
    const min = wrapper.dataset.min !== undefined ? Number(wrapper.dataset.min) : -Infinity;
    const max = wrapper.dataset.max !== undefined ? Number(wrapper.dataset.max) : Infinity;
    const step = Number(wrapper.dataset.step) || 1;
    const currentValue = Number(wrapper.querySelector(".fe2-stepper-value")?.textContent) || 0;

    if (event?.shiftKey) {
      const shiftTarget = direction === "up" ? max : min;
      if (isFinite(shiftTarget)) {
        // Bounded: jump to min/max
        if (shiftTarget === currentValue) return;
        FraggedEmpireUtility._updateStepperValue(sheet, wrapper, fieldName, shiftTarget);
      } else {
        // Unbounded: show inline input for free-form entry
        FraggedEmpireUtility._showStepperInput(sheet, wrapper, fieldName, currentValue, min, max);
      }
      return;
    }

    const delta = direction === "up" ? step : -step;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    if (newValue === currentValue) return;
    FraggedEmpireUtility._updateStepperValue(sheet, wrapper, fieldName, newValue);
  }

  /* -------------------------------------------- */
  static _updateStepperValue(sheet, wrapper, fieldName, newValue) {
    if (fieldName && !fieldName.startsWith("system.")) {
      const item = sheet.document.items?.get(fieldName);
      if (item) {
        item.update({ "system.munitions": newValue });
        return;
      }
    }
    sheet.document.update({ [fieldName]: newValue });
  }

  /* -------------------------------------------- */
  static _showStepperInput(sheet, wrapper, fieldName, currentValue, min, max) {
    const valueSpan = wrapper.querySelector(".fe2-stepper-value");
    if (!valueSpan) return;

    // Hide buttons, replace value span with input
    const buttons = wrapper.querySelectorAll(".fe2-stepper-btn");
    buttons.forEach(btn => btn.style.display = "none");

    const input = document.createElement("input");
    input.type = "number";
    input.value = currentValue;
    input.className = "fe2-stepper-inline-input";
    if (isFinite(min)) input.min = min;
    if (isFinite(max)) input.max = max;
    valueSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      let val = Number(input.value) || 0;
      if (isFinite(min)) val = Math.max(min, val);
      if (isFinite(max)) val = Math.min(max, val);
      FraggedEmpireUtility._updateStepperValue(sheet, wrapper, fieldName, val);
    };

    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { e.preventDefault(); input.value = currentValue; input.blur(); }
    });
  }

  /* -------------------------------------------- */
  /*  Race Sub-Item Transfer & Cleanup            */
  /* -------------------------------------------- */

  static RACE_SUBITEM_ARRAYS = ["complications", "perks", "languages", "stronghits"];

  /**
   * Transfer all sub-items from a race's system data to the actor as independent items.
   * Each created item is flagged with sourceRaceId for later cleanup.
   * @param {Actor} actor - The actor receiving the sub-items
   * @param {object} raceSystemData - The race item's system data containing sub-item arrays
   * @param {string} raceItemId - The ID of the race item on the actor
   */
  static async transferRaceSubitems(actor, raceSystemData, raceItemId) {
    const itemsToCreate = [];
    for (const arrayName of this.RACE_SUBITEM_ARRAYS) {
      const subItems = raceSystemData[arrayName] ?? [];
      for (const data of subItems) {
        const clone = foundry.utils.deepClone(data);
        delete clone._id;
        foundry.utils.setProperty(clone, "flags.foundry-fe2.sourceRaceId", raceItemId);
        itemsToCreate.push(clone);
      }
    }
    if (itemsToCreate.length) {
      await actor.createEmbeddedDocuments("Item", itemsToCreate);
    }
  }

  /**
   * Remove all actor items that were transferred from a specific race.
   * @param {Actor} actor - The actor to clean up
   * @param {string} raceItemId - The ID of the race item whose sub-items to remove
   */
  static async cleanupRaceSubitems(actor, raceItemId) {
    const toDelete = actor.items
      .filter(i => i.flags?.["foundry-fe2"]?.sourceRaceId === raceItemId)
      .map(i => i.id);
    if (toDelete.length) {
      await actor.deleteEmbeddedDocuments("Item", toDelete);
    }
  }

  /* -------------------------------------------- */
  static async confirmDelete(actor, itemId) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("FE2.Dialog.ConfirmRemoveTitle") },
      content: "<p>" + game.i18n.localize("FE2.Dialog.ConfirmRemoveContent") + "</p>",
      yes: {
        label: game.i18n.localize("FE2.Dialog.ConfirmRemoveYes"),
        icon: "fas fa-check"
      },
      no: {
        label: game.i18n.localize("FE2.Dialog.Cancel"),
        icon: "fas fa-times"
      }
    });
    if (confirmed) {
      // Cascade-delete race sub-items before deleting the race itself
      const item = actor.items.get(itemId);
      if (item?.type === "race") {
        await FraggedEmpireUtility.cleanupRaceSubitems(actor, itemId);
      }
      await actor.deleteEmbeddedDocuments("Item", [itemId]);
    }
  }

}