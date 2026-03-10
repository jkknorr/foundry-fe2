/**
 * Character actor sheet using Application V2.
 * @extends {ActorSheetV2}
 */

import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/* -------------------------------------------- */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "sheet", "actor"],
    position: { width: 730, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    actions: {
      editItem: FraggedEmpireActorSheet.#onEditItem,
      deleteItem: FraggedEmpireActorSheet.#onDeleteItem,
      equipItem: FraggedEmpireActorSheet.#onEquipItem,
      rollSkill: FraggedEmpireActorSheet.#onRollSkill,
      rollWeapon: FraggedEmpireActorSheet.#onRollWeapon,
      editSubActor: FraggedEmpireActorSheet.#onEditSubActor,
      deleteSubActor: FraggedEmpireActorSheet.#onDeleteSubActor,
      rollNPCFight: FraggedEmpireActorSheet.#onRollNPCFight,
      lockUnlockSheet: FraggedEmpireActorSheet.#onLockUnlockSheet,
      viewSkillTrait: FraggedEmpireActorSheet.#onViewSkillTrait,
      viewTraitLink: FraggedEmpireActorSheet.#onViewTraitLink,
      viewItemLink: FraggedEmpireActorSheet.#onViewItemLink,
      rollWeaponDamage: FraggedEmpireActorSheet.#onRollWeaponDamage,
      rollWeaponDamageCritical: FraggedEmpireActorSheet.#onRollWeaponDamageCritical,
      rollAcquisition: FraggedEmpireActorSheet.#onRollAcquisition,
      createEffect: FraggedEmpireActorSheet.#onCreateEffect,
      editEffect: FraggedEmpireActorSheet.#onEditEffect,
      toggleEffect: FraggedEmpireActorSheet.#onToggleEffect,
      deleteEffect: FraggedEmpireActorSheet.#onDeleteEffect,
      stepUp: FraggedEmpireActorSheet.#onStepUp,
      stepDown: FraggedEmpireActorSheet.#onStepDown
    }
  };

  /* -------------------------------------------- */
  static PARTS = {
    body: {
      template: "systems/foundry-fe2/templates/actor-sheet.html",
      scrollable: [".sheet-body"]
    }
  };

  /* -------------------------------------------- */
  tabGroups = { primary: "attribute" };

  /* -------------------------------------------- */
  /** Instance-level edit score toggle */
  _editScore = false;

  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    actor.prepareTraitsAttributes();
    let actorData = foundry.utils.deepClone(actor);
    let sortedSkills = actor.getSortedSkills();

    Object.assign(context, {
      title: this.title,
      id: actor.id,
      type: actor.type,
      img: actor.img,
      name: actor.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: actorData.system,
      effectCategories: FraggedEmpireUtility.categorizeEffects(actor),
      limited: actor.limited,
      sortedSkills: sortedSkills,
      weapons: actor.getWeapons(),
      strongHits: actor.getStrongHits(),
      species: actor.getRaces()[0] || null,
      races: actor.getRaces(),
      outfits: actor.getOutfits(),
      activeOutfits: actor.getOutfits().filter(o => o.system.carryState === "active"),
      utilities: actor.getUtilities(),
      inHandWeapons: actor.getWeapons().filter(w => w.system.carryState === "inHand"),
      equipments: actor.getEquipments(),
      languages: actor.getLanguages(),
      defenseBase: actor.getDefenseBase(),
      defenseTotal: actor.getDefenseTotal(),
      armourBase: actor.getBaseArmour(),
      armourTotal: actor.getTotalArmour(),
      tradeGoods: actor.getTradeGoods(),
      researches: actor.getResearch(),
      perks: actor.getPerks(),
      traits: actor.getTraits(),
      skillsTraits: actor.getSkillsTraits(),
      complications: actor.getComplications(),
      equipmentsSlotsBase: actor.getEquipmentSlotsBase(),
      equipmentsSlotsMax: actor.getEquipmentSlotsTotal(),
      equipmentsSlotsUsed: actor.getEquipmentSlotsUsed(),
      equipmentsSlotsCurrent: actor.getEquipmentSlotsTotal() - actor.getEquipmentSlotsUsed(),
      handsMax: actor._computed?.handsMax ?? 2,
      handsUsed: actor._computed?.handsUsed ?? 0,
      weaponsMax: actor._computed?.weaponsMax ?? 3,
      weaponsCount: actor._computed?.weaponsCount ?? 0,
      utilitiesCount: actor.getUtilities().length,
      subActors: actor.getSubActors(),
      optionsDMDP: FraggedEmpireUtility.createDirectOptionList(-3, +3),
      optionsBase: FraggedEmpireUtility.createDirectOptionList(0, 20),
      owner: actor.isOwner,
      editScore: this._editScore,
      disableScore: !this._editScore,
      isGM: game.user.isGM,
      effectiveAttributes: actor._effectiveAttributes || {},
      computed: actor._computed || {},
      baseValues: actor._baseValues || {}
    });

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: actor };
    context.enrichedBioDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.biosystem?.description ?? "", enrichOptions);
    context.enrichedBioNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.biosystem?.notes ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.gmnotes ?? "", enrichOptions);

    this._formData = context;
    return context;
  }

  /* -------------------------------------------- */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const sheetBody = this.element?.querySelector('.sheet-body');
    const scrollTop = sheetBody?.scrollTop ?? 0;
    if (scrollTop > 0) this._savedScrollTop = scrollTop;
  }

  /* -------------------------------------------- */
  _onRender(context, options) {
    super._onRender(context, options);

    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (!tab) continue;
      const tabElement = this.element?.querySelector(`[data-tab="${tab}"][data-group="${group}"]`);
      if (tabElement) this.changeTab(tab, group, {force: true});
    }

    // Restore scroll position after layout is complete
    requestAnimationFrame(() => {
      const sheetBody = this.element?.querySelector('.sheet-body');
      if (sheetBody && this._savedScrollTop) {
        sheetBody.scrollTop = this._savedScrollTop;
      }
    });

    if (!this.isEditable) return;
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static #onEditItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onDeleteItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    FraggedEmpireUtility.confirmDelete(this.document, itemId);
  }

  /* -------------------------------------------- */
  static #onEquipItem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.document.equipItem(itemId);
  }

  /* -------------------------------------------- */
  static #onRollSkill(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const skillId = itemRow.dataset.itemId;
    this.document.rollSkill(skillId);
  }

  /* -------------------------------------------- */
  static #onRollWeapon(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const weaponId = itemRow.dataset.itemId;
    this.document.rollWeapon(weaponId);
  }

  /* -------------------------------------------- */
  static #onEditSubActor(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    const actor = game.actors.get(actorId);
    actor?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onDeleteSubActor(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    this.document.delSubActor(actorId);
  }

  /* -------------------------------------------- */
  static #onRollNPCFight(event, target) {
    const itemRow = target.closest("[data-actor-id]");
    if (!itemRow) return;
    const actorId = itemRow.dataset.actorId;
    const actor = game.actors.get(actorId);
    actor?.rollNPCFight();
  }

  /* -------------------------------------------- */
  static #onLockUnlockSheet(event, target) {
    this._editScore = !this._editScore;
    this.render();
  }

  /* -------------------------------------------- */
  static #onViewSkillTrait(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    if (itemId && itemId !== "" && this._formData) {
      const itemData = this._formData.skillsTraits.find(item => item._id === itemId);
      if (itemData) {
        Item.create(itemData, { temporary: true }).then(trait => {
          trait.sheet.render(true);
        });
      }
    }
  }

  /* -------------------------------------------- */
  static #onViewTraitLink(event, target) {
    const itemId = target.dataset.itemId ?? target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onViewItemLink(event, target) {
    const itemId = target.dataset.itemId ?? target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const item = this.document.items.get(itemId);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  static #onRollWeaponDamage(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const weapon = this.document.items.get(itemId);
    if (weapon) this.document.rollDamage(weapon, "damage");
  }

  /* -------------------------------------------- */
  static #onRollWeaponDamageCritical(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const weapon = this.document.items.get(itemId);
    if (weapon) this.document.rollDamage(weapon, "criticaldamage");
  }

  /* -------------------------------------------- */
  static #onRollAcquisition(event, target) {
    this.document.rollAcquisition();
  }

  /* -------------------------------------------- */
  /*  Effect Action Handlers                      */
  /* -------------------------------------------- */

  static #onCreateEffect(event, target) {
    const effectData = {
      name: this.document.name,
      img: "icons/svg/aura.svg",
      origin: this.document.uuid,
      transfer: false,
      disabled: false
    };
    this.document.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  static #onEditEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const effect = this.document.effects.get(effectId);
    effect?.sheet.render(true);
  }

  static #onToggleEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const effect = this.document.effects.get(effectId);
    if (effect) effect.update({ disabled: !effect.disabled });
  }

  static async #onDeleteEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("FE2.Dialog.ConfirmRemoveTitle") },
      content: "<p>" + game.i18n.localize("FE2.Dialog.ConfirmRemoveContent") + "</p>"
    });
    if (confirmed) {
      this.document.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
    }
  }

  /* -------------------------------------------- */
  static #onStepUp(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "up", event);
  }

  static #onStepDown(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "down", event);
  }

  /* -------------------------------------------- */
  /*  Private Helpers                             */
  /* -------------------------------------------- */

  /**
   * Check if adding an item would exceed character limits.
   * Returns true (blocked) and shows a notification if a limit is exceeded.
   * @param {Item} item - The item being dropped
   * @returns {boolean} True if the item should be blocked
   */
  _checkItemLimits(item) {
    const actor = this.document;
    const computed = actor._computed || {};

    // Weapon limit
    if (item.type === "weapon") {
      const weaponsMax = computed.weaponsMax ?? 3;
      const weaponsCount = computed.weaponsCount ?? actor.items.filter(i => i.type === "weapon").length;
      if (weaponsCount >= weaponsMax) {
        ui.notifications.warn(game.i18n.format("FE2.Limits.WeaponsMax", { max: weaponsMax }));
        return true;
      }
    }

    // Equipment slots limit (all equippable items)
    const equippableTypes = new Set(["weapon", "outfit", "utility", "equipment"]);
    if (equippableTypes.has(item.type)) {
      const slotsUsed = actor.getEquipmentSlotsUsed();
      const slotsMax = actor.getEquipmentSlotsTotal();
      const itemSlots = Number(item.system?.slots) || 2;
      if (slotsUsed + itemSlots > slotsMax) {
        ui.notifications.warn(game.i18n.format("FE2.Limits.EquipmentSlots", { used: slotsUsed, max: slotsMax }));
        return true;
      }
    }

    // Utilities limit
    if (item.type === "utility") {
      const utilitiesMax = computed.utilitiesMax ?? 1;
      const utilitiesCount = actor.items.filter(i => i.type === "utility").length;
      if (utilitiesCount >= utilitiesMax) {
        ui.notifications.warn(game.i18n.format("FE2.Limits.Utilities", { max: utilitiesMax }));
        return true;
      }
    }

    // Resources limit
    if (equippableTypes.has(item.type)) {
      const resourcesAllotted = computed.resourcesAllotted ?? actor.getResourcesAllotted();
      const resourcesMax = actor.system.resources?.total || 0;
      let itemCost = 0;
      if (item.type === "equipment") {
        itemCost = Number(item.system?.cost) || 0;
      } else if (item.type === "utility") {
        itemCost = Number(item.system?.statstotal?.cost?.value || item.system?.stats?.cost?.value) || 0;
      } else {
        itemCost = Number(item.system?.statstotal?.resources?.value || item.system?.stats?.resources?.value) || 0;
      }
      if (itemCost > 0 && resourcesAllotted + itemCost > resourcesMax) {
        ui.notifications.warn(game.i18n.format("FE2.Limits.Resources", { used: resourcesAllotted, max: resourcesMax }));
        return true;
      }
    }

    return false;
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  async _onDrop(event) {
    let data;
    try {
      data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    } catch (e) {
      return;
    }

    if (data && data.type === "Actor" && data.uuid) {
      const droppedActor = await fromUuid(data.uuid);
      if (droppedActor) {
        if (droppedActor.type !== "npc" || droppedActor.system.npctype !== "companion") {
          ui.notifications.warn(game.i18n.localize("FE2.Notifications.CompanionOnly"));
          return;
        }
        // Companions count toward the weapon limit
        const computed = this.document._computed || {};
        const weaponsMax = computed.weaponsMax ?? 3;
        const weaponsCount = computed.weaponsCount ?? 0;
        if (weaponsCount >= weaponsMax) {
          ui.notifications.warn(game.i18n.format("FE2.Limits.WeaponsMax", { max: weaponsMax }));
          return;
        }
        this.document.addSubActor(droppedActor.id);
        return;
      }
    }
    // Single-species enforcement: remove existing race items before adding new one
    if (data?.type === "Item") {
      const item = await fromUuid(data.uuid);
      console.log(item)
      if (item?.type === "race") {
        const existingRaces = this.document.getRaces();
        // Clean up sub-items from existing races before removing them
        for (const race of existingRaces) {
          await FraggedEmpireUtility.cleanupRaceSubitems(this.document, race.id);
        }
        if (existingRaces.length > 0) {
          await this.document.deleteEmbeddedDocuments("Item",
            existingRaces.map(r => r.id));
        }
        const itemData = item.toObject();
        const created = await this.document.createEmbeddedDocuments("Item", [itemData]);
        // Transfer sub-items from new race to actor
        if (created.length) {
          await FraggedEmpireUtility.transferRaceSubitems(this.document, created[0].system, created[0].id);
        }
        return;
      }
      // Block equippable items that exceed character limits
      if (this.document.type === "character" && item) {
        const blocked = this._checkItemLimits(item);
        if (blocked) return;
      }
    }
    super._onDrop(event);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  async _onChangeForm(formConfig, event) {
    const target = event?.target;
    if (!target?.name) return;
    // Build update from the single changed field only — collecting the entire form
    // via FormDataExtended omits disabled fields, which can blank out locked inputs
    // (e.g. system.level.value when sheet is locked).
    let value = target.value;
    if (target.dataset.dtype === "Number") value = Number(value) || 0;
    const data = foundry.utils.expandObject({ [target.name]: value });
    await this.document.update(data);
  }
}
