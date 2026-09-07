// ==========================================================
// COMEBACK - DAILY DISCIPLINE TRACKER
// STRICT MODE
// ==========================================================

const STORAGE_KEY =
  "comebackStrictTrackerV4";

const WEEKS_TO_SHOW = 12;


const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
];



// ==========================================================
// DOM
// ==========================================================

const els = {

  todayDate:
    document.getElementById(
      "todayDate"
    ),

  todayRate:
    document.getElementById(
      "todayRate"
    ),

  todaySummary:
    document.getElementById(
      "todaySummary"
    ),

  currentStreak:
    document.getElementById(
      "currentStreak"
    ),

  bestStreak:
    document.getElementById(
      "bestStreak"
    ),

  totalCompleted:
    document.getElementById(
      "totalCompleted"
    ),

  progressTitle:
    document.getElementById(
      "progressTitle"
    ),

  progressFill:
    document.getElementById(
      "progressFill"
    ),

  dayStatus:
    document.getElementById(
      "dayStatus"
    ),

  planTaskName:
    document.getElementById(
      "planTaskName"
    ),

  addPlanBtn:
    document.getElementById(
      "addPlanBtn"
    ),

  taskPlanList:
    document.getElementById(
      "taskPlanList"
    ),

  taskList:
    document.getElementById(
      "taskList"
    ),

  emptyState:
    document.getElementById(
      "emptyState"
    ),

  contributionChart:
    document.getElementById(
      "contributionChart"
    ),

  overallRate:
    document.getElementById(
      "overallRate"
    ),

  historyList:
    document.getElementById(
      "historyList"
    )
};



// ==========================================================
// DATE HELPERS
// ==========================================================

function localDateKey(
  date = new Date()
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );
}



function parseDateKey(key) {

  const [
    year,
    month,
    day
  ] =
    key
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}



function addDays(
  date,
  amount
) {

  const copy =
    new Date(date);


  copy.setHours(
    12,
    0,
    0,
    0
  );


  copy.setDate(
    copy.getDate() +
    amount
  );


  return copy;
}



function getTodayKey() {

  return localDateKey(
    new Date()
  );
}



function getTomorrowKey() {

  return localDateKey(
    addDays(
      new Date(),
      1
    )
  );
}



function formatDate(date) {

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday:
        "short",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(date);
}



// ==========================================================
// ID
// ==========================================================

function createId() {

  if (
    typeof crypto !==
      "undefined" &&
    crypto.randomUUID
  ) {

    return crypto.randomUUID();

  }


  return (
    Date.now() +
    "-" +
    Math.random()
      .toString(16)
      .slice(2)
  );
}



// ==========================================================
// DEFAULT DATA
// ==========================================================

function defaultData() {

  return {

    taskPlans: [],

    days: {},

    streakResets: []

  };
}



// ==========================================================
// STORAGE
// ==========================================================

function loadData() {

  try {

    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!raw) {

      return defaultData();

    }


    const parsed =
      JSON.parse(raw);


    if (
      !Array.isArray(
        parsed.taskPlans
      )
    ) {

      parsed.taskPlans = [];

    }


    if (
      !parsed.days ||
      typeof parsed.days !==
        "object"
    ) {

      parsed.days = {};

    }


    if (
      !Array.isArray(
        parsed.streakResets
      )
    ) {

      parsed.streakResets = [];

    }


    return parsed;

  }

  catch (error) {

    console.error(
      "Storage error:",
      error
    );


    return defaultData();

  }
}



function saveData() {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(
      data
    )

  );
}



// ==========================================================
// PLAN VERSION FOR DATE
// ==========================================================

