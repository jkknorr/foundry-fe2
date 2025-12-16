import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class FraggedEmpireItemSheet extends foundry.appv1.sheets.ItemSheet {

  /** @override */
	static get defaultOptions() {

    return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["foundry-fe2", "sheet", "item"],
			template: "systems/foundry-fe2/templates/item-sheet.html",
      dragDrop: [{dragSelector: null, dropSelector: null}],
			width: 620,
			height: 550
      //tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
		});
  }

  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // Add "Post to chat" button
    // We previously restricted this to GM and editable items only. If you ever find this comment because it broke something: eh, sorry!
    buttons.unshift(
      {
        class: "post",
        icon: "fas fa-comment",
        onclick: ev => {} 
      })
    return buttons
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    if ( this.item.type.includes('weapon')) {
      position.width = 640;
    }
    return position;
  }
  
  /* -------------------------------------------- */
  async getData() {
    const objectData = FraggedEmpireUtility.data(this.object);
    
    // let itemData = foundry.utils.deepClone(FraggedEmpireUtility.templateData(this.object));
    let itemData = foundry.utils.duplicate(this.object);
    let formData = {
      title: this.title,
      id: this.id,
      type: this.type,
      img: itemData.img,
      name: this.title,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: itemData.system, 
      combatSkills: FraggedEmpireUtility.getSkillsType('personalcombat'),
      keywords: FraggedEmpireUtility.split3Columns(itemData.system.keywords),
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      isGM: game.user.isGM      
    }
    
    this.options.editable = !(this.object.system.origin == "embeddedItem");
    console.log("ITEM DATA", formData, this);
    return formData;
  }

  /* -------------------------------------------- */
  async manageVariation( itemId) {
    let itemData = this.object.system.variations.find( item => item._id == itemId);
    let variation = await Item.create(itemData, {temporary: true});   
    variation.data.origin = "embeddedItem";
    new FraggedEmpireItemSheet(variation).render(true);
    console.log("Variation", variation);
  }

  /* -------------------------------------------- */
  async manageModification( itemId) {
    let itemData = this.object.system.modifications.find( item => item._id == itemId);
    let modification = await Item.create(itemData, {temporary: true});   
    modification.data.origin = "embeddedItem";
    new FraggedEmpireItemSheet(modification).render(true);
    console.log("Modification", modification);
  }

  /* -------------------------------------------- */
  async manageTrait( itemId)  {
    let itemData = this.object.system.traits.find( item => item._id == itemId);
    let trait = await Item.create(itemData, {temporary: true});   
    trait.data.origin = "embeddedItem";
    new FraggedEmpireItemSheet(trait).render(true);
    console.log("Trait", trait);
  }

  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift({
      class: "post",
      icon: "fas fa-comment",
      onclick: ev => this.postItem()
    });
    return buttons
  }
  
  /* -------------------------------------------- */
  postItem() {
    console.log(this.item);
    let chatData = foundry.utils.duplicate(FraggedEmpireUtility.data(this.item));
    console.log(chatData);
    if (this.actor) {
      chatData.actor = { id: this.actor.id };
    }
    // Don't post any image for the item (which would leave a large gap) if the default image is used
    if (chatData.img.includes("/blank.png")) {
      chatData.img = null;
    }
    console.log("ITEM CHAT", chatData);
    // JSON object for easy creation
    chatData.jsondata = JSON.stringify(
      {
        compendium: "postedItem",
        payload: chatData,
      });

    renderTemplate('systems/foundry-fe2/templates/post-item.html', chatData).then(html => {
      let chatOptions = FraggedEmpireUtility.chatDataSetup(html);
      ChatMessage.create(chatOptions)
    });
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
      const item = this.object.options.actor.getOwnedItem(li.data("item-id"));
      item.sheet.render(true);
    });

    // Update Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      let itemType = li.data("item-type");
      let array = duplicate(this.object.system[itemType]);
      let newArray = array.filter( item => item._id != itemId);
      console.log("Delete", array, newArray, itemId, itemType);
      if ( itemType == 'variations') {
        this.object.update( {"system.variations": newArray} );
      } else if (itemType == "modifications") {
        this.object.update( { "system.modifications": newArray} );
      } else {
        this.object.update( { "system.traits": newArray} );
      }
    });

    html.find('.trait-name').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      this.manageTrait( itemId);
    });
    html.find('.variation-name').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      this.manageVariation( itemId);
    });
    html.find('.modification-name').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      this.manageModification( itemId);
    });

  }

  /* -------------------------------------------- */
  async _onDrop(event) {

    if (this.object.type == "skill" ) {
      let data = event.dataTransfer.getData('text/plain');
      if (data) {
        let dataItem = JSON.parse( data);
        let item;
        if (dataItem.pack) {
          item = await fromUuid(dataItem.id);
        } else {
          item = game.items.get(dataItem.id )
        }
        console.log("FOUND TRAIT", item, dataItem.id.length);
        if ( item.data.type == "trait") {
          let traitArray = duplicate(this.object.data.data.traits);
          let newItem = duplicate(item.data);
          newItem._id = randomID( dataItem.id.length );
          traitArray.push( newItem );
          await this.object.update( { 'data.traits': traitArray} );     
        }
      }
    }

    if (this.object.type == "weapon" || this.object.type == "spacecraftweapon"|| this.object.type == "outfit") {
      let data = event.dataTransfer.getData('text/plain');
      if (data) {
        let dataItem = JSON.parse( data);
        let item;
        if (dataItem.pack) {
          item = await fromUuid(dataItem.uuid.split('.')[1]);
        } else {
          item = game.items.get(dataItem.uuid.split('.')[1]);
        }
        // console.log("Item dropped : ", event, dataItem, dataItem.uuid, data);
        console.log("FOUND ITEM", item, dataItem.uuid.length);
        if ( item.type.includes("variation") ) {
          let variationsArray = foundry.utils.duplicate(this.object.system.variations);
          let newItem = foundry.utils.duplicate(item);
          newItem._id = randomID( dataItem.uuid.length );
          variationsArray.push( newItem );
          await this.object.update( { 'system.variations': variationsArray} );            
        } else if ( item.type.includes("modification") ) {
          let modsArray = foundry.utils.duplicate(this.object.system.modifications);
          let newItem = foundry.utils.duplicate(item);
          newItem._id = randomID( dataItem.uuid.length );
          modsArray.push( newItem );
          await this.object.update( { 'system.modifications': modsArray} );
        }
      }
    }
  }
  
  /* -------------------------------------------- */
  get template() {
    let type = this.item.type;
    return `systems/foundry-fe2/templates/item-${type}-sheet.html`;
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    console.log("We are in _updateObject for item-sheet",event,formData)
    return this.object.update(formData);
  }
}
