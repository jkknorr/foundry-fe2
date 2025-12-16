/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";

/* -------------------------------------------- */
export class FraggedEmpireActorSheet extends foundry.appv1.sheets.ActorSheet {

  /** @override */
  static get defaultOptions() {

    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fragged-empire", "sheet", "actor"],
      template: "systems/foundry-fe2/templates/actor-sheet.html",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      editScore: false
    });
  }

  /* -------------------------------------------- */
  async getData() {
    // const objectData = FraggedEmpireUtility.data(this.object);
    const objectData = this.object
    
    this.actor.prepareTraitsAttributes();
    // let actorData = foundry.utils.duplicate(FraggedEmpireUtility.templateData(this.object));
    let actorData = foundry.utils.duplicate(this.object);
    let sortedSkills = this.actor.getSortedSkills();


    let formData = {
      title: this.title,
      id: objectData.id,
      type: objectData.type,
      img: objectData.img,
      name: objectData.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: actorData.system,
      effects: this.object.effects.map(e => foundry.utils.deepClone(e.data)),
      limited: this.object.limited,
      sortedSkills: sortedSkills,
      weapons: this.actor.getWeapons(),
      strongHits: this.actor.getStrongHits(),
      races: this.actor.getRaces(),
      outfits: this.actor.getOutfits(),
      utilities: this.actor.getUtilities(),
      equipments: this.actor.getEquipments(),
      languages: this.actor.getLanguages(),
      defenseBase: this.actor.getDefenseBase(),
      defenseTotal: this.actor.getDefenseTotal(),
      armourBase: this.actor.getBaseArmour(),
      armourTotal: this.actor.getTotalArmour(),
      tradeGoods : this.actor.getTradeGoods(),
      researches: this.actor.getResearch(),
      perks: this.actor.getPerks(),
      traits: this.actor.getTraits(),
      skillsTraits: this.actor.getSkillsTraits(),
      complications: this.actor.getComplications(),
      equipmentsSlotsBase: this.actor.getEquipmentSlotsBase(),
      equipmentsSlotsTotal: this.actor.getEquipmentSlotsTotal(),
      equipmentsSlotsUsed: this.actor.getEquipmentSlotsUsed(),
      subActors: this.actor.getSubActors(),
      optionsDMDP: FraggedEmpireUtility.createDirectOptionList(-3, +3),      
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),      
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM
    }
    this.formData = formData;
    
    console.log("formData : ", formData);
    return formData;
  }

  /* -------------------------------------------- */
  async getSkillTrait(itemId) {
    if ( itemId != "") { 
      let itemData = this.formData.skillsTraits.find( item => item._id == itemId);
      let trait = await Item.create(itemData, {temporary: true});   
      trait.data.origin = "embeddedItem";
      new FraggedEmpireItemSheet(trait).render(true);
      console.log("Trait", trait);  
    }
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.skill-trait-view').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      this.getSkillTrait( itemId);
    });    
    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      const item = this.actor.items.get( itemId );
      item.sheet.render(true);
    });
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      FraggedEmpireUtility.confirmDelete(this, li);
    });

    html.find('.subactor-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      let actor = game.actors.get( actorId );
      actor.sheet.render(true);
    });
    
    html.find('.subactor-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      this.actor.delSubActor(actorId);
    });
    
    html.find('.trait-link').click((event) => {
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.getOwnedItem(itemId);
      item.sheet.render(true);
    }); 
    
    html.find('.competence-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const competenceId = li.data("item-id");
      this.actor.rollSkill(competenceId);
    });
    html.find('.weapon-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const armeId = li.data("item-id");
      console.log(this)
      this.actor.rollWeapon(armeId);
    });
    html.find('.npc-fight a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const actorId = li.data("actor-id");
      let actor = game.actors.get( actorId );
      actor.rollNPCFight();
    });        
    html.find('.weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.getOwnedItem(li.data("item-id"));
      this.actor.rollDamage(weapon, 'damage');
    });
    html.find('.weapon-damage-critical').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.getOwnedItem(li.data("item-id"));
      this.actor.rollDamage(weapon, 'criticaldamage');
    });
    
    html.find('.lock-unlock-sheet').click((event) => {
      this.options.editScore = !this.options.editScore;
      this.render(true);
    });    
    html.find('.item-link a').click((event) => {
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.getOwnedItem(itemId);
      item.sheet.render(true);
    });    
    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.equipItem( li.data("item-id") );
      this.render(true);
    });
    html.find('.weapons-munitions-label').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      console.log("We are in a custom trap for munitions", ev)
      // this.actor.equipItem( li.data("item-id") );
      // this.render(true);
    });

  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }
  
  /* -------------------------------------------- */
  async _onDrop(event) {
    let data = event.dataTransfer.getData('text/plain');
    if (data) {
      let dataItem = JSON.parse( data);
      let npc = game.actors.get( dataItem.id);
      if ( npc ) {
        this.actor.addSubActor( dataItem.id);
        return;
      }
    }
    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    console.log("We are in _updateObject",event)
    if (event.type == "change" && event.target.parentElement.className == "stat-label weapon-munitions-label") {
      this.actor.updateWeaponMunitions(event.target.name, event.target.value)
    }
    // Update the Actor
    return this.object.update(formData);
  }
}
