// Use an IIFE or block scope to prevent global namespace pollution
//

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

  // Centralized Data for Lines (Easier to maintain)
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

  const form = document.getElementById("onboarding-form");
  const lineContainer = document.getElementById("line-container");
  const scheduler = document.getElementById("scheduler");

  /* --- INITIALIZATION --- */
  function init() {
    renderLines();
    renderScheduler();
    form.addEventListener("submit", handleFormSubmit);
  }

  function getCsrfToken() {
    return document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
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

      // Event Listener (better than onclick=)
      btn.addEventListener("click", () => btn.classList.toggle("active"));

      fragment.appendChild(btn);
    });
    lineContainer.appendChild(fragment);
  }

  function renderScheduler() {
    const fragment = document.createDocumentFragment();
    DAYS.forEach((day) => fragment.appendChild(createDayComponent(day)));
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

    // Add Range Listener
    day.querySelector(".add-range-btn").addEventListener("click", () => {
      day.querySelector(".ranges").appendChild(createRangeInput(dayName, day));
    });

    return day;
  }

  function createRangeInput(dayName, dayEl) {
    const row = document.createElement("div");
    row.className = "range";

    const start = createTimeInput(`${dayName}_start[]`, dayEl);
    const end = createTimeInput(`${dayName}_end[]`, dayEl);

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

  function createTimeInput(name, dayEl) {
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

  function hasAtLeastOneTimeRange() {
    return [...document.querySelectorAll(".range")].some((range) => {
      const [start, end] = range.querySelectorAll("input");
      return start.value && end.value;
    });
  }

  function validateDay(dayEl) {
    const rows = [...dayEl.querySelectorAll(".range")];
    const errorEl = dayEl.querySelector(".error-msg");
    let error = "";

    // Reset styles
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
      .filter((r) => r.start !== null && r.end !== null);

    // Sort for overlap check
    ranges.sort((a, b) => a.start - b.start);

    for (let i = 0; i < ranges.length; i++) {
      const current = ranges[i];

      // Logic: End before Start?
      if (current.start >= current.end) {
        error = "End time must be after start time.";
        current.inputs[1].classList.add("input-error");
        break;
      }

      // Logic: Overlap?
      if (i < ranges.length - 1) {
        const next = ranges[i + 1];
        if (current.end > next.start) {
          error = "Time ranges cannot overlap.";
          current.inputs[1].classList.add("input-error");
          next.inputs[0].classList.add("input-error");
          break;
        }
      }
    }

    errorEl.textContent = error;
    errorEl.classList.toggle("visible", !!error);
    return !error;
  }

  /* --- SUBMISSION HANDLER --- */
  async function handleFormSubmit(e) {
    e.preventDefault();

    // 1. Lines
    const lines = [...document.querySelectorAll(".line-btn.active")].map(
      (btn) => btn.dataset.line,
    );

    if (lines.length === 0) {
      alert("Please select at least one train line.");
      return;
    }

    // 2. Times
    const times = {};
    let hasAnyRange = false;
    let allDaysValid = true;

    document.querySelectorAll(".day").forEach((day) => {
      const dayName = day.querySelector(".day-header span").innerText;
      if (!validateDay(day)) allDaysValid = false;

      const ranges = [];
      day.querySelectorAll(".range").forEach((range) => {
        const [start, end] = range.querySelectorAll("input");
        if (start.value && end.value) {
          ranges.push({ start: start.value, end: end.value });
          hasAnyRange = true;
        }
      });

      if (ranges.length) times[dayName] = ranges;
    });

    if (!allDaysValid) {
      alert("Please fix the time errors highlighted in red.");
      return;
    }

    if (!hasAnyRange) {
      alert("Please add at least one time range.");
      return;
    }

    // 3. Submit JSON
    const res = await fetch(form.action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({ lines, times }),
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg);
      return;
    } else {
      console.error("CSRF or Server Error");
    }

    // Redirect handled by backend
    const data = await res.json();
    window.location.href = data.redirect;
  }

  // Run
  init();
})();
