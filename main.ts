// write me a discord bot that can read and send messages to a discord channel
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
import * as fs from "fs";
const csv = require("csv-parser");
import { getDailyChallenge, getProfile, convertToDiscordText } from "./queries";
require("dotenv").config();

// UserRecord interface
interface userRecord {
  LC_USERNAME: string;
  DISCORD_HANDLE: string;
}

const members: any = {};
let data: any = {};

// continually update known data
async function updateData() {
  for (let member in members) {
    data[member] = await getProfile(members[member]);
  }
}

function formatNumberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// sanitizes discord input
function sanitizeDiscordInput(input: string): string {
  const escapeChars = /([\\_*~|`])/g;
  return input.replace(escapeChars, "\\$1");
}

// 5 Minutes
setInterval(updateData, 1000 * 60 * 5);

// writes csv file
async function writeCsv(data: Array<userRecord>, path: string = "./users.csv") {
  let out = "DISCORD_HANDLE,LC_USERNAME\n";
  for (let i = 0; i < data.length; i++) {
    out += `${data[i].DISCORD_HANDLE},${data[i].LC_USERNAME}\n`;
  }
  return new Promise<void>((resolve, reject) => {
    fs.writeFile("./users.csv", out, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

async function readCSV(path: string = "./users.csv") {
  return new Promise<Array<userRecord>>((resolve, reject) => {
    let results: Array<userRecord> = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data: any) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);
  });
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient: any) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message: any) => {
  // split message content into words
  const words = message.content.split(" ");

  // check if the first word is "lc"
  if (words[0] === "lc") {
    // REGISTER
    if (words[1] === "register" && words.length === 3) {
      const username = words[2];
      const user = await getProfile(username);
      if (user === null) {
        message.channel.send("User not found!");
        return;
      }

      // write to csv file
      const csvData: Array<userRecord> = [];
      members[message.author.username] = username;
      for (let i in members) {
        csvData.push({ DISCORD_HANDLE: i, LC_USERNAME: members[i] });
      }

      await writeCsv(csvData);
      await updateData();

      message.channel.send("Registered!");
    }

    // HELP
    else if (words[1] === "help") {
      const embed = new EmbedBuilder()
        .setTitle("Commands")
        .setDescription(
          "`lc register <username>` - Register your discord handle with your leetcode username\n`lc stats <handle>` - Get someone's leetcode stats\n`lc daily` - Get your daily challenge\n `lc leaderboard` - Displays a leaderboard by rank",
        )
        .setColor(0xffa015);
      message.channel.send({ embeds: [embed] });
    }

    // GET USER
    else if (words[1] === "stats") {
      // get author's stats
      let username: string;
      if (words.length === 2) {
        username = message.author.username;
        if (!(username in data)) {
          message.channel.send("You have not registered!");
          return;
        }
      }
      // get user's stats
      else if (words.length === 3 && words[2] in data) {
        username = words[2];
      } else {
        message.channel.send("Invalid user!");
        return;
      }

      // get problms
      const userData = data[username];
      const allProblems = userData.submitStats.acSubmissionNum.find(
        (e: any) => e.difficulty == "All",
      ).count;
      const easyProblems = userData.submitStats.acSubmissionNum.find(
        (e: any) => e.difficulty == "Easy",
      ).count;
      const mediumProblems = userData.submitStats.acSubmissionNum.find(
        (e: any) => e.difficulty == "Medium",
      ).count;
      const hardProblems = userData.submitStats.acSubmissionNum.find(
        (e: any) => e.difficulty == "Hard",
      ).count;
      const problemsString = `🟦 ${easyProblems} \u200b \u200b🟨 ${mediumProblems} \u200b\u200b 🟥 ${hardProblems} `;

      // get languages
      const languages = userData.languageProblemCount
        .sort((a: any, b: any) => b.problemsSolved - a.problemsSolved)
        .map((e: any) => e.languageName);
      const languageString = languages.join(", ");
      const embed = new EmbedBuilder()
        .setTitle(`${members[username]}`)
        .setDescription(`${sanitizeDiscordInput(username)}'s stats`)
        .setColor(0xffa015)
        .setURL(`https://leetcode.com/u/${members[username]}`)
        .setThumbnail(userData.profile.userAvatar)
        .setTimestamp()
        .setFields([
          {
            name: "**Rank**",
            value: formatNumberWithCommas(userData.profile.ranking),
            inline: true,
          },
          {
            name: `**Problems Solved** (${allProblems})`,
            value: problemsString,
            inline: false,
          },
          {
            name: "**Languages**",
            value: languageString,
            inline: true,
          },
        ]);
      message.channel.send({ embeds: [embed] });
    } else if (words[1] === "daily" && words.length === 2) {
      const dailyChallenge = await getDailyChallenge();
      const embed = new EmbedBuilder()
        .setTitle(`${dailyChallenge.question.title}`)
        .setDescription(`Daily ${dailyChallenge.date}`)
        .setURL(`https://leetcode.com${dailyChallenge.link}`)
        .setColor(0xffa015)
        .setFields([
          {
            name: "**Difficulty**",
            value: String(dailyChallenge.question.difficulty),
            inline: true,
          },
          {
            name: "**Acceptance Rate**",
            value: `${dailyChallenge.question.acRate.toFixed(1)}%`,
            inline: true,
          },
          {
            name: "**Description**",
            value: convertToDiscordText(dailyChallenge.question.content),
            inline: false,
          },
        ])
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    }
    // LEADERBOARD
    else if (words[1] === "leaderboard" && words.length === 2) {
      let leaderboard = "";
      const orderedMembers = Object.keys(members).sort(
        (a, b) => data[a].profile.ranking - data[b].profile.ranking,
      );
      for (let i = 0; i < orderedMembers.length; i++) {
        let prefix;
        if (i == 0) {
          prefix = "🥇";
        } else if (i == 1) {
          prefix = "🥈";
        } else if (i == 2) {
          prefix = "🥉";
        } else {
          prefix = "  " + (i + 1);
        }
        const member = orderedMembers[i];
        leaderboard += `${prefix}. ${sanitizeDiscordInput(member)}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle("Leaderboard 🏆")
        .setColor(0xffa015)
        .setDescription(leaderboard);
      message.channel.send({ embeds: [embed] });
    }

    // no valid command
    else {
      const embed = new EmbedBuilder()
        .setTitle("Invalid Command")
        .setDescription("Type `lc help` to see all commands")
        .setColor(0xffa015);
      message.channel.send({ embeds: [embed] });
    }
  }
});

(async () => {
  const csvData = await readCSV("./users.csv");
  for (let i of csvData) {
    members[i.DISCORD_HANDLE] = i.LC_USERNAME;
  }
  await updateData();
  // log in to discord
  client.login(process.env.TOKEN);
})();
