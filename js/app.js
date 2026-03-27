import { DEFAULT_APP_STATE, UI_TEXT } from './constants.js';
import {
  answerStudyQuestion,
  buildAchievements,
  buildExamSession,
  buildRecommendations,
  buildStudySession,
  filterQuestions,
  finalizeExam,
  getLocalizedText,
  getQuestionById,
  parseCsvQuestions,
  shuffle,
  startStudyHistoryEntry
} from './logic.js';
import {
  exportBackupPayload,
  importBackupPayload,
  loadAppState,
  loadSeedData,
  resetProgressState,
  saveAppState,
  saveQuestionBank
} from './storage.js';
import { renderRoute } from './views.js';

const state = loadAppState();
const bank = await loadSeedData();
let deferredPrompt = null;
let examTimerId = null;

const viewRoot = document.getElementById('view-root');
const themeToggle = document.getElementById('theme-toggle');
const languageSwitcher = document.getElementById('language-switcher');
const installButton = document.getElementById('install-btn');
const currentUserName = document.getElementById('current-user-name');
const statusBanner = document.getElementById('status-banner');

initialize();

function initialize() {
  hydrateDefaults();
  bindGlobalEvents();
  render();
  registerServiceWorker();
}

function hydrateDefaults() {
  document.body.classList.toggle('light', state.theme === 'light');
  themeToggle.checked = state.theme !== 'light';
  languageSwitcher.value = state.language;
  currentUserName.textContent = state.user.name || 'Local Student';
}

function bindGlobalEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);

  themeToggle.addEventListener('change', () => {
    state.theme = themeToggle.checked ? 'dark' : 'light';
    persistAndRender(false);
  });

  languageSwitcher.addEventListener('change', () => {
    state.language = languageSwitcher.value;
    persistAndRender(false);
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.classList.remove('hidden');
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    installButton.classList.add('hidden');
    showStatus('App installed successfully.');
  });

  document.getElementById('export-backup').addEventListener('click', exportBackup);
  document.getElementById('import-backup-input').addEventListener('change', importBackup);
}

function handleClick(event) {
  const navButton = event.target.closest('.nav-btn');
  if (navButton) {
    state.route = navButton.dataset.route;
    persistAndRender(false);
    return;
  }

  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) return;
  const action = actionNode.dataset.action;
  const questionId = actionNode.dataset.questionId;
  const answerId = actionNode.dataset.answerId;

  switch (action) {
    case 'resume-study':
      state.route = 'study';
      ensureStudySession();
      persistAndRender(false);
      break;
    case 'open-exam':
    case 'new-exam':
      clearExamSession();
      state.route = 'exam';
      persistAndRender(false);
      break;
    case 'smart-review':
      launchSmartReview();
      break;
    case 'generate-study':
      generateStudySession();
      break;
    case 'study-prev':
      moveStudy(-1);
      break;
    case 'study-next':
      moveStudy(1);
      break;
    case 'toggle-reveal':
      state.studySession.revealAnswer = !state.studySession.revealAnswer;
      persistAndRender(false);
      break;
    case 'answer-study':
      handleStudyAnswer(answerId);
      break;
    case 'toggle-favorite':
      toggleArrayMembership(state.favorites, questionId);
      persistAndRender(false);
      break;
    case 'toggle-review-later':
      toggleArrayMembership(state.reviewLater, questionId);
      persistAndRender(false);
      break;
    case 'toggle-mastery':
      state.mastery[questionId] = actionNode.dataset.mastered === 'yes' ? 30 : 100;
      persistAndRender(false);
      break;
    case 'open-question':
      openQuestionInStudy(questionId);
      break;
    case 'launch-exam':
      launchExam();
      break;
    case 'answer-exam':
      handleExamAnswer(answerId);
      break;
    case 'exam-prev':
      moveExam(-1);
      break;
    case 'exam-next':
      moveExam(1);
      break;
    case 'submit-exam':
      submitExam();
      break;
    case 'clear-exam':
      clearExamSession();
      persistAndRender(false);
      break;
    case 'export-questions':
      exportQuestions();
      break;
    case 'save-question':
      saveNewQuestion();
      break;
    case 'save-profile':
      saveProfile();
      break;
    case 'save-settings':
      saveSettings();
      break;
    case 'reset-progress':
      resetProgress();
      break;
    default:
      break;
  }
}

function handleChange(event) {
  const filterSelect = event.target.closest('[data-filter]');
  if (filterSelect) {
    state.studyFilters[filterSelect.dataset.filter] = filterSelect.value;
    persistAndRender(false);
    return;
  }

  const checkbox = event.target.closest('[data-filter-checkbox]');
  if (checkbox) {
    state.studyFilters[checkbox.dataset.filterCheckbox] = checkbox.checked;
    persistAndRender(false);
    return;
  }

  if (event.target.id === 'question-import-input') {
    importQuestions(event);
  }
}

function handleInput(event) {
  const filterInput = event.target.closest('[data-filter="search"]');
  if (filterInput) {
    state.studyFilters.search = filterInput.value;
    persistAndRender(false);
  }
}

