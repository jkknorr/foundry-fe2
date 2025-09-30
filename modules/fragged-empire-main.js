/**
 * FraggedEmpire system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { FraggedEmpireActor } from "./fragged-empire-actor.js";
import { FraggedEmpireItemSheet } from "./fragged-empire-item-sheet.js";
import { FraggedEmpireActorSheet } from "./fragged-empire-actor-sheet.js";
import { FraggedEmpireSpacecraftSheet } from "./fragged-empire-spacecraft-sheet.js";
import { FraggedEmpireNPCSheet } from "./fragged-empire-npc-sheet.js";
import { FraggedEmpireUtility } from "./fragged-empire-utility.js";
import { FraggedEmpireCombat } from "./fragged-empire-combat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {
  console.log(`Initializing Fragged Empire`);

  /* -------------------------------------------- */
  // preload handlebars templates
  FraggedEmpireUtility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 1
  };

  /* -------------------------------------------- */
  game.socket.on("system.fvtt-fragged-empire", data => {
    FraggedEmpireUtility.onSocketMesssage(data);
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Combat.documentClass = FraggedEmpireCombat;
  CONFIG.Actor.documentClass = FraggedEmpireActor;
  CONFIG.FraggedEmpire = {
  }

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fvtt-fragged-empire", FraggedEmpireActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("fvtt-fragged-empire", FraggedEmpireSpacecraftSheet, { types: ["spacecraft"], makeDefault: false });
  Actors.registerSheet("fvtt-fragged-empire", FraggedEmpireNPCSheet, { types: ["npc"], makeDefault: false });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("fvtt-fragged-empire", FraggedEmpireItemSheet, { makeDefault: true });

  FraggedEmpireUtility.init();
  
});

/* -------------------------------------------- */
function welcomeMessage() {
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div id="welcome-message-fragged-empire"><span class="rdd-roll-part">Welcome !</div>
    ` });
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", function () {

  FraggedEmpireUtility.ready();

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Warning ! No character linked to your user !");
    ChatMessage.create({
      content: "<b>WARNING</b> The player  " + game.user.name + " is not linked to a character !",
      user: game.user._id
    });
  }
  welcomeMessage();
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.toLowerCase().match(regExp);
    console.log(commands);
  }
  return true;
});
