
const state = {
  bank: null,
  selectedClass: 'A',
  session: null,
  timerId: null
};

const dom = {
  classButtons: [...document.querySelectorAll('.class-btn')],
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  bankStats: document.getElementById('bank-stats'),
  examShell: document.getElementById('exam-shell'),
  resultsShell: document.getElementById('results-shell'),
  statusMode: document.getElementById('status-mode'),
  statusSection: document.getElementById('status-section'),
  statusProgress: document.getElementById('status-progress'),
  statusTimerSection: document.getElementById('status-timer-section'),
  statusTimerTotal: document.getElementById('status-timer-total'),
  progressBar: document.getElementById('progress-bar'),
  questionCategory: document.getElementById('question-category'),
  questionSource: document.getElementById('question-source'),
  questionEn: document.getElementById('question-en'),
  questionEs: document.getElementById('question-es'),
  options: document.getElementById('options'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  finishSectionBtn: document.getElementById('finish-section-btn'),
  resultTitle: document.getElementById('result-title'),
  resultBadge: document.getElementById('result-badge'),
  sectionSummary: document.getElementById('section-summary'),
  reviewSections: document.getElementById('review-sections')
};

init();

async function init() {
  bindEvents();
  try {
    const response = await fetch('./data/question-bank.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el banco de preguntas.');
    state.bank = await response.json();
    updateBankStats();
  } catch (error) {
    dom.bankStats.textContent = 'Error cargando el banco. Verifica data/question-bank.json';
    console.error(error);
  }
}

function bindEvents() {
  dom.classButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedClass = btn.dataset.class;
      dom.classButtons.forEach((x) => x.classList.toggle('active', x === btn));
    });
  });

  dom.startBtn.addEventListener('click', startExam);
  dom.restartBtn.addEventListener('click', startExam);
  dom.prevBtn.addEventListener('click', () => moveQuestion(-1));
  dom.nextBtn.addEventListener('click', () => moveQuestion(1));
  dom.finishSectionBtn.addEventListener('click', finishCurrentSection);
}

function updateBankStats() {
  const all = state.bank.questions.length;
  const s1 = state.bank.questions.filter((q) => q.section === 1).length;
  const s2 = state.bank.questions.filter((q) => q.section === 2).length;
  const s3 = state.bank.questions.filter((q) => q.section === 3).length;
  dom.bankStats.textContent = `Banco cargado: ${all} preguntas totales · Parte 1: ${s1} · Parte 2: ${s2} · Parte 3: ${s3}`;
}

function startExam() {
  if (!state.bank) return;

  clearTimer();
  const structure = state.bank.examStructure[state.selectedClass];
  const sections = structure.map((spec) => {
    const pool = state.bank.questions.filter((q) => q.section === spec.section);
    const selected = sampleQuestions(pool, spec.questionCount).map(cloneQuestionForSession);
    return {
      ...spec,
      questions: selected,
      answers: {},
      completed: false,
      score: null
    };
  });

  state.session = {
    classType: state.selectedClass,
    sections,
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    sectionRemainingSeconds: structure[0].timeMinutes * 60,
    totalRemainingSeconds: structure.reduce((sum, s) => sum + (s.timeMinutes * 60), 0),
    finished: false
  };

  dom.examShell.classList.remove('hidden');
  dom.resultsShell.classList.add('hidden');
  dom.restartBtn.classList.remove('hidden');
  renderExam();
  state.timerId = window.setInterval(tick, 1000);
}

function cloneQuestionForSession(question) {
  const copy = JSON.parse(JSON.stringify(question));
  const correctOption = copy.options.find((o) => o.key === copy.correctKey);
  copy.options = shuffle(copy.options);
  copy.correctKey = copy.options.find((o) => o.textEn === correctOption.textEn && o.textEs === correctOption.textEs).key;
  return copy;
}

