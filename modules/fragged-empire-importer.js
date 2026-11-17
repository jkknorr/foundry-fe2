import { FraggedEmpireActor } from "./fragged-empire-actor.js";

export async function importNexusChar(filePath) {

    // const absolutePath = path.resolve(filePath);
    // const rawData = fs.readFileSync(absolutePath, "utf8");
    // const source = JSON.parse(rawData);
    const source = await fetch(filePath)
    const sourceJson = await source.json();

    console.log("Invoking the Nexus character import function with source:", sourceJson);
    const actorData = {
        name: sourceJson.name,
        type: "character",
    }
    const actor = await FraggedEmpireActor.create(actorData);
    console.log(`Actor ${actor.name} created successfully!`);
    let updateData = foundry.utils.deepClone(actor.toObject());
    for (const [key, value] of Object.entries(sourceJson.attributes)) {
        updateData.system.attributes[value.name.toLowerCase()].value = value.alloted;
    }
    for (const [key, value] of Object.entries(sourceJson.combatSkills)) {
        let skill = actor.items.find(item => item.name.toLowerCase() == value.name.toLowerCase());
        if (skill) {
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.toolbox = value.toolbox;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.trained = value.trained;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.workshop = value.workshop;
        }
    }
    for (const [key, value] of Object.entries(sourceJson.spaceSkills)) {
        let skill = actor.items.find(item => item.name.toLowerCase() == value.name.toLowerCase());
        if (skill) {
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.toolbox = value.toolbox;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.trained = value.trained;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.workshop = value.workshop;
        }
    }
    for (const [key, value] of Object.entries(sourceJson.primarySkills)) {
        let skill = actor.items.find(item => item.name.toLowerCase() == value.name.toLowerCase());
        if (skill) {
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.toolbox = value.toolbox;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.trained = value.trained;
            updateData.items.find(item => item.name.toLowerCase() == value.name.toLowerCase()).system.workshop = value.workshop;
        }
    }
    if (!foundry.utils.isEmpty(updateData)) {
        await actor.update(updateData, { enforceTypes: false });
    }
    for (const [key, value] of Object.entries(sourceJson.traits)) {
        let traitName = value.name.slice(0,value.name.indexOf("(")-1)
        let traitParentName = value.name.slice(value.name.indexOf("(")+1,value.name.indexOf(")"))
        console.log("Importing trait:", traitName, "with parent:", traitParentName);
        let trait = game.items.find(item => item.name.toLowerCase() == traitName.toLowerCase());
        let parentSkill = actor.items.find(item => item.name.toLowerCase() == traitParentName.toLowerCase());
        if (trait) {
            console.log("Found parent skill:", parentSkill);
        } else {
            console.warn(`Trait ${traitName} not found in the game items collection.`);
            if (parentSkill) {
                let traitData = foundry.utils.deepClone(trait.toObject());
                traitData.system.value = value.value;
                traitData.system.parentSkillId = parentSkill.id;
                await actor.createEmbeddedDocuments("Item", [traitData]);
                console.log(`Trait ${traitName} created successfully under parent skill ${traitParentName}!`);
            } else {
                console.warn(`Parent skill ${traitParentName} not found for trait ${traitName}.`);
            }
        }
    return actor;
    }
}