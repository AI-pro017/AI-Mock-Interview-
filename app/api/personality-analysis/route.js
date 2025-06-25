import { db } from '@/utils/db';
import { PersonalityFeedback } from '@/utils/schema';

// Example labeled data for k-NN (this is just an example, adapt as needed)
const sampleData = [
  { answers: [5, 4, 3, 2, 1, 5, 4, 3, 5, 4, 5, 3, 1, 4, 3], label: 'Analytical and detail-oriented' },
  { answers: [4, 3, 5, 4, 2, 4, 5, 3, 4, 3, 4, 2, 5, 5, 4], label: 'Creative and flexible' },
  { answers: [1, 1, 5, 1, 4, 1, 2, 5, 1, 2, 1, 4, 5, 2, 5], label: 'Reliable and practical' },
  { answers: [3, 2, 3, 4, 3, 4, 3, 3, 4, 3, 4, 5, 4, 4, 3], label: 'Outgoing and sociable' },
  { answers: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], label: 'Structured and disciplined' },
  { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], label: 'Empathetic and caring' },
  { answers: [4, 5, 3, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4, 5, 4], label: 'Assertive and confident' },
  { answers: [2, 2, 4, 3, 3, 2, 2, 4, 3, 2, 3, 4, 3, 2, 2], label: 'Reflective and calm' },
  { answers: [3, 4, 4, 3, 4, 3, 3, 3, 4, 4, 4, 4, 3, 3, 3], label: 'Spontaneous and adventurous' },
  { answers: [5, 4, 3, 5, 2, 5, 5, 5, 4, 3, 4, 2, 5, 3, 5], label: 'Organized and goal-oriented' },
  { answers: [1, 2, 5, 4, 1, 3, 3, 4, 3, 4, 3, 2, 4, 3, 4], label: 'Friendly and approachable'},
  { answers: [3, 3, 4, 5, 4, 4, 3, 4, 4, 3, 4, 4, 4, 3, 3], label: 'Strong leadership qualities'},
  { answers: [5, 5, 2, 5, 4, 5, 5, 2, 5, 4, 5, 4, 4, 5, 4], label: 'Balanced and neutral' },
  { answers: [4, 5, 3, 4, 4, 4, 5, 4, 3, 4, 3, 4, 4, 4, 4], label: 'Creative with unique perspectives'},
  { answers: [1, 4, 4, 2, 3, 5, 3, 4, 2, 3, 5, 4, 3, 5, 3], label: 'Optimistic and positive' },
  { answers: [3, 4, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 4, 4, 3], label: 'Energetic and dynamic'},
  { answers: [5, 4, 3, 4, 5, 4, 5, 3, 4, 3, 2, 5, 3, 5, 4], label: 'Reserved and introspective' },
];

// Method to calculate distance for k-NN
function calculateDistance(arr1, arr2) {
  return Math.sqrt(arr1.reduce((acc, val, i) => acc + Math.pow(val - arr2[i], 2), 0));
}

// k-NN classifier method
function kNNClassifier(responseData, k = 3) {
  const distances = sampleData.map((sample) => ({
    label: sample.label,
    distance: calculateDistance(sample.answers, responseData),
  }));

  distances.sort((a, b) => a.distance - b.distance);
  const nearestNeighbors = distances.slice(0, k);

  const labelCounts = nearestNeighbors.reduce((acc, neighbor) => {
    acc[neighbor.label] = (acc[neighbor.label] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(labelCounts).reduce((a, b) => (labelCounts[a] > labelCounts[b] ? a : b));
}

// Function to map answers to numeric values
function mapAnswerToScore(answer) {
  switch (answer) {
    case 'Strongly Agree':
      return 5;
    case 'Agree':
      return 4;
    case 'Neutral':
      return 3;
    case 'Disagree':
      return 2;
    case 'Strongly Disagree':
      return 1;
    default:
      return 0;
  }
}

// Function to analyze personality traits based on responses
function analyzePersonalityResults(results) {
  // Define the personality trait question categories
  const opennessQuestions = [1, 5, 7]; // Questions related to Openness
  const conscientiousnessQuestions = [2, 8, 13]; // Questions related to Conscientiousness
  const extraversionQuestions = [1, 6, 14, 15]; // Questions related to Extraversion
  const agreeablenessQuestions = [4, 6, 9, 11]; // Questions related to Agreeableness
  const neuroticismQuestions = [3, 4, 7, 10]; // Questions related to Neuroticism

  // Initialize scores for each trait
  let OpennessScore = 0;
  let ConscientiousnessScore = 0;
  let ExtraversionScore = 0;
  let AgreeablenessScore = 0;
  let NeuroticismScore = 0;

  // Loop through the results and calculate scores based on answers
  results.forEach((res) => {
    const answer = res.answer;
    const questionNumber = res.index; // Use index to identify the question

    // Get the mapped score for the user's answer
    const mappedScore = mapAnswerToScore(answer);

    // Assign the score to the appropriate personality trait based on question index
    if (opennessQuestions.includes(questionNumber)) {
      OpennessScore += mappedScore;
    }

    if (conscientiousnessQuestions.includes(questionNumber)) {
      ConscientiousnessScore += mappedScore;
    }

    if (extraversionQuestions.includes(questionNumber)) {
      ExtraversionScore += mappedScore;
    }

    if (agreeablenessQuestions.includes(questionNumber)) {
      AgreeablenessScore += mappedScore;
    }

    if (neuroticismQuestions.includes(questionNumber)) {
      NeuroticismScore += mappedScore;
    }
  });

const maxScore = opennessQuestions.length * 5; // 5 is the max score per question
const feedback = {
  Openness: OpennessScore > maxScore * 0.7 ? 'Open-minded' : 'Moderate openness',
  Conscientiousness: ConscientiousnessScore > maxScore * 0.7 ? 'Organized' : 'Flexible approach',
  Extraversion: ExtraversionScore > maxScore * 0.7 ? 'Outgoing' : 'Ambivert',
  Agreeableness: AgreeablenessScore > maxScore * 0.7 ? 'Empathetic' : 'Flexible in interactions',
  Neuroticism: NeuroticismScore > maxScore * 0.7 ? 'Emotionally reactive' : 'Emotionally stable',
};

  return {
    OpennessScore,
    ConscientiousnessScore,
    ExtraversionScore,
    AgreeablenessScore,
    NeuroticismScore,
    feedback,
  };
}

// Main GET function to fetch data and calculate score
export async function GET() {
  try {
    const results = await db.select().from(PersonalityFeedback);

    // Extracting answers and questions for personality analysis
    const userAnswers = results.map((res) => res.answer); 
    const userQuestions = results.map((res) => res.question); 

    // Analyze the user's answers and calculate scores
    const analyzedData = analyzePersonalityResults(results);

    // Calculate personality type using k-NN classifier
    const personalityType = kNNClassifier(userAnswers.map((answer) => parseInt(answer)), 3);

    // Return the analysis results including the calculated personality type
    return new Response(
      JSON.stringify({ ...analyzedData, personalityType, userQuestions, userAnswers }), 
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response('Error analyzing data', { status: 500 });
  }
}
