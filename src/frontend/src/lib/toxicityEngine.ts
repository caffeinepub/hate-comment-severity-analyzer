export interface CategoryScore {
  name: string;
  label: string;
  score: number;
  matches: string[];
}

export interface ToxicityResult {
  overallScore: number;
  riskLevel: "low" | "moderate" | "high" | "severe";
  categories: CategoryScore[];
  flaggedCategories: string[];
}

export interface LearnedModel {
  // per category: map of word -> score (how much more likely in positive examples)
  categoryWordScores: Record<string, Record<string, number>>;
  // per category baseline prevalence (fraction of rows labeled 1)
  categoryPrevalence: Record<string, number>;
  totalRows: number;
}

const CATEGORIES = [
  {
    name: "toxic",
    label: "Toxic",
    weight: 0.25,
    keywords: [
      "hate",
      "garbage",
      "trash",
      "scum",
      "filth",
      "useless",
      "waste",
      "piece of",
      "go to hell",
      "shut up",
      "freak",
      "jerk",
      "ass",
      "damn",
      "crap",
      "bastard",
      "bitch",
      "hell",
      "idiot",
      "fool",
      "awful",
      "horrible",
      "terrible",
      "disgusting",
      "repulsive",
    ],
  },
  {
    name: "severe_toxic",
    label: "Severely Toxic",
    weight: 0.2,
    keywords: [
      "die",
      "kill yourself",
      "kys",
      "go die",
      "you should die",
      "cancer",
      "aids",
      "disease",
      "rot",
      "burn in",
      "suffer",
      "deserve to die",
      "worthless piece",
      "subhuman",
      "vermin",
      "parasite",
      "pest",
      "maggot",
    ],
  },
  {
    name: "obscene",
    label: "Obscene",
    weight: 0.15,
    keywords: [
      "fuck",
      "shit",
      "cock",
      "pussy",
      "dick",
      "cunt",
      "asshole",
      "motherfucker",
      "bullshit",
      "horseshit",
      "fck",
      "f*ck",
      "sh*t",
      "sexual",
      "porn",
      "naked",
      "nude",
      "explicit",
    ],
  },
  {
    name: "threat",
    label: "Threatening",
    weight: 0.2,
    keywords: [
      "kill",
      "hurt",
      "attack",
      "destroy you",
      "will find you",
      "watch out",
      "you'll pay",
      "come for you",
      "track you",
      "hunt you",
      "end you",
      "murder",
      "shoot",
      "stab",
      "beat you",
      "torture",
      "harm",
      "punish",
      "get you",
      "pay for this",
      "regret this",
      "make you pay",
    ],
  },
  {
    name: "insult",
    label: "Insulting",
    weight: 0.1,
    keywords: [
      "idiot",
      "stupid",
      "loser",
      "worthless",
      "pathetic",
      "moron",
      "dumb",
      "ugly",
      "fat",
      "disgusting",
      "retard",
      "imbecile",
      "brainless",
      "clueless",
      "incompetent",
      "ignorant",
      "dense",
      "buffoon",
      "clown",
      "joke",
      "laughingstock",
      "failure",
    ],
  },
  {
    name: "identity_hate",
    label: "Identity Hate",
    weight: 0.1,
    keywords: [
      "muslim",
      "jew",
      "christian",
      "black people",
      "white people",
      "asian",
      "mexican",
      "immigrant",
      "refugee",
      "gay",
      "lesbian",
      "transgender",
      "queer",
      "feminist",
      "liberal",
      "conservative",
      "infidel",
      "kike",
      "nigger",
      "spic",
      "chink",
      "wetback",
      "fag",
      "dyke",
      "tranny",
      "towelhead",
    ],
  },
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  toxic: 0.25,
  severe_toxic: 0.2,
  obscene: 0.15,
  threat: 0.2,
  insult: 0.1,
  identity_hate: 0.1,
};

