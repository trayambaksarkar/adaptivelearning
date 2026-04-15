const axios = require("axios");

const ML_API = "http://127.0.0.1:8000/predict-difficulty";
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

// Diffiulty prediction 
exports.getDifficultyPrediction = async (data) => {
  try {
    console.log("SENDING TO ML:", {
      response_time: Number(data.response_time),
      correctness: Number(data.correctness),
      hint_used: Number(data.hint_used),
      current_difficulty: Number(data.current_difficulty) // 🔥 ensure number
    });

    const response = await axios.post(
      ML_API,
      {
        response_time: Number(data.response_time),
        correctness: Number(data.correctness),
        hint_used: Number(data.hint_used),
        current_difficulty: Number(data.current_difficulty)
      },
      {
        timeout: 5000
      }
    );

    const predictedValue = response.data.difficulty;
    let difficulty_level = "medium";

    if (predictedValue <= 1.5) difficulty_level = "easy";
    else if (predictedValue <= 2.5) difficulty_level = "medium";
    else difficulty_level = "hard";

    return {
      predicted_difficulty: predictedValue,
      difficulty_level,
      model_used: response.data.model_used
    };

  } catch (error) {
    console.error("ML API Error:", error.response?.data || error.message);

    return {
      predicted_difficulty: 2,
      difficulty_level: "medium"
    };
  }
};

// youtube recommendation
exports.getYouTubeVideos = async (query) => {
  try {
    const res = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query,
          key: YT_API_KEY,
          maxResults: 2, // Number of videos to show
          type: "video"
        }
      }
    );

    return res.data.items.map((item) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium.url
    }));

  } catch (err) {
    console.error("YT API Error:", err.message);
    return [];
  }
};

//knowledge prediction for deep learning model to recommend
// 🔥 KNOWLEDGE PREDICTION (DKT)
exports.getKnowledgePrediction = async (history) => {
  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/predict-knowledge",
      { history },
      { timeout: 5000 }
    );

    return response.data;

  } catch (error) {
    console.error("DL API Error:", error.response?.data || error.message);

    return {
      knowledge: 0.5 // default neutral value
    };
  }
};