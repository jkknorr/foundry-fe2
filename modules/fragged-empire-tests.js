import { importNexusChar } from "./fragged-empire-importer.js";
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";

export function registerFE2Tests(quench) {
    console.log("Registering FE2 Tests");
    console.log("Quench object:", quench);
	for (const batchFunction of [
		registerBasicPassingTestBatch,
        registerNexusImporterTestBatch,
		registerTestPCTestBatch,
	]) {
		batchFunction(quench);
	}
}

function registerBasicPassingTestBatch(quench) {
	quench.registerBatch(
		"quench.fe2.basic-pass",
		(context) => {
			const { describe, it, assert, expect, should } = context;
			describe("Passing Suite", function () {
				it("Passing Test", function () {
					assert.ok(true);
				});
				it("Passing Test using expect", function () {
					expect(2).to.equal(2);
				});
				it("Passing Test using should", function () {
					const foo = { bar: "baz" };
					foo.should.have.property("bar", "baz");
				});
				it("Passing Test using should helper", function () {
					should.not.equal(1, 2);
				});
			});
		},
		{
			displayName: "FE2: Basic Passing Test",
		},
	);
}

function registerNexusImporterTestBatch(quench) {
	quench.registerBatch(
		"quench.fe2.nexusImporter",
		(context) => {
			const { describe, it, assert, expect, should } = context;
			describe("Nexus Importer Suite", function () {
				it("Basic Import Test", async function () {
                    const testJsonFile = "systems/foundry-fe2/adam-blaze.json"
                    const source = await fetch(testJsonFile)
                    const sourceJson = await source.json();
                    const sourceStr = sourceJson.attributes.find(attr => attr.name === "Strength").alloted;
                    const sourceRef = sourceJson.attributes.find(attr => attr.name === "Reflexes").alloted;
                    const sourceMob = sourceJson.attributes.find(attr => attr.name === "Mobility").alloted;
                    let actor = game.actors.find(actor => actor.name === sourceJson.name);
                    if (actor) {
                        const deleted = await Actor.implementation.deleteDocuments([actor.id]);
                    }
                    const actorNew = await importNexusChar(testJsonFile)
                    console.log("Import function returned:", actorNew);
                    expect(sourceJson.name).to.equal(actorNew.name);
                    for (const [key, value] of Object.entries(sourceJson.attributes)) {
                        if (value.alloted !== undefined) {
                            expect(value.alloted).to.equal(actorNew.system.attributes[value.name.toLowerCase()].value);
                        }
                    }
				});
			});
		},
		{
			displayName: "FE2: Nexus Import Test",
		},
	);
}

function registerTestPCTestBatch(quench) {
	quench.registerBatch(
		"quench.fe2.test-pc",
		(context) => {
			const { describe, it, assert, expect, should } = context;
			describe("TestPC Suite", function () {
				let actor = game.actors.find(actor => actor.name === "TestPC");
				it("Resource allocation", function () {
					console.log(actor._computed)
					expect(actor._computed.resourcesAllotted).to.equal(3);
					expect(actor._computed.resourcesCurrent).to.equal(0);
				});
			});
		},
		{
			displayName: "FE2: TestPC stats",
		},
	);
}