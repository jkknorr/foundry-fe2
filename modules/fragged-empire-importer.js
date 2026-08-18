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
    // actor.system.attributes.strength.value = sourceJson.attributes.find(attr => attr.name === "Strength").alloted;
    for (const [key, value] of Object.entries(sourceJson.attributes)) {
        actor.system.attributes[value.name.toLowerCase()].value = value.alloted;
    }
    return actor;
}