function getPlanVersionForDate(
  plan,
  dateKey
) {

  if (
    dateKey <
    plan.createdDate
  ) {

    return null;

  }


  if (
    plan.deactivatedFrom &&
    dateKey >=
      plan.deactivatedFrom
  ) {

    return null;

  }


  const versions =
    [...plan.versions]
      .sort(
        (a, b) =>
          a.effectiveFrom
            .localeCompare(
              b.effectiveFrom
            )
      );


  let selected =
    null;


  for (
    const version
    of versions
  ) {

    if (
      version.effectiveFrom <=
      dateKey
    ) {

      selected =
        version;

    }

  }


  return selected;
}



// ==========================================================
// SCHEDULED TASKS FOR DATE
// ==========================================================

function getScheduledPlansForDate(
  date
) {

  const key =
    localDateKey(date);


  const weekday =
    date.getDay();


  return data.taskPlans
    .map(plan => {

      const version =
        getPlanVersionForDate(
          plan,
          key
        );


      if (!version) {

        return null;

      }


      if (
        !version.days.includes(
          weekday
        )
      ) {

        return null;

      }


      return {

        planId:
          plan.id,

        name:
          version.name

      };

    })
    .filter(Boolean);
}



// ==========================================================
// CREATE DAY RECORD
// ==========================================================

function ensureDayRecord(
  date
) {

  const key =
    localDateKey(date);


  if (
    data.days[key]
  ) {

    return data.days[key];

  }


  const scheduled =
    getScheduledPlansForDate(
      date
    );


  data.days[key] = {

    date:
      key,

    createdAt:
      new Date()
        .toISOString(),

    tasks:
      scheduled.map(
        task => ({

          id:
            `${key}-${task.planId}`,

          planId:
            task.planId,

          text:
            task.name,

          completed:
            false,

          completedAt:
            null

        })
      )

  };


  saveData();


  return data.days[key];
}



// ==========================================================
// GENERATE MISSED DAYS
// ==========================================================

function ensureMissingDays() {

  if (
    data.taskPlans.length ===
    0
  ) {

    ensureDayRecord(
      new Date()
    );

    return;

  }


  const createdDates =
    data.taskPlans
      .map(
        plan =>
          plan.createdDate
      )
      .filter(Boolean)
      .sort();


  if (
    createdDates.length ===
    0
  ) {

    return;

  }


  let cursor =
    parseDateKey(
      createdDates[0]
    );


  const today =
    new Date();


  today.setHours(
    12,
    0,
    0,
    0
  );


  while (
    cursor <= today
  ) {

    ensureDayRecord(
      cursor
    );


    cursor =
      addDays(
        cursor,
        1
      );

  }


  saveData();
}



// ==========================================================
// ADD TODAY'S NEWLY CREATED COMMITMENT
// ==========================================================

function syncTodayWithPlans() {

  const today =
    new Date();


  const record =
    ensureDayRecord(
      today
    );


  const scheduled =
    getScheduledPlansForDate(
      today
    );


  scheduled.forEach(
    plan => {

      const exists =
        record.tasks.some(
          task =>
            task.planId ===
            plan.planId
        );


      if (!exists) {

        record.tasks.push({

          id:
            `${
              getTodayKey()
            }-${plan.planId}`,

          planId:
            plan.planId,

          text:
            plan.name,

          completed:
            false,

          completedAt:
            null

        });

      }

    }
  );


  saveData();
}



// ==========================================================
// COMPLETION
// ==========================================================

function completionForRecord(
  record
) {

  const tasks =
    record?.tasks || [];


  if (
    tasks.length ===
    0
  ) {

    return {

      completed:
        0,

      total:
        0,

      rate:
        0,

      perfect:
        false,

      restDay:
        true

    };

  }


  const completed =
    tasks.filter(
      task =>
        task.completed
    ).length;


  const rate =
    Math.round(
      (
        completed /
        tasks.length
      ) * 100
    );


  return {

    completed,

    total:
      tasks.length,

    rate,

    perfect:
      completed ===
      tasks.length,

    restDay:
      false

  };
}



// ==========================================================
// ADD COMMITMENT
// ==========================================================