function sampleQuestions(pool, count) {
  if (pool.length < count) {
    throw new Error(`No hay suficientes preguntas en la parte ${pool[0]?.section ?? '?'} para generar ${count}.`);
  }
  return shuffle(pool).slice(0, count);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tick() {
  if (!state.session || state.session.finished) return;
  state.session.sectionRemainingSeconds -= 1;
  state.session.totalRemainingSeconds -= 1;

  if (state.session.sectionRemainingSeconds <= 0) {
    finishCurrentSection(true);
    return;
  }

  if (state.session.totalRemainingSeconds <= 0) {
    finishExam();
    return;
  }

  renderStatusOnly();
}

function getCurrentSection() {
  return state.session.sections[state.session.currentSectionIndex];
}

function getCurrentQuestion() {
  const section = getCurrentSection();
  return section.questions[state.session.currentQuestionIndex];
}

function renderExam() {
  renderStatusOnly();
  renderQuestion();
}

function renderStatusOnly() {
  const section = getCurrentSection();
  const totalQuestions = state.session.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredBefore = state.session.sections
    .slice(0, state.session.currentSectionIndex)
    .reduce((sum, s) => sum + s.questions.length, 0);

  dom.statusMode.textContent = `Class ${state.session.classType}`;
  dom.statusSection.textContent = `${section.name}`;
  dom.statusProgress.textContent = `${state.session.currentQuestionIndex + 1} / ${section.questions.length}`;
  dom.statusTimerSection.textContent = formatTime(state.session.sectionRemainingSeconds);
  dom.statusTimerTotal.textContent = formatTime(state.session.totalRemainingSeconds);

  const overallIndex = answeredBefore + state.session.currentQuestionIndex + 1;
  const pct = (overallIndex / totalQuestions) * 100;
  dom.progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

function renderQuestion() {
  const question = getCurrentQuestion();
  const section = getCurrentSection();
  const answer = section.answers[question.id] ?? null;

  dom.questionCategory.textContent = `${question.category}`;
  dom.questionSource.textContent = `${question.source}`;
  dom.questionEn.textContent = question.questionEn;
  dom.questionEs.textContent = question.questionEs;

  dom.options.innerHTML = '';
  question.options.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-btn${answer === option.key ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="option-key">${option.key}</span>
      <span class="option-line option-en">${escapeHtml(option.textEn)}</span>
      <span class="option-line option-es">${escapeHtml(option.textEs)}</span>
    `;
    btn.addEventListener('click', () => {
      section.answers[question.id] = option.key;
      renderQuestion();
    });
    dom.options.appendChild(btn);
  });

  dom.prevBtn.disabled = state.session.currentQuestionIndex === 0;
  dom.nextBtn.disabled = state.session.currentQuestionIndex === section.questions.length - 1;
}

function moveQuestion(delta) {
  const section = getCurrentSection();
  const nextIndex = state.session.currentQuestionIndex + delta;
  if (nextIndex < 0 || nextIndex >= section.questions.length) return;
  state.session.currentQuestionIndex = nextIndex;
  renderExam();
}

function finishCurrentSection(timeExpired = false) {
  if (!state.session || state.session.finished) return;

  const section = getCurrentSection();
  section.score = scoreSection(section);
  section.completed = true;
  section.timeExpired = timeExpired;

  const hasNext = state.session.currentSectionIndex < state.session.sections.length - 1;
  if (hasNext) {
    state.session.currentSectionIndex += 1;
    state.session.currentQuestionIndex = 0;
    const nextSection = getCurrentSection();
    state.session.sectionRemainingSeconds = nextSection.timeMinutes * 60;
    renderExam();
  } else {
    finishExam();
  }
}

function scoreSection(section) {
  let correct = 0;
  const review = section.questions.map((question) => {
    const selected = section.answers[question.id] ?? null;
    const isCorrect = selected === question.correctKey;
    if (isCorrect) correct += 1;
    const selectedOption = question.options.find((o) => o.key === selected) || null;
    const correctOption = question.options.find((o) => o.key === question.correctKey);
    return {
      question,
      selected,
      selectedOption,
      correctOption,
      isCorrect
    };
  });

  const total = section.questions.length;
  const percent = total ? (correct / total) * 100 : 0;
  const pass = percent >= section.passingPercent;
  return { correct, total, percent, pass, review };
}

function finishExam() {
  clearTimer();
  if (!state.session) return;

  state.session.sections.forEach((section) => {
    if (!section.score) {
      section.score = scoreSection(section);
      section.completed = true;
    }
  });
  state.session.finished = true;
  renderResults();
}

function renderResults() {
  dom.resultsShell.classList.remove('hidden');
  dom.sectionSummary.innerHTML = '';
  dom.reviewSections.innerHTML = '';

  const passedAll = state.session.sections.every((section) => section.score.pass);
  dom.resultTitle.textContent = `Resultado final · Class ${state.session.classType}`;
  dom.resultBadge.textContent = passedAll ? 'APROBADO' : 'NO APROBADO';
  dom.resultBadge.className = `result-badge${passedAll ? '' : ' fail'}`;

  state.session.sections.forEach((section) => {
    const card = document.createElement('article');
    card.className = 'summary-card';
    card.innerHTML = `
      <h4>${section.name}</h4>
      <div class="${section.score.pass ? 'summary-pass' : 'summary-fail'}">${section.score.pass ? 'Aprobada' : 'No aprobada'}</div>
      <p>${section.score.correct} / ${section.score.total} correctas</p>
      <p>${section.score.percent.toFixed(1)}% · mínimo ${section.passingPercent}%</p>
      <p class="muted">${section.timeExpired ? 'El tiempo se agotó en esta parte.' : 'Parte cerrada normalmente.'}</p>
    `;
    dom.sectionSummary.appendChild(card);

    const details = document.createElement('details');
    details.className = 'review-section';
    details.open = false;

    const summary = document.createElement('summary');
    summary.textContent = `${section.name} · ${section.score.correct}/${section.score.total} · ${section.score.pass ? 'Aprobada' : 'No aprobada'}`;
    details.appendChild(summary);

    const inner = document.createElement('div');
    inner.className = 'review-inner';

    section.score.review.forEach((item, index) => {
      const reviewCard = document.createElement('article');
      reviewCard.className = `review-card ${item.isCorrect ? 'good' : 'bad'}`;
      reviewCard.innerHTML = `
        <div class="review-status">${item.isCorrect ? '✔ Correcta / Correct' : '✖ Incorrecta / Incorrect'} · ${index + 1}</div>
        <div class="answer-line"><strong>${escapeHtml(item.question.questionEn)}</strong></div>
        <div class="answer-line muted">${escapeHtml(item.question.questionEs)}</div>
        <div class="answer-line"><span class="answer-label">Tu respuesta:</span> ${item.selectedOption ? `${item.selectedOption.key} — ${escapeHtml(item.selectedOption.textEn)}<br><span class="muted">${escapeHtml(item.selectedOption.textEs)}</span>` : '<span class="muted">Sin responder / Unanswered</span>'}</div>
        <div class="answer-line"><span class="answer-label">Correcta:</span> ${item.correctOption.key} — ${escapeHtml(item.correctOption.textEn)}<br><span class="muted">${escapeHtml(item.correctOption.textEs)}</span></div>
        <div class="review-explanation">
          <strong>Why it is correct:</strong> ${escapeHtml(item.question.explanationEn)}<br>
          <span class="muted"><strong>Por qué es correcta:</strong> ${escapeHtml(item.question.explanationEs)}</span>
        </div>
      `;
      inner.appendChild(reviewCard);
    });

    details.appendChild(inner);
    dom.reviewSections.appendChild(details);
  });

  dom.resultsShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.addEventListener('beforeunload', clearTimer);
