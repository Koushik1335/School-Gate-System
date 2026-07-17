const SVG_NS = "http://www.w3.org/2000/svg";
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

let dayIndex = 0, simMinutes = 450, speed = 15, running = false;
let lastFrameTime = null, people = [], nextId = 0, spawnAccumulator = 0, everSeenPerson = false;

const svg = document.getElementById("simSvg");
const peopleLayer = document.getElementById("peopleLayer");
const dayLabel = document.getElementById("dayLabel");
const timeLabel = document.getElementById("timeLabel");
const personLegendRow = document.getElementById("personLegendRow");

/* entrance hedge: 4 bushes, each with a small dark "light" on top */
const hedgeGroup = document.getElementById("hedgeBushes");
const hedgeStart = 441, hedgeWidth = 232, bushCount = 4, bw = hedgeWidth / bushCount;
for (let i = 0; i < bushCount; i++) {
    const cx = hedgeStart + bw * (i + 0.5);
    const bush = document.createElementNS(SVG_NS, "rect");
    bush.setAttribute("class", "hedge-bush");
    bush.setAttribute("x", cx - bw / 2 + 3);
    bush.setAttribute("y", 117);
    bush.setAttribute("width", bw - 6);
    bush.setAttribute("height", 23);
    bush.setAttribute("rx", 10);
    hedgeGroup.appendChild(bush);

    const dot = document.createElementNS(SVG_NS, "rect");
    dot.setAttribute("class", "hedge-dot");
    dot.setAttribute("x", cx - 2);
    dot.setAttribute("y", 122);
    dot.setAttribute("width", 4);
    dot.setAttribute("height", 4);
    hedgeGroup.appendChild(dot);
}

/* the main gate itself - colour is set live by updateGateDisplay() */
const gate = document.createElementNS(SVG_NS, "rect");
gate.setAttribute("id", "mainGate");
gate.setAttribute("x", 350);
gate.setAttribute("y", 111);
gate.setAttribute("width", 85);
gate.setAttribute("height", 14);
gate.setAttribute("stroke", "#000");
gate.setAttribute("stroke-width", "2");
svg.appendChild(gate);

const OUTSIDE_GATE = { x: 365, y: 80 };
const YARD = [
    { x: 420, y: 380 }, { x: 500, y: 410 }, { x: 610, y: 385 },
    { x: 700, y: 430 }, { x: 820, y: 450 }, { x: 930, y: 500 },
];
const BUILDINGS = [{ x: 450, y: 260 }, { x: 620, y: 260 }];

/* ---- schedule (all times in minutes since midnight) ----
   7:00-8:45 entry | 10:00-10:30, 11:45-12:15, 13:30-13:50 breaks
   Tue/Wed 3rd break = an exit window instead of a normal break
   15:05-15:45 dismissal | 16:00+ everyone can leave */
const BREAKS = [[600, 630], [705, 735], [810, 830]];
const inRange = (m, [s, e]) => m >= s && m <= e;
const isBreakTime = m => BREAKS.some(r => inRange(m, r));
const isBreakStart = m => BREAKS.some(([s]) => m >= s && m <= s + 10);
const isBreakEnd = m => BREAKS.some(([, e]) => m >= e - 10 && m <= e);

function getGateState(day, m) {
    if (m >= 420 && m < 525) return "open";
    if (inRange(m, [810, 830])) {
        if (day === "Tuesday") return "restricted";
        if (day === "Wednesday") return "open";
    }
    if (m >= 905 && m <= 945) return "open";
    if (m >= 960) return "open";
    return "closed";
}

function decideMovement() {
    const day = dayNames[dayIndex], m = simMinutes;
    if (m >= 420 && m < 525) return "enter";
    if (isBreakTime(m)) {
        if ((day === "Tuesday" || day === "Wednesday") && inRange(m, [810, 830])) return "exit";
        if (isBreakStart(m)) return "breakOut";
        if (isBreakEnd(m)) return "breakIn";
    }
    if (m >= 905 && m <= 945) return "exit";
    if (m >= 960) return "exit";
    return null;
}