function addCommitment() {

  const name =
    els.planTaskName
      .value
      .trim();


  if (!name) {

    alert(
      "Enter a commitment name."
    );

    els.planTaskName
      .focus();

    return;

  }


  const checked =
    document.querySelectorAll(
      ".day-selector input:checked"
    );


  const days =
    [...checked]
      .map(
        input =>
          Number(
            input.value
          )
      );


  if (
    days.length ===
    0
  ) {

    alert(
      "Select at least one day."
    );

    return;

  }


  const todayKey =
    getTodayKey();


  const duplicate =
    data.taskPlans.some(
      plan => {

        const version =
          getPlanVersionForDate(
            plan,
            todayKey
          );


        if (!version) {

          return false;

        }


        return (
          version.name
            .toLowerCase()
          ===
          name.toLowerCase()
        );

      }
    );


  if (duplicate) {

    alert(
      "This commitment already exists."
    );

    return;

  }


  data.taskPlans.push({

    id:
      createId(),

    createdDate:
      todayKey,

    deactivatedFrom:
      null,

    versions: [

      {

        effectiveFrom:
          todayKey,

        name,

        days:
          [...days]

      }

    ]

  });


  saveData();


  /*
   If today's weekday
   was selected,
   it becomes mandatory TODAY.
  */

  syncTodayWithPlans();


  els.planTaskName.value =
    "";


  document
    .querySelectorAll(
      ".day-selector input"
    )
    .forEach(
      checkbox => {

        checkbox.checked =
          false;

      }
    );


  render();

}



// ==========================================================
// STREAK RESET
// ==========================================================

function resetCurrentStreak() {

  const today =
    getTodayKey();


  if (
    !data.streakResets.includes(
      today
    )
  ) {

    data.streakResets.push(
      today
    );

  }


  saveData();
}



// ==========================================================
// EDIT COMMITMENT
// ==========================================================

function editCommitment(
  planId
) {

  const plan =
    data.taskPlans.find(
      item =>
        item.id ===
        planId
    );


  if (!plan) {

    return;

  }


  const version =
    getPlanVersionForDate(
      plan,
      getTodayKey()
    );


  if (!version) {

    return;

  }


  const streak =
    calculateStreaks();


  const confirmEdit =
    confirm(
`⚠️ CHANGE COMMITMENT?

Task: ${version.name}

Changing your commitment will BREAK your current streak.

Current Streak: 🔥 ${streak.current}
Best Streak: 🏆 ${streak.best}

Today's tasks will remain locked.

Continue?`
    );


  if (!confirmEdit) {

    return;

  }


  const newName =
    prompt(
      "Commitment name:",
      version.name
    );


  if (
    newName === null
  ) {

    return;

  }


  if (
    !newName.trim()
  ) {

    alert(
      "Task name cannot be empty."
    );

    return;

  }


  const newDaysText =
    prompt(
`Enter days using numbers:

0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday

Example:
Workout Mon-Sat
1,2,3,4,5,6`,

      version.days
        .join(",")
    );


  if (
    newDaysText === null
  ) {

    return;

  }


  const newDays =
    [
      ...new Set(

        newDaysText
          .split(",")
          .map(
            value =>
              Number(
                value.trim()
              )
          )
          .filter(
            value =>
              [
                0,
                1,
                2,
                3,
                4,
                5,
                6
              ].includes(
                value
              )
          )

      )
    ];


  if (
    newDays.length ===
    0
  ) {

    alert(
      "Select at least one valid day."
    );

    return;

  }


  /*
   IMPORTANT

   New schedule starts tomorrow.

   Therefore user cannot
   remove today's commitment.
  */

  plan.versions.push({

    effectiveFrom:
      getTomorrowKey(),

    name:
      newName.trim(),

    days:
      newDays

  });


  resetCurrentStreak();


  saveData();


  alert(
`Commitment updated.

🔥 Current streak broken.

New schedule starts tomorrow.

Today's commitments are still locked.`
  );


  render();
}



