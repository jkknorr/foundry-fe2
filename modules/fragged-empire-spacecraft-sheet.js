/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";

/* -------------------------------------------- */
export class FraggedEmpireSpacecraftSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {

    return mergeObject(super.defaultOptions, {
      classes: ["fragged-empire", "sheet", "spacecraft"],
      template: "systems/fvtt-fragged-empire/templates/spacecraft-sheet.html",
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
    let shipData = duplicate(FraggedEmpireUtility.templateData(this.object));

    let formData = {
      title: this.title,
      id: objectData.id,
      type: objectData.type,
      img: objectData.img,
      name: objectData.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      data: shipData,
      effects: this.object.effects.map(e => foundry.utils.deepClone(e.data)),
      limited: this.object.limited,
      weapons: this.actor.getSpacecraftWeapons(),
      tradeGoods : this.actor.getTradeGoods(),
      defenseBase: this.actor.getDefenseBase(),
      defenseVsOrdinance: this.actor.getVsOrdinance(),      
      armourBase: this.actor.getBaseArmour(),
      armourTotal: this.actor.getTotalArmour(),
      traits: this.actor.getTraits(),
      perks: this.actor.getPerks(),
      optionsDMDP: FraggedEmpireUtility.createDirectOptionList(-3, +3),      
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),      
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM
    }

    console.log("SHIP : ", formData, this.object);
    return formData;
  }

  /* -------------------------------------------- */
  async prepareTraits( subtype) {
    let traits = duplicate(await FraggedEmpireUtility.getTraitAttributeList( subtype ));
    return traits
  }

  /* -------------------------------------------- */
  async prepareTraitsAttributes( actorData ) {
    let traits = {}
    for( let key in actorData.attributes) {
      traits[key] = duplicate(await FraggedEmpireUtility.getTraitAttributeList( key ));
    }
    return traits
  }
  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
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
    html.find('.spacecraft-weapon-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const armeId = li.data("item-id");
      this.actor.rollSpacecraftWeapon(armeId);
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
