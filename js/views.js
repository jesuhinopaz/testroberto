import {
  buildAchievements,
  buildRecommendations,
  filterQuestions,
  formatRelativeDate,
  getLocalizedText,
  getQuestionById,
  overallMetrics,
  topicPerformance,
  uniqueTopics,
  usageByLicense
} from './logic.js';

function t(dict, key) {
  return dict[key] ?? key;
}

function metricCard(label, value, subtle = '') {
  return `
    <article class="metric-card card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-subtle">${subtle}</div>
    </article>
  `;
}

function optionList(items, selected, includeAll = false, allLabel = 'All') {
  const allOption = includeAll ? `<option value="all" ${selected === 'all' ? 'selected' : ''}>${allLabel}</option>` : '';
  return `${allOption}${items
    .map((item) => `<option value="${escapeHtml(item.value)}" ${selected === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`)
    .join('')}`;
}

export function renderRoute(route, state, bank, dict) {
  switch (route) {
    case 'study':
      return renderStudy(state, bank, dict);
    case 'exam':
      return renderExam(state, bank, dict);
    case 'review':
      return renderReview(state, bank, dict);
    case 'progress':
      return renderProgress(state, bank, dict);
    case 'admin':
      return renderAdmin(state, bank, dict);
    case 'settings':
      return renderSettings(state, bank, dict);
    case 'dashboard':
    default:
      return renderDashboard(state, bank, dict);
  }
}

export function getRouteTitle(route, dict) {
  const map = {
    dashboard: t(dict, 'dashboard'),
    study: t(dict, 'studyMode'),
    exam: t(dict, 'examMode'),
    review: t(dict, 'reviewCenter'),
    progress: t(dict, 'progress'),
    admin: t(dict, 'adminPanel'),
    settings: t(dict, 'settings')
  };
  return map[route] ?? t(dict, 'dashboard');
}

function renderDashboard(state, bank, dict) {
  const metrics = overallMetrics(state, bank);
  const recommendations = buildRecommendations(state, bank, { limit: 6, licenseId: state.preferences.selectedLicenseId });
  const weakTopics = topicPerformance(state, bank).slice(0, 5).filter((topic) => topic.attempts > 0);
  const achievements = buildAchievements(state);
  const history = state.sessionHistory.slice(0, 5);

  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'dashboard')}</h2>
        <p class="page-subtitle">${t(dict, 'installHint')}</p>
      </div>
      <div class="inline-actions">
        <button class="btn" data-action="resume-study">${t(dict, 'continueStudy')}</button>
        <button class="btn btn-secondary" data-action="open-exam">${t(dict, 'startExam')}</button>
        <button class="btn btn-secondary" data-action="smart-review">${t(dict, 'smartReview')}</button>
      </div>
    </div>

    <section class="login-grid">
      <article class="hero-card card">
        <div class="hero-copy">
          <h2>${escapeHtml(bank.meta.appName)} · ${t(dict, 'localCloudReady')}</h2>
          <p class="page-subtitle">
            This starter already includes study mode, exam mode, local profile, favorites, progress tracking, PWA shell,
            import/export, multi-license data separation, and an admin seed workflow.
          </p>
        </div>
        <div class="pill-row">
          <span class="pill">PWA</span>
          <span class="pill">Offline</span>
          <span class="pill">Multi-license</span>
          <span class="pill">i18n</span>
          <span class="pill">Admin import</span>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>${t(dict, 'quickActions')}</h3>
          <span class="pill pill-success">Local MVP</span>
        </div>
        <div class="kpi-list">
          <div class="kpi-item"><strong>${state.user.name || 'Local Student'}</strong><span class="small-note">${escapeHtml(state.user.email || 'No email saved')}</span></div>
          <div class="kpi-item"><strong>${getLocalizedLicenseName(bank, state.preferences.selectedLicenseId, state.language)}</strong><span class="small-note">Default active license</span></div>
          <div class="kpi-item"><strong>${state.preferences.dailyGoalMinutes} min</strong><span class="small-note">Daily study goal</span></div>
        </div>
      </article>
    </section>

    <section class="metric-grid" style="margin-top:1rem;">
      ${metricCard(t(dict, 'totalQuestions'), metrics.totalQuestions, `${metrics.favorites} favorites · ${metrics.reviewLater} review later`)}
      ${metricCard(t(dict, 'accuracy'), `${metrics.accuracy}%`, `${metrics.correct}/${metrics.attempts || 0} answered correctly`)}
      ${metricCard(t(dict, 'studySessions'), metrics.studySessions, `${state.sessionHistory.length} total tracked sessions`)}
      ${metricCard(t(dict, 'currentStreak'), metrics.streak, 'Days with activity')}
    </section>

    <section class="grid-2" style="margin-top:1rem;">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'weakTopics')}</h3></div>
        ${weakTopics.length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>Topic</th><th>Attempts</th><th>${t(dict, 'accuracy')}</th></tr></thead><tbody>${weakTopics
              .map(
                (topic) => `<tr><td>${escapeHtml(topic.topic)}</td><td>${topic.attempts}</td><td>${topic.accuracy ?? '—'}%</td></tr>`
              )
              .join('')}</tbody></table></div>`
          : `<div class="empty-state">${t(dict, 'noWeakTopics')}</div>`}
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'recommendedQueue')}</h3></div>
        ${recommendations.length
          ? `<div class="stack-xs">${recommendations
              .map(
                ({ question, priority }) => `
                  <button class="answer-btn" data-action="open-question" data-question-id="${question.id}">
                    <strong>${escapeHtml(getLocalizedText(question.text, state.language))}</strong>
                    <div class="small-note">${escapeHtml(question.topic)} · priority ${Math.round(priority)}</div>
                  </button>`
              )
              .join('')}</div>`
          : `<div class="empty-state">${t(dict, 'smartExplanation')}</div>`}
      </article>
    </section>

    <section class="grid-2" style="margin-top:1rem;">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'recentActivity')}</h3></div>
        ${history.length
          ? `<div class="stack-xs">${history
              .map(
                (item) => `<div class="kpi-item"><strong>${capitalize(item.type)}</strong><span class="small-note">${formatRelativeDate(item.createdAt)} · ${item.totalQuestions} questions${item.accuracy !== null ? ` · ${item.accuracy}%` : ''}</span></div>`
              )
              .join('')}</div>`
          : `<div class="empty-state">${t(dict, 'noHistory')}</div>`}
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'achievements')}</h3></div>
        <div class="badge-grid">
          ${achievements
            .map(
              (badge) => `
                <div class="badge-card card">
                  <div class="badge-icon">${badge.icon}</div>
                  <strong>${badge.label}</strong>
                  <div class="small-note">${badge.unlocked ? 'Unlocked' : 'Locked'}</div>
                </div>`
            )
            .join('')}
        </div>
      </article>
    </section>
  `;
}