// ==========================================================
// REMOVE COMMITMENT
// ==========================================================

function removeCommitment(
  planId
) {

  const plan =
    data.taskPlans.find(
      item =>
        item.id ===
        planId
    );


  if (!plan) {

    return;

  }


  const version =
    getPlanVersionForDate(
      plan,
      getTodayKey()
    );


  if (!version) {

    return;

  }


  const streak =
    calculateStreaks();


  const confirmed =
    confirm(
`⚠️ REMOVE COMMITMENT?

${version.name}

Removing it will BREAK your current streak.

Current Streak: 🔥 ${streak.current}
Best Streak: 🏆 ${streak.best}

Today's commitment will NOT disappear.

Continue?`
    );


  if (!confirmed) {

    return;

  }


  /*
   Remove from TOMORROW.

   Today's task remains.
  */

  plan.deactivatedFrom =
    getTomorrowKey();


  resetCurrentStreak();


  saveData();


  alert(
`Commitment removed from future days.

🔥 Current streak broken.

Today's task is still mandatory.`
  );


  render();
}



// ==========================================================
// COMPLETE TASK
// ==========================================================

function completeTask(
  taskId
) {

  const today =
    ensureDayRecord(
      new Date()
    );


  const task =
    today.tasks.find(
      item =>
        item.id ===
        taskId
    );


  if (!task) {

    return;

  }


  if (
    task.completed
  ) {

    alert(
      "🔒 This task is already completed and cannot be unchecked."
    );

    return;

  }


  const confirmed =
    confirm(
`Complete "${task.text}"?

Once completed, this cannot be undone.`
    );


  if (!confirmed) {

    renderTasks();

    return;

  }


  task.completed =
    true;


  task.completedAt =
    new Date()
      .toISOString();


  saveData();


  render();
}



// ==========================================================
// STREAK
// ==========================================================

function calculateStreaks() {

  const today =
    new Date();


  today.setHours(
    12,
    0,
    0,
    0
  );


  const resets =
    [...data.streakResets]
      .sort();


  const latestReset =
    resets.length
      ? resets[
          resets.length - 1
        ]
      : null;



  // ==================================
  // CURRENT
  // ==================================

  let current =
    0;


  let cursor =
    new Date(today);


  while (true) {

    const key =
      localDateKey(
        cursor
      );


    /*
      Plan changed today?
      Current streak is immediately 0.
    */

    if (
      latestReset &&
      key <= latestReset
    ) {

      break;

    }


    const record =
      data.days[key];


    if (!record) {

      break;

    }


    const stats =
      completionForRecord(
        record
      );


    /*
      REST DAY

      Doesn't add streak.
      Doesn't break streak.
    */

    if (
      stats.restDay
    ) {

      cursor =
        addDays(
          cursor,
          -1
        );

      continue;

    }


    /*
      TODAY pending:

      Previous streak
      remains visible during day.
    */

    if (
      key ===
        getTodayKey() &&
      !stats.perfect
    ) {

      cursor =
        addDays(
          cursor,
          -1
        );

      continue;

    }


    if (
      stats.perfect
    ) {

      current++;


      cursor =
        addDays(
          cursor,
          -1
        );


      continue;

    }


    /*
      Missed required task
    */

    break;

  }



  // ==================================
  // BEST STREAK
  // ==================================

  const keys =
    Object.keys(
      data.days
    )
      .sort();


  let best =
    0;


  let running =
    0;


  for (
    const key
    of keys
  ) {

    const stats =
      completionForRecord(
        data.days[key]
      );


    /*
      Rest days preserve streak
      but don't increase it.
    */

    if (
      stats.restDay
    ) {

      if (
        data.streakResets.includes(
          key
        )
      ) {

        running =
          0;

      }


      continue;

    }


    if (
      stats.perfect
    ) {

      running++;


      best =
        Math.max(
          best,
          running
        );

    }

    else if (
      key !==
      getTodayKey()
    ) {

      running =
        0;

    }


    /*
      User changed routine.
    */

    if (
      data.streakResets.includes(
        key
      )
    ) {

      best =
        Math.max(
          best,
          running
        );


      running =
        0;

    }

  }


  return {

    current,

    best

  };
}



