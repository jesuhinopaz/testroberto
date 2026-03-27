import { DIFFICULTY_ORDER } from './constants.js';

export function getLocalizedText(value, language = 'en') {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.en ?? '';
}

export function uniqueTopics(questions) {
  return [...new Set(questions.map((question) => question.topic))].sort((a, b) => a.localeCompare(b));
}

export function uniqueLicenses(bank) {
  return bank.licenses.map((license) => ({
    id: license.id,
    name: getLocalizedText(license.name, 'en')
  }));
}

export function filterQuestions(questions, state) {
  const filters = state.studyFilters;
  const favorites = new Set(state.favorites);
  const reviewLater = new Set(state.reviewLater);

  let filtered = questions.filter((question) => {
    const stat = state.questionStats[question.id] ?? emptyQuestionStat();
    const matchesLicense = filters.licenseId === 'all' || question.licenseId === filters.licenseId;
    const matchesTopic = filters.topic === 'all' || question.topic === filters.topic;
    const matchesDifficulty = filters.difficulty === 'all' || question.difficulty === filters.difficulty;
    const haystack = JSON.stringify(question).toLowerCase();
    const matchesSearch = !filters.search || haystack.includes(filters.search.toLowerCase());
    const matchesFavorites = !filters.onlyFavorites || favorites.has(question.id);
    const matchesIncorrect = !filters.onlyIncorrect || stat.incorrectCount > 0;
    const matchesReviewLater = !filters.onlyReviewLater || reviewLater.has(question.id);

    return (
      matchesLicense &&
      matchesTopic &&
      matchesDifficulty &&
      matchesSearch &&
      matchesFavorites &&
      matchesIncorrect &&
      matchesReviewLater
    );
  });

  if (filters.randomized) {
    filtered = shuffle([...filtered]);
  } else {
    filtered.sort((a, b) => {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
    });
  }

  return filtered;
}

export function buildStudySession(questions, existing = null) {
  if (existing?.questionIds?.length) return existing;
  return {
    questionIds: questions.map((question) => question.id),
    currentIndex: 0,
    revealAnswer: false,
    selectedAnswerId: null,
    lastGeneratedAt: new Date().toISOString()
  };
}

export function getQuestionById(bank, questionId) {
  return bank.questions.find((question) => question.id === questionId) ?? null;
}

export function answerStudyQuestion(state, question, answerId) {
  const stats = state.questionStats[question.id] ?? emptyQuestionStat();
  const isCorrect = question.correctAnswerId === answerId;

  stats.attemptCount += 1;
  stats.lastAnsweredAt = new Date().toISOString();
  if (isCorrect) {
    stats.correctCount += 1;
  } else {
    stats.incorrectCount += 1;
  }

  state.questionStats[question.id] = stats;
  updateMastery(state, question.id, isCorrect);

  return isCorrect;
}

export function buildExamSession(questionIds, durationMinutes, selectedLicenseId) {
  return {
    active: true,
    questionIds,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    durationMinutes,
    results: null,
    selectedLicenseId
  };
}

export function finalizeExam(state, bank) {
  const exam = state.examSession;
  const reviewed = exam.questionIds.map((questionId) => {
    const question = getQuestionById(bank, questionId);
    const answerId = exam.answers[questionId] ?? null;
    const isCorrect = question?.correctAnswerId === answerId;

    const stats = state.questionStats[questionId] ?? emptyQuestionStat();
    stats.attemptCount += 1;
    stats.lastAnsweredAt = new Date().toISOString();
    if (isCorrect) stats.correctCount += 1;
    else stats.incorrectCount += 1;
    state.questionStats[questionId] = stats;
    updateMastery(state, questionId, isCorrect);

    return {
      questionId,
      answerId,
      isCorrect,
      correctAnswerId: question?.correctAnswerId ?? null
    };
  });

  const correct = reviewed.filter((item) => item.isCorrect).length;
  const total = reviewed.length || 1;
  const score = Math.round((correct / total) * 100);
  const result = {
    endedAt: new Date().toISOString(),
    correct,
    incorrect: total - correct,
    total,
    score,
    passed: score >= 70,
    reviewed
  };

  state.examSession.results = result;
  state.examSession.active = false;
  state.sessionHistory.unshift({
    id: crypto.randomUUID(),
    type: 'exam',
    createdAt: result.endedAt,
    totalQuestions: total,
    accuracy: score,
    minutes: exam.durationMinutes,
    licenseId: exam.selectedLicenseId
  });

  unlockAchievements(state);

  return result;
}

