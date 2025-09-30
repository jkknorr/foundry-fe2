/* -------------------------------------------- */
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireRoll } from "./fragged-empire-roll-dialog.js";

/* -------------------------------------------- */
const coverBonusTable = { "nocover": 0, "lightcover": 2, "heavycover": 4, "entrenchedcover": 6};

/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class FraggedEmpireActor extends Actor {

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional SoS functionality.
   *
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   *
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   *
   */

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

    if ( data.type == 'character') {
      const skills = await FraggedEmpireUtility.loadCompendium("fvtt-fragged-empire.skills");
      data.items = skills.map(i => i.toObject());
    }

    return super.create(data, options);
  }
    
  /* -------------------------------------------- */
  prepareBaseData() {
  }

  /* -------------------------------------------- */
  async prepareData() {
    
    super.prepareData();
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    if (this.type == 'character') {
      let restotal = this.data.data.level.value + 2 + this.data.data.resources.bonus;
      if ( restotal != this.data.data.resources.total) {
        this.data.data.resources.total = restotal;
        this.update( { 'data.resources.total': restotal } );
      }
      let inftotal = this.data.data.level.value + 2 + this.data.data.influence.bonus;
      if ( inftotal != this.data.data.influence.total) {
        this.data.data.influence.total = inftotal;
        this.update( { 'data.influence.total': inftotal } );
      }
      let endmax = 10 + (this.data.data.attributes.strength.value * 5) + this.data.data.endurance.endurancebonus;
      if (endmax != this.data.data.endurance.max) {
        this.data.data.endurance.max = endmax;
        this.update( { 'data.endurance.max': endmax } );
      }
      let coverBonus = coverBonusTable[this.data.data.defensebonus.cover];
      let defTotal = this.getDefenseBase() + coverBonus + this.data.data.defensebonus.defense;
      if ( defTotal != this.data.data.defensebonus.total) {
        this.data.data.defensebonus.total = defTotal;
        this.update( { 'data.defensebonus.total': defTotal } );
      }
      let vsimpair = this.getDefenseBase() + this.data.data.attributes.strength.value + this.data.data.defensebonus.vsimpairbonus;
      if (vsimpair != this.data.data.defensebonus.vsimpair) {
        this.data.data.defensebonus.vsimpair = vsimpair;
        this.update( { 'data.defensebonus.vsimpair': vsimpair } );
      }
      let vspsionic = this.getDefenseBase() + this.data.data.attributes.focus.value + this.data.data.defensebonus.vspsionicbonus;
      if (vspsionic != this.data.data.defensebonus.vspsionic) {
        this.data.data.defensebonus.vspsionic = vspsionic;
        this.update( { 'data.defensebonus.vspsionic': vspsionic } );
      }
      let vsstealth = 10 + this.data.data.attributes.perception.value + this.data.data.defensebonus.ally;
      if (vsstealth != this.data.data.defensebonus.vsstealth) {
        this.data.data.defensebonus.vsstealth = vsstealth;
        this.update( { 'data.defensebonus.vsstealth': vsstealth } );
      }
      let recovery = this.data.data.attributes.focus.value + this.data.data.endurance.recoverybonus;
      if (recovery != this.data.data.endurance.recovery) {
        this.data.data.endurance.recovery = recovery;
        this.update( { 'data.endurance.recovery': recovery } );
      }      
    }
    if (this.type == 'spacecraft') {
      let cargomax = (this.data.data.size.value*4) + this.data.data.attributes.hull.value - 10 + this.data.data.stats.cargo.bonus;
      if  ( cargomax != this.data.data.stats.cargo.max) {
        this.data.data.stats.cargo.max = cargomax;
        this.update( { 'data.stats.cargo.max': cargomax } );
      }
      let slotmax = this.data.data.size.value + this.data.data.stats.weaponsslot.bonus;
      if ( slotmax != this.data.data.stats.weaponsslot.max) {
        this.data.data.stats.weaponsslot.max = slotmax;
        this.update( { 'data.stats.weaponsslot.max': slotmax } );
      }
      let resupmax = (this.data.data.size.value*2) + this.data.data.stats.resupply.bonus;
      if ( resupmax != this.data.data.stats.resupply.max) {
        this.data.data.stats.resupply.max = resupmax;
        this.update( { 'data.stats.resupply.max': resupmax } );
      }
      let velomax = 6 
      if ( velomax != this.data.data.attributes.velocity.value) {
        this.data.data.attributes.velocity.value = velomax;
        this.update( { 'data.attributes.velocity.value': velomax } );
      }
      let defenceb = this.getDefenseBase();
      if ( defenceb != this.data.data.fight.defence.base) {
        this.data.data.fight.defence.base = defenceb;
        this.update( { 'data.fight.defence.base': defenceb } );
      }
      let defencet = defenceb + this.data.data.fight.defence.bonus;
      if ( defencet != this.data.data.fight.defence.total) {
        this.data.data.fight.defence.total = defencet;
        this.update( { 'data.fight.defence.total': defencet } );
      }
      let armourb = this.getBaseArmour();
      if ( armourb != this.data.data.fight.armour.base) {
        this.data.data.fight.armour.base = armourb;
        this.update( { 'data.fight.armour.base': armourb } );
      }
      let armourt = armourb + this.data.data.fight.armour.bonus;
      if ( armourt != this.data.data.fight.armour.total) {
        this.data.data.fight.armour.total = armourt;
        this.update( { 'data.fight.armour.total': armourt } );
      }
      let shieldb = 10 + (this.data.data.attributes.power.value*this.data.data.size.value) ;
      if ( shieldb != this.data.data.fight.shield.base) {
        this.data.data.fight.shield.base = shieldb;
        this.update( { 'data.fight.shield.base': shieldb } );        
      }
      let shieldt = shieldb  + this.data.data.fight.shield.bonus;
      if ( shieldt != this.data.data.fight.shield.total) {
        this.data.data.fight.shield.total = shieldt;
        this.update( { 'data.fight.shield.total': shieldt } );        
      }
      let vsordinance = this.data.data.fight.defence.total + this.data.data.fight.defence.derivated.vsordinance.bonus;
      if ( vsordinance != this.data.data.fight.defence.derivated.vsordinance.total) {
        this.data.data.fight.defence.derivated.vsordinance.total = vsordinance;
        this.update( { 'data.fight.defence.derivated.vsordinance.total': vsordinance } );        
      }
      let vsboarding = 10 + this.data.data.size.value + this.data.data.attributes.crew.value + this.data.data.fight.defence.derivated.vsboarding.bonus;
      if ( vsboarding != this.data.data.fight.defence.derivated.vsboarding.total) {
        this.data.data.fight.defence.derivated.vsboarding.total = vsboarding;
        this.update( { 'data.fight.defence.derivated.vsboarding.total': vsboarding } );        
      }
      let at0shield = -1 + this.data.data.fight.armour.derivated.at0shield.bonus;
      if ( at0shield != this.data.data.fight.armour.derivated.at0shield.total) {
        this.data.data.fight.armour.derivated.at0shield.total = at0shield;
        this.update( { 'data.fight.armour.derivated.at0shield.total': at0shield } );        
      }
    }

    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {
    if ( changed.data?.resources?.value ) {
      if ( changed.data.resources.value < 0 ) 
        changed.data.resources.value = 0;
      if ( changed.data.resources.value > this.data.data.resources.total ) 
        changed.data.resources.value = this.data.data.resources.total; 
    }
    if ( changed.data?.influence?.value ) {
      if ( changed.data.influence.value < 0 ) 
        changed.data.influence.value = 0;
      if ( changed.data.influence.value > this.data.data.influence.total ) 
        changed.data.influence.value = this.data.data.influence.total; 
    }

    super._preUpdate(changed, options, user);
  }

  /* -------------------------------------------- */
  getPerks() {
    let search =(this.type == 'character') ? 'perk' : 'spacecraftperk';
    let comp = this.data.items.filter( item => item.type == search);
    return comp;
  }
  /* -------------------------------------------- */
  getTraits() {
    let search = 'trait';
    if ( this.type == 'character' || this.type == 'npc') {
      search = 'trait';
    } else {
      search = 'spacecrafttrait';
    }
    let comp = this.data.items.filter( item => item.type == search);
    return comp;
  }
  /* -------------------------------------------- */
  getComplications() {
    let comp = this.data.items.filter( item => item.type == 'complication');
    return comp;
  }
  /* -------------------------------------------- */
  getSkills() {
    let comp = this.data.items.filter( item => item.type == 'skill');
    return comp;
  }

  /* -------------------------------------------- */
  prepareSkill( item, type) {
    if (item.type == 'skill' && item.data.data.type == type) {
      item.data.data.trainedValue = (item.data.data.trained) ? 1 : -2
      item.data.data.total = item.data.data.trainedValue + item.data.data.bonus;
      item.data.data.isTrait = item.data.data.traits.length > 0;
      return item;
    }
  }

  /* -------------------------------------------- */
  async equipItem(itemId ) {
    let item = this.data.items.find( item => item.id == itemId );
    if ( item &&  item.type == 'outfit' || item.type == 'utility') {
      let itemUnequipped = this.data.items.find( item2 => item2.type == item.type && item2.data.data.equipped );
      if ( itemUnequipped) {
        let update = { _id: itemUnequipped.id, "data.equipped": false };
        await this.updateEmbeddedDocuments('Item', [update]); 
      }
    }
    if (item && item.data.data) {
      let update = { _id: item.id, "data.equipped": !item.data.data.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  getSortedSkills() {
    let comp = {};
    comp['everyday'] = this.data.items.filter( item => this.prepareSkill(item, 'everyday') );
    comp['professional'] = this.data.items.filter( item => this.prepareSkill(item, 'professional') );
    comp['combat'] = this.data.items.filter( item => this.prepareSkill(item, 'combat') );
    comp['vehicle'] = this.data.items.filter( item => this.prepareSkill(item, 'vehicle')) ;
    return comp;
  }
 
  /* -------------------------------------------- */
  prepareTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.data.data.subtype == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareSpacecraftTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.data.data.type == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareTraitsAttributes() {
    let search = (this.type == 'character') ? 'trait' : 'spacecrafttrait';
    let traitsAttr = this.data.items.filter( item => item.type == search);
    let actorData = this.data.data;
    
    if ( this.type == 'character') {
      for( let key in actorData.attributes) {
        this.prepareTraitSpecific( actorData.attributes, key, traitsAttr);
      }
      this.prepareTraitSpecific(actorData, "fate", traitsAttr);
      this.prepareTraitSpecific(actorData, "influence", traitsAttr);
      this.prepareTraitSpecific(actorData, "resources", traitsAttr);
      this.prepareTraitSpecific(actorData, "level", traitsAttr);
    } else {
      for( let key in actorData.attributes) {
        this.prepareSpacecraftTraitSpecific( actorData.attributes, key, traitsAttr);
      }
    }
  }

  /* -------------------------------------------- */
  getEquipmentSlotsBase() {
    let equipSlots = this.data.items.filter( item => item.type == 'outfit' || item.type == 'utility');
    let equipmentSlots = 0;
    for (let equip of equipSlots) {
      if ( equip.data.data.statstotal?.equipmentslots?.value && !isNaN( equip.data.data.statstotal.equipmentslots.value)) {
        equipmentSlots+= Number(equip.data.data.statstotal.equipmentslots.value);
      }
    }
    return equipmentSlots;
  }
  /* -------------------------------------------- */
  getEquipmentSlotsTotal() {
    return this.getEquipmentSlotsBase() + this.data.data.equipmentslots.bonus;
  }

  /* -------------------------------------------- */
  getSkillsTraits() { 
    let skills = this.getSkills();
    let skillsTraits = [];
    for( let skill of skills) {
      for (let trait of skill.data.data.traits) {
        trait.associatedSkill = skill.name;
      }
      skillsTraits = skillsTraits.concat( skill.data.data.traits );
    }
    //console.log("Consolidated skills", skillsTraits);
    return skillsTraits;
  } 

  /* -------------------------------------------- */
  getTrait( traitId  ) {
    let trait = this.data.items.find( item => item.id == traitId );
    return trait;
  }
  
  /* -------------------------------------------- */
  compareName( a, b) {
    if ( a.name < b.name ) {
      return -1;
    }
    if ( a.name > b.name ) {
      return 1;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getLanguages() {
    return this.data.items.filter( item => item.type == 'language'  );
  }
  /* -------------------------------------------- */
  getStrongHits() {
    return this.data.items.filter( item => item.type == 'stronghit'  );
  }
  /* ------------------------------------------- */
  getUtilities() {
    return this.data.items.filter( item => item.type == 'utility'  );
  }
  /* ------------------------------------------- */
  getEquipments() {
    return this.data.items.filter( item => item.type == 'utility' || item.type == 'outfit' || item.type == "weapon" );
  }
  
  /* -------------------------------------------- */
  updateWeaponStat( weapon) {
    weapon.data.data.totalHit = weapon.data.data.stats.hit.value;
    for (let variation of weapon.data.data.variations) {
      if (!isNaN(variation.data.stats.hit) ) {
        weapon.data.data.totalHit += Number(variation.data.data.stats.hit.value)
      }
    }
    for (let mod of weapon.data.data.modifications) {
      if (!isNaN(mod.data.stats.hit) ) {
        weapon.data.data.totalHit += Number(mod.data.data.stats.hit.value)
      }
    }
  }

  /* -------------------------------------------- */
  getRaces( ) {
    return this.data.items.filter( item => item.type == 'race' );
  }

  /* -------------------------------------------- */
  getWeapons() {
    let weapons = this.data.items.filter( item => item.type == 'weapon' );
    for (let weapon of weapons) {
      this.updateWeaponStat(weapon);
    }
    return weapons;
  }

  /* -------------------------------------------- */
  getSpacecraftWeapons() {
    let weapons = this.data.items.filter( item => item.type == 'spacecraftweapon' );
    return weapons;
  }
  /* -------------------------------------------- */
  getOutfits() {
    return this.data.items.filter( item => item.type == 'outfit' );
  }

  /* -------------------------------------------- */
  getActiveEffects(matching = it => true) {
    let array = Array.from(this.getEmbeddedCollection("ActiveEffect").values());
    return Array.from(this.getEmbeddedCollection("ActiveEffect").values()).filter(it => matching(it));
  }
  /* -------------------------------------------- */
  getEffectByLabel(label) {
    return this.getActiveEffects().find(it => it.data.label == label);
  }
  /* -------------------------------------------- */
  getEffectById(id) {
    return this.getActiveEffects().find(it => it.id == id);
  }

  /* -------------------------------------------- */
  getAttribute( attrName ) {
    for( let key in this.data.attributes) {
      let attr = this.data.data.carac[key];
      if (attr.label.toLowerCase() == attrName.toLowerCase() ) {
        return deepClone(categ.carac[carac]);
      }
    }
  }

  /* -------------------------------------------- */
  async equipGear( equipmentId ) {    
    let item = this.data.items.find( item => item.id == equipmentId );
    if (item && item.data.data) {
      let update = { _id: item.id, "data.equipe": !item.data.data.equipe };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  buildListeActionsCombat( ) {
    let armes = [];
  }
    
  /* -------------------------------------------- */
  saveRollData( rollData) {
    this.currentRollData = rollData;
  }
  /* -------------------------------------------- */
  getRollData( ) {
    return this.currentRollData;
  }
  
  /* -------------------------------------------- */
  getInitiativeScore( )  {
    if ( this.type == 'character') {
      return this.data.data.attributes.intelligence.current + (this.data.data.attributes.reflexes.current/10)
    } else if (this.type == 'spacecraft') {
      return this.data.data.attributes.velocity.value + (this.data.data.size.value/10)
    }
    return 0.0;
  }

  /* -------------------------------------------- */
  getDefenseBase() {
    if (this.type == 'character') {
      let outfitBonus = 0;
      let outfits = this.data.items.filter( item => (item.type == 'outfit' || item.type == 'utility') && item.data.data.equipped );
      for (let item of outfits) {
        if ( !isNaN(item.data.data.statstotal?.defence?.value)) {
          outfitBonus += Number(item.data.data.statstotal.defence.value);
        }
      }
      return 10 + this.data.data.attributes.reflexes.value + outfitBonus;
    }
    if (this.type == 'spacecraft') {
      return 12 - this.data.data.size.value + this.data.data.attributes.engines.value;
    }
    return 0;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    if (this.type == 'character') {
      return this.data.data.defensebonus.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getVsOrdinance() {
    if (this.type == 'spacecraft') {
      return this.data.data.fight.defence.value + this.data.data.fight.defence.vsordinance;
    }
  }
  /* -------------------------------------------- */
  getBaseArmour( ) {
    if (this.type == 'character') {
      let armour = 0;
      let outfits = this.data.items.filter( item => (item.type == 'outfit' || item.type == 'utility') && item.data.data.equipped );
      for (let item of outfits) {
        if ( !isNaN(item.data.data.statstotal?.armour?.value)) {
          armour += Number(item.data.data.statstotal.armour.value);
        }
      }
      return armour;
    }
    if (this.type == 'spacecraft') {
      return 3;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getTotalArmour( ) {
    if (this.type == 'character') {
      this.data.data.armourbonus.total = this.getBaseArmour() + this.data.data.armourbonus.armour;
      return this.data.data.armourbonus.total;
    }
    if (this.type == 'spacecraft') {
      this.data.data.fight.armour.total = this.getBaseArmour() + this.data.data.fight.armour.bonus
      return this.data.data.fight.armour.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getTradeGoods( ) {
    let tradeGoods = this.data.items.filter( item => item.type == 'tradegood' );
    for (let good of tradeGoods) {
      good.cargoSpace = Math.ceil(good.data.data.tradebox / 4); 
    }
    return tradeGoods;

  }
  /* -------------------------------------------- */
  getResearch( ) {
    let research = this.data.items.filter( item => item.type == 'research' );
    return research;

  }
  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.data.data.subactors) {
      subActors.push(duplicate(game.actors.get(id)));
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor( subActorId) {
    let subActors = duplicate( this.data.data.subactors);
    subActors.push( subActorId);
    await this.update( { 'data.subactors': subActors } );
  }
  /* -------------------------------------------- */
  async delSubActor( subActorId) {
    let newArray = [];
    console.log("ID; ", this.data.data.subactors, subActorId);
    for (let id of this.data.data.subactors) {
      if ( id != subActorId) {
        newArray.push( id);
      }
    }
    await this.update( { 'data.subactors': newArray } );
  }
  /* -------------------------------------------- */
  decrementFate() {
    if ( this.type == 'character' && this.data.data.fate.value > 0 ) {
      let newFate = this.data.data.fate.value - 1;
      this.data.data.fate.value = newFate;
      this.update( { 'data.fate.value': newFate } );
      return newFate;
    }
    return false;
  }
  /* -------------------------------------------- */
  getFate() {
    if ( this.type == 'character' && this.data.data.fate.value > 0 ) {
      return this.data.data.fate.value;
    }
    return false;
  }

  /* -------------------------------------------- */
  async rollSkill( competenceId ) {
    let skill = this.data.items.find( item => item.type == 'skill' && item.id == competenceId);
    if (skill) {
      let rollData = {
        mode: "skill",
        alias: this.name, 
        actorImg: this.img,
        actorId: this.id,
        img: skill.img,
        hasFate: this.getFate(),
        rollMode: game.settings.get("core", "rollMode"),
        title: `Skill ${skill.name} : ${skill.data.data.total}`,
        skill: skill,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
        difficulty: 0,
        useToolbox: false,
        useDedicatedworkshop: false,
        toolsAvailable: skill.data.data.toolbox || skill.data.data.useDedicatedworkshop
      }
      let rollDialog = await FraggedEmpireRoll.create( this, rollData);
      console.log(rollDialog);
      rollDialog.render( true );
    } else {
      ui.notifications.warn("Skill not found !");
    }
  }

  /* -------------------------------------------- */
  async rollGenericSkill( ) {
    let rollData = {
      mode: "genericskill",
      alias: this.name, 
      actorImg: this.img,
      actorId: this.id,
      img: this.img,
      hasFate: this.getFate(),
      rollMode: game.settings.get("core", "rollMode"),
      title: `Generic Skill roll`,
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
      difficulty: 0
    }
    let rollDialog = await FraggedEmpireRoll.create( this, rollData);
    console.log(rollDialog);
    rollDialog.render( true );
  }

  /* -------------------------------------------- */
  async rollWeapon( weaponId ) {
    let weapon = this.data.items.find( item => item.id == weaponId);
    console.log("WEAPON :", weaponId, weapon );
        
    this.updateWeaponStat( weapon);
    if ( weapon ) {
      
      let rollData = {
        mode: 'weapon',
        alias: this.name, 
        actorId: this.id,
        img: weapon.img,
        hasFate: this.getFate(),
        rollMode: game.settings.get("core", "rollMode"),
        title: "Attack : " + weapon.name,
        weapon: weapon,
        weaponRoFOptions: FraggedEmpireUtility.buildRoFArray(weapon), 
        rofValue: 1,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( )
      }
      // Add skill for character only
      if (this.type == 'character') {
        let weaponSkills = this.data.items.filter( item => item.type == 'skill' && item.data.data.type == 'combat');
        rollData.weaponSkills =  weaponSkills;
        let combatSkill = weaponSkills[0];
        if ( weapon.data.data.defaultskill != "") {
          combatSkill = this.data.items.find( item => item.type == 'skill' && item.data.data.type == 'combat' && item.name == weapon.data.data.defaultskill);
        }
        rollData.skillId = combatSkill.id;
        rollData.skill = combatSkill;
      }
      let rollDialog = await FraggedEmpireRoll.create( this, rollData);
      console.log("WEAPON ROLL", rollData);
      rollDialog.render( true );
    } else {
      ui.notifications.warn("Weapon not found !", weaponId);
    }
  }
  /* -------------------------------------------- */
  buildNPCRoFArray( ) {
    let bodiesBase = Number(this.data.data.spec.bodies.value);
    let rofMax = bodiesBase + Number(this.data.data.stats.rof.value) || 1;
    return FraggedEmpireUtility.createDirectOptionList(1, rofMax);
  }

  /* -------------------------------------------- */
  async rollNPCFight( ) {    

    let rollData = {
      mode: 'npcfight',
      alias: this.name, 
      actorId: this.id,
      img: this.img,
      hasFate: this.getFate(),
      npcstats: duplicate(this.data.data.stats),
      rollMode: game.settings.get("core", "rollMode"),
      title: "Attack : " + this.name,
      weaponRoFOptions: this.buildNPCRoFArray(), 
      rofValue: 1,
      optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
      bonusMalus: 0,
      optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( )
    }
    let rollDialog = await FraggedEmpireRoll.create( this, rollData);
    console.log("NPC FIGHT ROLL", rollData);
    rollDialog.render( true );
  }

  /* -------------------------------------------- */
  async rollSpacecraftWeapon( weaponId ) {
      let weapon = this.data.items.find( item => item.id == weaponId);
      console.log("SPACECRAFT WEAPON :", weaponId, weapon );
      
      // Build available actor/skills
      let actorList = []
      if (game.user.isGM )  {
        for (let actor of game.actors) {
          actorList.push( { id:actor.id, name:actor.name, skills:actor.data.items.filter( item => item.type == 'skill' && item.data.data.type == 'vehicle') } );
        }
      } else {      
        let actorWeapon = game.user.character;
        actorList.push( { id:actorWeapon.id, name:actorWeapon.name, skills:actorWeapon.data.items.filter( item => item.type == 'skill' && item.data.data.type == 'vehicle') } );
      }

      // Skill prepare
      let skill = actorList[0].skills[0];
      skill.data.data.trainedValue = (skill.data.data.trained) ? 1 : -2
      skill.data.data.total = skill.data.data.trainedValue + skill.data.data.bonus;
      skill.data.data.isTrait = skill.data.data.traits.length > 0; 

      if ( weapon ) {      
        let rollData = {
          mode: 'spacecraftweapon',
          alias: this.name, 
          actorId: this.id,
          actorList: actorList,
          img: weapon.img,
          hasFate: this.getFate(),
          rollMode: game.settings.get("core", "rollMode"),
          title: "Spacecraft attack : " + weapon.name,
          weapon: weapon,
          skillId: actorList[0].skills[0].id,
          skill: actorList[0].skills[0],
          optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
          optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
          bonusMalus: 0,
          isGM: game.user.isGM
        }
        let rofMax = Number(weapon.data.data.statstotal.rof.value) || 1;
        rollData.rofValue = rofMax;

        let rollDialog = await FraggedEmpireRoll.create( this, rollData);
        console.log("SPACECRAFT WEAPON ROLL", rollData);
        rollDialog.render( true );
      } else {
        ui.notifications.warn("Weapon not found !", weaponId);
      }
    }
  
  /* -------------------------------------------- */
  async incrementeArgent( arme ) {
    let monnaie = this.data.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.data.nombre + 1;
      await this.updateOwnedItem( { _id: monnaie._id, 'data.nombre': newValeur } );
    }
  }
  /* -------------------------------------------- */
  async decrementeArgent( arme ) {
    let monnaie = this.data.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.data.nombre - 1;
      newValeur = (newValeur <= 0) ? 0 : newValeur;
      await this.updateOwnedItem( { _id: monnaie._id, 'data.nombre': newValeur } );
    }
  }
  
  /* -------------------------------------------- */
  async incrementeQuantite( objetId ) {
    let objetQ = this.data.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.data.data.quantite + 1;
      const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'data.quantite': newQ }]); // pdates one EmbeddedEntity
    }
  }
  
  /* -------------------------------------------- */
  async decrementeQuantite( objetId ) {
    let objetQ = this.data.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.data.data.quantite - 1;
      newQ = (newQ <= 0) ? 0 : newQ;
      const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'data.quantite': newQ }]); // pdates one EmbeddedEntity
    }
  }
    
}
