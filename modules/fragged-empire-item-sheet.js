import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { getKeywordId, KEYWORD_CATEGORIES, VAR_MOD_PARENT_MAP } from "./keyword-config.js";

/**
 * Item sheet using Application V2.
 * @extends {ItemSheetV2}
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class FraggedEmpireItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    classes: ["foundry-fe2", "sheet", "item"],
    position: { width: 620, height: 550 },
    window: {
      resizable: true,
      controls: [
        {
          icon: "fas fa-comment",
          label: "FE2.Sheet.Common.PostToChat",
          action: "postItem"
        }
      ]
    },
    form: { submitOnChange: true },
    actions: {
      postItem: FraggedEmpireItemSheet.#onPostItem,
      viewVariation: FraggedEmpireItemSheet.#onViewVariation,
      viewModification: FraggedEmpireItemSheet.#onViewModification,
      viewTrait: FraggedEmpireItemSheet.#onViewTrait,
      deleteEmbedded: FraggedEmpireItemSheet.#onDeleteEmbedded,
      viewRaceSubitem: FraggedEmpireItemSheet.#onViewRaceSubitem,
      createEffect: FraggedEmpireItemSheet.#onCreateEffect,
      editEffect: FraggedEmpireItemSheet.#onEditEffect,
      toggleEffect: FraggedEmpireItemSheet.#onToggleEffect,
      deleteEffect: FraggedEmpireItemSheet.#onDeleteEffect,
      removeKeyword: FraggedEmpireItemSheet.#onRemoveKeyword,
      viewStrongHit: FraggedEmpireItemSheet.#onViewStrongHit,
      stepUp: FraggedEmpireItemSheet.#onStepUp,
      stepDown: FraggedEmpireItemSheet.#onStepDown
    },
  };

  /* -------------------------------------------- */
  static PARTS = {
    body: {
      template: "systems/foundry-fe2/templates/item-skill-sheet.html",
      scrollable: [".sheet-body"]
    }
  };

  /* -------------------------------------------- */
  /**
   * Dynamically configure render parts to use the correct template for this item type.
   * @param {HandlebarsRenderOptions} options
   * @returns {Record<string, HandlebarsTemplatePart>}
   * @protected
   */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (this.document.type) {
      parts.body.template = `systems/foundry-fe2/templates/item-${this.document.type}-sheet.html`;
    }
    return parts;
  }

  /* -------------------------------------------- */
  tabGroups = { primary: "details" };

  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const itemData = foundry.utils.deepClone(item);

    context.title = this.title;
    context.id = item.id;
    context.type = item.type;
    context.img = item.img;
    context.name = item.name;
    context.editable = this.isEditable;
    context.cssClass = this.isEditable ? "editable" : "locked";
    context.system = itemData.system;
    context.combatSkills = FraggedEmpireUtility.getSkillsType("personalcombat");
    context.optionsBase = FraggedEmpireUtility.createDirectOptionList(0, 20);

    // Keyword enrichment for item types that support keywords
    const KEYWORD_ITEM_TYPES = new Set(["weapon", "outfit", "utility", "equipment", "spacecraftweapon", "variation", "modification", "variationoutfit", "modificationoutfit", "spacecraftweaponvariation", "spacecraftweaponmodification","trait"]);
    if (KEYWORD_ITEM_TYPES.has(item.type)) {
      const activeKeywords = Array.isArray(itemData.system.keywords) ? itemData.system.keywords : [];
      context.keywordsEnriched = activeKeywords.map((kw, idx) => {
        const kwId = getKeywordId(kw);

        // Build enriched display data directly from embedded keyword item
        const enriched = {
          _id: kw._id || null,
          index: idx,
          id: kwId,
          label: kw.name ?? kwId,
          description: kw.system?.description ?? "",
          params: []
        };

        // Show params that are enabled via useParamX/useParamY flags
        const params = kw.system?.params ?? {};
        if (kw.system?.useParamX) {
          enriched.params.push({ key: "X", label: "X", value: params.X ?? "" });
        }
        if (kw.system?.useParamY) {
          enriched.params.push({ key: "Y", label: "Y", value: params.Y ?? "" });
        }

        // Source attribution
        if (kw.sourceId) {
          enriched.sourceId = kw.sourceId;
          const source = (itemData.system.variations ?? []).find(v => v._id === kw.sourceId)
            || (itemData.system.modifications ?? []).find(m => m._id === kw.sourceId);
          enriched.sourceName = source ? game.i18n.format("FE2.Items.Common.PropagatedFrom", { name: source.name }) : "";
        }

        return enriched;
      });
    }
    context.limited = item.limited;
    context.owner = item.isOwner;
    context.isGM = game.user.isGM;
    context.effects = item.effects.map(e => {
      const data = {
        _id: e.id,
        name: e.name,
        img: e.img,
        tint: e.tint ?? "#ffffff",
        disabled: e.disabled,
        active: !e.disabled,
        effect: e
      };
      const sourceId = e.flags?.["foundry-fe2"]?.sourceId;
      if (sourceId) {
        data.sourceId = sourceId;
        const source = (itemData.system.variations ?? []).find(v => v._id === sourceId)
          || (itemData.system.modifications ?? []).find(m => m._id === sourceId);
        data.sourceName = source ? game.i18n.format("FE2.Items.Common.PropagatedFrom", { name: source.name }) : "";
      }
      return data;
    });

    // Type-specific choice objects for selectOptions
    switch (item.type) {
      case "weapon":
        context.weaponTypeChoices = FraggedEmpireUtility.buildWeaponTypeChoices();
        context.defaultSkillChoices = this.#buildDefaultSkillChoices(context.combatSkills);
        break;
      case "modification":
        context.modificationTypeChoices = FraggedEmpireUtility.buildModificationTypeChoices();
        context.weaponTypeWithAllChoices = FraggedEmpireUtility.buildWeaponTypeWithAllChoices();
        break;
      case "variation":
        context.variationTypeChoices = FraggedEmpireUtility.buildVariationTypeChoices();
        context.weaponTypeWithAllChoices = FraggedEmpireUtility.buildWeaponTypeWithAllChoices();
        break;
      case "trait":
        context.traitTypeChoices = FraggedEmpireUtility.buildTraitTypeChoices();
        break;
      case "tradegood":
        context.tradeGoodTypeChoices = FraggedEmpireUtility.buildTradeGoodTypeChoices();
        break;
      case "perk":
        context.perkTypeChoices = FraggedEmpireUtility.buildPerkTypeChoices();
        break;
      case "spacecraftperk":
        context.spacecraftPerkTypeChoices = FraggedEmpireUtility.buildSpacecraftPerkTypeChoices();
        break;
      case "spacecrafttrait":
        context.spacecraftTraitTypeChoices = FraggedEmpireUtility.buildSpacecraftTraitTypeChoices();
        break;
      case "complication":
        context.complicationTypeChoices = FraggedEmpireUtility.buildComplicationTypeChoices();
        break;
      case "research":
        context.researchGainChoices = FraggedEmpireUtility.buildResearchGainChoices();
        break;
      case "spacecraftweapon":
        context.weaponTypeChoices = FraggedEmpireUtility.buildWeaponTypeChoices();
        context.defaultSkillChoices = this.#buildDefaultSkillChoices(context.combatSkills);
        break;
      case "outfit":
        break;
      case "keyword":
        context.categoryChoices = {
          narrative: game.i18n.localize("FE2.Keywords.Categories.Narrative"),
          itemProperty: game.i18n.localize("FE2.Keywords.Categories.ItemProperty"),
          rollModifier: game.i18n.localize("FE2.Keywords.Categories.RollModifier"),
          munition: game.i18n.localize("FE2.Keywords.Categories.Munition"),
          complex: game.i18n.localize("FE2.Keywords.Categories.Complex")
        };
        context.itemTypeOptions = [
          { value: "weapon", label: game.i18n.localize("FE2.Items.Types.Weapon"), checked: itemData.system.itemTypes?.includes("weapon") },
          { value: "outfit", label: game.i18n.localize("FE2.Items.Types.Outfit"), checked: itemData.system.itemTypes?.includes("outfit") },
          { value: "utility", label: game.i18n.localize("FE2.Items.Types.Utility"), checked: itemData.system.itemTypes?.includes("utility") },
          { value: "equipment", label: game.i18n.localize("FE2.Items.Types.Equipment"), checked: itemData.system.itemTypes?.includes("equipment") },
          { value: "spacecraftweapon", label: game.i18n.localize("FE2.Items.Types.SpacecraftWeapon"), checked: itemData.system.itemTypes?.includes("spacecraftweapon") },
          { value: "trait", label: game.i18n.localize("FE2.Items.Types.Trait"), checked: itemData.system.itemTypes?.includes("trait") }
        ];
        context.statModEntries = [
          { key: "slots", label: game.i18n.localize("FE2.Item.Slots"), mode: itemData.system.statModifiers?.slots?.mode ?? "", value: itemData.system.statModifiers?.slots?.value ?? "" },
          { key: "hands", label: game.i18n.localize("FE2.Item.Hands"), mode: itemData.system.statModifiers?.hands?.mode ?? "", value: itemData.system.statModifiers?.hands?.value ?? "" },
          { key: "draw", label: game.i18n.localize("FE2.Item.Draw"), mode: itemData.system.statModifiers?.draw?.mode ?? "", value: itemData.system.statModifiers?.draw?.value ?? "" },
          { key: "reload", label: game.i18n.localize("FE2.Item.Reload"), mode: itemData.system.statModifiers?.reload?.mode ?? "", value: itemData.system.statModifiers?.reload?.value ?? "" }
        ];
        break;
    }

    // Enrich HTML for prose-mirror collapsed display
    const enrichOptions = { async: true, relativeTo: item };
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", enrichOptions);
    context.enrichedRequirements = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.requirements ?? "", enrichOptions);
    context.enrichedBenefits = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.benefits ?? "", enrichOptions);
    context.enrichedDisadvantages = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.disadvantages ?? "", enrichOptions);
    context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.gmnotes ?? "", enrichOptions);

    return context;
  }

  /* -------------------------------------------- */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */
  /**
   * Save scroll position before re-render so we can restore it after.
   * The V2 scrollable mechanism sometimes loses position due to tab activation
   * and layout recalculation in _onRender.
   */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const sheetBody = this.element?.querySelector('.sheet-body');
    const scrollTop = sheetBody?.scrollTop ?? 0;
    if (scrollTop > 0) this._savedScrollTop = scrollTop;
  }

  /* -------------------------------------------- */
  _onRender(context, options) {
    super._onRender(context, options);

    // V2 DragDrop: manually create and bind (V2 has no built-in dragDrop infrastructure)
    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: null,
      permissions: {
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);

    // Activate tabs after render (V2 does not auto-activate from tabGroups)
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      if (!tab) continue;
      this.changeTab(tab, group, {force: true});
    }

    // Restore scroll position after layout is complete
    requestAnimationFrame(() => {
      const sheetBody = this.element?.querySelector('.sheet-body');
      if (sheetBody && this._savedScrollTop) {
        sheetBody.scrollTop = this._savedScrollTop;
      }
    });

    // Keyword item sheet: itemTypes checkbox listeners
    for (const cb of this.element?.querySelectorAll('.fe2-keyword-itemtype-cb') ?? []) {
      cb.addEventListener('change', () => {
        const checked = Array.from(this.element.querySelectorAll('.fe2-keyword-itemtype-cb'))
          .filter(c => c.checked)
          .map(c => c.dataset.type);
        this.document.update({ "system.itemTypes": checked });
      });
    }

    // Keyword sheet: sanitize keywordId input (lowercase alphanumeric only)
    const kwIdInput = this.element?.querySelector('input[name="system.keywordId"]');
    if (kwIdInput) {
      kwIdInput.addEventListener("input", () => {
        kwIdInput.value = kwIdInput.value.toLowerCase().replace(/[^a-z0-9]/g, "");
      });
    }

    // Keyword param input listeners
    for (const input of this.element?.querySelectorAll('.fe2-keyword-param') ?? []) {
      input.addEventListener('change', (event) => {
        event.stopPropagation();
        this.#onUpdateKeywordParam(event);
      });
    }
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static #onPostItem(event, target) {
    this.#postItemToChat();
  }

  /* -------------------------------------------- */
  static #onViewVariation(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("variations", itemId);
  }

  /* -------------------------------------------- */
  static #onViewModification(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("modifications", itemId);
  }

  /* -------------------------------------------- */
  static #onViewTrait(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    this.#viewEmbeddedItem("traits", itemId);
  }

  /* -------------------------------------------- */
  static #onViewStrongHit(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const entry = this.document.system.stronghits?.find(sh => sh._id === itemId);
    if (!entry) return;
    Item.create({
      type: "stronghit",
      name: entry.name,
      img: entry.img,
      system: entry.system ?? {}
    }, { temporary: true }).then(tempItem => tempItem.sheet.render(true));
  }

  /* -------------------------------------------- */
  static #onViewRaceSubitem(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const arrayName = itemRow.dataset.itemType;
    this.#viewEmbeddedItem(arrayName, itemId);
  }

  /* -------------------------------------------- */
  static async #onDeleteEmbedded(event, target) {
    const itemRow = target.closest("[data-item-id]");
    if (!itemRow) return;
    const itemId = itemRow.dataset.itemId;
    const itemType = itemRow.dataset.itemType;
    const array = foundry.utils.deepClone(this.document.system[itemType]);
    const newArray = array.filter(item => item._id !== itemId);

    // For variations/modifications: also clean up propagated data
    if (itemType === "variations" || itemType === "modifications") {
      const removal = FraggedEmpireUtility.buildRemovalData(this.document, itemId);
      await this.document.update({
        [`system.${itemType}`]: newArray,
        "system.keywords": removal.keywords,
        "system.stronghits": removal.stronghits
      });
      // Recompute statstotal
      const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(this.document);
      if (Object.keys(statUpdates).length) await this.document.update(statUpdates);
      // Clean up propagated ActiveEffects
      await FraggedEmpireUtility.cleanupPropagatedEffects(this.document, itemId);
    } else {
      await this.document.update({ [`system.${itemType}`]: newArray });
    }
  }

  /* -------------------------------------------- */
  /*  Effect Action Handlers                      */
  /* -------------------------------------------- */

  static #onCreateEffect(event, target) {
    const effectData = {
      name: this.document.name,
      img: "icons/svg/aura.svg",
      origin: this.document.uuid,
      transfer: true,
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
  /*  Keyword Action Handlers                     */
  /* -------------------------------------------- */

  static async #onRemoveKeyword(event, target) {
    const tagEl = target.closest('.fe2-keyword-tag');
    if (!tagEl) return;
    const index = parseInt(tagEl.dataset.keywordIndex);
    const keywords = foundry.utils.deepClone(this.document.system.keywords || []);
    const removed = keywords[index];
    keywords.splice(index, 1);
    await this.document.update({ "system.keywords": keywords });
    // Clean up propagated AEs if the removed keyword was new-format with an _id
    if (removed?._id) {
      await FraggedEmpireUtility.cleanupPropagatedEffects(this.document, removed._id);
    }
  }

  async #onUpdateKeywordParam(event) {
    const input = event.currentTarget;
    const tagEl = input.closest('.fe2-keyword-tag');
    if (!tagEl) return;
    const index = parseInt(tagEl.dataset.keywordIndex);
    const paramKey = input.dataset.paramKey;
    const keywords = foundry.utils.deepClone(this.document.system.keywords || []);
    const kw = keywords[index];
    if (!kw?.system?.params) return;
    kw.system.params[paramKey] = input.value;
    await this.document.update({ "system.keywords": keywords });
    // Update propagated AEs that reference this parameter
    if (kw._id) {
      await FraggedEmpireUtility.updatePropagatedEffectParams(this.document, kw._id, kw.system.params);
    }
  }

  /* -------------------------------------------- */
  /*  Private Helpers                             */
  /* -------------------------------------------- */

  /**
   * Post the item details to chat.
   */
  #postItemToChat() {
    const item = this.document;
    let chatData = foundry.utils.deepClone(item.toObject());
    if (item.actor) {
      chatData.actor = { id: item.actor.id };
    }
    if (chatData.img?.includes("/blank.png")) {
      chatData.img = null;
    }
    chatData.jsondata = JSON.stringify({
      compendium: "postedItem",
      payload: chatData
    });

    foundry.applications.handlebars.renderTemplate("systems/foundry-fe2/templates/post-item.html", chatData).then(html => {
      let chatOptions = FraggedEmpireUtility.chatDataSetup(html);
      chatOptions.flags = { "foundry-fe2": { itemData: chatData } };
      ChatMessage.create(chatOptions);
    });
  }

  /* -------------------------------------------- */
  /**
   * View an embedded sub-item (variation, modification, or trait) stored in system arrays.
   * @param {string} arrayName  The system property name ("variations", "modifications", or "traits")
   * @param {string} itemId     The _id of the embedded item
   */
  async #viewEmbeddedItem(arrayName, itemId) {
    const itemData = this.document.system[arrayName]?.find(item => item._id === itemId);
    if (!itemData) return;
    const tempItem = new Item(itemData);
    tempItem.sheet.render(true);
  }

  /* -------------------------------------------- */
  /**
   * Build a choices object from combat skills for default skill select.
   * @param {Array} combatSkills
   * @returns {Object}
   */
  #buildDefaultSkillChoices(combatSkills) {
    const choices = {};
    for (const skill of combatSkills) {
      choices[skill.name] = skill.name;
    }
    return choices;
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /**
   * Skip schema validation in _prepareSubmitData — our item data model
   * handles validation at the document level. This lets the base V2 flow
   * handle prose-mirror and all form elements correctly.
   * Also merges statstotal computation into the same update to avoid
   * double-render (which would break scroll position preservation).
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = this._processFormData(event, form, formData);
    if (updateData) {
      foundry.utils.mergeObject(submitData, updateData, {performDeletions: true});
      foundry.utils.mergeObject(submitData, updateData, {performDeletions: false});
    }
    // Merge statstotal computation into the same update (single render cycle).
    // submitData is nested (from expandObject), but computeItemStatsTotals expects
    // flat dot-notation keys — flatten before passing.
    if (this.document.system.stats) {
      const flatData = foundry.utils.flattenObject(submitData);
      const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(this.document, flatData);
      Object.assign(submitData, statUpdates);
    }
    return submitData;
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /** Mapping from dropped sub-item type to the race system array name */
  static RACE_SUBITEM_ARRAYS = {
    complication: "complications",
    perk: "perks",
    language: "languages",
    stronghit: "stronghits"
  };

  /** Type-correct variation/modification mapping per parent item type */
  static VARIATION_TYPES = {
    weapon: { variation: "variation", modification: "modification" },
    outfit: { variation: "variationoutfit", modification: "modificationoutfit" },
    spacecraftweapon: { variation: "spacecraftweaponvariation", modification: "spacecraftweaponmodification" }
  };

  async _onDrop(event) {
    const item = this.document;
    let data;
    try {
      data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    } catch (e) {
      console.error("FE2 | _onDrop: failed to parse drag event data", e);
      return;
    }
    if (!data?.uuid) return;
    let droppedItem;
    try {
      droppedItem = await fromUuid(data.uuid);
    } catch (e) {
      console.error("FE2 | _onDrop: failed to resolve UUID", data.uuid, e);
      return;
    }
    if (!droppedItem) return;

    // Skill: accept trait drops
    if (item.type === "skill") {
      if (droppedItem.type === "trait") {
        const traitArray = foundry.utils.deepClone(item.system.traits);
        const newItem = foundry.utils.deepClone(droppedItem.toObject());
        newItem._id = foundry.utils.randomID();
        traitArray.push(newItem);
        await item.update({ "system.traits": traitArray });
      }
      return;
    }

    // Race: accept complications, perks, languages, strong hits as sub-items
    if (item.type === "race") {
      const arrayName = FraggedEmpireItemSheet.RACE_SUBITEM_ARRAYS[droppedItem.type];
      if (!arrayName) {
        ui.notifications.warn(game.i18n.localize("FE2.Notifications.RaceSubitemNotAllowed"));
        return;
      }
      const subArray = foundry.utils.deepClone(item.system[arrayName] ?? []);
      const newItem = foundry.utils.deepClone(droppedItem.toObject());
      newItem._id = foundry.utils.randomID();
      subArray.push(newItem);
      await item.update({ [`system.${arrayName}`]: subArray });
      return;
    }

    // Strong hit: embed into any item type that has stronghits array
    const STRONGHIT_ITEM_TYPES = new Set(["weapon", "outfit", "spacecraftweapon", "variation", "modification", "variationoutfit", "modificationoutfit", "spacecraftweaponvariation", "spacecraftweaponmodification"]);
    if (droppedItem.type === "stronghit" && STRONGHIT_ITEM_TYPES.has(item.type)) {
      const stronghitsArray = foundry.utils.deepClone(item.system.stronghits ?? []);
      stronghitsArray.push({
        _id: foundry.utils.randomID(),
        name: droppedItem.name,
        img: droppedItem.img,
        system: {
          requirements: droppedItem.system.requirements ?? "",
          description: droppedItem.system.description ?? ""
        }
      });
      await item.update({ "system.stronghits": stronghitsArray });
      return;
    }

    // Keyword item: embed onto applicable parent items
    const KEYWORD_PARENT_TYPES = new Set(["weapon", "outfit", "utility", "equipment", "spacecraftweapon", "variation", "modification", "variationoutfit", "modificationoutfit", "spacecraftweaponvariation", "spacecraftweaponmodification","trait"]);
    if (droppedItem.type === "keyword" && KEYWORD_PARENT_TYPES.has(item.type)) {
      // Validate applicability: check keyword's itemTypes against resolved parent type
      const resolvedType = VAR_MOD_PARENT_MAP[item.type] ?? item.type;
      const kwItemTypes = droppedItem.system.itemTypes ?? [];
      console.log(kwItemTypes.length, kwItemTypes)
      if (kwItemTypes.length > 0 && !kwItemTypes.includes(resolvedType)) {
        ui.notifications.warn(`Keyword "${droppedItem.name}" is not applicable to ${resolvedType} items.`);
        return;
      }
      // Clone keyword into system.keywords[]
      const keywordsArray = foundry.utils.deepClone(item.system.keywords ?? []);
      const clonedKw = foundry.utils.deepClone(droppedItem.toObject());
      clonedKw._id = foundry.utils.randomID();
      keywordsArray.push(clonedKw);
      await item.update({ "system.keywords": keywordsArray });
      // Propagate AEs from keyword to parent (pass params for {X}/{Y} resolution)
      await FraggedEmpireUtility.propagateActiveEffects(item, droppedItem, clonedKw._id, clonedKw.system?.params);
      return;
    }

    // Stat items: accept type-correct variations/modifications
    const typeMap = FraggedEmpireItemSheet.VARIATION_TYPES[item.type];
    if (typeMap) {
      try {
        if (droppedItem.type === typeMap.variation) {
          // Enforce max 1 variation
          if (item.system.variations.length >= 1) {
            ui.notifications.warn(game.i18n.localize("FE2.Items.Common.VariationLimitReached"));
            return;
          }
          const variationsArray = foundry.utils.deepClone(item.system.variations);
          const newItem = foundry.utils.deepClone(droppedItem.toObject());
          newItem._id = foundry.utils.randomID();
          variationsArray.push(newItem);
          // Build propagation data (keywords + stronghits with sourceId)
          const propagation = FraggedEmpireUtility.buildPropagationData(newItem, newItem._id);
          const updateData = { "system.variations": variationsArray };
          if (propagation.keywords.length) {
            updateData["system.keywords"] = [...(item.system.keywords ?? []), ...propagation.keywords];
          }
          if (propagation.stronghits.length) {
            updateData["system.stronghits"] = [...(item.system.stronghits ?? []), ...propagation.stronghits];
          }
          await item.update(updateData);
          // Recompute statstotal
          const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(item);
          if (Object.keys(statUpdates).length) await item.update(statUpdates);
          // Propagate ActiveEffects from source item
          await FraggedEmpireUtility.propagateActiveEffects(item, droppedItem, newItem._id);
        } else if (droppedItem.type === typeMap.modification) {
          const modsArray = foundry.utils.deepClone(item.system.modifications);
          const newItem = foundry.utils.deepClone(droppedItem.toObject());
          newItem._id = foundry.utils.randomID();
          modsArray.push(newItem);
          // Build propagation data (keywords + stronghits with sourceId)
          const propagation = FraggedEmpireUtility.buildPropagationData(newItem, newItem._id);
          const updateData = { "system.modifications": modsArray };
          if (propagation.keywords.length) {
            updateData["system.keywords"] = [...(item.system.keywords ?? []), ...propagation.keywords];
          }
          if (propagation.stronghits.length) {
            updateData["system.stronghits"] = [...(item.system.stronghits ?? []), ...propagation.stronghits];
          }
          await item.update(updateData);
          // Recompute statstotal
          const statUpdates = FraggedEmpireUtility.computeItemStatsTotals(item);
          if (Object.keys(statUpdates).length) await item.update(statUpdates);
          // Propagate ActiveEffects from source item
          await FraggedEmpireUtility.propagateActiveEffects(item, droppedItem, newItem._id);
        }
      } catch (e) {
        console.error("FE2 | _onDrop: error processing drop", e);
        ui.notifications.error("Failed to add item: " + e.message);
      }
      return;
    }
  }
}
