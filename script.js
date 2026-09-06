const STORAGE_KEY = "comebackTrackerDataV1";
const WEEKS_TO_SHOW = 12;

const els = {
  todayDate: document.getElementById("todayDate"),
  todayRate: document.getElementById("todayRate"),
  todaySummary: document.getElementById("todaySummary"),
  currentStreak: document.getElementById("currentStreak"),
  bestStreak: document.getElementById("bestStreak"),
  totalCompleted: document.getElementById("totalCompleted"),
  progressTitle: document.getElementById("progressTitle"),
  progressFill: document.getElementById("progressFill"),
  dayStatus: document.getElementById("dayStatus"),
  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  contributionChart: document.getElementById("contributionChart"),
  historyList: document.getElementById("historyList"),
  overallRate: document.getElementById("overallRate")
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { days: {} };

    if (!parsed.days || typeof parsed.days !== "object") {
      parsed.days = {};
    }

    return parsed;
  } catch {
    return { days: {} };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTodayRecord() {
  const key = localDateKey();

  if (!data.days[key]) {
    data.days[key] = {
      tasks: []
    };
  }

  if (!Array.isArray(data.days[key].tasks)) {
    data.days[key].tasks = [];
  }

  return data.days[key];
}

function completionForRecord(record) {
  const tasks = record?.tasks || [];

  if (tasks.length === 0) {
    return {
      completed: 0,
      total: 0,
      rate: 0,
      perfect: false
    };
  }

  const completed = tasks.filter(task => task.completed).length;
  const rate = Math.round((completed / tasks.length) * 100);

  return {
    completed,
    total: tasks.length,
    rate,
    perfect: completed === tasks.length
  };
}

function levelForRate(rate, hasTasks) {
  if (!hasTasks || rate <= 0) return 0;
  if (rate <= 25) return 1;
  if (rate <= 50) return 2;
  if (rate < 100) return 3;

  return 4;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function calculateStreaks() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let current = 0;
  let cursor = new Date(today);

  const todayStats =
    completionForRecord(data.days[localDateKey(today)]);

  // आजचे tasks अजून पूर्ण नसतील
  // तर yesterday पासून streak calculate होईल
  if (!todayStats.perfect) {
    cursor = addDays(cursor, -1);
  }

  while (true) {
    const record = data.days[localDateKey(cursor)];

    if (!completionForRecord(record).perfect) {
      break;
    }

    current++;
    cursor = addDays(cursor, -1);
  }

  const perfectDates = Object.keys(data.days)
    .filter(key =>
      completionForRecord(data.days[key]).perfect
    )
    .sort();

  let best = 0;
  let run = 0;
  let previous = null;

  for (const key of perfectDates) {
    const currentDate = parseDateKey(key);

    if (
      previous &&
      localDateKey(addDays(previous, 1)) === key
    ) {
      run++;
    } else {
      run = 1;
    }

    best = Math.max(best, run);
    previous = currentDate;
  }

  return {
    current,
    best
  };
}

function addTask(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  const today = getTodayRecord();

  today.tasks.push({
    id: `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,

    text: trimmed,

    completed: false,

    createdAt: new Date().toISOString()
  });

  saveData();
  render();
}

function toggleTask(id) {
  const today = getTodayRecord();

  const task = today.tasks.find(
    task => task.id === id
  );

  if (!task) {
    return;
  }

  task.completed = !task.completed;

  task.completedAt = task.completed
    ? new Date().toISOString()
    : null;

  saveData();
  render();
}

function deleteTask(id) {
  const today = getTodayRecord();

  today.tasks = today.tasks.filter(
    task => task.id !== id
  );

  saveData();
  render();
}

function renderTasks() {
  const today = getTodayRecord();

  els.taskList.innerHTML = "";

  els.emptyState.classList.toggle(
    "hidden",
    today.tasks.length > 0
  );

  for (const task of today.tasks) {
    const row = document.createElement("div");

    row.className =
      `task-item ${task.completed ? "completed" : ""}`;

    const checkbox =
      document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = !!task.completed;

    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.text} complete`
    );

    checkbox.addEventListener(
      "change",
      () => toggleTask(task.id)
    );

    const name =
      document.createElement("span");

    name.className = "task-name";
    name.textContent = task.text;

    const del =
      document.createElement("button");

    del.className = "delete-btn";
    del.type = "button";
    del.textContent = "✕";
    del.title = "Delete today's task";

    del.addEventListener(
      "click",
      () => deleteTask(task.id)
    );

    row.append(
      checkbox,
      name,
      del
    );

    els.taskList.appendChild(row);
  }
}

function renderStats() {
  const stats =
    completionForRecord(getTodayRecord());

  const streaks =
    calculateStreaks();

  const allRecords =
    Object.values(data.days);

  const totalCompleted =
    allRecords.reduce(
      (sum, record) =>
        sum +
        completionForRecord(record).completed,
      0
    );

  const totalTasks =
    allRecords.reduce(
      (sum, record) =>
        sum +
        completionForRecord(record).total,
      0
    );

  const overall =
    totalTasks
      ? Math.round(
          (totalCompleted / totalTasks) * 100
        )
      : 0;

  els.todayRate.textContent =
    `${stats.rate}%`;

  els.todaySummary.textContent =
    `${stats.completed} / ${stats.total} tasks completed`;

  els.currentStreak.textContent =
    streaks.current;

  els.bestStreak.textContent =
    streaks.best;

  els.totalCompleted.textContent =
    totalCompleted;

  els.progressTitle.textContent =
    `${stats.rate}% complete`;

  els.progressFill.style.width =
    `${stats.rate}%`;

  els.overallRate.textContent =
    `Overall: ${overall}%`;

  els.dayStatus.classList.toggle(
    "perfect",
    stats.perfect
  );

  if (stats.total === 0) {
    els.dayStatus.textContent =
      "Start your day";
  } else if (stats.perfect) {
    els.dayStatus.textContent =
      "Perfect day 🔥";
  } else if (stats.rate >= 75) {
    els.dayStatus.textContent =
      "Almost there";
  } else if (stats.rate >= 50) {
    els.dayStatus.textContent =
      "Keep pushing";
  } else {
    els.dayStatus.textContent =
      "Keep moving";
  }
}

function renderChart() {
  els.contributionChart.innerHTML = "";

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const dayIndexMon =
    (today.getDay() + 6) % 7;

  const mondayThisWeek =
    addDays(today, -dayIndexMon);

  const start =
    addDays(
      mondayThisWeek,
      -(WEEKS_TO_SHOW - 1) * 7
    );

  for (
    let i = 0;
    i < WEEKS_TO_SHOW * 7;
    i++
  ) {
    const date =
      addDays(start, i);

    const key =
      localDateKey(date);

    const record =
      data.days[key];

    const stats =
      completionForRecord(record);

    const level =
      levelForRate(
        stats.rate,
        stats.total > 0
      );

    const cell =
      document.createElement("div");

    cell.className =
      `day-cell level-${level}`;

    if (
      key === localDateKey(today)
    ) {
      cell.classList.add("today");
    }

    if (date > today) {
      cell.classList.add("future");
    }

    const description =
      stats.total
        ? `${formatDate(date)}: ${stats.completed}/${stats.total} tasks (${stats.rate}%)`
        : `${formatDate(date)}: no tasks`;

    cell.title =
      description;

    cell.setAttribute(
      "aria-label",
      description
    );

    els.contributionChart
      .appendChild(cell);
  }
}

function renderHistory() {
  const todayKey =
    localDateKey();

  const keys =
    Object.keys(data.days)
      .filter(
        key =>
          key <= todayKey &&
          (data.days[key]?.tasks?.length || 0) > 0
      )
      .sort(
        (a, b) =>
          b.localeCompare(a)
      )
      .slice(0, 10);

  els.historyList.innerHTML = "";

  if (!keys.length) {
    els.historyList.innerHTML =
      '<p class="history-empty">Your completed days will appear here.</p>';

    return;
  }

  for (const key of keys) {
    const stats =
      completionForRecord(
        data.days[key]
      );

    const row =
      document.createElement("div");

    row.className =
      "history-row";

    const date =
      document.createElement("div");

    date.className =
      "history-date";

    date.textContent =
      key === todayKey
        ? `Today • ${formatDate(parseDateKey(key))}`
        : formatDate(parseDateKey(key));

    const count =
      document.createElement("div");

    count.className =
      "history-count";

    count.textContent =
      `${stats.completed}/${stats.total} completed${
        stats.perfect
          ? " • 🔥 Perfect"
          : ""
      }`;

    const rate =
      document.createElement("div");

    rate.className =
      "history-rate";

    rate.textContent =
      `${stats.rate}%`;

    row.append(
      date,
      count,
      rate
    );

    els.historyList
      .appendChild(row);
  }
}

function render() {
  els.todayDate.textContent =
    formatDate(new Date());

  renderTasks();
  renderStats();
  renderChart();
  renderHistory();
}

els.taskForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    addTask(
      els.taskInput.value
    );

    els.taskInput.value = "";

    els.taskInput.focus();
  }
);

let data = loadData();

getTodayRecord();

saveData();

render();