// ==========================================================
// CHART COLOR
// ==========================================================

function getLevel(
  rate,
  hasTasks
) {

  if (!hasTasks) {

    return 0;

  }


  if (
    rate === 0
  ) {

    return 0;

  }


  if (
    rate <= 25
  ) {

    return 1;

  }


  if (
    rate <= 50
  ) {

    return 2;

  }


  if (
    rate < 100
  ) {

    return 3;

  }


  return 4;
}



// ==========================================================
// RENDER PLANS
// ==========================================================

function renderTaskPlans() {

  els.taskPlanList.innerHTML =
    "";


  const todayKey =
    getTodayKey();


  const plans =
    data.taskPlans
      .map(
        plan => ({

          plan,

          version:
            getPlanVersionForDate(
              plan,
              todayKey
            )

        })
      )
      .filter(
        item =>
          item.version
      );


  if (
    plans.length ===
    0
  ) {

    els.taskPlanList.innerHTML =
      `
      <p class="history-empty">
        No commitments added yet.
      </p>
      `;


    return;

  }


  const displayDays = [

    {
      value: 1,
      letter: "M",
      name: "Monday"
    },

    {
      value: 2,
      letter: "T",
      name: "Tuesday"
    },

    {
      value: 3,
      letter: "W",
      name: "Wednesday"
    },

    {
      value: 4,
      letter: "T",
      name: "Thursday"
    },

    {
      value: 5,
      letter: "F",
      name: "Friday"
    },

    {
      value: 6,
      letter: "S",
      name: "Saturday"
    },

    {
      value: 0,
      letter: "S",
      name: "Sunday"
    }

  ];


  plans.forEach(
    item => {

      const {
        plan,
        version
      } =
        item;


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "plan-item";



      // NAME

      const name =
        document.createElement(
          "div"
        );


      name.className =
        "plan-name";


      name.textContent =
        version.name;



      // DAYS

      const daysContainer =
        document.createElement(
          "div"
        );


      daysContainer.className =
        "plan-days";


      displayDays.forEach(
        day => {

          const dayBox =
            document.createElement(
              "span"
            );


          dayBox.className =
            "plan-day";


          dayBox.textContent =
            day.letter;


          dayBox.title =
            day.name;


          if (
            version.days.includes(
              day.value
            )
          ) {

            dayBox.classList.add(
              "active"
            );

          }


          daysContainer.appendChild(
            dayBox
          );

        }
      );



      // ACTIONS

      const actions =
        document.createElement(
          "div"
        );


      actions.className =
        "plan-actions";



      const editBtn =
        document.createElement(
          "button"
        );


      editBtn.type =
        "button";


      editBtn.className =
        "edit-plan-btn";


      editBtn.textContent =
        "Edit";


      editBtn.addEventListener(
        "click",
        () =>
          editCommitment(
            plan.id
          )
      );



      const removeBtn =
        document.createElement(
          "button"
        );


      removeBtn.type =
        "button";


      removeBtn.className =
        "delete-plan-btn";


      removeBtn.textContent =
        "Remove";


      removeBtn.addEventListener(
        "click",
        () =>
          removeCommitment(
            plan.id
          )
      );



      actions.append(
        editBtn,
        removeBtn
      );


      row.append(
        name,
        daysContainer,
        actions
      );


      els.taskPlanList
        .appendChild(
          row
        );

    }
  );
}



// ==========================================================
// RENDER TODAY
// ==========================================================

