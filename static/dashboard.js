// Use an IIFE to prevent global namespace pollution
(() => {
  /* --- CONFIGURATION --- */
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const TRAIN_DATA = [
    { id: "1", color: "#EE352E" },
    { id: "2", color: "#EE352E" },
    { id: "3", color: "#EE352E" },
    { id: "4", color: "#00933C" },
    { id: "5", color: "#00933C" },
    { id: "6", color: "#00933C" },
    { id: "7", color: "#B933AD" },
    { id: "A", color: "#0039A6" },
    { id: "C", color: "#0039A6" },
    { id: "E", color: "#0039A6" },
    { id: "B", color: "#FF6319" },
    { id: "D", color: "#FF6319" },
    { id: "F", color: "#FF6319" },
    { id: "M", color: "#FF6319" },
    { id: "G", color: "#6CBE45" },
    { id: "N", color: "#FCCC0A" },
    { id: "Q", color: "#FCCC0A" },
    { id: "R", color: "#FCCC0A" },
    { id: "W", color: "#FCCC0A" },
    { id: "L", color: "#A7A9AC" },
    { id: "J", color: "#996633" },
    { id: "Z", color: "#996633" },
  ];

  const form = document.getElementById("dashboard-form");
  const lineContainer = document.getElementById("line-container");
  const scheduler = document.getElementById("scheduler");

  let USER_LINES = [];
  let USER_TIMES = {};

  /* --- DATA LOADING --- */
  function loadUserData() {
    const el = document.getElementById("user-data");
    if (!el) throw new Error("Missing user-data script tag");

    const data = JSON.parse(el.textContent);
    USER_LINES = data.lines || [];
    USER_TIMES = data.times || {};
  }

  function getCsrfToken() {
    return document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
  }

  /* --- INITIALIZATION --- */
  async function init() {
    await loadUserData();
    renderLines();
    renderScheduler();
    form.addEventListener("submit", handleFormSubmit);
  }

  /* --- RENDERERS --- */
  function renderLines() {
    const fragment = document.createDocumentFragment();

    TRAIN_DATA.forEach((train) => {
      const btn = document.createElement("div");
      btn.className = "line-btn";
      btn.textContent = train.id;
      btn.dataset.line = train.id;
      btn.style.backgroundColor = train.color;

      if (USER_LINES.includes(train.id)) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => btn.classList.toggle("active"));
      fragment.appendChild(btn);
    });

    lineContainer.appendChild(fragment);
  }

  function renderScheduler() {
    const fragment = document.createDocumentFragment();

    DAYS.forEach((day) => {
      const dayComponent = createDayComponent(day);

      if (USER_TIMES[day]) {
        const rangesContainer = dayComponent.querySelector(".ranges");
        USER_TIMES[day].forEach((range) => {
          const rangeEl = createRangeInput(day, dayComponent);
          const [startInput, endInput] = rangeEl.querySelectorAll("input");
          startInput.value = range.start;
          endInput.value = range.end;
          rangesContainer.appendChild(rangeEl);
        });
      }

      fragment.appendChild(dayComponent);
    });

    scheduler.appendChild(fragment);
  }

  function createDayComponent(dayName) {
    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `
      <div class="day-header">
        <span>${dayName}</span>
        <button type="button" class="add-range-btn">Add Range</button>
      </div>
      <div class="ranges"></div>
      <div class="error-msg"></div>
    `;

    day.querySelector(".add-range-btn").addEventListener("click", () => {
      day.querySelector(".ranges").appendChild(createRangeInput(dayName, day));
    });

    return day;
  }

  function createRangeInput(dayName, dayEl) {
    const row = document.createElement("div");
    row.className = "range";

    const start = createTimeInput(dayEl);
    const end = createTimeInput(dayEl);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      row.remove();
      validateDay(dayEl);
    });

    row.append(start, end, removeBtn);
    return row;
  }

  function createTimeInput(dayEl) {
    const input = document.createElement("input");
    input.type = "time";
    input.required = true;
    input.addEventListener("input", () => validateDay(dayEl));
    return input;
  }

  /* --- VALIDATION --- */
  function toMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function validateDay(dayEl) {
    const rows = [...dayEl.querySelectorAll(".range")];
    const errorEl = dayEl.querySelector(".error-msg");
    let error = "";

    rows.forEach((r) =>
      r
        .querySelectorAll("input")
        .forEach((i) => i.classList.remove("input-error")),
    );

    const ranges = rows
      .map((row) => {
        const [s, e] = row.querySelectorAll("input");
        return {
          start: toMinutes(s.value),
          end: toMinutes(e.value),
          inputs: [s, e],
        };
      })
      .filter((r) => r.start !== null && r.end !== null)
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < ranges.length; i++) {
      if (ranges[i].start >= ranges[i].end) {
        error = "End time must be after start time.";
        ranges[i].inputs[1].classList.add("input-error");
        break;
      }

      if (i < ranges.length - 1 && ranges[i].end > ranges[i + 1].start) {
        error = "Time ranges cannot overlap.";
        ranges[i].inputs[1].classList.add("input-error");
        ranges[i + 1].inputs[0].classList.add("input-error");
        break;
      }
    }

    errorEl.textContent = error;
    errorEl.classList.toggle("visible", !!error);
    return !error;
  }

  /* --- SUBMISSION --- */
  async function handleFormSubmit(e) {
    e.preventDefault();

    const lines = [...document.querySelectorAll(".line-btn.active")].map(
      (btn) => btn.dataset.line,
    );

    if (!lines.length) {
      alert("Please select at least one train line.");
      return;
    }

    const times = {};
    let hasRange = false;

    document.querySelectorAll(".day").forEach((day) => {
      const name = day.querySelector(".day-header span").innerText;
      if (!validateDay(day)) return;

      const ranges = [];
      day.querySelectorAll(".range").forEach((r) => {
        const [s, e] = r.querySelectorAll("input");
        if (s.value && e.value) {
          ranges.push({ start: s.value, end: e.value });
          hasRange = true;
        }
      });

      if (ranges.length) times[name] = ranges;
    });

    if (!hasRange) {
      alert("Please add at least one time range.");
      return;
    }

    const res = await fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify({ lines, times }),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    window.location.reload();
  }

  init();
})();
