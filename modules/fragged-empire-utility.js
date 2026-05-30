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
    let fe2StatusEffects = [
    {
      img: 'icons/svg/target.svg',
      id: 'lockedon',
      name: game.i18n.localize("FE2.Effects.Statuses.LockedOn"),
      description: '<p>Enemy Weapons with the Lock On Keyword gain an advantage against you, and enemy characters know where you are (so you can’t Stealth).</p>',
      tooltip: '<p>Enemy Weapons with the Lock On Keyword gain an advantage against you, and enemy characters know where you are (so you can’t Stealth).</p>',
    },
    {
      img: 'icons/svg/fire.svg',
      id: 'burn',
      name: game.i18n.localize("FE2.Effects.Statuses.Burn"),
      description: '<p>You suffer 3 General Damage (Stacks) at the start of their Turn until an appropriate Skill Roll of 12 is made.</p>',
      tooltip: '<p>You suffer 3 General Damage (Stacks) at the start of their Turn until an appropriate Skill Roll of 12 is made.</p>',
    },
    {
      img: 'icons/svg/blood.svg',
      id: 'bleeding',
      name: game.i18n.localize("FE2.Effects.Statuses.Bleeding"),
      description: '<p>You suffer 1 damage to a random (1d6) Attribute at the start of your Turn until a suitable Skill Roll of 12 is performed on you (Stacks).</p>',
      tooltip: '<p> All damaged characters suffer 3 General Damage (Stacks) at the start of their Turn until an appropriate Skill Roll of 12 is made.</p>',
    },
    {
      img: 'icons/svg/paralysis.svg',
      id: 'suppressed',
      name: game.i18n.localize("FE2.Effects.Statuses.Suppressed"),
      description: '<p>You may perform -1 Action during your next Turn (Does not Stack), Stops that Companion Body from moving during their next Turn (does not reduce their Actions), No effect on Ordnance, May be removed with a suitable Skill Roll of 12 by a different character.</p>',
      tooltip: '<p>You may perform -1 Action during your next Turn (Does not Stack), Stops that Companion Body from moving during their next Turn (does not reduce their Actions), No effect on Ordnance, May be removed with a suitable Skill Roll of 12 by a different character.</p>',
    },
    {
      img: 'icons/svg/invisible.svg',
      id: 'stealthed',
      name: game.i18n.localize("FE2.Effects.Statuses.Stealthed"),
      description: '<p>You move at 1/2 speed. You may not be perceived or Attacked by your enemies.</p>',
      tooltip: '<p>You move at 1/2 speed. You may not be perceived or Attacked by your enemies.</p>',
    }
  ]

  CONFIG.statusEffects = fe2StatusEffects;
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
      'systems/foundry-fe2/templates/partials/roll-window-footer.html',
      'systems/foundry-fe2/templates/partials/roll-preview-quantity.html',
      'systems/foundry-fe2/templates/partials/roll-preview-section.html',
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
    // FE2 rulebook: Overwatch/Sighted add Focus to Range; Sighted adds Reflexes to Hit.
    return {
      "overwatch": game.i18n.localize("FE2.Roll.ShotType.Overwatch") + focus + ")",
      "snap": game.i18n.localize("FE2.Roll.ShotType.SnapShot"),
      "sighted": game.i18n.localize("FE2.Roll.ShotType.SightedShot") + focus + " Hit +" + ref + ")"
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

    let actor = game.actors.get(rollData.actorId);
    rollData.endDmgAdd = 0;

    // Apply selected conditional effects (mutates bonusMalus / effectHitBonus /
    // effectEndDmg) BEFORE the to-hit derivation reads them.
    if (rollData.selectedConditionalEffects?.length && rollData.conditionalEffects?.length) {
      rollData.appliedConditionalEffects = FraggedEmpireUtility.applySelectedConditionalEffects(rollData);
    }

    if ( rollData.mode == "skill" || rollData.mode == "genericskill") {
      rollData.strongHitAvailable = ( rollData.nbStrongHitUsed < rollData.nbStrongHit);
    }

    // SSOT: the same derivation helpers the roll window previews (FR-006/SC-002).
    // computeToHit sets rollData.weaponHit / finalBM / skillLevel; computeHitDice returns the dice count.
    FraggedEmpireUtility.computeToHit(rollData, actor);
    let skillLevel = rollData.skillLevel;
    let nbDice = FraggedEmpireUtility.computeHitDice(rollData, actor);

    // Munition Boost: +X End/Shield Dmg (damage side; the +Xd6 dice are handled by computeHitDice).
    if (rollData.munHitDice && rollData.weapon) {
      rollData.endDmgAdd = FraggedEmpireUtility.getMunitionBoosts(rollData.weapon).bonusEndDmg;
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
      // SSOT: the range penalty was already computed and stored on rollData by
      // calculateRangePenalty (the sole authority — Focus-adjusted range + Deflector
      // Field penalty-value doubling). Apply that single value; default 0 when no
      // weapon/target/tokens (FR-006/FR-010/FR-011; spacecraft carries no range penalty).
      rollData.rollTotal = rollData.rollTotal - Number(rollData.rangepenalty || 0);

      if (rollData.target) {
        rollData.targetDefence = FraggedEmpireUtility.computeTargetDefence(rollData);
        if (rollData.target.type == "npc"){
          rollData.targetArmor = rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value
          rollData.targetEnd = rollData.target._computed?.endurance ?? rollData.target.system.fight.endurance.value
          rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + Number(actor.system.attributes.focus.current) + (rollData.effectEndDmg || 0)
          rollData.critDmg = rollData.weapon.system.statstotal.crit.value - (rollData.target._computed?.armour ?? rollData.target.system.fight.armour.value)
        } else if (rollData.target.type == "spacecraft") {
          rollData.targetArmor = rollData.target.system.fight.armour.total
          rollData.targetEnd = rollData.target.system.fight.shield.total
          rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.shielddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
          rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.fight.armour.total
        } else {
          rollData.targetArmor = rollData.target.system.armourbonus.total
          rollData.targetEnd = rollData.target.system.endurance.value
          rollData.critDmg = rollData.weapon.system.statstotal.crit.value - rollData.target.system.armourbonus.total
          rollData.totalEndDmg = Number(rollData.weapon.system.statstotal.enddmg.value) + rollData.endDmgAdd + (rollData.effectEndDmg || 0)
        }
      }
    }

    if (findKeywordOnItem(rollData.weapon, "disruptor")) {
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
    if (rollData.weapon && rollData.mode != "skill" && rollData.mode != "genericskill") {
      if (rollData.weapon.system.keywords.find(keyword => keyword.name === 'Build Momentum')) {
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
    }

    let chatRollFlags = FraggedEmpireUtility.buildRollChatFlags(rollData);
    this.createChatWithRollMode( rollData.alias, {
      content: await foundry.applications.handlebars.renderTemplate(`systems/foundry-fe2/templates/chat-generic-result.html`, rollData),
      flags: { "foundry-fe2": { rollData: chatRollFlags } }
    });

    if (rollData.target && rollData.mode != "skill" && rollData.mode != "genericskill") {
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
    // Sole authority for the range penalty (preview AND roll consume rollData.rangepenalty).
    rollData.rangepenalty = 0;

    // No-target / no-token guard (FR-010): stay interactive, treat range as unavailable.
    if (!rollData.weapon || !rollData.target) return rollData;
    const targetToken = rollData.target.getActiveTokens?.()[0];
    const actorToken = actor.getActiveTokens?.()[0];
    if (!targetToken || !actorToken) return rollData;

    // Effective range: non-snap shots add the attacker's FOCUS (FE2 rulebook; corrects
    // the prior Reflexes transposition). Henchman surrogate mirrors computeToHit.
    let weaponRange = Number(rollData.weapon.system.statstotal.range.value);
    if (rollData.shotType != "snap") weaponRange += FraggedEmpireUtility.resolveFocus(actor);

    const shotpath = canvas.grid.measurePath([targetToken.center, actorToken.center]);
    rollData.distance = shotpath.distance; // true measured distance (no distance-doubling)

    // Divide-by-zero / non-finite range guard (FR-011): no penalty, stay interactive.
    if (!(weaponRange > 0)) return rollData;

    const basePenalty = Math.max(0, (Math.ceil(shotpath.distance / weaponRange) - 1)) * 2;

    // Deflector Field doubles the PENALTY VALUE (not the distance) for non-Splash
    // weapons (FR-017/FR-018). On a 0 base penalty the multiplier stays 0.
    const targetDeflector = findKeywordOnItem(
      rollData.target.items.find(outfit => outfit.system.carryState === 'active'), 'deflctfield');
    const weaponSplash = findKeywordOnItem(rollData.weapon, 'splash');
    const deflectorMult = (targetDeflector && !weaponSplash) ? 2 : 1;

    rollData.rangepenalty = basePenalty * deflectorMult;
    return rollData;
  }

  /* -------------------------------------------- */
  /**
   * Resolve the attacker's Reflexes, using the NPC-henchman surrogate (durability.max)
   * where the actor has no Reflexes attribute. Mirrors resolveFocus / calculateRangePenalty.
   * @param {Actor} actor
   * @returns {number}
   */
  static resolveReflexes(actor) {
    if (actor.type == 'npc' && actor.system.npctype == 'henchman') return Number(actor.system.fight.durability.max);
    return Number(actor.system.attributes?.reflexes?.current) || 0;
  }

  /* -------------------------------------------- */
  /**
   * Resolve the attacker's Focus, using the NPC-henchman surrogate (durability.max)
   * where the actor has no Focus attribute.
   * @param {Actor} actor
   * @returns {number}
   */
  static resolveFocus(actor) {
    if (actor.type == 'npc' && actor.system.npctype == 'henchman') return Number(actor.system.fight.durability.max);
    return Number(actor.system.attributes?.focus?.current) || 0;
  }

  /* -------------------------------------------- */
  /**
   * SSOT helper: static to-hit bonus added to the 3d6 (weaponHit + finalBM + skillLevel),
   * excluding the dice. Sets rollData.weaponHit, rollData.finalBM and rollData.skillLevel
   * so the roll and chat consume the same numbers as the preview (FR-006/SC-002).
   * Reads documents but mutates no game state; conditional effects must already be folded
   * into rollData.bonusMalus / effectHitBonus by the caller.
   * @param {object} rollData
   * @param {Actor}  actor
   * @returns {number} weaponHit + finalBM + skillLevel
   */
  static computeToHit(rollData, actor) {
    // Skill level (+ skill effect modifiers, + untrained penalty).
    let skillLevel = rollData.skill?.system.total || 0;
    if (rollData.effectModifiers) {
      const mods = rollData.effectModifiers;
      const skillId = rollData.skill?.id;
      const skillMods = [...(mods.skills?.[skillId] || []), ...(mods.skills?.all || [])];
      if (skillMods.length) skillLevel = Math.round(applyModifiers(skillLevel, skillMods));
      if (rollData.skill && !rollData.skill.system.trained && rollData.untrainedSkillMod) {
        skillLevel += rollData.untrainedSkillMod;
      }
    }

    // Weapon hit bonus (npcfight uses its stat block; skill/genericskill add nothing).
    let weaponHit = 0;
    if (rollData.mode == 'weapon' || rollData.mode == 'spacecraftweapon') {
      weaponHit = Number(rollData.weapon.system.statstotal.hit.value) + (rollData.effectHitBonus || 0);
    } else if (rollData.mode == 'npcfight') {
      weaponHit = Number(rollData.npcstats.hit.value);
    }

    // Lock On hit boost — only when the target carries the Locked On effect.
    if (rollData.target && rollData.weapon) {
      const targetLockedOn = rollData.target.effects.some(e => e.name == 'Locked On');
      if (targetLockedOn) {
        let lockOnBoost = 0;
        for (const trait of actor.items.filter(i => i.type === "trait")) {
          const traitBoost = findKeywordOnItem(trait, 'lockonxhitenddmg');
          if (traitBoost) lockOnBoost += Number(traitBoost.system.params.X);
        }
        const wpnBoost = findKeywordOnItem(rollData.weapon, 'lockonxhitenddmg');
        if (wpnBoost) lockOnBoost += Number(wpnBoost.system.params.X);
        weaponHit += lockOnBoost;
      }
    }

    // Bonus/Malus aggregation.
    let finalBM = Number(rollData.bonusMalus) || 0;
    if (rollData.isAcquisition) finalBM += actor._computed.acquisitionMod;
    if (rollData.isArcane) {
      let arcanePenalty = 2 + (rollData.arcaneMod || 0);
      if (arcanePenalty < 0) arcanePenalty = 0;
      finalBM -= arcanePenalty;
    }
    if (rollData.useToolbox) finalBM += 1;
    if (rollData.useDedicatedworkshop) finalBM += 2;
    // Sighted shots add the attacker's REFLEXES to the attack (corrects the prior Focus transposition).
    if (rollData.shotType == 'sighted') finalBM += FraggedEmpireUtility.resolveReflexes(actor);

    rollData.weaponHit = weaponHit;
    rollData.finalBM = finalBM;
    rollData.skillLevel = skillLevel;
    return weaponHit + finalBM + skillLevel;
  }

  /* -------------------------------------------- */
  /**
   * SSOT helper: number of d6 the attack rolls. Reads documents but applies no munitions
   * side effects (ammo decrement stays in rollFraggedEmpire).
   * @param {object} rollData
   * @param {Actor}  actor
   * @returns {number}
   */
  static computeHitDice(rollData, actor) {
    let nbDice = 3;
    if (rollData.mode == 'weapon' || rollData.mode == 'spacecraftweapon') {
      nbDice = Number(rollData.weapon.system.statstotal.hitdice.value.substring(0, 1));
    }
    if (rollData.bMHitDice) nbDice += Number(rollData.bMHitDice);
    if (rollData.munHitDice) {
      nbDice += Number(rollData.munHitDice);
      if (rollData.weapon) nbDice += FraggedEmpireUtility.getMunitionBoosts(rollData.weapon).bonusDice;
    }
    if (rollData.mode == 'npcfight') {
      const rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      nbDice += rofValue - 1;
    }
    if (rollData.target && actor.items.find(i => i.type === "trait" && i.name === "Killer")) {
      if (rollData.target.isAttributeDamaged()) nbDice++;
    }
    return nbDice;
  }

  /* -------------------------------------------- */
  /**
   * SSOT helper: target's effective defence including cover, per target type.
   * @param {object} rollData
   * @returns {number|null} null when there is no valid target (caller hides the row, FR-010)
   */
  static computeTargetDefence(rollData) {
    const target = rollData.target;
    if (!target) return null;
    const coverMod = (Number(rollData.intmod) || 0) * (Number(rollData.cover) || 0);
    if (target.type == "npc") {
      return (target._computed?.defence ?? target.system.fight.defence.value) + coverMod;
    } else if (target.type == "spacecraft") {
      return target.system.fight.defence.total; // cover not applied (matches current code)
    }
    return target.system.defensebonus.total + coverMod;
  }

  /* -------------------------------------------- */
  /**
   * Read a weapon's Munition Boost keywords into roll contributions.
   * @param {Item} weapon
   * @returns {{bonusDice: number, bonusEndDmg: number}}
   */
  static getMunitionBoosts(weapon) {
    let bonusDice = 0;
    let bonusEndDmg = 0;
    if (!weapon) return { bonusDice, bonusEndDmg };
    const munBoosts = weapon.system.keywords.filter(keyword => keyword.name.includes('Munition Boost'));
    for (const munBoost of munBoosts) {
      switch (munBoost.name) {
        case 'Munition Boost Xd6':
          bonusDice += Number(munBoost.system.params.X);
          break;
        case 'Munition Boost +X End/Shield Dmg':
          bonusEndDmg = Number(munBoost.system.params.X);
          break;
      }
    }
    return { bonusDice, bonusEndDmg };
  }
  /* -------------------------------------------- */

  /* -------------------------------------------- */
  static checkDisruptorVulnerable (actor) {
    let disruptorCount = 0;
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