function renderTasks() {

  const record =
    ensureDayRecord(
      new Date()
    );


  els.taskList.innerHTML =
    "";


  if (
    record.tasks.length ===
    0
  ) {

    els.emptyState
      .classList
      .remove(
        "hidden"
      );


    return;

  }


  els.emptyState
    .classList
    .add(
      "hidden"
    );


  record.tasks.forEach(
    task => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        `task-item ${
          task.completed
            ? "completed"
            : ""
        }`;



      const checkbox =
        document.createElement(
          "input"
        );


      checkbox.type =
        "checkbox";


      checkbox.className =
        "task-check";


      checkbox.checked =
        task.completed;


      /*
        Once done,
        permanently locked.
      */

      checkbox.disabled =
        task.completed;


      checkbox.addEventListener(
        "change",
        () =>
          completeTask(
            task.id
          )
      );



      const name =
        document.createElement(
          "span"
        );


      name.className =
        "task-name";


      name.textContent =
        task.text;



      const status =
        document.createElement(
          "span"
        );


      status.className =
        "task-status";


      status.textContent =
        task.completed

          ? "✅ DONE • LOCKED 🔒"

          : "⬜ PENDING";



      row.append(
        checkbox,
        name,
        status
      );


      els.taskList
        .appendChild(
          row
        );

    }
  );
}



// ==========================================================
// RENDER STATS
// ==========================================================

function renderStats() {

  const record =
    ensureDayRecord(
      new Date()
    );


  const todayStats =
    completionForRecord(
      record
    );


  const streak =
    calculateStreaks();


  const allRecords =
    Object.values(
      data.days
    );


  const totalCompleted =
    allRecords.reduce(

      (
        total,
        record
      ) =>

        total +
        completionForRecord(
          record
        ).completed,

      0

    );


  const totalTasks =
    allRecords.reduce(

      (
        total,
        record
      ) =>

        total +
        completionForRecord(
          record
        ).total,

      0

    );


  const overall =
    totalTasks

      ? Math.round(
          (
            totalCompleted /
            totalTasks
          ) * 100
        )

      : 0;



  els.currentStreak
    .textContent =
      streak.current;


  els.bestStreak
    .textContent =
      streak.best;


  els.totalCompleted
    .textContent =
      totalCompleted;


  els.overallRate
    .textContent =
      `Overall: ${overall}%`;



  if (
    todayStats.restDay
  ) {

    els.todayRate
      .textContent =
        "REST";


    els.todaySummary
      .textContent =
        "No required tasks today";


    els.progressTitle
      .textContent =
        "Rest Day";


    els.progressFill
      .style
      .width =
        "0%";


    els.dayStatus
      .textContent =
        "😴 Rest Day";


    els.dayStatus
      .classList
      .remove(
        "perfect"
      );


    return;

  }



  els.todayRate
    .textContent =
      `${todayStats.rate}%`;


  els.todaySummary
    .textContent =
      `${todayStats.completed} / ${todayStats.total} completed`;


  els.progressTitle
    .textContent =
      `${todayStats.rate}% complete`;


  els.progressFill
    .style
    .width =
      `${todayStats.rate}%`;



  if (
    todayStats.perfect
  ) {

    els.dayStatus
      .textContent =
        "🔥 Perfect Day";


    els.dayStatus
      .classList
      .add(
        "perfect"
      );

  }

  else {

    els.dayStatus
      .classList
      .remove(
        "perfect"
      );


    if (
      todayStats.rate >=
      75
    ) {

      els.dayStatus
        .textContent =
          "Almost there";

    }

    else if (
      todayStats.rate >=
      50
    ) {

      els.dayStatus
        .textContent =
          "Keep pushing";

    }

    else {

      els.dayStatus
        .textContent =
          "No excuses";

    }

  }

}



// ==========================================================
// RENDER CHART
// ==========================================================

