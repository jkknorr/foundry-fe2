import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

/* -------------------------------------------- */
export class FraggedEmpireCombat extends Combat {
  
  /* -------------------------------------------- */
  async rollInitiative(ids, formula = undefined, messageOptions = {} ) {
    console.log("Initiative is requested !!!");

    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant._id;
    for (let cId = 0; cId < ids.length; cId++) {
      const c = this.combatants.get(ids[cId]);
      let initBonus = c.actor ? c.actor.getInitiativeScore() : 0;
      let id = c._id || c.id;
      await this.updateEmbeddedDocuments("Combatant", [{ _id: id, initiative: initBonus }]);
    }

    return this;
  }
}