function render() {
  const dict = UI_TEXT[state.language] || UI_TEXT.en;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = dict[key] ?? key;
  });

  const titleMap = { dashboard: dict.dashboard, study: dict.studyMode, exam: dict.examMode, review: dict.reviewCenter, progress: dict.progress, admin: dict.adminPanel, settings: dict.settings };
  document.title = `BuilderPrep Pro · ${titleMap[state.route] || dict.dashboard}`;
  currentUserName.textContent = state.user.name || 'Local Student';
  document.body.classList.toggle('light', state.theme === 'light');
  themeToggle.checked = state.theme !== 'light';
  languageSwitcher.value = state.language;

  viewRoot.innerHTML = renderRoute(state.route, state, bank, dict);

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === state.route);
  });

  if (state.route === 'exam' && state.examSession.active) {
    startExamTimer();
  } else {
    stopExamTimer();
  }
}

function ensureStudySession() {
  const filtered = filterQuestions(bank.questions, state);
  if (!state.studySession.questionIds.length || state.studySession.currentIndex >= state.studySession.questionIds.length) {
    state.studySession = buildStudySession(filtered);
  }
}

function generateStudySession() {
  const filtered = filterQuestions(bank.questions, state);
  state.studySession = buildStudySession(filtered, null);
  if (!state.sessionHistory.some((item) => item.type === 'study' && sameDay(item.createdAt, new Date().toISOString()))) {
    startStudyHistoryEntry(state, filtered.length);
  }
  persistAndRender();
}

function handleStudyAnswer(answerId) {
  ensureStudySession();
  const questionId = state.studySession.questionIds[state.studySession.currentIndex];
  const question = getQuestionById(bank, questionId);
  if (!question) return;

  state.studySession.selectedAnswerId = answerId;
  state.studySession.revealAnswer = true;
  const isCorrect = answerStudyQuestion(state, question, answerId);
  buildAchievements(state);
  showStatus(isCorrect ? 'Correct answer recorded.' : 'Incorrect answer recorded.');
  persistAndRender();
}

function moveStudy(delta) {
  ensureStudySession();
  const maxIndex = Math.max(0, state.studySession.questionIds.length - 1);
  state.studySession.currentIndex = clamp(state.studySession.currentIndex + delta, 0, maxIndex);
  state.studySession.revealAnswer = false;
  state.studySession.selectedAnswerId = null;
  persistAndRender(false);
}

function openQuestionInStudy(questionId) {
  state.route = 'study';
  state.studySession = {
    questionIds: [questionId],
    currentIndex: 0,
    revealAnswer: false,
    selectedAnswerId: null,
    lastGeneratedAt: new Date().toISOString()
  };
  persistAndRender(false);
}

function launchSmartReview() {
  const recommended = buildRecommendations(state, bank, { limit: 12, licenseId: state.preferences.selectedLicenseId });
  state.route = 'study';
  state.studyFilters.licenseId = state.preferences.selectedLicenseId;
  state.studyFilters.onlyFavorites = false;
  state.studyFilters.onlyIncorrect = false;
  state.studyFilters.onlyReviewLater = false;
  state.studySession = {
    questionIds: recommended.map((item) => item.question.id),
    currentIndex: 0,
    revealAnswer: false,
    selectedAnswerId: null,
    lastGeneratedAt: new Date().toISOString()
  };
  startStudyHistoryEntry(state, recommended.length);
  persistAndRender();
}

function launchExam() {
  const selectedLicenseId = document.getElementById('exam-license')?.value || state.preferences.selectedLicenseId;
  const questionCount = Number(document.getElementById('exam-count')?.value || state.preferences.examLength);
  const durationMinutes = Number(document.getElementById('exam-duration')?.value || state.preferences.examMinutes);

  const pool = bank.questions.filter((question) => question.licenseId === selectedLicenseId);
  const questionIds = shuffle(pool.map((question) => question.id)).slice(0, Math.min(questionCount, pool.length));

  state.preferences.selectedLicenseId = selectedLicenseId;
  state.preferences.examLength = questionCount;
  state.preferences.examMinutes = durationMinutes;
  state.examSession = buildExamSession(questionIds, durationMinutes, selectedLicenseId);
  persistAndRender();
}

function handleExamAnswer(answerId) {
  const questionId = state.examSession.questionIds[state.examSession.currentIndex];
  if (!questionId) return;
  state.examSession.answers[questionId] = answerId;
  persistAndRender(false);
}

function moveExam(delta) {
  const maxIndex = Math.max(0, state.examSession.questionIds.length - 1);
  state.examSession.currentIndex = clamp(state.examSession.currentIndex + delta, 0, maxIndex);
  persistAndRender(false);
}

function submitExam() {
  if (!state.examSession.questionIds.length) return;
  finalizeExam(state, bank);
  persistAndRender();
  showStatus('Exam submitted and saved locally.');
}

function clearExamSession() {
  state.examSession = structuredClone(DEFAULT_APP_STATE.examSession);
  stopExamTimer();
}

