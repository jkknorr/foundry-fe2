/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";

/* -------------------------------------------- */
export class FraggedEmpireNPCSheet extends foundry.appv1.sheets.ActorSheet {

  /** @override */
  static get defaultOptions() {

    return mergeObject(super.defaultOptions, {
      classes: ["fragged-empire", "sheet", "actor"],
      template: "systems/foundry-fe2/templates/npc-sheet.html",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      editScore: false
    });
  }

  /* -------------------------------------------- */
  async getData() {
    const objectData = FraggedEmpireUtility.data(this.object);
    
    this.actor.prepareTraitsAttributes();
    let actorData = duplicate(FraggedEmpireUtility.templateData(this.object));

    let formData = {
      title: this.title,
      id: objectData.id,
      type: objectData.type,
      img: objectData.img,
      name: objectData.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      data: actorData,
      effects: this.object.effects.map(e => foundry.utils.deepClone(e.data)),
      limited: this.object.limited,
      equipments: this.actor.getEquipments(),
      defenseBase: this.actor.getDefenseBase(),
      defenseTotal: this.actor.getDefenseTotal(),
      armourBase: this.actor.getBaseArmour(),
      armourTotal: this.actor.getTotalArmour(),
      weapons: this.actor.getWeapons(),
      traits: this.actor.getTraits(),
      optionsDMDP: FraggedEmpireUtility.createDirectOptionList(-3, +3),      
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),      
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM
    }
    this.formData = formData;

    console.log("NPC : ", formData, this.object);
    return formData;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

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
      this.actor.rollWeapon(armeId);
    });    
    html.find('.npc-fight-roll').click((event) => {
      this.actor.rollNPCFight();
    });        
    html.find('.npc-skill-roll').click((event) => {
      this.actor.rollGenericSkill();
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
  /** @override */
  _updateObject(event, formData) {
    // Update the Actor
    return this.object.update(formData);
  }
}