function renderStudy(state, bank, dict) {
  const questions = filterQuestions(bank.questions, state);
  const topics = uniqueTopics(bank.questions.filter((question) => state.studyFilters.licenseId === 'all' || question.licenseId === state.studyFilters.licenseId));
  const session = state.studySession.questionIds.length ? state.studySession : { questionIds: questions.map((item) => item.id), currentIndex: 0, revealAnswer: false, selectedAnswerId: null };
  const currentQuestionId = session.questionIds[session.currentIndex] ?? questions[0]?.id;
  const question = getQuestionById(bank, currentQuestionId);
  const stat = state.questionStats[currentQuestionId] ?? { attemptCount: 0, incorrectCount: 0 };
  const isFavorite = state.favorites.includes(currentQuestionId);
  const inReviewLater = state.reviewLater.includes(currentQuestionId);
  const mastery = state.mastery[currentQuestionId] ?? 0;

  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'studyMode')}</h2>
        <p class="page-subtitle">Browse the bank by topic, difficulty, keywords, favorites, or mistakes. This mode saves progress locally.</p>
      </div>
      <div class="pill-row">
        <span class="pill">${questions.length} filtered</span>
        <span class="pill">Mastery ${mastery}%</span>
      </div>
    </div>

    <article class="card">
      <div class="card-title-row"><h3>${t(dict, 'studyControls')}</h3></div>
      <div class="controls-grid">
        <div class="field"><label>${t(dict, 'license')}</label><select data-filter="licenseId">${optionList(bank.licenses.map((license) => ({ value: license.id, label: getLocalizedText(license.name, state.language) })), state.studyFilters.licenseId, true)}</select></div>
        <div class="field"><label>${t(dict, 'topic')}</label><select data-filter="topic">${optionList(topics.map((topic) => ({ value: topic, label: topic })), state.studyFilters.topic, true)}</select></div>
        <div class="field"><label>${t(dict, 'difficulty')}</label><select data-filter="difficulty">${optionList([{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }], state.studyFilters.difficulty, true)}</select></div>
        <div class="field"><label>${t(dict, 'search')}</label><input data-filter="search" type="text" value="${escapeHtml(state.studyFilters.search)}" placeholder="keyword" /></div>
        <div class="field"><label>&nbsp;</label><button class="btn" data-action="generate-study">${t(dict, 'generateSet')}</button></div>
      </div>
      <div class="pill-row">
        <label class="pill"><input data-filter-checkbox="onlyFavorites" type="checkbox" ${state.studyFilters.onlyFavorites ? 'checked' : ''}/> ${t(dict, 'favoritesOnly')}</label>
        <label class="pill"><input data-filter-checkbox="onlyIncorrect" type="checkbox" ${state.studyFilters.onlyIncorrect ? 'checked' : ''}/> ${t(dict, 'incorrectOnly')}</label>
        <label class="pill"><input data-filter-checkbox="onlyReviewLater" type="checkbox" ${state.studyFilters.onlyReviewLater ? 'checked' : ''}/> ${t(dict, 'reviewLaterOnly')}</label>
        <label class="pill"><input data-filter-checkbox="randomized" type="checkbox" ${state.studyFilters.randomized ? 'checked' : ''}/> ${t(dict, 'randomized')}</label>
      </div>
    </article>

    ${question
      ? `
        <article class="question-card card" style="margin-top:1rem;">
          <div class="question-header">
            <div>
              <div class="question-meta">
                <span class="pill">${escapeHtml(question.category)}</span>
                <span class="pill">${escapeHtml(question.topic)}</span>
                <span class="pill">${escapeHtml(question.difficulty)}</span>
                <span class="pill">${stat.attemptCount} attempts</span>
                <span class="pill">${stat.incorrectCount} missed</span>
              </div>
              <div class="question-text">${escapeHtml(getLocalizedText(question.text, state.language))}</div>
            </div>
            <div class="small-note">${session.currentIndex + 1} / ${session.questionIds.length}</div>
          </div>

          <div class="answer-list">
            ${question.answers
              .map((answer) => {
                const selected = session.selectedAnswerId === answer.id;
                const showReveal = session.revealAnswer;
                const classNames = ['answer-btn'];
                if (showReveal && answer.id === question.correctAnswerId) classNames.push('correct');
                if (showReveal && selected && answer.id !== question.correctAnswerId) classNames.push('incorrect');

                return `<button class="${classNames.join(' ')}" data-action="answer-study" data-answer-id="${answer.id}">${answer.id.toUpperCase()}. ${escapeHtml(getLocalizedText(answer.text, state.language))}</button>`;
              })
              .join('')}
          </div>

          ${session.revealAnswer
            ? `<div class="explanation-box"><strong>${t(dict, 'explanation')}:</strong><p>${escapeHtml(getLocalizedText(question.explanation, state.language))}</p></div>`
            : ''}

          <div class="question-actions" style="margin-top:1rem;">
            <button class="btn btn-secondary" data-action="study-prev">${t(dict, 'previous')}</button>
            <button class="btn btn-secondary" data-action="study-next">${t(dict, 'next')}</button>
            <button class="btn btn-secondary" data-action="toggle-reveal">${session.revealAnswer ? t(dict, 'hideAnswer') : t(dict, 'revealAnswer')}</button>
            <button class="btn btn-secondary" data-action="toggle-favorite" data-question-id="${question.id}">${isFavorite ? t(dict, 'unfavorite') : t(dict, 'favorite')}</button>
            <button class="btn btn-secondary" data-action="toggle-review-later" data-question-id="${question.id}">${inReviewLater ? t(dict, 'removeReviewLater') : t(dict, 'markReviewLater')}</button>
            <button class="btn" data-action="toggle-mastery" data-question-id="${question.id}" data-mastered="${mastery >= 80 ? 'yes' : 'no'}">${mastery >= 80 ? t(dict, 'markNeedsWork') : t(dict, 'markMastered')}</button>
          </div>
        </article>`
      : `<div class="empty-state" style="margin-top:1rem;">${t(dict, 'noQuestionsMatch')}</div>`}
  `;
}

function renderExam(state, bank, dict) {
  const exam = state.examSession;
  const activeQuestion = getQuestionById(bank, exam.questionIds[exam.currentIndex]);

  if (exam.active && activeQuestion) {
    return `
      <div class="content-header">
        <div>
          <h2 class="page-title">${t(dict, 'activeExam')}</h2>
          <p class="page-subtitle">${getLocalizedLicenseName(bank, exam.selectedLicenseId, state.language)} · ${t(dict, 'timeRemaining')}: <strong id="exam-timer">--:--</strong></p>
        </div>
        <div class="pill-row">
          <span class="pill">${t(dict, 'questionNumber')} ${exam.currentIndex + 1}/${exam.questionIds.length}</span>
          <span class="pill">${Object.keys(exam.answers).length} ${t(dict, 'answered')}</span>
        </div>
      </div>

      <article class="question-card card">
        <div class="question-meta">
          <span class="pill">${escapeHtml(activeQuestion.category)}</span>
          <span class="pill">${escapeHtml(activeQuestion.topic)}</span>
          <span class="pill">${escapeHtml(activeQuestion.difficulty)}</span>
        </div>
        <div class="question-text">${escapeHtml(getLocalizedText(activeQuestion.text, state.language))}</div>
        <div class="answer-list">
          ${activeQuestion.answers
            .map((answer) => {
              const selected = exam.answers[activeQuestion.id] === answer.id;
              return `<button class="answer-btn ${selected ? 'correct' : ''}" data-action="answer-exam" data-answer-id="${answer.id}">${answer.id.toUpperCase()}. ${escapeHtml(getLocalizedText(answer.text, state.language))}</button>`;
            })
            .join('')}
        </div>
        <div class="question-actions" style="margin-top:1rem;">
          <button class="btn btn-secondary" data-action="exam-prev">${t(dict, 'previous')}</button>
          <button class="btn btn-secondary" data-action="exam-next">${t(dict, 'next')}</button>
          <button class="btn" data-action="submit-exam">${t(dict, 'submitExam')}</button>
          <button class="btn btn-danger" data-action="clear-exam">${t(dict, 'clearExam')}</button>
        </div>
      </article>
    `;
  }

  if (exam.results) {
    return `
      <div class="content-header">
        <div>
          <h2 class="page-title">${t(dict, 'examMode')}</h2>
          <p class="page-subtitle">${exam.results.passed ? t(dict, 'passed') : t(dict, 'failed')}</p>
        </div>
        <div class="pill-row">
          <span class="pill ${exam.results.passed ? 'pill-success' : 'pill-danger'}">${t(dict, 'score')}: ${exam.results.score}%</span>
          <span class="pill">${exam.results.correct} ${t(dict, 'correct')}</span>
          <span class="pill">${exam.results.incorrect} ${t(dict, 'incorrect')}</span>
        </div>
      </div>

      <section class="metric-grid">
        ${metricCard(t(dict, 'score'), `${exam.results.score}%`, exam.results.passed ? t(dict, 'passed') : t(dict, 'failed'))}
        ${metricCard(t(dict, 'correct'), exam.results.correct, 'Correct answers')}
        ${metricCard(t(dict, 'incorrect'), exam.results.incorrect, 'Missed answers')}
        ${metricCard(t(dict, 'questionCount'), exam.results.total, 'Questions in attempt')}
      </section>

      <article class="card" style="margin-top:1rem;">
        <div class="card-title-row"><h3>${t(dict, 'reviewAnswers')}</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>#</th><th>Question</th><th>Your answer</th><th>Correct</th><th>Status</th></tr></thead>
            <tbody>
              ${exam.results.reviewed
                .map((item, index) => {
                  const question = getQuestionById(bank, item.questionId);
                  return `<tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(getLocalizedText(question?.text, state.language))}</td>
                    <td>${(item.answerId || '—').toUpperCase()}</td>
                    <td>${(item.correctAnswerId || '—').toUpperCase()}</td>
                    <td><span class="pill ${item.isCorrect ? 'pill-success' : 'pill-danger'}">${item.isCorrect ? t(dict, 'yes') : t(dict, 'no')}</span></td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="question-actions" style="margin-top:1rem;">
          <button class="btn" data-action="new-exam">${t(dict, 'startExam')}</button>
          <button class="btn btn-secondary" data-action="smart-review">${t(dict, 'smartReview')}</button>
        </div>
      </article>
    `;
  }

  const defaultLicense = state.preferences.selectedLicenseId;
  const defaultQuestions = bank.questions.filter((question) => question.licenseId === defaultLicense).length;

  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'examMode')}</h2>
        <p class="page-subtitle">Build a timed exam from your selected license and launch it instantly.</p>
      </div>
    </div>

    <article class="card">
      <div class="card-title-row"><h3>${t(dict, 'examSetup')}</h3></div>
      <div class="controls-grid">
        <div class="field"><label>${t(dict, 'license')}</label><select id="exam-license">${optionList(bank.licenses.map((license) => ({ value: license.id, label: getLocalizedText(license.name, state.language) })), defaultLicense)}</select></div>
        <div class="field"><label>${t(dict, 'questionCount')}</label><input id="exam-count" type="number" min="5" max="50" value="${Math.min(Math.max(state.preferences.examLength, 5), defaultQuestions)}" /></div>
        <div class="field"><label>${t(dict, 'durationMinutes')}</label><input id="exam-duration" type="number" min="5" max="180" value="${state.preferences.examMinutes}" /></div>
        <div class="field"><label>&nbsp;</label><button class="btn" data-action="launch-exam">${t(dict, 'startExamNow')}</button></div>
      </div>
    </article>
  `;
}

function renderReview(state, bank, dict) {
  const favorites = bank.questions.filter((question) => state.favorites.includes(question.id));
  const recommendations = buildRecommendations(state, bank, { limit: 8, licenseId: state.preferences.selectedLicenseId });
  const mistakes = bank.questions
    .map((question) => ({ question, missed: state.questionStats[question.id]?.incorrectCount ?? 0 }))
    .filter((item) => item.missed > 0)
    .sort((a, b) => b.missed - a.missed)
    .slice(0, 10);

  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'reviewCenter')}</h2>
        <p class="page-subtitle">${t(dict, 'smartExplanation')}</p>
      </div>
      <div class="inline-actions">
        <button class="btn" data-action="smart-review">${t(dict, 'smartReview')}</button>
      </div>
    </div>

    <section class="grid-2">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'weakQuestionQueue')}</h3></div>
        <div class="stack-xs">
          ${recommendations
            .map(
              ({ question, priority }) => `
                <button class="answer-btn" data-action="open-question" data-question-id="${question.id}">
                  <strong>${escapeHtml(getLocalizedText(question.text, state.language))}</strong>
                  <div class="small-note">${escapeHtml(question.topic)} · priority ${Math.round(priority)}</div>
                </button>`
            )
            .join('')}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'favoritesReview')}</h3></div>
        ${favorites.length
          ? `<div class="stack-xs">${favorites
              .slice(0, 8)
              .map(
                (question) => `
                  <button class="answer-btn" data-action="open-question" data-question-id="${question.id}">
                    <strong>${escapeHtml(getLocalizedText(question.text, state.language))}</strong>
                    <div class="small-note">${escapeHtml(question.topic)}</div>
                  </button>`
              )
              .join('')}</div>`
          : `<div class="empty-state">${t(dict, 'emptyFavorites')}</div>`}
      </article>
    </section>

    <article class="card" style="margin-top:1rem;">
      <div class="card-title-row"><h3>${t(dict, 'mistakesTable')}</h3></div>
      ${mistakes.length
        ? `<div class="table-wrap"><table class="table"><thead><tr><th>Question</th><th>Topic</th><th>Missed</th></tr></thead><tbody>${mistakes
            .map(
              ({ question, missed }) => `<tr><td>${escapeHtml(getLocalizedText(question.text, state.language))}</td><td>${escapeHtml(question.topic)}</td><td>${missed}</td></tr>`
            )
            .join('')}</tbody></table></div>`
        : `<div class="empty-state">${t(dict, 'emptyMistakes')}</div>`}
    </article>
  `;
}

