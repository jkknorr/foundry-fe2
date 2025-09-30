import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

export class FraggedEmpireRoll extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData ) {

    let html
    let options = { classes: ["fraggedempiredialog"], width: 600, height: 320, 'z-index': 99999 };
    if ( rollData.mode == "skill") {
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-skill.html', rollData);
      options.height = 360;
    } else if (rollData.mode == "weapon") {
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-weapon.html', rollData);
      options.height = 460;
    } else if (rollData.mode == "spacecraftweapon") {
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-spacecraftweapon.html', rollData);
    } else if (rollData.mode == "npcfight") {
      options.height = 360;
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-npcfight.html', rollData);
    } else if (rollData.mode == "genericskill") {
      options.height = 240;
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-genericskill.html', rollData);
    } else {
      html = await renderTemplate('systems/fvtt-fragged-empire/templates/roll-dialog-skill.html', rollData);
    }
    return new FraggedEmpireRoll(actor, rollData, html, options );
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let conf = {
      title: (rollData.mode == "skill") ? "Skill" : "Roll",
      content: html,
      buttons: { 
        roll: {
            icon: '<i class="fas fa-check"></i>',
            label: "Roll !",
            callback: () => { this.roll() } 
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => { this.close() }
        } },
      default: "roll",
      close: close
    }

    super(conf, options);

    this.actor = actor;
    this.rollData = rollData;
  }

  /* -------------------------------------------- */
  roll () {
    FraggedEmpireUtility.rollFraggedEmpire( this.rollData )
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    var dialog = this;
    function onLoad() {
    }
    $(function () { onLoad(); });

    html.find('#bonusMalus').change((event) => {
      this.rollData.bonusMalus = Number(event.currentTarget.value);
    });
    html.find('#useToolbox').change((event) => {
      this.rollData.useToolbox = event.currentTarget.value == "on";
    });
    html.find('#useDedicatedworkshop').change((event) => {
      this.rollData.useDedicatedworkshop = event.currentTarget.value == "on";
    });
    html.find('#difficulty').change((event) => {
      this.rollData.difficulty = Number(event.currentTarget.value);
    });    
    html.find('#skillId').change((event) => {
      this.rollData.skillId = event.currentTarget.value;
      this.rollData.skill = this.rollData.weaponSkills.find( item => item.id == this.rollData.skillId)
    });
    html.find('#skill-spacecraft').change((event) => {
      this.rollData.skillId = event.currentTarget.value;
      for (let actor of this.rollData.actorList) {
        let skill = actor.skills.find( item => item.id == this.rollData.skillId);
        if (skill) {          
          skill.data.data.trainedValue = (skill.data.data.trained) ? 1 : -2
          skill.data.data.total = skill.data.data.trainedValue + skill.data.data.bonus;
          skill.data.data.isTrait = skill.data.data.traits.length > 0; 
          this.rollData.skill = skill;
        }
      }
    });    
    html.find('#rof').change((event) => {
      this.rollData.rofValue = Number(event.currentTarget.value);
    });

  }
  
}