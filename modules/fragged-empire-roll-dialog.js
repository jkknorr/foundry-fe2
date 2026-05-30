import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Per-mode body template. */
const BODY_TEMPLATES = {
  skill:            "systems/foundry-fe2/templates/roll-dialog-skill.html",
  weapon:           "systems/foundry-fe2/templates/roll-dialog-weapon.html",
  spacecraftweapon: "systems/foundry-fe2/templates/roll-dialog-spacecraftweapon.html",
  npcfight:         "systems/foundry-fe2/templates/roll-dialog-npcfight.html",
  genericskill:     "systems/foundry-fe2/templates/roll-dialog-genericskill.html"
};

/** Modes that show a live preview (and therefore re-render on each control change). */
const PREVIEW_MODES = new Set(["weapon", "npcfight", "spacecraftweapon"]);

/**
 * Live roll-configuration window (ApplicationV2). Re-renders on every in-window
 * control change so the previewed quantities always match what will be rolled
 * (FR-006/SC-002). Preserves the {@link FraggedEmpireRoll}.create(actor, rollData)
 * contract used by all existing call sites.
 */
export class FraggedEmpireRollApp extends HandlebarsApplicationMixin(ApplicationV2) {

  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["foundry-fe2", "fraggedempiredialog", "fe2-roll-dialog"],
    position: { width: 600, height: "auto" },
    window: { title: "FE2.Roll.Buttons.RollTitle" },
    form: {
      handler: FraggedEmpireRollApp.#onFormChange,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      roll: FraggedEmpireRollApp.#onRoll,
      cancel: FraggedEmpireRollApp.#onCancel
    }
  };

  /* -------------------------------------------- */
  static PARTS = {
    body:   { template: BODY_TEMPLATES.skill }, // overridden per instance in _configureRenderParts
    footer: { template: "systems/foundry-fe2/templates/partials/roll-window-footer.html" }
  };

  /* -------------------------------------------- */
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.rollData = options.rollData;
    this._result = null;
    this._baseline = null;
    this.#buildChoiceLists();
  }

  /* -------------------------------------------- */
  /** Per-mode window title (skill rolls vs. everything else). */
  get title() {
    return (this.rollData?.mode === "skill")
      ? game.i18n.localize("FE2.Chat.Headers.Skill")
      : game.i18n.localize("FE2.Roll.Buttons.RollTitle");
  }

  /* -------------------------------------------- */
  /**
   * Open the roll window and block until the user resolves it.
   * @param {Actor}  actor     The rolling actor.
   * @param {object} rollData  The RollContext.
   * @returns {Promise<object|null>} rollData if Roll was pressed, null if cancelled/closed.
   */
  static create(actor, rollData) {
    return new Promise((resolve) => {
      const app = new this({ actor, rollData });
      app.addEventListener("close", () => resolve(app._result ?? null), { once: true });
      app.render({ force: true });
    });
  }

  /* -------------------------------------------- */
  /** Select the per-mode body template without mutating the shared static PARTS. */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.body.template = BODY_TEMPLATES[this.rollData.mode] ?? BODY_TEMPLATES.skill;
    return parts;
  }

  /* -------------------------------------------- */
  /** Build the dynamic select choice lists (ported from the former DialogV2 helper). */
  #buildChoiceLists() {
    const rollData = this.rollData;
    const actor = this.actor;

    if (rollData.weaponSkills) {
      rollData.weaponSkillChoices = {};
      for (const skill of rollData.weaponSkills) {
        rollData.weaponSkillChoices[skill.id] = `${skill.name} (${skill.system.total})`;
      }
    }

    if (rollData.actorList) {
      rollData.spacecraftSkillChoices = {};
      for (const a of rollData.actorList) {
        for (const skill of a.skills) {
          rollData.spacecraftSkillChoices[skill.id] = `${a.name} - ${skill.name} (${skill.system.total})`;
        }
      }
    }

    if (rollData.mode === "weapon") {
      rollData.coverChoices = FraggedEmpireUtility.buildCoverChoices();
      const refMod = FraggedEmpireUtility.resolveReflexes(actor);
      const focusMod = FraggedEmpireUtility.resolveFocus(actor);
      rollData.optionsShotType = FraggedEmpireUtility.buildShotTypeChoices(refMod, focusMod);
    }

    if (rollData.mode === "skill") {
      rollData.optionsSkillDifficulty = FraggedEmpireUtility.buildSkillDiffChoices();
    }
  }

  /* -------------------------------------------- */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const rollData = this.rollData;
    const actor = this.actor;

    // Baseline: snap shot + zeroed in-window modifiers. Computed once, cached.
    if (!this._baseline) this._baseline = this.#computeQuantities(this.#baselineClone());
    const adjusted = this.#computeQuantities(this.#adjustedClone());

    const preview = {};
    if (PREVIEW_MODES.has(rollData.mode)) {
      preview.toHit = this.#previewQuantity(this._baseline.toHit, adjusted.toHit);
      preview.hitDice = this.#previewQuantity(this._baseline.hitDice, adjusted.hitDice);
    }

    // Range Penalty & Target Defence are character-weapon-only (FR-007) and only when
    // the target / tokens are present (FR-010).
    if (rollData.mode === "weapon") {
      const hasTarget = !!rollData.target;
      const hasRangeInfo = hasTarget
        && !!rollData.target.getActiveTokens?.()[0]
        && !!actor.getActiveTokens?.()[0];
      if (hasRangeInfo) {
        preview.rangePenalty = this.#previewQuantity(this._baseline.rangePenalty, adjusted.rangePenalty);
      }
      if (hasTarget && adjusted.targetDefence !== null) {
        preview.targetDefence = this.#previewQuantity(this._baseline.targetDefence, adjusted.targetDefence);
      }
    }

    // Reflect conditional-effect checkbox state so it survives re-renders (FR-013).
    const selected = rollData.selectedConditionalEffects ?? [];
    const conditionalEffects = (rollData.conditionalEffects ?? []).map(ce => ({
      ...ce, selected: selected.includes(ce.effectId)
    }));

    return {
      ...context,
      ...rollData,
      conditionalEffects,
      preview,
      name: actor.name
    };
  }

  /* -------------------------------------------- */
  /** A shallow clone at baseline (snap + no in-window modifiers, FR-004/FR-016). */
  #baselineClone() {
    return {
      ...this.rollData,
      shotType: "snap",
      bonusMalus: 0,
      bMHitDice: 0,
      munHitDice: 0,
      cover: 0,
      rofValue: 1,
      selectedConditionalEffects: []
    };
  }

  /* -------------------------------------------- */
  /** A shallow clone with the currently-selected conditional effects folded in. */
  #adjustedClone() {
    const clone = { ...this.rollData };
    if (clone.selectedConditionalEffects?.length && clone.conditionalEffects?.length) {
      FraggedEmpireUtility.applySelectedConditionalEffects(clone);
    }
    return clone;
  }

  /* -------------------------------------------- */
  /** Derive the previewed quantities for a given roll-state clone (SSOT helpers). */
  #computeQuantities(state) {
    const actor = this.actor;
    const q = {
      toHit: FraggedEmpireUtility.computeToHit(state, actor),
      hitDice: FraggedEmpireUtility.computeHitDice(state, actor),
      rangePenalty: null,
      targetDefence: null
    };
    if (this.rollData.mode === "weapon") {
      FraggedEmpireUtility.calculateRangePenalty(state, actor); // sets state.rangepenalty
      q.rangePenalty = Number(state.rangepenalty) || 0;
      q.targetDefence = FraggedEmpireUtility.computeTargetDefence(state);
    }
    return q;
  }

  /* -------------------------------------------- */
  #previewQuantity(baseline, adjusted) {
    return { baseline, adjusted, changed: baseline !== adjusted };
  }

  /* -------------------------------------------- */
  /** submitOnChange handler: write changed controls into rollData, then re-render. */
  static async #onFormChange(event, form, formData) {
    const data = formData.object;
    const rollData = this.rollData;

    // Numeric selects (present per mode)
    if ("shotType" in data) rollData.shotType = data.shotType;
    if ("bonusMalus" in data) rollData.bonusMalus = Number(data.bonusMalus);
    if ("bMHitDice" in data) rollData.bMHitDice = Number(data.bMHitDice);
    if ("munHitDice" in data) rollData.munHitDice = Number(data.munHitDice);
    if ("cover" in data) rollData.cover = Number(data.cover);
    if ("rof" in data) rollData.rofValue = Number(data.rof);

    // Skill / generic-skill checkboxes & difficulty (ported so those rolls are unchanged)
    if ("useToolbox" in data) rollData.useToolbox = !!data.useToolbox;
    if ("useDedicatedworkshop" in data) rollData.useDedicatedworkshop = !!data.useDedicatedworkshop;
    if ("isArcane" in data) rollData.isArcane = !!data.isArcane;
    if ("isAcquisition" in data) rollData.isAcquisition = !!data.isAcquisition;
    if ("useSTP" in data) rollData.useSTP = !!data.useSTP;
    if ("skillDiff" in data) {
      rollData.difficulty = Number(data.skillDiff);
      rollData.skilldifficulty = Number(data.skillDiff);
    }

    // Weapon skill selection
    if ("skillId" in data && rollData.weaponSkills) {
      rollData.skillId = data.skillId;
      rollData.skill = rollData.weaponSkills.find(item => item.id === rollData.skillId);
    }

    // Spacecraft crew skill selection — rebuild the skill object so the to-hit matches the roll
    if ("skill" in data && rollData.actorList) {
      rollData.skillId = data.skill;
      for (const a of rollData.actorList) {
        const skill = a.skills.find(item => item.id === rollData.skillId);
        if (skill) {
          skill.system.trainedValue = (skill.system.trained) ? 1 : -2;
          skill.system.total = skill.system.trainedValue + skill.system.bonus;
          skill.system.isTrait = skill.system.traits.length > 0;
          rollData.skill = skill;
        }
      }
    }

    // Conditional-effect toggles carry no name; read their checked state from the form DOM.
    if (rollData.conditionalEffects?.length) {
      rollData.selectedConditionalEffects = Array.from(
        form.querySelectorAll(".conditional-effect-toggle:checked")
      ).map(cb => cb.dataset.effectId);
    }

    // Keep the stored range penalty current so the rolled value equals the preview (FR-006).
    if (rollData.mode === "weapon" && rollData.target) {
      FraggedEmpireUtility.calculateRangePenalty(rollData, this.actor);
    }

    // Only the preview windows need a re-render; skill/generic-skill keep their natural DOM state.
    if (PREVIEW_MODES.has(rollData.mode)) this.render();
  }

  /* -------------------------------------------- */
  /** Roll action: fire the roll (as the former Roll button did), then close. */
  static async #onRoll(event, target) {
    await FraggedEmpireUtility.rollFraggedEmpire(this.rollData);
    this._result = this.rollData;
    await this.close();
  }

  /* -------------------------------------------- */
  /** Cancel action: close with no result (FR-009). */
  static async #onCancel(event, target) {
    await this.close();
  }
}

/**
 * Backwards-compatible alias: the 10 existing call sites import { FraggedEmpireRoll }
 * and call FraggedEmpireRoll.create(actor, rollData).
 */
export const FraggedEmpireRoll = FraggedEmpireRollApp;