function renderProgress(state, bank, dict) {
  const metrics = overallMetrics(state, bank);
  const topics = topicPerformance(state, bank);
  const licenses = usageByLicense(state, bank);

  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'progress')}</h2>
        <p class="page-subtitle">Track accuracy, topic trends, license usage, and mastery over time.</p>
      </div>
    </div>

    <section class="metric-grid">
      ${metricCard(t(dict, 'accuracy'), `${metrics.accuracy}%`, `${metrics.correct} correct / ${metrics.incorrect} incorrect`)}
      ${metricCard(t(dict, 'favoritesOnly'), metrics.favorites, 'Questions bookmarked')}
      ${metricCard(t(dict, 'reviewLaterOnly'), metrics.reviewLater, 'Queued for later')}
      ${metricCard(t(dict, 'currentStreak'), metrics.streak, 'Continuous activity days')}
    </section>

    <section class="grid-2" style="margin-top:1rem;">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'topicPerformance')}</h3></div>
        ${topics.length
          ? `<div class="table-wrap"><table class="table"><thead><tr><th>${t(dict, 'topic')}</th><th>Attempts</th><th>${t(dict, 'accuracy')}</th></tr></thead><tbody>${topics
              .map(
                (topic) => `<tr><td>${escapeHtml(topic.topic)}</td><td>${topic.attempts}</td><td>${topic.accuracy === null ? '—' : `${topic.accuracy}%`}</td></tr>`
              )
              .join('')}</tbody></table></div>`
          : `<div class="empty-state">${t(dict, 'noHistory')}</div>`}
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'usageByLicense')}</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>${t(dict, 'license')}</th><th>${t(dict, 'questionCount')}</th><th>Attempts</th><th>${t(dict, 'accuracy')}</th></tr></thead><tbody>${licenses
          .map(
            (item) => `<tr><td>${escapeHtml(getLocalizedLicenseName(bank, item.licenseId, state.language))}</td><td>${item.questionCount}</td><td>${item.attempts}</td><td>${item.accuracy}%</td></tr>`
          )
          .join('')}</tbody></table></div>
      </article>
    </section>
  `;
}

function renderAdmin(state, bank, dict) {
  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'adminPanel')}</h2>
        <p class="page-subtitle">Local content admin for seed banks. Use JSON or CSV imports now, then wire this UI to real APIs later.</p>
      </div>
    </div>

    <section class="grid-2">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'adminOverview')}</h3></div>
        <div class="kpi-list">
          <div class="kpi-item"><strong>${bank.questions.length}</strong><span class="small-note">${t(dict, 'totalQuestions')}</span></div>
          <div class="kpi-item"><strong>${bank.licenses.length}</strong><span class="small-note">${t(dict, 'license')}</span></div>
          <div class="kpi-item"><strong>${new Set(bank.questions.map((question) => question.topic)).size}</strong><span class="small-note">${t(dict, 'topic')}</span></div>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'importQuestions')}</h3></div>
        <div class="stack-xs">
          <label class="btn btn-secondary file-label"><span>${t(dict, 'importQuestions')} (JSON / CSV)</span><input id="question-import-input" type="file" accept=".json,.csv,application/json,text/csv" hidden /></label>
          <button class="btn btn-secondary" data-action="export-questions">${t(dict, 'exportQuestions')}</button>
        </div>
        <p class="footer-note">CSV header example: licenseId, examId, category, topic, difficulty, question_en, question_es, answerA_en, answerB_en, answerC_en, answerD_en, correctAnswerId, explanation_en, explanation_es, tags</p>
      </article>
    </section>

    <article class="card" style="margin-top:1rem;">
      <div class="card-title-row"><h3>${t(dict, 'addQuestion')}</h3></div>
      <div class="grid-2">
        <div class="field"><label>${t(dict, 'license')}</label><select id="new-license">${optionList(bank.licenses.map((license) => ({ value: license.id, label: getLocalizedText(license.name, state.language) })), state.preferences.selectedLicenseId)}</select></div>
        <div class="field"><label>${t(dict, 'category')}</label><input id="new-category" type="text" placeholder="Safety" /></div>
        <div class="field"><label>${t(dict, 'topic')}</label><input id="new-topic" type="text" placeholder="Scheduling" /></div>
        <div class="field"><label>${t(dict, 'difficulty')}</label><select id="new-difficulty">${optionList([{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }], 'medium')}</select></div>
      </div>
      <div class="grid-2" style="margin-top:1rem;">
        <div class="field"><label>${t(dict, 'questionTextEnglish')}</label><textarea id="new-question-en"></textarea></div>
        <div class="field"><label>${t(dict, 'questionTextSpanish')}</label><textarea id="new-question-es"></textarea></div>
      </div>
      <div class="grid-2" style="margin-top:1rem;">
        <div class="field"><label>${t(dict, 'answerA')}</label><input id="new-answer-a" type="text" /></div>
        <div class="field"><label>${t(dict, 'answerB')}</label><input id="new-answer-b" type="text" /></div>
        <div class="field"><label>${t(dict, 'answerC')}</label><input id="new-answer-c" type="text" /></div>
        <div class="field"><label>${t(dict, 'answerD')}</label><input id="new-answer-d" type="text" /></div>
      </div>
      <div class="grid-2" style="margin-top:1rem;">
        <div class="field"><label>${t(dict, 'correctAnswer')}</label><select id="new-correct-answer">${optionList([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }, { value: 'd', label: 'D' }], 'a')}</select></div>
        <div class="field"><label>${t(dict, 'tags')}</label><input id="new-tags" type="text" placeholder="safety, ppe, site" /></div>
      </div>
      <div class="grid-2" style="margin-top:1rem;">
        <div class="field"><label>${t(dict, 'explanationEnglish')}</label><textarea id="new-explanation-en"></textarea></div>
        <div class="field"><label>${t(dict, 'explanationSpanish')}</label><textarea id="new-explanation-es"></textarea></div>
      </div>
      <div class="question-actions" style="margin-top:1rem;">
        <button class="btn" data-action="save-question">${t(dict, 'saveQuestion')}</button>
      </div>
    </article>
  `;
}

