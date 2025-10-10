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

  static defineSchema() {

    const fields = foundry.data.fields;
    return {
      level: new fields.NumberField({ initial: 1 }),
      resources: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        alloted: new fields.NumberField({ initial: 0 }),
        bonus: new fields.NumberField({ initial: 0 }),
        total: new fields.NumberField({ initial: 0 })
      }),
      influence: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        bonus: new fields.NumberField({ initial: 0 }),
        total: new fields.NumberField({ initial: 0 })
      }),
      sparetimepoints: new fields.NumberField({ initial: 1 }),
      attributes: new fields.SchemaField({
        strength: new fields.SchemaField({
          label: new fields.StringField({ initial: "Strength" }),
          value: new fields.NumberField({ initial: 0 }),
          current: new fields.NumberField({ initial: 0 })
        }),
      })
    }
  }

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
      const skills = await FraggedEmpireUtility.loadCompendium("foundry-fe2.skills");
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
      let restotal = this.data.level.value + 2 + this.system.resources.bonus;
      if ( restotal != this.system.resources.total) {
        this.system.resources.total = restotal;
        this.update( { 'data.resources.total': restotal } );
      }
      let inftotal = this.system.level.value + 2 + this.system.influence.bonus;
      if ( inftotal != this.system.influence.total) {
        this.system.influence.total = inftotal;
        this.update( { 'data.influence.total': inftotal } );
      }
      let endmax = 10 + (this.system.attributes.strength.value * 5) + this.system.endurance.endurancebonus;
      if (endmax != this.system.endurance.max) {
        this.system.endurance.max = endmax;
        this.update( { 'data.endurance.max': endmax } );
      }
      let coverBonus = coverBonusTable[this.system.defensebonus.cover];
      let defTotal = this.getDefenseBase() + coverBonus + this.system.defensebonus.defense;
      if ( defTotal != this.system.defensebonus.total) {
        this.system.defensebonus.total = defTotal;
        this.update( { 'data.defensebonus.total': defTotal } );
      }
      let vsimpair = this.getDefenseBase() + this.system.attributes.strength.value + this.system.defensebonus.vsimpairbonus;
      if (vsimpair != this.system.defensebonus.vsimpair) {
        this.system.defensebonus.vsimpair = vsimpair;
        this.update( { 'data.defensebonus.vsimpair': vsimpair } );
      }
      let vspsionic = this.getDefenseBase() + this.system.attributes.focus.value + this.system.defensebonus.vspsionicbonus;
      if (vspsionic != this.system.defensebonus.vspsionic) {
        this.system.defensebonus.vspsionic = vspsionic;
        this.update( { 'data.defensebonus.vspsionic': vspsionic } );
      }
      let vsstealth = 10 + this.system.attributes.perception.value + this.system.defensebonus.ally;
      if (vsstealth != this.system.defensebonus.vsstealth) {
        this.system.defensebonus.vsstealth = vsstealth;
        this.update( { 'data.defensebonus.vsstealth': vsstealth } );
      }
      let recovery = this.system.attributes.focus.value + this.system.endurance.recoverybonus;
      if (recovery != this.system.endurance.recovery) {
        this.system.endurance.recovery = recovery;
        this.update( { 'data.endurance.recovery': recovery } );
      }      
    }
    if (this.type == 'spacecraft') {
      let cargomax = (this.system.size.value*4) + this.system.attributes.hull.value - 10 + this.system.stats.cargo.bonus;
      if  ( cargomax != this.system.stats.cargo.max) {
        this.system.stats.cargo.max = cargomax;
        this.update( { 'data.stats.cargo.max': cargomax } );
      }
      let slotmax = this.system.size.value + this.system.stats.weaponsslot.bonus;
      if ( slotmax != this.system.stats.weaponsslot.max) {
        this.system.stats.weaponsslot.max = slotmax;
        this.update( { 'data.stats.weaponsslot.max': slotmax } );
      }
      let resupmax = (this.system.size.value*2) + this.system.stats.resupply.bonus;
      if ( resupmax != this.system.stats.resupply.max) {
        this.system.stats.resupply.max = resupmax;
        this.update( { 'data.stats.resupply.max': resupmax } );
      }
      let velomax = 6 
      if ( velomax != this.system.attributes.velocity.value) {
        this.system.attributes.velocity.value = velomax;
        this.update( { 'data.attributes.velocity.value': velomax } );
      }
      let defenceb = this.getDefenseBase();
      if ( defenceb != this.system.fight.defence.base) {
        this.system.fight.defence.base = defenceb;
        this.update( { 'data.fight.defence.base': defenceb } );
      }
      let defencet = defenceb + this.system.fight.defence.bonus;
      if ( defencet != this.system.fight.defence.total) {
        this.system.fight.defence.total = defencet;
        this.update( { 'data.fight.defence.total': defencet } );
      }
      let armourb = this.getBaseArmour();
      if ( armourb != this.system.fight.armour.base) {
        this.system.fight.armour.base = armourb;
        this.update( { 'data.fight.armour.base': armourb } );
      }
      let armourt = armourb + this.system.fight.armour.bonus;
      if ( armourt != this.system.fight.armour.total) {
        this.system.fight.armour.total = armourt;
        this.update( { 'data.fight.armour.total': armourt } );
      }
      let shieldb = 10 + (this.system.attributes.power.value*this.system.size.value) ;
      if ( shieldb != this.system.fight.shield.base) {
        this.system.fight.shield.base = shieldb;
        this.update( { 'data.fight.shield.base': shieldb } );        
      }
      let shieldt = shieldb  + this.system.fight.shield.bonus;
      if ( shieldt != this.system.fight.shield.total) {
        this.system.fight.shield.total = shieldt;
        this.update( { 'data.fight.shield.total': shieldt } );        
      }
      let vsordinance = this.system.fight.defence.total + this.system.fight.defence.derivated.vsordinance.bonus;
      if ( vsordinance != this.system.fight.defence.derivated.vsordinance.total) {
        this.system.fight.defence.derivated.vsordinance.total = vsordinance;
        this.update( { 'data.fight.defence.derivated.vsordinance.total': vsordinance } );        
      }
      let vsboarding = 10 + this.system.size.value + this.system.attributes.crew.value + this.system.fight.defence.derivated.vsboarding.bonus;
      if ( vsboarding != this.system.fight.defence.derivated.vsboarding.total) {
        this.system.fight.defence.derivated.vsboarding.total = vsboarding;
        this.update( { 'data.fight.defence.derivated.vsboarding.total': vsboarding } );        
      }
      let at0shield = -1 + this.system.fight.armour.derivated.at0shield.bonus;
      if ( at0shield != this.system.fight.armour.derivated.at0shield.total) {
        this.system.fight.armour.derivated.at0shield.total = at0shield;
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
      if ( changed.data.resources.value > this.system.resources.total ) 
        changed.data.resources.value = this.system.resources.total; 
    }
    if ( changed.data?.influence?.value ) {
      if ( changed.data.influence.value < 0 ) 
        changed.data.influence.value = 0;
      if ( changed.data.influence.value > this.system.influence.total ) 
        changed.data.influence.value = this.system.influence.total; 
    }

    super._preUpdate(changed, options, user);
  }

  /* -------------------------------------------- */
  getPerks() {
    let search =(this.type == 'character') ? 'perk' : 'spacecraftperk';
    let comp = this.items.filter( item => item.type == search);
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
    let comp = this.items.filter( item => item.type == search);
    return comp;
  }
  /* -------------------------------------------- */
  getComplications() {
    let comp = this.items.filter( item => item.type == 'complication');
    return comp;
  }
  /* -------------------------------------------- */
  getSkills() {
    let comp = this.items.filter( item => item.type == 'skill');
    return comp;
  }

  /* -------------------------------------------- */
  prepareSkill( item, type) {
    if (item.type == 'skill' && item.system.type == type) {
      item.system.trainedValue = (item.system.trained) ? 1 : -2
      item.system.total = item.system.trainedValue + item.system.bonus;
      item.system.isTrait = item.system.traits.length > 0;
      return item;
    }
  }

  /* -------------------------------------------- */
  async equipItem(itemId ) {
    let item = this.items.find( item => item.id == itemId );
    if ( item &&  item.type == 'outfit' || item.type == 'utility') {
      let itemUnequipped = this.items.find( item2 => item2.type == item.type && item2.system.equipped );
      if ( itemUnequipped) {
        let update = { _id: itemUnequipped.id, "data.equipped": false };
        await this.updateEmbeddedDocuments('Item', [update]); 
      }
    }
    if (item && item.system) {
      let update = { _id: item.id, "data.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  getSortedSkills() {
    let comp = {};
    comp['everyday'] = this.items.filter( item => this.prepareSkill(item, 'everyday') );
    comp['professional'] = this.items.filter( item => this.prepareSkill(item, 'professional') );
    comp['combat'] = this.items.filter( item => this.prepareSkill(item, 'combat') );
    comp['vehicle'] = this.items.filter( item => this.prepareSkill(item, 'vehicle')) ;
    return comp;
  }
 
  /* -------------------------------------------- */
  prepareTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.system.subtype == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareSpacecraftTraitSpecific( actorData, key, traitsAttr ) {
    let trait = traitsAttr.find( item => item.system.type == key); // Get the first attribute trait
    if (trait ) {
      actorData[key].traitId = trait.id;
    } else {
      actorData[key].traitId = "";
    }
  }
  /* -------------------------------------------- */
  prepareTraitsAttributes() {
    let search = (this.type == 'character') ? 'trait' : 'spacecrafttrait';
    console.log("Test",this.system.level);
    let traitsAttr = this.items.filter( item => item.type == search);
    let actorData = this.system;
    
    if ( this.type == 'character') {
      for( let key in actorData.attributes) {
        this.prepareTraitSpecific( actorData.attributes, key, traitsAttr);
      }
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
    let equipSlots = this.items.filter( item => item.type == 'outfit' || item.type == 'utility');
    let equipmentSlots = 0;
    for (let equip of equipSlots) {
      if ( equip.system.statstotal?.equipmentslots?.value && !isNaN( equip.system.statstotal.equipmentslots.value)) {
        equipmentSlots+= Number(equip.system.statstotal.equipmentslots.value);
      }
    }
    return equipmentSlots;
  }
  /* -------------------------------------------- */
  getEquipmentSlotsTotal() {
    return this.getEquipmentSlotsBase() + this.system.equipmentslots.bonus;
  }

  /* -------------------------------------------- */
  getSkillsTraits() { 
    let skills = this.getSkills();
    let skillsTraits = [];
    for( let skill of skills) {
      for (let trait of skill.system.traits) {
        trait.associatedSkill = skill.name;
      }
      skillsTraits = skillsTraits.concat( skill.system.traits );
    }
    //console.log("Consolidated skills", skillsTraits);
    return skillsTraits;
  } 

  /* -------------------------------------------- */
  getTrait( traitId  ) {
    let trait = this.items.find( item => item.id == traitId );
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
    return this.items.filter( item => item.type == 'language'  );
  }
  /* -------------------------------------------- */
  getStrongHits() {
    return this.items.filter( item => item.type == 'stronghit'  );
  }
  /* ------------------------------------------- */
  getUtilities() {
    return this.items.filter( item => item.type == 'utility'  );
  }
  /* ------------------------------------------- */
  getEquipments() {
    return this.items.filter( item => item.type == 'utility' || item.type == 'outfit' || item.type == "weapon" );
  }
  
  /* -------------------------------------------- */
  updateWeaponStat( weapon) {
    weapon.system.totalHit = weapon.system.stats.hit.value;
    for (let variation of weapon.system.variations) {
      if (!isNaN(variation.data.stats.hit) ) {
        weapon.system.totalHit += Number(variation.system.stats.hit.value)
      }
    }
    for (let mod of weapon.system.modifications) {
      if (!isNaN(mod.data.stats.hit) ) {
        weapon.system.totalHit += Number(mod.system.stats.hit.value)
      }
    }
  }

  /* -------------------------------------------- */
  getRaces( ) {
    return this.items.filter( item => item.type == 'race' );
  }

  /* -------------------------------------------- */
  getWeapons() {
    let weapons = this.items.filter( item => item.type == 'weapon' );
    for (let weapon of weapons) {
      this.updateWeaponStat(weapon);
    }
    return weapons;
  }

  /* -------------------------------------------- */
  getSpacecraftWeapons() {
    let weapons = this.items.filter( item => item.type == 'spacecraftweapon' );
    return weapons;
  }
  /* -------------------------------------------- */
  getOutfits() {
    return this.items.filter( item => item.type == 'outfit' );
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
      let attr = this.system.carac[key];
      if (attr.label.toLowerCase() == attrName.toLowerCase() ) {
        return deepClone(categ.carac[carac]);
      }
    }
  }

  /* -------------------------------------------- */
  async equipGear( equipmentId ) {    
    let item = this.items.find( item => item.id == equipmentId );
    if (item && item.system) {
      let update = { _id: item.id, "data.equipe": !item.system.equipe };
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
      return this.system.attributes.intelligence.current + (this.system.attributes.reflexes.current/10)
    } else if (this.type == 'spacecraft') {
      return this.system.attributes.velocity.value + (this.system.size.value/10)
    }
    return 0.0;
  }

  /* -------------------------------------------- */
  getDefenseBase() {
    if (this.type == 'character') {
      let outfitBonus = 0;
      let outfits = this.items.filter( item => (item.type == 'outfit' || item.type == 'utility') && item.system.equipped );
      for (let item of outfits) {
        if ( !isNaN(item.system.statstotal?.defence?.value)) {
          outfitBonus += Number(item.system.statstotal.defence.value);
        }
      }
      return 10 + this.system.attributes.reflexes.value + outfitBonus;
    }
    if (this.type == 'spacecraft') {
      return 12 - this.system.size.value + this.system.attributes.engines.value;
    }
    return 0;
  }

  /* -------------------------------------------- */
  getDefenseTotal() {
    if (this.type == 'character') {
      return this.system.defensebonus.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getVsOrdinance() {
    if (this.type == 'spacecraft') {
      return this.system.fight.defence.value + this.system.fight.defence.vsordinance;
    }
  }
  /* -------------------------------------------- */
  getBaseArmour( ) {
    if (this.type == 'character') {
      let armour = 0;
      let outfits = this.items.filter( item => (item.type == 'outfit' || item.type == 'utility') && item.system.equipped );
      for (let item of outfits) {
        if ( !isNaN(item.system.statstotal?.armour?.value)) {
          armour += Number(item.system.statstotal.armour.value);
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
      this.system.armourbonus.total = this.getBaseArmour() + this.system.armourbonus.armour;
      return this.system.armourbonus.total;
    }
    if (this.type == 'spacecraft') {
      this.system.fight.armour.total = this.getBaseArmour() + this.system.fight.armour.bonus
      return this.system.fight.armour.total;
    }
    return 0;
  }
  /* -------------------------------------------- */
  getTradeGoods( ) {
    let tradeGoods = this.items.filter( item => item.type == 'tradegood' );
    for (let good of tradeGoods) {
      good.cargoSpace = Math.ceil(good.system.tradebox / 4); 
    }
    return tradeGoods;

  }
  /* -------------------------------------------- */
  getResearch( ) {
    let research = this.items.filter( item => item.type == 'research' );
    return research;

  }
  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.system.subactors) {
      subActors.push(duplicate(game.actors.get(id)));
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor( subActorId) {
    let subActors = duplicate( this.system.subactors);
    subActors.push( subActorId);
    await this.update( { 'data.subactors': subActors } );
  }
  /* -------------------------------------------- */
  async delSubActor( subActorId) {
    let newArray = [];
    console.log("ID; ", this.system.subactors, subActorId);
    for (let id of this.system.subactors) {
      if ( id != subActorId) {
        newArray.push( id);
      }
    }
    await this.update( { 'data.subactors': newArray } );
  }
  /* -------------------------------------------- */
  decrementFate() {
    if ( this.type == 'character' && this.system.fate.value > 0 ) {
      let newFate = this.system.fate.value - 1;
      this.system.fate.value = newFate;
      this.update( { 'data.fate.value': newFate } );
      return newFate;
    }
    return false;
  }
  /* -------------------------------------------- */
  getFate() {
    if ( this.type == 'character' && this.system.fate.value > 0 ) {
      return this.system.fate.value;
    }
    return false;
  }

  /* -------------------------------------------- */
  async rollSkill( competenceId ) {
    let skill = this.items.find( item => item.type == 'skill' && item.id == competenceId);
    if (skill) {
      let rollData = {
        mode: "skill",
        alias: this.name, 
        actorImg: this.img,
        actorId: this.id,
        img: skill.img,
        hasFate: this.getFate(),
        rollMode: game.settings.get("core", "rollMode"),
        title: `Skill ${skill.name} : ${skill.system.total}`,
        skill: skill,
        optionsBonusMalus: FraggedEmpireUtility.buildListOptions(-6, +6),
        bonusMalus: 0,
        optionsDifficulty: FraggedEmpireUtility.buildDifficultyOptions( ),
        difficulty: 0,
        useToolbox: false,
        useDedicatedworkshop: false,
        toolsAvailable: skill.system.toolbox || skill.system.useDedicatedworkshop
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
    let weapon = this.items.find( item => item.id == weaponId);
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
        let weaponSkills = this.items.filter( item => item.type == 'skill' && item.system.type == 'combat');
        rollData.weaponSkills =  weaponSkills;
        let combatSkill = weaponSkills[0];
        if ( weapon.system.defaultskill != "") {
          combatSkill = this.items.find( item => item.type == 'skill' && item.system.type == 'combat' && item.name == weapon.system.defaultskill);
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
    let bodiesBase = Number(this.system.spec.bodies.value);
    let rofMax = bodiesBase + Number(this.system.stats.rof.value) || 1;
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
      npcstats: duplicate(this.system.stats),
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
      let weapon = this.items.find( item => item.id == weaponId);
      console.log("SPACECRAFT WEAPON :", weaponId, weapon );
      
      // Build available actor/skills
      let actorList = []
      if (game.user.isGM )  {
        for (let actor of game.actors) {
          actorList.push( { id:actor.id, name:actor.name, skills:actor.data.items.filter( item => item.type == 'skill' && item.system.type == 'vehicle') } );
        }
      } else {      
        let actorWeapon = game.user.character;
        actorList.push( { id:actorWeapon.id, name:actorWeapon.name, skills:actorWeapon.data.items.filter( item => item.type == 'skill' && item.system.type == 'vehicle') } );
      }

      // Skill prepare
      let skill = actorList[0].skills[0];
      skill.system.trainedValue = (skill.system.trained) ? 1 : -2
      skill.system.total = skill.system.trainedValue + skill.system.bonus;
      skill.system.isTrait = skill.system.traits.length > 0; 

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
        let rofMax = Number(weapon.system.statstotal.rof.value) || 1;
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
    let monnaie = this.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.data.nombre + 1;
      await this.updateOwnedItem( { _id: monnaie._id, 'data.nombre': newValeur } );
    }
  }
  /* -------------------------------------------- */
  async decrementeArgent( arme ) {
    let monnaie = this.items.find( item => item.type == 'monnaie' && item.name == arme.name);
    if (monnaie) {
      let newValeur = monnaie.data.nombre - 1;
      newValeur = (newValeur <= 0) ? 0 : newValeur;
      await this.updateOwnedItem( { _id: monnaie._id, 'data.nombre': newValeur } );
    }
  }
  
  /* -------------------------------------------- */
  async incrementeQuantite( objetId ) {
    let objetQ = this.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.system.quantite + 1;
      const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'data.quantite': newQ }]); // pdates one EmbeddedEntity
    }
  }
  
  /* -------------------------------------------- */
  async decrementeQuantite( objetId ) {
    let objetQ = this.items.find( item => item.id == objetId );
    if (objetQ) {
      let newQ = objetQ.system.quantite - 1;
      newQ = (newQ <= 0) ? 0 : newQ;
      const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'data.quantite': newQ }]); // pdates one EmbeddedEntity
    }
  }
    
}
