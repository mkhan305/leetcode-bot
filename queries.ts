const axios = require("axios");

const profileQuery = `
    query userSessionProgress($username: String!) {
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }  
    languageProblemCount {
      languageName
      problemsSolved
    }
    profile { 
      ranking
      userAvatar
    }
  }
}`;

const dailyQuery = `query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    link
    userStatus
    question {
      content
      acRate
      difficulty
      title
    }
  }
}`;

const streakQuery = `
query getStreakCounter {
  matchedUser(username: $username) {
    streakCounter {
      streakCount
      daysSkipped
      currentDayCompleted
    }
  } 
}
`;

export const getProfile = async (username: string) => {
  try {
    const response = await axios.post("https://leetcode.com/graphql/", {
      query: profileQuery,
      variables: { username: username },
    });

    return response.data.data.matchedUser;
  } catch (error) {
    console.error("Error fetching skill stats:", error);
  }
};

export const getDailyChallenge = async () => {
  try {
    const response = await axios.post("https://leetcode.com/graphql/", {
      query: dailyQuery,
    });
    return response.data.data.activeDailyCodingChallengeQuestion;
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
  }
};

export const getStreak = async (username: string) => {
  try {
    const response = await axios.post("https://leetcode.com/graphql/", {
      query: streakQuery,
      variables: { username: username },
    });
    return response.data.data.activeDailyCodingChallengeQuestion;
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
  }
};

export function convertToDiscordText(content: any) {
  // Replace HTML entities with their corresponding characters
  content = content.replace(/&nbsp;/g, " ");
  content = content.replace(/&#39;/g, "'");

  // Replace HTML tags with Discord markdown equivalents
  content = content.replace(/<p>/g, "\n").replace(/<\/p>/g, "\n");
  content = content.replace(/<strong>/g, "**").replace(/<\/strong>/g, "**");
  content = content.replace(/<em>/g, "*").replace(/<\/em>/g, "*");
  content = content.replace(/<code>/g, "`").replace(/<\/code>/g, "`");
  content = content.replace(/<ul>/g, "").replace(/<\/ul>/g, "");
  content = content.replace(/<li>/g, "• ").replace(/<\/li>/g, "\n");
  content = content.replace(/<pre>/g, "```\n").replace(/<\/pre>/g, "```\n");

  // Remove image tags entirely
  content = content.replace(/<img[^>]*>/g, "");

  // Remove any remaining HTML tags
  content = content.replace(/<\/?[^>]+(>|$)/g, "");

  // Extract content up until the first mention of "Example"
  const index = content.indexOf("Example");
  if (index !== -1) {
    content = content.substring(0, index);
  }

  // Clean up extra newlines
  content = content.replace(/\n\s*\n/g, "\n\n");

  return content.trim();
}

//getStreak("handsomebanana").then(console.log);

//getDailyChallenge()
//  .then((e: any) => convertToDiscord(e.question.content))
//  .then(console.log);