function renderSettings(state, bank, dict) {
  return `
    <div class="content-header">
      <div>
        <h2 class="page-title">${t(dict, 'settings')}</h2>
        <p class="page-subtitle">Local profile, defaults, and reset tools for this starter.</p>
      </div>
    </div>

    <section class="grid-2">
      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'profile')}</h3></div>
        <div class="stack-xs">
          <div class="field"><label>${t(dict, 'displayName')}</label><input id="profile-name" type="text" value="${escapeHtml(state.user.name || '')}" /></div>
          <div class="field"><label>${t(dict, 'email')}</label><input id="profile-email" type="email" value="${escapeHtml(state.user.email || '')}" /></div>
          <button class="btn" data-action="save-profile">${t(dict, 'saveProfile')}</button>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row"><h3>${t(dict, 'settings')}</h3></div>
        <div class="stack-xs">
          <div class="field"><label>${t(dict, 'license')}</label><select id="settings-license">${optionList(bank.licenses.map((license) => ({ value: license.id, label: getLocalizedText(license.name, state.language) })), state.preferences.selectedLicenseId)}</select></div>
          <div class="field"><label>${t(dict, 'dailyGoalMinutes')}</label><input id="settings-goal" type="number" min="5" max="240" value="${state.preferences.dailyGoalMinutes}" /></div>
          <div class="field"><label>${t(dict, 'questionCount')}</label><input id="settings-exam-length" type="number" min="5" max="100" value="${state.preferences.examLength}" /></div>
          <div class="field"><label>${t(dict, 'durationMinutes')}</label><input id="settings-exam-minutes" type="number" min="5" max="240" value="${state.preferences.examMinutes}" /></div>
          <button class="btn" data-action="save-settings">${t(dict, 'saveSettings')}</button>
          <button class="btn btn-danger" data-action="reset-progress">${t(dict, 'resetProgress')}</button>
        </div>
      </article>
    </section>
  `;
}

function getLocalizedLicenseName(bank, licenseId, language) {
  return getLocalizedText(bank.licenses.find((license) => license.id === licenseId)?.name, language) || licenseId;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
