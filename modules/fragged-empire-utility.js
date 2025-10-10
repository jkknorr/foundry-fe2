/* -------------------------------------------- */  

/* -------------------------------------------- */  
export class FraggedEmpireUtility  {
  

  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => FraggedEmpireUtility.chatListeners(html));
  }

  /* -------------------------------------------- */
  static async ready() {
    const skills = await FraggedEmpireUtility.loadCompendium("foundry-fe2.skills");
    this.compendiumSkills  = skills.map(i => i.toObject());
  }

  /* -------------------------------------------- */
  static getSkillsType( skillType ) {
    let filtered = this.compendiumSkills.filter( skill => skill.data.type == skillType );
    return filtered;
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {

    html.on("click", '.link-reroll', event => {
      const diceIndex = $(event.currentTarget).data("dice-index");
      const actorId = $(event.currentTarget).data("actor-id");
      FraggedEmpireUtility.rerollDice(actorId, diceIndex)
    });
    html.on("click", '.fate-reroll', event => {
      const actorId = $(event.currentTarget).data("actor-id");      
      FraggedEmpireUtility.rerollDice(actorId);      
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
      'systems/foundry-fe2/templates/partial-skill-list-header.html'
    ]
    return foundry.applications.handlebars.loadTemplates(templatePaths);    
  }

  /* -------------------------------------------- */
  static templateData(it) {
    return FraggedEmpireUtility.data(it)?.data ?? {}
  }

  /* -------------------------------------------- */
  static data(it) {
    if (it instanceof Actor || it instanceof Item || it instanceof Combatant) {
      return it.data;
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
    let options = ""
    for (let i = min; i <= max; i++) {
      options += `<option value="${i}">${i}</option>`
    }
    return options;
  }
  
  /* -------------------------------------------- */
  static async getTraitFromCompendium( itemId) {
    let trait = game.items.find( item => item.data.type == 'trait' && item.id == itemId );
    if ( !trait ) { 
      let traits =  await this.loadCompendium('world.traits', item => item.id == itemId );
      let traitsObj = traits.map(i => i.toObject());
      trait = traitsObj[0];
    } else {
      trait = duplicate( trait);
    }

    console.log("TRAIT", itemId, trait);
    return trait;
  }

  /* -------------------------------------------- */
  static async getTraitAttributeList( attr ) {
    console.log("Searching traits: attr");
    let traits1 = game.items.filter( item => item.data.type == 'trait' && item.data.data.subtype == attr );
    let traits2 = await this.loadCompendium('world.traits', item => item.data.type == 'trait' && item.data.data.subtype == attr );
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
    //console.log("Compendium", compendiumData);
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
    
    console.log("Going to roll", rollData);

    // Init stuff
    let skillLevel = rollData.skill?.data.data.total ||  0;
    let nbDice = 3;

    // Bonus/Malus total
    rollData.weaponHit = 0;
    rollData.rofBonus = 0;
    rollData.finalBM = rollData.bonusMalus;
    if ( rollData.useToolbox) rollData.finalBM += 1;
    if ( rollData.useDedicatedworkshop) rollData.finalBM += 2;
    if ( rollData.mode == 'weapon' || rollData.mode == 'spacecraftweapon') {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.weapon.data.data.statstotal.hit.value);
      rollData.rofBonus = rollData.rofValue - 1;
      nbDice += rollData.rofBonus;
    }
    if ( rollData.mode == 'npcfight' ) {
      rollData.rofValue = (rollData.rofValue < 1) ? 1 : Number(rollData.rofValue);
      rollData.weaponHit = Number(rollData.npcstats.hit.value);
      rollData.rofBonus = rollData.rofValue - 1;
      nbDice += rollData.rofBonus;
    }
    let myRoll = rollData.roll;
    if ( !myRoll ) { // New rolls only of no rerolls
      let formula = nbDice+"d6+"+rollData.weaponHit+"+"+rollData.finalBM+"+"+skillLevel;
      myRoll = new Roll(formula).roll( { async: false} );
      console.log("ROLL : ", formula);
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );
      rollData.roll = myRoll
      rollData.nbStrongHitUsed = 0;
    }
    
    let minStrongHit = 6;
    let maxStrongHit = 6;
    if ( rollData.weapon && rollData.weapon.data.data.keywords.stronghit.flag) {
      minStrongHit = Number(rollData.weapon.data.data.keywords.stronghit.X);
      maxStrongHit = Number(rollData.weapon.data.data.keywords.stronghit.Y);
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
    if ( rollData.mode == "skill" || rollData.mode == "genericskill") {
      rollData.strongHitAvailable = ( rollData.nbStrongHitUsed < rollData.nbStrongHit);
    } else {
      rollData.strongHitAvailable = false;
    }
    console.log("ROLLLL!!!!", rollData);
  
    let actor = game.actors.get(rollData.actorId);
    actor.saveRollData( rollData );
  
    this.createChatWithRollMode( rollData.alias, {
      content: await renderTemplate(`systems/foundry-fe2/templates/chat-generic-result.html`, rollData)
    });
  }

  /* -------------------------------------------- */
  static async rerollDice( actorId, diceIndex=-1 ) {
    let actor = game.actors.get(actorId);
    let rollData = actor.getRollData();
    
    if ( diceIndex != -1) {
      let myRoll = new Roll("1d6").roll( { async: false} );
      await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode") );

      rollData.roll.dice[0].results[diceIndex].result = myRoll.total; // Patch
      rollData.nbStrongHitUsed++;
    } else {
      rollData.hasFate = actor.decrementFate();
      rollData.roll = undefined;
    }

    this.rollFraggedEmpire( rollData );
  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.data._id);
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
    let chatGM = duplicate(chatOptions);
    chatGM.whisper = this.getUsers(user => user.isGM);
    chatGM.content = "Blinde message of " + game.user.name + "<br>" + chatOptions.content;
    console.log("blindMessageToGM", chatGM);
    game.socket.emit("system.foundry-fe2", { msg: "msg_gm_chat_message", data: chatGM });
  }

  /* -------------------------------------------- */
  static buildRoFArray( item ) {
    if (item.type != "weapon") return false;
    
    let rofMax = Number(item.data.data.statstotal.rof.value) || 1;
    return this.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  static split3Columns(data) {
    
    let array = [ [], [], [] ];
    if (data== undefined) return array;

    let col = 0;
    for (let key in data) {
      let keyword = data[key];
      keyword.key = key; // Self-reference
      array[col].push( keyword);
      col++;
      if (col == 3) col = 0;
    } 
    return array;
  }

  /* -------------------------------------------- */
  static createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          this.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = "Message only to the GM";
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
    let options = ""
    options += `<option value="0">None</option>`
    options += `<option value="8">Easy</option>`
    options += `<option value="12">Moderate</option>`
    options += `<option value="16">Difficult</option>`
    options += `<option value="18">Very Difficult</option>`
    return options;

  }
  
  /* -------------------------------------------- */
  static async confirmDelete(actorSheet, li) {
    let itemId = li.data("item-id");
    let msgTxt = "<p>Are you sure to remove this Item ?";
    let buttons = {
      delete: {
          icon: '<i class="fas fa-check"></i>',
          label: "Yes, remove it",
          callback: () => {
            actorSheet.actor.deleteEmbeddedDocuments( "Item", [itemId] );
            li.slideUp(200, () => actorSheet.render(false));
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      }
      msgTxt += "</p>";
      let d = new Dialog({
        title: "Confirm removal",
        content: msgTxt,
        buttons: buttons,
        default: "cancel"
      });
      d.render(true);
  }

}