async function importQuestions(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  let importedQuestions = [];

  if (file.name.toLowerCase().endsWith('.csv')) {
    importedQuestions = parseCsvQuestions(text);
  } else {
    const payload = JSON.parse(text);
    importedQuestions = Array.isArray(payload) ? payload : payload.questions ?? [];
  }

  if (!importedQuestions.length) {
    showStatus('No valid questions found in import.', true);
    return;
  }

  const knownIds = new Set(bank.questions.map((question) => question.id));
  const unique = importedQuestions.filter((question) => !knownIds.has(question.id));
  bank.questions.push(...unique);
  saveQuestionBank(bank);
  event.target.value = '';
  showStatus(`Imported ${unique.length} new questions.`);
  persistAndRender(false);
}

function exportQuestions() {
  downloadJson('builderprep-question-bank.json', bank);
}

function saveNewQuestion() {
  const question = {
    id: `q-${crypto.randomUUID()}`,
    licenseId: readValue('new-license', state.preferences.selectedLicenseId),
    examId: readValue('new-license', state.preferences.selectedLicenseId) === 'va-b' ? 'va-b-core' : 'va-a1-core',
    category: readValue('new-category', 'Imported'),
    topic: readValue('new-topic', 'Imported'),
    difficulty: readValue('new-difficulty', 'medium'),
    tags: readValue('new-tags', '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    text: {
      en: readValue('new-question-en', 'New question'),
      es: readValue('new-question-es', 'Nueva pregunta')
    },
    answers: ['a', 'b', 'c', 'd'].map((idLetter) => ({
      id: idLetter,
      text: {
        en: readValue(`new-answer-${idLetter}`, ''),
        es: readValue(`new-answer-${idLetter}`, '')
      }
    })),
    correctAnswerId: readValue('new-correct-answer', 'a'),
    explanation: {
      en: readValue('new-explanation-en', ''),
      es: readValue('new-explanation-es', '')
    }
  };

  bank.questions.unshift(question);
  saveQuestionBank(bank);
  showStatus('Question saved to local bank.');
  persistAndRender(false);
}

function saveProfile() {
  state.user.name = readValue('profile-name', state.user.name);
  state.user.email = readValue('profile-email', state.user.email);
  persistAndRender();
  showStatus('Profile saved locally.');
}

function saveSettings() {
  state.preferences.selectedLicenseId = readValue('settings-license', state.preferences.selectedLicenseId);
  state.preferences.dailyGoalMinutes = Number(readValue('settings-goal', state.preferences.dailyGoalMinutes));
  state.preferences.examLength = Number(readValue('settings-exam-length', state.preferences.examLength));
  state.preferences.examMinutes = Number(readValue('settings-exam-minutes', state.preferences.examMinutes));
  persistAndRender();
  showStatus('Settings saved locally.');
}

function resetProgress() {
  const cleanState = resetProgressState();
  Object.assign(state, cleanState);
  clearExamSession();
  persistAndRender();
  showStatus('Progress reset completed.');
}

function exportBackup() {
  const payload = exportBackupPayload(state, bank);
  downloadJson(`builderprep-backup-${new Date().toISOString().slice(0, 10)}.json`, payload);
  showStatus('Backup exported successfully.');
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  const payload = JSON.parse(text);
  importBackupPayload(payload);

  const freshState = loadAppState();
  Object.assign(state, freshState);
  const freshBank = await loadSeedData();
  bank.meta = freshBank.meta;
  bank.licenses = freshBank.licenses;
  bank.exams = freshBank.exams;
  bank.questions = freshBank.questions;

  event.target.value = '';
  persistAndRender();
  showStatus('Backup imported successfully.');
}

function persistAndRender(_save = true) {
  saveAppState(state);
  render();
}

function showStatus(message, isError = false) {
  statusBanner.textContent = message;
  statusBanner.classList.remove('hidden');
  statusBanner.style.background = isError ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)';
  clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = setTimeout(() => statusBanner.classList.add('hidden'), 3200);
}

function readValue(id, fallback) {
  return document.getElementById(id)?.value?.trim() || fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toggleArrayMembership(array, value) {
  const index = array.indexOf(value);
  if (index >= 0) array.splice(index, 1);
  else array.push(value);
}

function startExamTimer() {
  stopExamTimer();
  const timerNode = document.getElementById('exam-timer');
  if (!timerNode) return;

  const startedAt = new Date(state.examSession.startedAt).getTime();
  const endsAt = startedAt + state.examSession.durationMinutes * 60 * 1000;

  const tick = () => {
    const remainingMs = endsAt - Date.now();
    if (remainingMs <= 0) {
      timerNode.textContent = '00:00';
      stopExamTimer();
      submitExam();
      return;
    }
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    timerNode.textContent = `${minutes}:${seconds}`;
  };

  tick();
  examTimerId = setInterval(tick, 1000);
}

function stopExamTimer() {
  if (examTimerId) {
    clearInterval(examTimerId);
    examTimerId = null;
  }
}

function sameDay(a, b) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch (error) {
    console.error('SW registration failed', error);
  }
}
