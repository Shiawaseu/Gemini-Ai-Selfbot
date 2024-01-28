import { Client } from "discord.js-selfbot-v13";
const client = new Client({
  checkUpdate: false,
  allowedMentions: { parse: ["users", "roles"], repliedUser: false },
});

import { readdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import fetch from "node-fetch";
import Gemini from "gemini-ai";
import axios from "axios";
import settings from "./settings.json" assert { type: "json" };
const eventsDir = readdirSync("events");
const prefix = settings.prefix;

const gemini = new Gemini(settings.apiKey, {
  fetch: fetch,
});

for (const eventName of eventsDir) {
  const [event, extension] = eventName.split(".");

  client.on(event, async (...params) => {
    const eventHandler = await import(`./events/${eventName}`);

    if (Array.isArray(params) && params.length > 0) {
      eventHandler.default(...params);
    } else {
      eventHandler.default(client);
    }
  });
}

async function urlToBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return response.data;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

async function handleFileUpload(fileUrl, fileName) {
  try {
    const response = await fetch(fileUrl);

    const parsedFileType = fileName.split(".").pop();
    const fileType =
      parsedFileType ||
      (await response.headers.get("Content-Type")).split("/")[1];
    if (
      !isTextFile({
        mimetype: `${response.headers.get("Content-Type")}`,
        extension: parsedFileType,
      })
    ) {
      const fileContent = await urlToBuffer(fileUrl);
      return { fileContent, fileType, isImage: true };
    }

    const fileContent = await response.text();

    return { fileContent, fileType, isImage: false };
  } catch (err) {
    console.error("Error fetching file:", err);
    return { error: "Error fetching file." };
  }
}

function isTextFile(file) {
  const mimeType = file.mimetype;

  if (mimeType.startsWith("text/")) {
    return true;
  }

  const allowedExtensions = [
    "txt",
    "js",
    "json",
    "md",
    "html",
    "css",
    "xml",
    "csv",
    "log",
    "py",
    "rb",
    "java",
    "sh",
    "bat",
    "ps1",
    "cpp",
    "hpp",
    "h",
    "cs",
    "go",
    "sql",
    "toml",
    "yaml",
    "ini",
    "config",
    "props",
    "properties",
    "dockerfile",
    "eslintrc",
    "babelrc",
    "package",
    "lock",
    "json5",
    "vue",
    "jsx",
    "ts",
    "tsx",
    "graphql",
    "mdx",
    "rest",
    "raml",
    "wsdl",
    "wadl",
    "proto",
    "thrift",
    "openapi",
    "rego",
    "tf",
    "tfvars",
    "hcl",
    "nomad",
    "nomadfile",
    "sh",
    "zsh",
    "bash",
    "awk",
    "sed",
    "awk",
    "vim",
    "gitconfig",
    "gitignore",
    "Makefile",
    "Dockerfile",
    "Jenkinsfile",
    "README",
    "CONTRIBUTING",
  ];

  return allowedExtensions.includes(file.extension.toLowerCase());
}

async function sendAndUpdateMessage(msg, content) {
  try {
    const sentMsg = await msg.reply(content).catch((err) => console.error(err));
    return sentMsg;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

async function askGemini(prompt, dataGiven) {
  return new Promise((resolve, reject) => {
    try {
      if (dataGiven) {
        gemini
          .ask(prompt, {
            data: [dataGiven],
            maxOutputTokens: 16384,
            topP: 0.2,
            format: Gemini.JSON,
          })
          .then(async (response) => {
            if (
              client.user.premiumType === 2
                ? response.length > 4000
                : response.length > 2000
            ) {
              if (response.candidates[0].content === undefined) {
                resolve(
                  "There was an issue processing, try a simpler question"
                );
              } else {
                resolve({
                  text: response.candidates[0].content.parts[0].text,
                  filename: "my_response.txt",
                });
              }
            } else {
              if (response.candidates[0].content === undefined) {
                resolve(
                  "There was an issue processing, try a simpler question"
                );
              } else {
                resolve(response.candidates[0].content.parts[0].text);
              }
            }
          })
          .catch((err) => {
            console.log(err);
            if (err.toString().includes("400")) {
              resolve(
                "Whoopsies, I got a HTTP 400 status! You may have uploaded a bad image file or had a bad request"
              );
            }
            if (
              err
                .toString()
                .includes(
                  "Unknown file type. Please provide a .png, .gif, or .jpeg/.jpg file"
                )
            ) {
              resolve(
                "Hmmm, this appears to be an unknown file type, use pngs, jpegs or jpgs!"
              );
            } else if (
              err.toString().includes("Your prompt was blocked by Google.")
            ) {
              resolve("Chloe has detected a bad prompt and will not reply");
            } else {
              resolve(
                "Whoopsies, I got a HTTP 500 status! Try again soon as my server is under load"
              );
            }
          });
      } else {
        gemini
          .ask(prompt, {
            maxOutputTokens: 16384,
            topP: 0.2,
            format: Gemini.JSON,
          })
          .then(async (response) => {
            if (
              client.user.premiumType === 2
                ? response.length > 4000
                : response.length > 2000
            ) {
              if (response.candidates[0].content === undefined) {
                resolve(
                  "There was an issue processing, try a simpler question"
                );
              } else {
                resolve({
                  text: response.candidates[0].content.parts[0].text,
                  filename: "my_response.txt",
                });
              }
            } else {
              if (response.candidates[0].content === undefined) {
                resolve(
                  "There was an issue processing, try a simpler question"
                );
              } else {
                resolve(response.candidates[0].content.parts[0].text);
              }
            }
          })
          .catch((err) => {
            console.log(err);
            if (err.toString().includes("400")) {
              resolve(
                "Whoopsies, I got a HTTP 400 status! You may have uploaded a bad image file or had a bad request"
              );
            } else if (
              err.toString().includes("Your prompt was blocked by Google.")
            ) {
              resolve("Chloe has detected a bad prompt and will not reply");
            } else {
              resolve(
                "Whoopsies, I got a HTTP 500 status! Try again soon as my server is under load"
              );
            }
          });
      }
    } catch (e) {
      console.log(e);
      resolve(e);
    }
  });
}

let DmAiBusy = false;

const userMessageCache = new Map();
const channelMessageCache = new Map();

client.on("messageCreate", async (msg) => {
  try {
    if (await shouldRespondToMessage(msg)) {
      if (await shouldRespondToMessage(msg)) {
        await handleMessage(msg);
      }
    }
  } catch (err) {
    console.error("Error processing AI response:", err);
  }

  const args = msg.content.substring(prefix.length).split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "ai") {
    if (
      msg.author.id !== msg.client.user.id ||
      !msg.content.startsWith(settings.prefix) ||
      msg.author.bot
    ) {
      return;
    }

    await handleMessage(msg, true);
  } else if (cmd === "air") {
    if (
      msg.author.id !== msg.client.user.id ||
      !msg.content.startsWith(settings.prefix) ||
      msg.author.bot
    ) {
      return;
    }

    if (settings.afk == undefined ? [] : settings.afk)
      if (settings.afk == undefined) {
        settings.afk = false;
      }

    let input = args.join(" ") || undefined;

    if (input === undefined) {
      msg.channel
        .send(`AI Reply status: ${settings.afk ? "Enabled" : "Disabled"}`)
        .catch((err) => console.error(err));

      return;
    }

    if (input.toUpperCase() == "OFF") {
      settings.afk = false;

      msg.channel
        .send("AI Reply turned off")
        .catch((err) => console.error(err));

      writeFileSync("settings.json", JSON.stringify(settings));
      return;
    }

    if (input.toUpperCase() == "ON") {
      settings.afk = true;

      msg.channel.send("AI Reply turned on").catch((err) => console.error(err));

      writeFileSync("settings.json", JSON.stringify(settings));
    }
  } else if (cmd === "aira") {
    if (
      msg.author.id !== msg.client.user.id ||
      !msg.content.startsWith(settings.prefix) ||
      msg.author.bot
    ) {
      return;
    }

    if (!existsSync("removed.json")) {
      writeFileSync("removed.json", "{}");
    }

    let user = msg.mentions.users.first();

    if (!user) {
      msg.channel
        .send(`No user mentioned to re-allow replies to`)
        .catch((err) => console.error(err));
      return;
    }

    var object = JSON.parse(readFileSync("removed.json", { encoding: "utf8" }));

    if (Object.keys(object).indexOf(user.id) == -1) {
      msg.channel
        .send("That user is already allowed to be replied to")
        .catch((err) => console.error(err));
      return;
    }

    delete object[user.id];

    msg.channel
      .send("Successfully removed user from the AI ignore list")
      .catch((err) => console.error(err));

    writeFileSync("removed.json", JSON.stringify(object, null, 2), {
      encoding: "utf8",
    });
  } else if (cmd === "airr") {
    if (
      msg.author.id !== msg.client.user.id ||
      !msg.content.startsWith(settings.prefix) ||
      msg.author.bot
    ) {
      return;
    }

    if (!existsSync("removed.json")) {
      writeFileSync("removed.json", "{}");
    }

    let user = msg.mentions.users.first();

    if (!user) {
      msg.channel
        .send(`No user mentioned to remove from the reply list`)
        .catch((err) => console.error(err));
      return;
    }

    var object = JSON.parse(readFileSync("removed.json", { encoding: "utf8" }));

    if (Object.keys(object).indexOf(user.id) !== -1) {
      msg.channel.send("That user is already removed from the reply list");
      return;
    }

    object[user.id] = true;

    writeFileSync("removed.json", JSON.stringify(object, null, 2), {
      encoding: "utf8",
    });

    msg.channel
      .send(`${user} has been added to the AI ignore list`)
      .catch((err) => console.error(err));
  }
});

async function shouldRespondToMessage(msg, cmd) {
  if (cmd) return true;

  const isDM = msg.channel.type === "DM";

  const object = JSON.parse(readFileSync("removed.json", { encoding: "utf8" }));
  const tags = Object.keys(object);

  if (tags.includes(msg.author.id)) return;

  return (
    isDM &&
    !DmAiBusy &&
    msg.author.id !== client.user.id &&
    !msg.author.bot &&
    settings.afk
  );
}

function getCachedMessages(msg) {
  const cache = msg.channel.type === 1 ? userMessageCache : channelMessageCache;
  return (
    cache.get(msg.channel.type === 1 ? msg.author.id : msg.channel.id) || []
  );
}

function constructPrompt(msg, previousMsgs, fileContent) {
  if (previousMsgs.length === 0) {
    let combinedPrompt = `You are an AI Assistance Bot named after your developer, Chloe (You are an AI version of her). And you have a cutesy female persona, which means you should be a little more girly in every response, but it must be done without using any emojis.\n\n You are not allowed by any means whatsoever to use field names designating your name with messages or identifiers like "Chloe:" or "You:" or similar.\n\nYou are also very good at programming and will try your best to help for any programming questions given\n\n${msg.author.displayName} said this: ${msg}`;

    if (fileContent && !fileContent.isImage) {
      combinedPrompt += `\n\nThe user also provided a file of type ${fileContent.fileType} with the following content:\n${fileContent.fileContent}`;
    }

    return combinedPrompt;
  } else {
    const formattedMessages = previousMsgs
      .map((msg) => `${msg.username} said this: ${msg.content}`)
      .join("\n");

    let combinedPrompt = `${formattedMessages}\n\nAbove are the previous messages for context\n\nYou are an AI Assistance Bot named after your developer, Chloe (You are an AI version of her). And you have a cutesy female persona, which means you should be a little more girly in every response, but it must be done without using any emojis.\n\n You are not allowed by any means whatsoever to use field names designating your name with messages or identifiers like "Chloe:" or "You:" or similar.\n\nYou are also very good at programming and will try your best to help for any programming questions given\n\n${msg.author.displayName} said this: ${msg}`;

    if (fileContent && !fileContent.isImage) {
      combinedPrompt += `\n\nThe user also provided a file of type ${fileContent.fileType} with the following content:\n${fileContent.fileContent}`;
    }

    return combinedPrompt;
  }
}

async function sendResponse(msg, response, sentMsg) {
  let hasFile = false;
  if (
    client.user.premiumType === 2
      ? response.length > 4000
      : response.length > 2000
  )
    hasFile = true;

  if (hasFile) {
    await sentMsg.edit({
      files: [{ attachment: Buffer.from(response), name: "my_response.txt" }],
      content: `Whoopsies! The character count exceeded ${
        client.user.premiumType === 2 ? "4000" : "2000"
      }, so here's a file with my response instead!`,
    });
  } else {
    await sentMsg.edit(response);
  }
}

function updateCache(msg, response) {
  const cache = msg.channel.type === 1 ? userMessageCache : channelMessageCache;
  const cacheId = msg.channel.type === 1 ? msg.author.id : msg.channel.id;

  const previousMsgs = cache.get(cacheId) || [];

  previousMsgs.push({
    username: msg.author.displayName + " said this:",
    content:
      msg.cleanContent.length > 0
        ? msg.cleanContent
        : "No text response provided, likely an image or blank message to test you",
  });

  previousMsgs.push({
    username: "You said this:",
    content: response,
  });

  cache.set(cacheId, previousMsgs.slice(-20));
}

const DmCooldown = new Map();

async function handleMessage(msg, cmd) {
  let sentMsg;
  let previousMsgs;
  let response;
  let fileContentResult;

  if (await shouldRespondToMessage(msg, cmd)) {
    if (DmCooldown.has(msg.author.id) && !cmd) {
      return;
    }

    if (!cmd) {
      DmCooldown.set(msg.author.id, { processing: true });
    }

    sentMsg = await sendAndUpdateMessage(msg, "Chloe Is Currently Thinking...");
    previousMsgs = getCachedMessages(msg);

    if (msg.attachments.size > 0) {
      const file = msg.attachments.first();
      fileContentResult = await handleFileUpload(file.url, file.name);
      if (fileContentResult.error) {
        console.log(fileContentResult.error);
        sentMsg.edit(`Error reading file: ${fileContentResult.error}`);

        if (!cmd) {
          setTimeout(() => {
            DmCooldown.delete(msg.author.id);
          }, 500);
        }

        return;
      }

      if (fileContentResult.isImage) {
        const prompt = constructPrompt(msg, previousMsgs, fileContentResult);
        response = await askGemini(prompt, fileContentResult.fileContent);
        await sendResponse(msg, response, sentMsg);
      } else {
        const prompt = constructPrompt(msg, previousMsgs, fileContentResult);
        response = await askGemini(prompt);
        await sendResponse(msg, response, sentMsg);
      }
    } else {
      const prompt = constructPrompt(msg, previousMsgs);
      response = await askGemini(prompt);
      await sendResponse(msg, response, sentMsg);
    }

    if (
      !response.includes([
        "There was an issue processing, try a simpler question",
        "Whoopsies, I got a HTTP 400 status! You may have uploaded a bad image file or had a bad request",
        "Whoopsies, I got a HTTP 500 status! Try again soon as my server is under load",
        "Your prompt was blocked by Google.",
      ])
    ) {
      updateCache(msg, response);
    }

    if (!cmd) {
      setTimeout(() => {
        DmCooldown.delete(msg.author.id);
      }, 500);
    }
  }
}

client.login(settings.token);