function formatTime(minutes) {
    let h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    const ampm = h >= 12 ? "PM" : "AM";
    let h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

function updateClockDisplay() {
    dayLabel.textContent = dayNames[dayIndex];
    timeLabel.textContent = formatTime(simMinutes);
}

function updateGateDisplay() {
    const state = getGateState(dayNames[dayIndex], simMinutes);
    gate.setAttribute("fill", state === "open" ? "#ffffff" : state === "restricted" ? "#4e4e4e" : "#000000");
}

const randomFrom = list => list[Math.floor(Math.random() * list.length)];

const MOVE_PATHS = {
    enter: () => [OUTSIDE_GATE, randomFrom(YARD)],
    exit: () => [randomFrom(YARD), OUTSIDE_GATE],
    breakOut: () => [randomFrom(BUILDINGS), randomFrom(YARD)],
    breakIn: () => [randomFrom(YARD), randomFrom(BUILDINGS)],
};

function spawnPerson(type) {
    const [start, end] = MOVE_PATHS[type]();
    const isSenior = Math.random() < 0.4;
    const person = {
        id: nextId++,
        x: start.x, y: start.y,
        startX: start.x, startY: start.y,
        endX: end.x, endY: end.y,
        progress: 0,
        speed: 0.45 + Math.random() * 0.3,
        el: document.createElementNS(SVG_NS, "circle"),
    };
    person.el.setAttribute("r", 4.5);
    person.el.setAttribute("class", isSenior ? "person-senior" : "person");
    peopleLayer.appendChild(person.el);
    people.push(person);

    if (!everSeenPerson) {
        everSeenPerson = true;
        personLegendRow.classList.add("visible");
    }
}

function stepPeople(dtSeconds) {
    for (const p of people) {
        p.progress = Math.min(1, p.progress + dtSeconds * p.speed);
        p.x = p.startX + (p.endX - p.startX) * p.progress;
        p.y = p.startY + (p.endY - p.startY) * p.progress;
        p.el.setAttribute("cx", p.x);
        p.el.setAttribute("cy", p.y);
    }
    people = people.filter(p => {
        if (p.progress >= 1) { p.el.remove(); return false; }
        return true;
    });
}

function clearPeople() {
    people.forEach(p => p.el.remove());
    people = [];
}

function tick(now) {
    if (lastFrameTime === null) lastFrameTime = now;
    const dtSeconds = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (running) {
        simMinutes += dtSeconds * speed;
        if (simMinutes >= 1020) {
            simMinutes = 420;
            dayIndex = (dayIndex + 1) % 5;
            clearPeople();
        }
        if (simMinutes >= 525 && simMinutes < 526) clearPeople(); // school starts, everyone's in class

        const movement = decideMovement();
        spawnAccumulator += dtSeconds;
        if (movement && spawnAccumulator > 0.25 && people.length < 35) {
            spawnAccumulator = 0;
            spawnPerson(movement);
        }
        stepPeople(dtSeconds);
    }

    updateClockDisplay();
    updateGateDisplay();
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
updateClockDisplay();
updateGateDisplay();

function toggleRun() {
    running = !running;
    const btn = document.getElementById("startStopBtn");
    btn.textContent = running ? "STOP" : "START";
    btn.classList.toggle("running", running);
    btn.classList.toggle("stopped", !running);
}

function setDay(value) {
    dayIndex = parseInt(value, 10);
    updateGateDisplay();
}

function jumpTo(minutes) {
    simMinutes = minutes;
    clearPeople();
    updateClockDisplay();
    updateGateDisplay();
}

function resetSim() {
    running = false;
    simMinutes = 450;
    dayIndex = 0;
    document.getElementById("daySelect").value = "0";
    clearPeople();
    everSeenPerson = false;
    personLegendRow.classList.remove("visible");
    const btn = document.getElementById("startStopBtn");
    btn.textContent = "START";
    btn.classList.remove("running");
    btn.classList.add("stopped");
    updateClockDisplay();
    updateGateDisplay();
}

document.getElementById("speedSlider").addEventListener("input", (e) => {
    speed = parseInt(e.target.value, 10);
    document.getElementById("speedLabel").textContent = `${speed} sim-min / sec`;
});
