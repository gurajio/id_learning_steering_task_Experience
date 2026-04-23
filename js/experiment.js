window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Experiment = function Experiment({ elements, config, geometry, renderer, ui }) {
  const totalTrials = config.conditions.reduce((sum, condition) => sum + condition.trials, 0);
  const state = {
    status: "idle",
    conditionIndex: 0,
    trialInCondition: 0,
    totalTrial: 0,
    activeTrial: null,
    pointerId: null,
    results: [],
    currentPath: null,
    lastFailure: null,
    resumeStatus: null,
    breakEndsAt: null,
    breakTimerId: null
  };

  function currentCondition() {
    return config.conditions[state.conditionIndex] || null;
  }

  function draw(pointer = null) {
    renderer.draw({
      canvas: elements.canvas,
      state,
      condition: currentCondition(),
      pointer
    });
  }

  function updateUi() {
    ui.update(elements, {
      state,
      conditions: config.conditions,
      currentCondition: currentCondition(),
      totalTrials
    });
  }

  function setExperimentMode(enabled) {
    document.body.classList.toggle("experiment-mode", enabled);
  }

  function clearBreakTimer() {
    if (state.breakTimerId) {
      clearInterval(state.breakTimerId);
      state.breakTimerId = null;
    }
    state.breakEndsAt = null;
    if (elements.breakTimer) elements.breakTimer.textContent = "";
  }

  function updateBreakTimer() {
    if (!state.breakEndsAt || !elements.breakTimer) return;

    const remainingMs = Math.max(0, state.breakEndsAt - Date.now());
    const remainingSec = Math.ceil(remainingMs / 1000);
    elements.breakTimer.textContent = remainingSec > 0 ? `休憩 ${remainingSec}秒` : "";
    if (remainingMs <= 0) resumeExperiment();
  }

  function resetExperiment() {
    state.status = "idle";
    state.conditionIndex = 0;
    state.trialInCondition = 0;
    state.totalTrial = 0;
    state.activeTrial = null;
    state.pointerId = null;
    state.results = [];
    state.currentPath = null;
    state.lastFailure = null;
    state.resumeStatus = null;
    clearBreakTimer();
    setExperimentMode(false);

    elements.downloadCsvBtn.disabled = true;
    elements.downloadJsonBtn.disabled = true;
    elements.abortBtn.disabled = true;
    elements.pauseResumeBtn.disabled = true;
    elements.breakBtn.disabled = true;
    elements.retryBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.startBtn.disabled = false;
    ui.setInitialLog(elements);
    ui.setMessage(elements, "Enter participant ID and press Start.");
    updateUi();
    draw();
  }

  function startExperiment() {
    if (!elements.participantInput.value.trim()) {
      ui.setMessage(elements, "Enter participant ID.", "fail");
      elements.participantInput.focus();
      return;
    }

    state.conditionIndex = 0;
    state.trialInCondition = 0;
    state.totalTrial = 0;
    state.results = [];
    setExperimentMode(true);
    elements.startBtn.disabled = true;
    elements.abortBtn.disabled = false;
    elements.pauseResumeBtn.disabled = false;
    elements.breakBtn.disabled = false;
    elements.downloadCsvBtn.disabled = true;
    elements.downloadJsonBtn.disabled = true;
    prepareTrial();
  }

  function prepareTrial() {
    const condition = currentCondition();
    if (!condition) {
      finishExperiment();
      return;
    }

    state.status = "ready";
    state.resumeStatus = null;
    state.pointerId = null;
    state.lastFailure = null;
    state.currentPath = geometry.makePath(elements.canvas, condition);
    elements.abortBtn.disabled = false;
    elements.retryBtn.disabled = true;
    elements.nextBtn.disabled = true;
    ui.setMessage(elements, `${condition.name} ${condition.label}: press START to begin MT measurement.`);
    draw();
    updateUi();
  }

  function startTrial(point, event) {
    const condition = currentCondition();
    const path = state.currentPath;
    const radius = condition.width / 2;
    if (!geometry.isInsideCircle(point, path.start, radius)) {
      ui.setMessage(elements, "Start from inside the START circle.", "fail");
      return;
    }

    state.status = "running";
    state.pointerId = event.pointerId;
    elements.canvas.setPointerCapture(event.pointerId);
    const now = performance.now();
    state.activeTrial = {
      participantId: elements.participantInput.value.trim(),
      conditionId: condition.id,
      conditionName: condition.name,
      conditionLabel: condition.label,
      width: condition.width,
      amplitude: condition.amplitude,
      steeringId: condition.steeringId,
      conditionOrder: state.conditionIndex + 1,
      trialInCondition: state.trialInCondition + 1,
      totalTrial: state.totalTrial + 1,
      startedAtIso: new Date().toISOString(),
      startTime: now,
      endTime: null,
      mtMs: null,
      success: false,
      errorType: "",
      endpointX: "",
      endpointY: "",
      deviated: false,
      deviationCount: 0,
      deviationTotalMs: 0,
      maxDeviationPx: 0,
      currentDeviation: null,
      deviationEvents: [],
      trajectory: [{ x: point.x, y: point.y, t: 0 }]
    };
    draw();
  }

  function recordDeviationState(trial, point, t) {
    const condition = currentCondition();
    const deviation = geometry.getCorridorDeviation(point, state.currentPath, condition.width);
    if (deviation.outsidePx > 0) {
      trial.deviated = true;
      trial.maxDeviationPx = Math.max(trial.maxDeviationPx, deviation.outsidePx);
      if (!trial.currentDeviation) {
        trial.deviationCount += 1;
        trial.currentDeviation = {
          startT: t,
          endT: t,
          maxOutsidePx: deviation.outsidePx
        };
      } else {
        trial.currentDeviation.endT = t;
        trial.currentDeviation.maxOutsidePx = Math.max(trial.currentDeviation.maxOutsidePx, deviation.outsidePx);
      }
      return;
    }

    closeDeviationEvent(trial, t);
  }

  function closeDeviationEvent(trial, t) {
    if (!trial.currentDeviation) return;

    trial.currentDeviation.endT = t;
    trial.deviationTotalMs += trial.currentDeviation.endT - trial.currentDeviation.startT;
    trial.deviationEvents.push({
      startT: Math.round(trial.currentDeviation.startT),
      endT: Math.round(trial.currentDeviation.endT),
      durationMs: Math.round(trial.currentDeviation.endT - trial.currentDeviation.startT),
      maxOutsidePx: Number(trial.currentDeviation.maxOutsidePx.toFixed(2))
    });
    trial.currentDeviation = null;
  }

  function recordMove(point) {
    const condition = currentCondition();
    const trial = state.activeTrial;
    if (!trial || state.status !== "running") return;

    const t = performance.now() - trial.startTime;
    trial.trajectory.push({ x: point.x, y: point.y, t });
    recordDeviationState(trial, point, t);

    if (geometry.isInsideCircle(point, state.currentPath.end, condition.width / 2)) {
      completeSuccessfulTrial(point);
      return;
    }

    draw(point);
  }

  function completeSuccessfulTrial(point) {
    const trial = state.activeTrial;
    if (!trial || state.status !== "running") return;

    const now = performance.now();
    closeDeviationEvent(trial, now - trial.startTime);
    trial.success = true;
    trial.endTime = now;
    trial.mtMs = Math.round(trial.endTime - trial.startTime);
    trial.errorType = "";
    trial.endpointX = Number(point.x.toFixed(2));
    trial.endpointY = Number(point.y.toFixed(2));
    try {
      elements.canvas.releasePointerCapture(state.pointerId);
    } catch (_) {}
    commitTrial(trial);
    const deviationNote = trial.deviated ? ` / deviation ${trial.deviationCount}` : "";
    ui.setMessage(elements, `success: MT ${trial.mtMs} ms${deviationNote}.`);
    advanceAfterTrial();
  }

  function completeTrial(point) {
    const condition = currentCondition();
    const trial = state.activeTrial;
    if (!trial || state.status !== "running") return;

    const t = performance.now() - trial.startTime;
    trial.trajectory.push({ x: point.x, y: point.y, t });
    recordDeviationState(trial, point, t);
    if (!geometry.isInsideCircle(point, state.currentPath.end, condition.width / 2)) {
      failTrial("endpoint_miss", point);
      return;
    }
    completeSuccessfulTrial(point);
  }

  function failTrial(errorType, point, shouldAdvance = true) {
    const trial = state.activeTrial;
    if (!trial) return;

    const endpoint = point || trial.trajectory.at(-1);
    trial.success = false;
    trial.errorType = errorType;
    trial.endTime = performance.now();
    trial.mtMs = Math.round(trial.endTime - trial.startTime);
    closeDeviationEvent(trial, trial.mtMs);
    trial.endpointX = Number(endpoint.x.toFixed(2));
    trial.endpointY = Number(endpoint.y.toFixed(2));
    commitTrial(trial);
    state.lastFailure = errorType;

    const messages = {
      endpoint_miss: "failed: endpoint was not reached.",
      pointer_cancel: "failed: pointer input was canceled.",
      manual_abort: "failed: trial was aborted."
    };
    ui.setMessage(elements, messages[errorType] || "failed.", "fail");
    if (!shouldAdvance) return;
    advanceAfterTrial(true);
  }

  function commitTrial(trial) {
    const saved = {
      participantId: trial.participantId,
      conditionId: trial.conditionId,
      conditionName: trial.conditionName,
      conditionLabel: trial.conditionLabel,
      width: trial.width,
      amplitude: trial.amplitude,
      steeringId: trial.steeringId,
      conditionOrder: trial.conditionOrder,
      trialInCondition: trial.trialInCondition,
      totalTrial: trial.totalTrial,
      startedAtIso: trial.startedAtIso,
      mtMs: trial.mtMs,
      success: trial.success,
      errorType: trial.errorType,
      endpointX: trial.endpointX,
      endpointY: trial.endpointY,
      deviated: trial.deviated,
      deviationCount: trial.deviationCount,
      deviationTotalMs: Math.round(trial.deviationTotalMs),
      maxDeviationPx: Number(trial.maxDeviationPx.toFixed(2)),
      deviationEvents: trial.deviationEvents,
      trajectory: trial.trajectory.map((point) => ({
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
        t: Math.round(point.t)
      }))
    };
    state.results.push(saved);
    state.activeTrial = null;
    elements.downloadCsvBtn.disabled = false;
    elements.downloadJsonBtn.disabled = false;
    ui.updateLog(elements, saved);
  }

  function advanceAfterTrial(failed = false) {
    state.status = failed ? "failed" : "between";
    state.pointerId = null;
    state.trialInCondition += 1;
    state.totalTrial += 1;

    const condition = currentCondition();
    if (state.trialInCondition >= condition.trials) {
      state.conditionIndex += 1;
      state.trialInCondition = 0;
      if (state.conditionIndex >= config.conditions.length) {
        finishExperiment();
        return;
      }
      state.status = "break";
      elements.abortBtn.disabled = false;
      elements.nextBtn.disabled = false;
      elements.retryBtn.disabled = true;
      ui.setMessage(elements, "Condition block finished. Press Next when ready.");
    } else {
      prepareTrial();
      return;
    }

    draw();
    updateUi();
  }

  function finishExperiment() {
    clearBreakTimer();
    state.status = "finished";
    elements.nextBtn.disabled = true;
    elements.retryBtn.disabled = true;
    elements.abortBtn.disabled = true;
    elements.pauseResumeBtn.disabled = true;
    elements.breakBtn.disabled = true;
    elements.startBtn.disabled = false;
    elements.downloadCsvBtn.disabled = false;
    elements.downloadJsonBtn.disabled = false;
    setExperimentMode(false);
    ui.setMessage(elements, "Experiment finished. Save CSV or JSON.");
    draw();
    updateUi();
  }

  function nextTrial() {
    if (state.status === "break" || state.status === "between" || state.status === "failed") {
      prepareTrial();
    }
  }

  function abortActiveTrial() {
    if (state.status === "running" && state.activeTrial) {
      failTrial("manual_abort", state.activeTrial.trajectory.at(-1));
    }
  }

  function abortExperiment() {
    if (state.status === "idle" || state.status === "finished") return;
    const hadActiveTrial = state.status === "running" && state.activeTrial;
    if (hadActiveTrial) {
      failTrial("manual_abort", state.activeTrial.trajectory.at(-1), false);
    }
    if (hadActiveTrial) {
      state.trialInCondition += 1;
      state.totalTrial += 1;
    }
    if (state.pointerId !== null) {
      try {
        elements.canvas.releasePointerCapture(state.pointerId);
      } catch (_) {}
    }
    state.activeTrial = null;
    state.pointerId = null;
    state.currentPath = null;
    finishExperiment();
    ui.setMessage(elements, "Experiment aborted. Saved trials can be exported.");
  }

  function pauseExperiment() {
    if (state.status === "idle" || state.status === "finished") return;
    if (state.status === "break") {
      nextTrial();
      return;
    }
    if (state.status === "paused" || state.status === "break_timer") {
      resumeExperiment();
      return;
    }
    if (state.status === "running") {
      ui.setMessage(elements, "現在の試行を終えてから中止できます。", "fail");
      return;
    }

    state.resumeStatus = state.status;
    state.status = "paused";
    ui.setMessage(elements, "中止中です。再開を押すと続きから開始できます。", "break");
    updateUi();
    draw();
  }

  function resumeExperiment() {
    if (state.status !== "paused" && state.status !== "break_timer") return;

    clearBreakTimer();
    state.status = state.resumeStatus || "ready";
    state.resumeStatus = null;
    ui.setMessage(elements, "再開しました。STARTを押すとMT計測が始まります。");
    updateUi();
    draw();
  }

  function startBreak() {
    if (state.status === "running") {
      ui.setMessage(elements, "現在の試行を終えてから休憩できます。", "fail");
      return;
    }
    if (state.status === "idle" || state.status === "finished" || state.status === "paused" || state.status === "break_timer") return;

    state.resumeStatus = state.status;
    state.status = "break_timer";
    state.breakEndsAt = Date.now() + 60000;
    state.breakTimerId = setInterval(updateBreakTimer, 250);
    ui.setMessage(elements, "1分休憩中です。再開を押すと早めに戻れます。", "break");
    updateBreakTimer();
    updateUi();
    draw();
  }

  return {
    state,
    currentCondition,
    draw,
    resetExperiment,
    startExperiment,
    nextTrial,
    startTrial,
    recordMove,
    completeTrial,
    failTrial,
    abortActiveTrial,
    abortExperiment,
    pauseExperiment,
    startBreak
  };
};