const STOPWORDS = new Set([
  "the",
  "and",
  "is",
  "in",
  "it",
  "of",
  "to",
  "a",
  "was",
  "for",
  "that",
  "this",
  "with",
  "on",
  "be",
  "as",
  "are",
  "at",
  "an",
  "by",
  "or",
  "from",
  "but",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export function trainModelFromDataset(
  rows: Array<{ comment_text: string } & Record<string, string>>,
  categoryColumns: string[],
): LearnedModel {
  const totalDocs = rows.length;
  const categoryWordScores: Record<string, Record<string, number>> = {};
  const categoryPrevalence: Record<string, number> = {};

  for (const category of categoryColumns) {
    const positiveRows = rows.filter((r) => r[category] === "1");
    const positiveDocs = positiveRows.length;
    categoryPrevalence[category] = positiveDocs / Math.max(totalDocs, 1);

    // Count word frequencies in positive examples
    const posFreq: Record<string, number> = {};
    for (const row of positiveRows) {
      for (const word of tokenize(row.comment_text ?? "")) {
        posFreq[word] = (posFreq[word] ?? 0) + 1;
      }
    }

    // Count word frequencies in all rows
    const totalFreq: Record<string, number> = {};
    for (const row of rows) {
      for (const word of tokenize(row.comment_text ?? "")) {
        totalFreq[word] = (totalFreq[word] ?? 0) + 1;
      }
    }

    // Compute score = (posFreq / positiveDocs) / (totalFreq / totalDocs)
    const wordScores: Record<string, number> = {};
    for (const word of Object.keys(posFreq)) {
      const posRate = posFreq[word] / Math.max(positiveDocs, 1);
      const totalRate = (totalFreq[word] ?? 0) / Math.max(totalDocs, 1);
      const score = totalRate > 0 ? posRate / totalRate : 0;
      if (score > 1.2) {
        wordScores[word] = score;
      }
    }

    // Keep top 200 words by score
    const top200 = Object.entries(wordScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .reduce<Record<string, number>>((acc, [w, s]) => {
        acc[w] = s;
        return acc;
      }, {});

    categoryWordScores[category] = top200;
  }

  return { categoryWordScores, categoryPrevalence, totalRows: totalDocs };
}

export function analyzeWithLearnedModel(
  text: string,
  model: LearnedModel,
): ToxicityResult {
  if (!text.trim()) {
    return {
      overallScore: 0,
      riskLevel: "low",
      categories: CATEGORIES.map((c) => ({
        name: c.name,
        label: c.label,
        score: 0,
        matches: [],
      })),
      flaggedCategories: [],
    };
  }

  const tokens = tokenize(text);
  const tokenCount = Math.max(tokens.length, 1);

  let weightedSum = 0;
  const categories: CategoryScore[] = [];
  const flaggedCategories: string[] = [];

  for (const cat of CATEGORIES) {
    const wordScores = model.categoryWordScores[cat.name] ?? {};
    const prevalence = model.categoryPrevalence[cat.name] ?? 0;

    // Sum scores for matched tokens
    let scoreSum = 0;
    const matchedWords: string[] = [];
    for (const token of tokens) {
      if (wordScores[token] !== undefined) {
        scoreSum += wordScores[token];
        if (!matchedWords.includes(token)) matchedWords.push(token);
      }
    }

    const normalizedScore = scoreSum / tokenCount;
    let rawScore = Math.min(100, Math.round(normalizedScore * 60));

    // Boost by prevalence
    if (prevalence > 0.1) {
      rawScore = Math.min(100, rawScore + Math.round(prevalence * 10));
    }

    const score = Math.min(100, rawScore);
    const weight = CATEGORY_WEIGHTS[cat.name] ?? cat.weight;
    weightedSum += score * weight;

    categories.push({
      name: cat.name,
      label: cat.label,
      score,
      matches: matchedWords,
    });
    if (score > 0) {
      flaggedCategories.push(cat.label);
    }
  }

  const maxCategoryScore = Math.max(...categories.map((c) => c.score));
  const overallScore = Math.min(
    100,
    Math.round(weightedSum * 0.3 + maxCategoryScore * 0.7),
  );

  let riskLevel: "low" | "moderate" | "high" | "severe";
  if (overallScore <= 25) riskLevel = "low";
  else if (overallScore <= 50) riskLevel = "moderate";
  else if (overallScore <= 75) riskLevel = "high";
  else riskLevel = "severe";

  return { overallScore, riskLevel, categories, flaggedCategories };
}

/**
 * Score a single category by match count (not density).
 * Independent of text length -- works equally well for short typed text
 * and long OCR-extracted screenshots.
 *
 * Scoring:
 *   0 matches → 0
 *   1 match   → 50
 *   2 matches → 75
 *   3+ matches → 100
 */
function scoreCategory(
  text: string,
  keywords: string[],
): { score: number; matches: string[] } {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase()) && !found.includes(kw)) {
      found.push(kw);
    }
  }

  const matchCount = found.length;
  const score = matchCount === 0 ? 0 : Math.min(100, 25 + matchCount * 25);

  return { score, matches: found };
}

