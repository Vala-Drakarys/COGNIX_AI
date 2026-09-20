/*
  COGNIX UI <-> diagnostic engine bridge
  -------------------------------------------------------------
  Adapts the chat UI (script.js) to the engine's existing HTTP API
  (GET /api/profile, POST /api/action, POST /api/transcribe).
  The engine is unchanged: the controller still owns every state
  transition, this file only turns chat messages into engine actions
  and engine state into chat replies.

  Conversation flow
    1. First message  -> the question the student lost marks on
    2. Second message -> the student's own answer/attempt   (starts an investigation)
    3. Diagnostic checks -> reply with an option number or in your own words
    4. Diagnosis -> reply Yes / No / Not sure
    5. Result and targeted resource, then a new question can be sent
  Commands: "stop" ends an investigation, "new" abandons it and starts over.
  JPG/JPEG photos are read into text via /api/transcribe for review.
*/
(function () {
  "use strict";

  const PROFILE = "practice";
  const MODULE = "education";
  const FILE_ONLY_TEXT = "Please analyze the attached file(s).";
  const GREETING = /^(hi|hii|hello|hey|thanks|thank you|ok|okay)[.!\s]*$/i;

  const bridge = {snap: null, stage: "idle", question: "", presentedRun: null};

  const say = (...lines) => lines.filter(Boolean).join("\n\n");

  async function call(path, options) {
    const res = await fetch(path, {credentials: "include", ...options});
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw Object.assign(new Error(data.error || "Backend returned " + res.status), {reload: data.reload, status: res.status});
    return data;
  }

  async function loadProfile() {
    bridge.snap = await call("/api/profile?profile=" + PROFILE);
    return bridge.snap;
  }

  async function act(payload) {
    if (!bridge.snap) await loadProfile();
    try {
      bridge.snap = await call("/api/action?profile=" + PROFILE, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...payload, revision: bridge.snap.profile.revision, request_id: crypto.randomUUID()})
      });
    } catch (err) {
      if (err.reload) await loadProfile();
      throw err;
    }
    return bridge.snap;
  }

  const run = () => bridge.snap && bridge.snap.run;
  const active = () => run() && ["WAIT_FOR_STUDENT", "WAIT"].includes(run().state);

  // ---- engine state -> chat text -------------------------------------------------------------

  function describeQuestion(r, lead) {
    const q = r.question;
    if (!q.choices.length) {
      return say(lead, "Diagnostic check " + (r.attempts + 1), q.prompt, "Answer in your own words, or reply “not sure”.");
    }
    const options = [...q.choices, "I’m not sure"].map((c, i) => (i + 1) + ". " + c);
    return say(lead, "Diagnostic check " + (r.attempts + 1), q.prompt, options.join("\n"),
      "Reply with an option number, or explain in your own words.");
  }

  function describeConfirmation(r) {
    const gap = bridge.snap.catalog[r.hypothesis].gap.toLowerCase();
    return say("Based on your responses, the evidence suggests " + gap + ".",
      "Does this match what you found difficult? Reply Yes, No (I'll investigate further) or Not sure.");
  }

  function describeFinish(r) {
    const cat = bridge.snap.catalog;
    const items = bridge.snap.profile.interventions.filter(i => i.run_id === r.id).slice(-2);
    const resources = items.map(i => i.title + "\n" + i.text).join("\n\n");
    let head;
    if (r.outcome === "confirmed") {
      head = "Diagnosis confirmed: " + cat[r.hypothesis].gap + ". Confidence is " + String(r.confidence).toLowerCase() + ", not certainty.";
    } else if (r.outcome === "no_gap_observed") {
      head = "No consistent gap was established, so I haven’t manufactured a diagnosis.";
    } else {
      head = "I don’t have enough evidence to identify the cause yet. Uncertainty stays on your record rather than being guessed.";
    }
    return say(head, resources, "Send another question whenever you’re ready.");
  }

  function describeRun(lead) {
    const r = run();
    if (!r) return lead || "";
    if (r.state === "WAIT_FOR_STUDENT") return describeQuestion(r, lead);
    if (r.state === "WAIT") return say(lead, describeConfirmation(r));
    if (r.state === "FINISH") return say(lead, describeFinish(r));
    return lead || "";
  }

  function latestEvidence() {
    const r = run();
    const e = r && r.events.filter(x => x.type === "EVIDENCE").at(-1);
    return e ? "Noted: " + e.text : "";
  }

  // ---- photo input -----------------------------------------------------------------------------

  async function toJpegDataUrl(file) {
    let bitmap;
    try { bitmap = await createImageBitmap(file, {imageOrientation: "from-image"}); }
    catch (_) { bitmap = await createImageBitmap(file); }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function readPhoto(file) {
    const r = run();
    const target = r && r.state === "WAIT_FOR_STUDENT" ? "answer" : bridge.stage === "need_attempt" ? "attempt" : "question";
    const data = await call("/api/transcribe?profile=" + PROFILE, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({image: await toJpegDataUrl(file), target})
    });
    const input = document.getElementById("messageInput");
    if (input) input.value = data.text;
    return say("I read this from your photo. It has been placed in the message box so you can check and correct it before sending:",
      data.text, data.truncated ? "The text was shortened to fit. Please check it." : "");
  }

  // ---- chat message -> engine action -----------------------------------------------------------

  function parseConfirmation(text) {
    const t = text.trim().toLowerCase();
    if (/^(1|y|yes|yeah|yep|yup|correct|that matches|matches)\b/.test(t)) return "yes";
    if (/^(3|not sure|unsure|maybe|i'm not sure|i’m not sure|idk)\b/.test(t)) return "unsure";
    if (/^(2|n|no|nope|not really|disagree)\b/.test(t)) return "no";
    return null;
  }

  function alreadyShown(r) {
    if (bridge.presentedRun === r.id + r.state + r.attempts) return true;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem("cognix_messages") || "[]"); } catch (_) {}
    const anchor = r.state === "WAIT_FOR_STUDENT" ? r.question.prompt : "Does this match what you found difficult?";
    return saved.some(m => m.role === "assistant" && m.content.includes(anchor));
  }

  async function handle(text) {
    const cmd = text.trim().toLowerCase();
    if (!bridge.snap) await loadProfile();
    const live = bridge.snap.service.configured;

    if (active() && !alreadyShown(run())) {
      bridge.presentedRun = run().id + run().state + run().attempts;
      return describeRun("Welcome back. Your investigation is still open. Reply “stop” to end it, or “new” to abandon it and start again.");
    }

    if (cmd === "stop" || cmd === "new" || cmd === "cancel") {
      bridge.stage = "idle";
      bridge.question = "";
      if (!active()) return "Nothing to stop. Send a question you lost marks on to begin.";
      await act({kind: "stop"});
      return cmd === "new" ? "Investigation stopped. Send the new question when you’re ready." : "Investigation stopped. Send another question whenever you’re ready.";
    }

    const r = run();

    if (r && r.state === "WAIT_FOR_STUDENT") {
      const n = /^\s*(\d{1,2})\s*[.)]?\s*$/.exec(text);
      let choice = n && n[1] >= 1 && n[1] <= r.question.choices.length + 1 ? Number(n[1]) - 1 : undefined;
      if (/^(not sure|i['’]m not sure|unsure|idk)[.!]*$/i.test(text.trim())) choice = r.question.choices.length;
      await act({kind: "answer", question_id: r.question.id, answer: text.trim(), ...(choice !== undefined ? {choice} : {})});
      return describeRun(latestEvidence());
    }

    if (r && r.state === "WAIT") {
      const value = parseConfirmation(text);
      if (!value) return say("I need a Yes, No or Not sure before I can continue.", describeConfirmation(r));
      await act({kind: "confirm", value});
      return describeRun();
    }

    // No open investigation: collect the question, then the attempt, then start.
    if (bridge.stage === "idle") {
      if (GREETING.test(text.trim())) {
        return "Hi! I’m Cognix. Send me a question you lost marks on (Mathematics, Physics or Chemistry) and I’ll help find out why it went wrong, not just what the right answer is.";
      }
      bridge.question = text.trim();
      bridge.stage = "need_attempt";
      return "Got it. What was your answer or attempt for that question? Even a partial or wrong attempt helps.";
    }

    const question = bridge.question;
    bridge.stage = "idle";
    bridge.question = "";
    try {
      await act({kind: "start", module: MODULE, mode: live ? "live" : "practice", question, attempt: text.trim()});
    } catch (err) {
      return say(err.message, "Send the question again to retry.");
    }
    bridge.presentedRun = run().id + run().state + run().attempts;
    return describeRun(run().state === "FINISH" ? "" : "Thanks. I won’t assume why the answer went wrong. I’ll check a few possibilities one at a time.");
  }

  // ---- study activity (streak, study time, question count) --------------------------------------

  const localDay = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  function recordActivity(payload) {
    return fetch("/api/study-time", {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({...payload, date: localDay()})
    }).catch(() => {});
  }

  // Study time counts real, visible, active minutes: one minute is credited for each minute
  // the page is visible and the student has interacted with it in the last two minutes.
  let lastInteraction = Date.now();
  ["keydown", "pointerdown", "scroll"].forEach(name =>
    window.addEventListener(name, () => { lastInteraction = Date.now(); }, {passive: true}));
  setInterval(() => {
    if (document.visibilityState === "visible" && Date.now() - lastInteraction < 120000) recordActivity({minutes: 1});
  }, 60000);

  async function reply(text, files) {
    await recordActivity({questions: 1});
    const jpegs = (files || []).filter(f => f.type === "image/jpeg" || /\.jpe?g$/i.test(f.name || ""));
    if ((files || []).length && !jpegs.length) {
      return "I can read JPG or JPEG photos of a question or answer. Other file types can’t be diagnosed yet, so please type the text instead.";
    }
    try {
      if (jpegs.length) {
        const out = await readPhoto(jpegs[0]);
        return text && text !== FILE_ONLY_TEXT ? say(out, "Your typed message was not sent to the diagnosis. Check the photo text, then send it.") : out;
      }
      return await handle(text);
    } catch (err) {
      if (err instanceof TypeError) throw err; // network failure: let script.js show its connection message
      return err.reload ? say(err.message, "I reloaded your saved session. Please send your reply again.") : err.message;
    }
  }

  window.CognixBridge = {reply};
})();