export function startStudyHistoryEntry(state, questionCount) {
  state.sessionHistory.unshift({
    id: crypto.randomUUID(),
    type: 'study',
    createdAt: new Date().toISOString(),
    totalQuestions: questionCount,
    accuracy: null,
    minutes: null,
    licenseId: state.studyFilters.licenseId === 'all' ? state.preferences.selectedLicenseId : state.studyFilters.licenseId
  });

  unlockAchievements(state);
}

export function buildRecommendations(state, bank, options = {}) {
  const licenseId = options.licenseId ?? state.preferences.selectedLicenseId;
  const pool = bank.questions.filter((question) => question.licenseId === licenseId);

  return pool
    .map((question) => {
      const stat = state.questionStats[question.id] ?? emptyQuestionStat();
      const mastery = state.mastery[question.id] ?? 0;
      const hoursSinceLast = stat.lastAnsweredAt
        ? (Date.now() - new Date(stat.lastAnsweredAt).getTime()) / 36e5
        : 999;
      const priority = stat.incorrectCount * 18 + Math.max(0, 60 - mastery) + Math.min(72, hoursSinceLast) + (stat.attemptCount === 0 ? 22 : 0);
      return { question, priority };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, options.limit ?? 8);
}

export function topicPerformance(state, bank) {
  const groups = new Map();
  for (const question of bank.questions) {
    const stat = state.questionStats[question.id] ?? emptyQuestionStat();
    const entry = groups.get(question.topic) ?? {
      topic: question.topic,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      licenseId: question.licenseId
    };
    entry.attempts += stat.attemptCount;
    entry.correct += stat.correctCount;
    entry.incorrect += stat.incorrectCount;
    groups.set(question.topic, entry);
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      accuracy: item.attempts ? Math.round((item.correct / item.attempts) * 100) : null
    }))
    .sort((a, b) => {
      const aScore = a.accuracy ?? 999;
      const bScore = b.accuracy ?? 999;
      return aScore - bScore;
    });
}

export function overallMetrics(state, bank) {
  const stats = Object.values(state.questionStats);
  const totals = stats.reduce(
    (acc, stat) => {
      acc.attempts += stat.attemptCount;
      acc.correct += stat.correctCount;
      acc.incorrect += stat.incorrectCount;
      return acc;
    },
    { attempts: 0, correct: 0, incorrect: 0 }
  );

  const studySessions = state.sessionHistory.filter((session) => session.type === 'study').length;
  const streak = calculateStreak(state.sessionHistory);

  return {
    totalQuestions: bank.questions.length,
    attempts: totals.attempts,
    correct: totals.correct,
    incorrect: totals.incorrect,
    accuracy: totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : 0,
    studySessions,
    streak,
    favorites: state.favorites.length,
    reviewLater: state.reviewLater.length
  };
}

export function usageByLicense(state, bank) {
  return bank.licenses.map((license) => {
    const questionIds = bank.questions.filter((question) => question.licenseId === license.id).map((question) => question.id);
    const stats = questionIds.map((id) => state.questionStats[id] ?? emptyQuestionStat());
    const attempts = stats.reduce((sum, stat) => sum + stat.attemptCount, 0);
    const correct = stats.reduce((sum, stat) => sum + stat.correctCount, 0);
    return {
      licenseId: license.id,
      questionCount: questionIds.length,
      attempts,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : 0
    };
  });
}