export function analyzeComment(text: string): ToxicityResult {
  if (!text.trim()) {
    return {
      overallScore: 0,
      riskLevel: "low",
      categories: CATEGORIES.map((c) => ({
        name: c.name,
        label: c.label,
        score: 0,
        matches: [],
      })),
      flaggedCategories: [],
    };
  }

  let weightedSum = 0;
  const categories: CategoryScore[] = [];
  const flaggedCategories: string[] = [];

  for (const cat of CATEGORIES) {
    const { score, matches } = scoreCategory(text, cat.keywords);
    weightedSum += score * cat.weight;
    categories.push({ name: cat.name, label: cat.label, score, matches });
    if (score > 0) {
      flaggedCategories.push(cat.label);
    }
  }

  const maxCategoryScore = Math.max(...categories.map((c) => c.score));
  const overallScore = Math.min(
    100,
    Math.round(weightedSum * 0.3 + maxCategoryScore * 0.7),
  );

  let riskLevel: "low" | "moderate" | "high" | "severe";
  if (overallScore <= 25) riskLevel = "low";
  else if (overallScore <= 50) riskLevel = "moderate";
  else if (overallScore <= 75) riskLevel = "high";
  else riskLevel = "severe";

  return { overallScore, riskLevel, categories, flaggedCategories };
}

export function analyzeCommentWithWeights(
  text: string,
  categoryWeights: Record<string, number>,
): ToxicityResult {
  if (!text.trim()) {
    return {
      overallScore: 0,
      riskLevel: "low",
      categories: CATEGORIES.map((c) => ({
        name: c.name,
        label: c.label,
        score: 0,
        matches: [],
      })),
      flaggedCategories: [],
    };
  }

  let weightedSum = 0;
  const categories: CategoryScore[] = [];
  const flaggedCategories: string[] = [];

  for (const cat of CATEGORIES) {
    const { score: rawScore, matches } = scoreCategory(text, cat.keywords);
    const multiplier = categoryWeights[cat.name] ?? 1.0;
    const score = Math.min(100, Math.round(rawScore * multiplier));
    weightedSum += score * cat.weight;
    categories.push({ name: cat.name, label: cat.label, score, matches });
    if (score > 0) {
      flaggedCategories.push(cat.label);
    }
  }

  const maxCategoryScore = Math.max(...categories.map((c) => c.score));
  const overallScore = Math.min(
    100,
    Math.round(weightedSum * 0.3 + maxCategoryScore * 0.7),
  );

  let riskLevel: "low" | "moderate" | "high" | "severe";
  if (overallScore <= 25) riskLevel = "low";
  else if (overallScore <= 50) riskLevel = "moderate";
  else if (overallScore <= 75) riskLevel = "high";
  else riskLevel = "severe";

  return { overallScore, riskLevel, categories, flaggedCategories };
}
