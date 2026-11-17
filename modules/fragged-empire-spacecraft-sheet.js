import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireSpacecraftSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "sheet", "spacecraft"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editItem: FraggedEmpireSpacecraftSheet.#onEditItem,
      deleteItem: FraggedEmpireSpacecraftSheet.#onDeleteItem,
      equipItem: FraggedEmpireSpacecraftSheet.#onEquipItem,
      rollSkill: FraggedEmpireSpacecraftSheet.#onRollSkill,
      rollSpacecraftWeapon: FraggedEmpireSpacecraftSheet.#onRollSpacecraftWeapon,
      lockUnlockSheet: FraggedEmpireSpacecraftSheet.#onLockUnlockSheet,
      createEffect: FraggedEmpireSpacecraftSheet.#onCreateEffect,
      editEffect: FraggedEmpireSpacecraftSheet.#onEditEffect,
      toggleEffect: FraggedEmpireSpacecraftSheet.#onToggleEffect,
      deleteEffect: FraggedEmpireSpacecraftSheet.#onDeleteEffect,
      stepUp: FraggedEmpireSpacecraftSheet.#onStepUp,
      stepDown: FraggedEmpireSpacecraftSheet.#onStepDown
    },
    dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
  };

  static PARTS = {
    body: {
      template: "systems/foundry-fe2/templates/spacecraft-sheet.html",
      scrollable: [".sheet-body"]
    }
  };

  tabGroups = { primary: "attribute" };

  _editScore = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    actor.prepareTraitsAttributes();

    context.name = actor.name;
    context.img = actor.img;
    context.system = actor.system;
    context.cssClass = this.isEditable ? "editable" : "locked";
    context.effectCategories = FraggedEmpireUtility.categorizeEffects(actor);
    context.limited = actor.limited;
    context.weapons = actor.getSpacecraftWeapons();
    context.tradeGoods = actor.getTradeGoods();
    context.cargo = actor.system.stats.cargo.max;
    context.cargoSpaceUsed = actor.getCargoSpaceUsed();
    context.defenseBase = actor.getDefenseBase();
    context.armourBase = actor.getBaseArmour();
    context.armourTotal = actor.getTotalArmour();
    context.traits = actor.getTraits();
    context.perks = actor.getPerks();
    context.optionsDMDP = FraggedEmpireUtility.createDirectOptionList(-3, +3);
    context.optionsBase = FraggedEmpireUtility.createDirectOptionList(0, 20);
    context.spacecraftAttrCurrentChoices = FraggedEmpireUtility.createDirectOptionList(-5, 6);
    context.spacecraftAttrValueChoices = FraggedEmpireUtility.createDirectOptionList(0, 6);
    context.owner = actor.isOwner;
    context.editScore = this._editScore ??= false;
    context.disableScore = !this._editScore;
    context.isGM = game.user.isGM;
    context.effectiveAttributes = actor._effectiveAttributes || {};
    context.computed = actor._computed || {};
    context.baseValues = actor._baseValues || {};

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: actor };
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.description ?? "", enrichOptions);
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.notes ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.gmnotes ?? "", enrichOptions);

    return context;
  }

  async _preRender(context, options) {
    await super._preRender(context, options);
    const sheetBody = this.element?.querySelector('.sheet-body');
    const scrollTop = sheetBody?.scrollTop ?? 0;
    if (scrollTop > 0) this._savedScrollTop = scrollTop;
  }

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
  }

  static #onEditItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    const item = this.document.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  static #onDeleteItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    FraggedEmpireUtility.confirmDelete(this.document, itemId);
  }

  static #onEquipItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.document.equipItem(itemId);
  }

  static #onRollSkill(event, target) {
    const skillId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!skillId) return;
    this.document.rollSkill(skillId);
  }

  static #onRollSpacecraftWeapon(event, target) {
    const weaponId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!weaponId) return;
    this.document.rollSpacecraftWeapon(weaponId);
  }

  static #onLockUnlockSheet(event, target) {
    this._editScore = !this._editScore;
    this.render();
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

  static #onStepUp(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "up", event);
  }

  static #onStepDown(event, target) {
    FraggedEmpireUtility.handleStepperAction(this, target, "down", event);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  async _onChangeForm(formConfig, event) {
    const form = this.form;
    if (!form) return;
    const formData = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(formData.object);
    await this.document.update(data);
  }
}
