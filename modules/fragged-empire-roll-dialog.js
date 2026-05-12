import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/**
 * Roll dialog using DialogV2.wait().
 * No longer extends Dialog — just a static helper class.
 */
export class FraggedEmpireRoll {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    // Build choice objects for dynamic selects
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
      let refMod = 0
      let focusMod = 0
      if (actor.type == 'npc' && actor.system.npctype == 'henchman') {
        refMod = actor.system.fight.durability.max
        focusMod = refMod
      } else {
        refMod = actor.system.attributes.reflexes.current
        focusMod = actor.system.attributes.focus.current
      }
      rollData.optionsShotType = FraggedEmpireUtility.buildShotTypeChoices(refMod,focusMod);
    }

    // Determine template
    let templatePath;
    if (rollData.mode === "skill") {
      rollData.optionsSkillDifficulty = FraggedEmpireUtility.buildSkillDiffChoices();
      templatePath = "systems/foundry-fe2/templates/roll-dialog-skill.html";
    } else if (rollData.mode === "weapon") {
      templatePath = "systems/foundry-fe2/templates/roll-dialog-weapon.html";
    } else if (rollData.mode === "spacecraftweapon") {
      templatePath = "systems/foundry-fe2/templates/roll-dialog-spacecraftweapon.html";
    } else if (rollData.mode === "npcfight") {
      templatePath = "systems/foundry-fe2/templates/roll-dialog-npcfight.html";
    } else if (rollData.mode === "genericskill") {
      templatePath = "systems/foundry-fe2/templates/roll-dialog-genericskill.html";
    } else {
      templatePath = "systems/foundry-fe2/templates/roll-dialog-skill.html";
    }
    console.log(rollData)

    const html = await foundry.applications.handlebars.renderTemplate(templatePath, rollData);

    const title = (rollData.mode === "skill")
      ? game.i18n.localize("FE2.Chat.Headers.Skill")
      : game.i18n.localize("FE2.Roll.Buttons.RollTitle");

    return foundry.applications.api.DialogV2.wait({
      window: { title },
      classes: ["fraggedempiredialog"],
      position: { width: 600, height: "auto" },
      content: html,
      buttons: [
        {
          action: "roll",
          label: game.i18n.localize("FE2.Roll.Buttons.Roll"),
          icon: "fas fa-check",
          callback: () => FraggedEmpireUtility.rollFraggedEmpire(rollData)
        },
        {
          action: "cancel",
          label: game.i18n.localize("FE2.Dialog.Cancel"),
          icon: "fas fa-times"
        }
      ],
      render: (event, dialog) => {
        const el = dialog.element ?? dialog;

        el.querySelector("#shotType")?.addEventListener("change", async (e) => {
          rollData.shotType = e.currentTarget.value;
          rollData = FraggedEmpireUtility.calculateRangePenalty(rollData, game.actors.get(rollData.actorId));
        });
        el.querySelector("#bonusMalus")?.addEventListener("change", (e) => {
          rollData.bonusMalus = Number(e.currentTarget.value);
        });
        el.querySelector("#bMHitDice")?.addEventListener("change", (e) => {
          rollData.bMHitDice = Number(e.currentTarget.value);
        });
        el.querySelector("#useToolbox")?.addEventListener("change", (e) => {
          rollData.useToolbox = e.currentTarget.checked;
        });
        el.querySelector("#munHitDice")?.addEventListener("change", (e) => {
          rollData.munHitDice = Number(e.currentTarget.value);
        });
        el.querySelector("#cover")?.addEventListener("change", (e) => {
          rollData.cover = Number(e.currentTarget.value);
        });
        el.querySelector("#useDedicatedworkshop")?.addEventListener("change", (e) => {
          rollData.useDedicatedworkshop = e.currentTarget.checked;
        });
        el.querySelector("#skillDiff")?.addEventListener("change", (e) => {
          rollData.difficulty = Number(e.currentTarget.value);
        });
        el.querySelector("#skillDiff")?.addEventListener("change", (e) => {
          rollData.skilldifficulty = Number(e.currentTarget.value);
        });
        el.querySelector("#isArcane")?.addEventListener("change", (e) => {
          rollData.isArcane = e.currentTarget.checked;
        });
        el.querySelector("#isAcquisition")?.addEventListener("change", (e) => {
          rollData.isAcquisition = e.currentTarget.checked;
        });
        el.querySelector("#useSTP")?.addEventListener("change", (e) => {
          rollData.useSTP = e.currentTarget.checked;
        });
        el.querySelector("#skillId")?.addEventListener("change", (e) => {
          rollData.skillId = e.currentTarget.value;
          rollData.skill = rollData.weaponSkills.find(item => item.id === rollData.skillId);
        });
        el.querySelector("#skill-spacecraft")?.addEventListener("change", (e) => {
          rollData.skillId = e.currentTarget.value;
          for (let a of rollData.actorList) {
            let skill = a.skills.find(item => item.id === rollData.skillId);
            if (skill) {
              skill.system.trainedValue = (skill.system.trained) ? 1 : -2;
              skill.system.total = skill.system.trainedValue + skill.system.bonus;
              skill.system.isTrait = skill.system.traits.length > 0;
              rollData.skill = skill;
            }
          }
        });
        el.querySelector("#rof")?.addEventListener("change", (e) => {
          rollData.rofValue = Number(e.currentTarget.value);
        });

        // Conditional effect checkboxes
        el.querySelectorAll(".conditional-effect-toggle").forEach(cb => {
          cb.addEventListener("change", (e) => {
            const effectId = e.currentTarget.dataset.effectId;
            if (e.currentTarget.checked) {
              rollData.selectedConditionalEffects.push(effectId);
            } else {
              rollData.selectedConditionalEffects = rollData.selectedConditionalEffects.filter(id => id !== effectId);
            }
          });
        });
      }
    });
  }
}
