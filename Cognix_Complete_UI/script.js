/*
  COGNIX FRONTEND
  -------------------------------------------------------------
  Connect your backend by changing API_BASE_URL and/or the
  endpoints in CONFIG below.

  Expected chat response examples:
    { "reply": "..." }
  or
    { "message": "..." }
  or
    { "response": "..." }

  Expected optional streak response:
    { "streak": 7 }
*/

const CONFIG = {
  API_BASE_URL: "",                 // e.g. "http://localhost:8000"
  CHAT_ENDPOINT: "/api/chat",
  STREAK_ENDPOINT: "/api/streak",
  STUDY_TIME_ENDPOINT: "/api/study-time",
  NOTES_ENDPOINT: "/api/notes",
  USE_DEMO_FALLBACK: true           // false = show backend errors instead of demo replies
};

const state = {
  streak: Number(localStorage.getItem("cognix_streak") || 3),
  questions: Number(localStorage.getItem("cognix_questions") || 0),
  studyMinutes: Number(localStorage.getItem("cognix_study_minutes") || 0),
  messages: JSON.parse(localStorage.getItem("cognix_messages") || "[]")
};

const $ = (id) => document.getElementById(id);
const sidebar = $("sidebar");
const chatArea = $("chatArea");
const emptyState = $("emptyState");
const messageInput = $("messageInput");
const typingIndicator = $("typingIndicator");
const attachmentList = $("attachmentList");
let attachedFiles = [];

function endpoint(path) {
  return `${CONFIG.API_BASE_URL}${path}`;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(endpoint(path), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  return response.json();
}

function saveState() {
  localStorage.setItem("cognix_streak", state.streak);
  localStorage.setItem("cognix_questions", state.questions);
  localStorage.setItem("cognix_study_minutes", state.studyMinutes);
  localStorage.setItem("cognix_messages", JSON.stringify(state.messages.slice(-40)));
}

function renderStats() {
  $("streakCount").textContent = state.streak;
  $("progressStreak").textContent = state.streak;
  $("questionCount").textContent = state.questions;
  $("studyTime").textContent = `${state.studyMinutes} min`;
  $("modalStreak").textContent = state.streak;
}

function renderMessages() {
  chatArea.innerHTML = "";
  if (!state.messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = '<div class="empty-orbit"></div>';
    chatArea.appendChild(empty);
    return;
  }
  state.messages.forEach(m => {
    const el = document.createElement("div");
    el.className = `message ${m.role}`;
    el.textContent = m.content;
    chatArea.appendChild(el);
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addMessage(role, content) {
  state.messages.push({role, content, time: Date.now()});
  saveState();
  renderMessages();
}

function demoReply(text) {
  const t = text.toLowerCase();
  if (t.includes("hello") || t.includes("hi")) return "Hi! I'm Cognix. Ask me anything you're studying and I'll help you work through it step by step.";
  if (t.includes("math") || t.includes("equation")) return "Sure. Send me the exact problem and I'll break the solution into clear steps.";
  if (t.includes("study plan")) return "I can help you build a study plan. Tell me the subjects, your deadline, and how much time you can study each day.";
  if (t.includes("physics")) return "Let's work through the physics concept carefully. Send the question, formula, or topic you're stuck on.";
  return "I’m ready to help. Send the question, topic, notes, or problem you want to work on.";
}

async function getAssistantReply(text) {
  try {
    const data = await apiFetch(CONFIG.CHAT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        message: text,
        messages: state.messages,
        files: attachedFiles.map(f => ({name: f.name, type: f.type, size: f.size}))
      })
    });
    return data.reply ?? data.message ?? data.response ?? data.answer ?? JSON.stringify(data);
  } catch (err) {
    if (CONFIG.USE_DEMO_FALLBACK) return demoReply(text);
    throw err;
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !attachedFiles.length) return;

  const shownText = text || `Attached ${attachedFiles.length} file(s).`;
  addMessage("user", shownText);
  messageInput.value = "";
  state.questions += 1;
  state.studyMinutes += 1;
  saveState();
  renderStats();
  clearAttachments();

  typingIndicator.classList.add("show");
  $("sendBtn").disabled = true;

  try {
    const reply = await getAssistantReply(text || "Please analyze the attached file(s).");
    addMessage("assistant", reply);
  } catch (err) {
    addMessage("assistant", "I couldn't reach the tutoring backend. Check API_BASE_URL and your backend endpoint.");
    showToast("Backend connection failed");
  } finally {
    typingIndicator.classList.remove("show");
    $("sendBtn").disabled = false;
    messageInput.focus();
  }
}

function clearAttachments() {
  attachedFiles = [];
  attachmentList.innerHTML = "";
  $("fileInput").value = "";
}

$("chatForm").addEventListener("submit", e => {
  e.preventDefault();
  sendMessage();
});

$("attachBtn").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", e => {
  attachedFiles = [...e.target.files];
  attachmentList.innerHTML = attachedFiles.map(f =>
    `<span class="attachment">${escapeHtml(f.name)}</span>`
  ).join("");
});