export function buildAchievements(state) {
  const metrics = {
    totalAttempts: Object.values(state.questionStats).reduce((sum, stat) => sum + stat.attemptCount, 0),
    favorites: state.favorites.length,
    streak: calculateStreak(state.sessionHistory),
    sessions: state.sessionHistory.length,
    masteryCount: Object.values(state.mastery).filter((value) => value >= 80).length
  };

  const badges = [
    { id: 'first-steps', icon: '🚀', label: 'First Steps', unlocked: metrics.totalAttempts >= 5 },
    { id: 'focused', icon: '🎯', label: 'Focused Learner', unlocked: metrics.masteryCount >= 5 },
    { id: 'consistent', icon: '🔥', label: 'Streak Builder', unlocked: metrics.streak >= 3 },
    { id: 'collector', icon: '⭐', label: 'Favorite Collector', unlocked: metrics.favorites >= 5 }
  ];

  return badges;
}

export function parseCsvQuestions(csvText) {
  const rows = tokenizeCsv(csvText.trim());
  if (!rows.length) return [];

  const [header, ...records] = rows;
  return records
    .filter((record) => record.some(Boolean))
    .map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] ?? ''])))
    .map((row) => normalizeImportedRow(row));
}

function normalizeImportedRow(row) {
  const id = row.id || `q-${crypto.randomUUID()}`;
  return {
    id,
    licenseId: row.licenseId || 'va-a1',
    examId: row.examId || 'va-a1-core',
    category: row.category || 'Imported',
    topic: row.topic || 'Imported',
    difficulty: row.difficulty || 'medium',
    tags: splitTags(row.tags),
    text: {
      en: row.question_en || row.text_en || row.question || 'Imported question',
      es: row.question_es || row.text_es || row.question || 'Pregunta importada'
    },
    answers: ['a', 'b', 'c', 'd'].map((idLetter) => ({
      id: idLetter,
      text: {
        en: row[`answer${idLetter.toUpperCase()}_en`] || row[`answer_${idLetter}_en`] || row[`answer${idLetter.toUpperCase()}`] || '',
        es: row[`answer${idLetter.toUpperCase()}_es`] || row[`answer_${idLetter}_es`] || row[`answer${idLetter.toUpperCase()}`] || ''
      }
    })),
    correctAnswerId: (row.correctAnswerId || row.correct || 'a').toLowerCase(),
    explanation: {
      en: row.explanation_en || row.explanation || '',
      es: row.explanation_es || row.explanation || ''
    }
  };
}

function splitTags(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenizeCsv(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      current.push(field.trim());
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      current.push(field.trim());
      rows.push(current);
      current = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length || current.length) {
    current.push(field.trim());
    rows.push(current);
  }

  return rows;
}

export function formatRelativeDate(dateString) {
  if (!dateString) return '—';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / 36e5);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function emptyQuestionStat() {
  return {
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastAnsweredAt: null
  };
}

function updateMastery(state, questionId, isCorrect) {
  const current = state.mastery[questionId] ?? 0;
  const next = isCorrect ? current + 12 : current - 10;
  state.mastery[questionId] = clamp(next, 0, 100);
}

function calculateStreak(history) {
  if (!history.length) return 0;
  const days = [...new Set(history.map((item) => item.createdAt.slice(0, 10)))].sort().reverse();
  let streak = 0;
  const pointer = new Date();
  pointer.setHours(0, 0, 0, 0);

  for (const day of days) {
    const expected = pointer.toISOString().slice(0, 10);
    if (day === expected) {
      streak += 1;
      pointer.setDate(pointer.getDate() - 1);
    } else if (streak === 0) {
      pointer.setDate(pointer.getDate() - 1);
      if (day === pointer.toISOString().slice(0, 10)) {
        streak += 1;
        pointer.setDate(pointer.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

function unlockAchievements(state) {
  state.achievements = buildAchievements(state).filter((item) => item.unlocked).map((item) => item.id);
}