function renderChart() {

  els.contributionChart
    .innerHTML =
      "";


  const today =
    new Date();


  today.setHours(
    12,
    0,
    0,
    0
  );


  const mondayIndex =
    (
      today.getDay() +
      6
    ) % 7;


  const mondayThisWeek =
    addDays(
      today,
      -mondayIndex
    );


  const start =
    addDays(
      mondayThisWeek,
      -(WEEKS_TO_SHOW - 1) * 7
    );


  for (
    let i = 0;

    i <
    WEEKS_TO_SHOW * 7;

    i++
  ) {

    const date =
      addDays(
        start,
        i
      );


    const key =
      localDateKey(
        date
      );


    const record =
      data.days[key];


    const stats =
      completionForRecord(
        record
      );


    const level =
      getLevel(
        stats.rate,
        stats.total > 0
      );


    const cell =
      document.createElement(
        "div"
      );


    cell.className =
      `day-cell level-${level}`;



    if (
      key ===
      getTodayKey()
    ) {

      cell.classList.add(
        "today"
      );

    }



    if (
      date > today
    ) {

      cell.classList.add(
        "future"
      );

    }



    if (
      date > today
    ) {

      cell.title =
        `${formatDate(date)} • Future`;

    }

    else if (
      !record
    ) {

      cell.title =
        `${formatDate(date)} • No data`;

    }

    else if (
      stats.restDay
    ) {

      cell.title =
        `${formatDate(date)} • Rest Day`;

    }

    else {

      cell.title =
        `${formatDate(date)} • ${stats.completed}/${stats.total} • ${stats.rate}%`;

    }



    els.contributionChart
      .appendChild(
        cell
      );

  }

}



// ==========================================================
// HISTORY
// ==========================================================

function renderHistory() {

  els.historyList
    .innerHTML =
      "";


  const keys =
    Object.keys(
      data.days
    )

      .filter(
        key =>
          key <=
          getTodayKey()
      )

      .sort(
        (a, b) =>
          b.localeCompare(a)
      )

      .slice(
        0,
        14
      );


  if (
    keys.length ===
    0
  ) {

    els.historyList
      .innerHTML =
        `
        <p class="history-empty">
          No history yet.
        </p>
        `;


    return;

  }



  keys.forEach(
    key => {

      const record =
        data.days[key];


      const stats =
        completionForRecord(
          record
        );


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "history-row";



      const date =
        document.createElement(
          "div"
        );


      date.className =
        "history-date";


      date.textContent =
        key === getTodayKey()

          ? `Today • ${formatDate(parseDateKey(key))}`

          : formatDate(
              parseDateKey(
                key
              )
            );



      const count =
        document.createElement(
          "div"
        );


      count.className =
        "history-count";



      if (
        stats.restDay
      ) {

        count.textContent =
          "😴 Rest Day";

      }

      else if (
        stats.perfect
      ) {

        count.textContent =
          `${stats.completed}/${stats.total} • 🔥 Perfect`;

      }

      else {

        count.textContent =
          `${stats.completed}/${stats.total} completed`;

      }



      const rate =
        document.createElement(
          "div"
        );


      rate.className =
        "history-rate";


      rate.textContent =
        stats.restDay

          ? "REST"

          : `${stats.rate}%`;



      row.append(
        date,
        count,
        rate
      );


      els.historyList
        .appendChild(
          row
        );

    }
  );
}



// ==========================================================
// MAIN RENDER
// ==========================================================

function render() {

  els.todayDate
    .textContent =
      `Today ${formatDate(
        new Date()
      )}`;


  renderTaskPlans();

  renderTasks();

  renderStats();

  renderChart();

  renderHistory();


  saveData();
}



// ==========================================================
// EVENTS
// ==========================================================

els.addPlanBtn
  .addEventListener(
    "click",
    addCommitment
  );



els.planTaskName
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        event.preventDefault();

        addCommitment();

      }

    }
  );



// ==========================================================
// START APP
// ==========================================================

let data =
  loadData();


ensureMissingDays();


syncTodayWithPlans();


render();