$("sidebarToggle").addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("cognix_dark", document.body.classList.contains("dark") ? "1" : "0");
});

$("profileBtn").addEventListener("click", () => {
  $("profileMenu").classList.toggle("hidden");
  $("profileBtn").setAttribute("aria-expanded", String(!$("profileMenu").classList.contains("hidden")));
});

document.addEventListener("click", e => {
  if (!$("profileBtn").contains(e.target) && !$("profileMenu").contains(e.target)) {
    $("profileMenu").classList.add("hidden");
  }
});

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchPage(btn.dataset.page));
});

function switchPage(page) {
  document.querySelectorAll(".nav-item").forEach(x => x.classList.toggle("active", x.dataset.page === page));
  document.querySelectorAll(".page").forEach(p => {
    p.classList.add("hidden-page");
    p.classList.remove("active");
  });
  const target = $(`${page}Page`);
  if (target) {
    target.classList.remove("hidden-page");
    target.classList.add("active");
  }
}

$("streakCard").addEventListener("click", () => $("streakModal").classList.remove("hidden"));
$("closeModal").addEventListener("click", () => $("streakModal").classList.add("hidden"));
$("modalStart").addEventListener("click", () => {
  $("streakModal").classList.add("hidden");
  switchPage("home");
  messageInput.focus();
});

$("saveNotes").addEventListener("click", async () => {
  const notes = $("notesEditor").value;
  localStorage.setItem("cognix_notes", notes);
  $("notesStatus").textContent = "Saved locally.";
  try {
    await apiFetch(CONFIG.NOTES_ENDPOINT, {method:"POST", body: JSON.stringify({notes})});
    $("notesStatus").textContent = "Saved.";
  } catch (_) {
    // Local save remains available when no backend is configured.
  }
});

document.querySelectorAll("[data-action]").forEach(el => {
  el.addEventListener("click", () => {
    const action = el.dataset.action;
    if (action === "create-plan") showToast("Study-plan editor ready to connect.");
    if (action === "profile") showToast("Connect your profile endpoint here.");
    if (action === "settings") showToast("Settings can be connected to your backend.");
    if (action === "logout") showToast("Connect your authentication logout endpoint.");
  });
});

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function loadBackendData() {
  try {
    const data = await apiFetch(CONFIG.STREAK_ENDPOINT);
    if (typeof data.streak === "number") state.streak = data.streak;
  } catch (_) {}
  try {
    const data = await apiFetch(CONFIG.STUDY_TIME_ENDPOINT);
    if (typeof data.minutes === "number") state.studyMinutes = data.minutes;
  } catch (_) {}
  saveState();
  renderStats();
}

(function init() {
  if (localStorage.getItem("cognix_dark") === "1") document.body.classList.add("dark");
  const savedNotes = localStorage.getItem("cognix_notes");
  if (savedNotes) $("notesEditor").value = savedNotes;
  renderStats();
  renderMessages();
  loadBackendData();
})();
