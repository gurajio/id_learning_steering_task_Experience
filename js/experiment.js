window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Experiment = function Experiment({ elements, config, geometry, renderer, ui }) {
  const totalTrials = config.conditions.reduce((sum, condition) => sum + condition.trials, 0);
  const autoNextTrialDelayMs = config.autoNextTrialDelayMs ?? 800;
  let autoAdvanceTimer = null;
  const state = {
    status: "idle",
    conditionIndex: 0,
    trialInCondition: 0,
    totalTrial: 0,
    activeTrial: null,
    pointerId: null,
    results: [],
    currentPath: null,
    lastFailure: null
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

  function clearAutoAdvanceTimer() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  function scheduleNextTrial() {
    clearAutoAdvanceTimer();
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      if (state.status === "between" || state.status === "failed") {
        prepareTrial();
      }
    }, autoNextTrialDelayMs);
  }

  function resetExperiment() {
    clearAutoAdvanceTimer();
    state.status = "idle";
    state.conditionIndex = 0;
    state.trialInCondition = 0;
    state.totalTrial = 0;
    state.activeTrial = null;
    state.pointerId = null;
    state.results = [];
    state.currentPath = null;
    state.lastFailure = null;

    elements.downloadCsvBtn.disabled = true;
    elements.downloadJsonBtn.disabled = true;
    elements.retryBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.startBtn.disabled = false;
    ui.setInitialLog(elements);
    ui.setMessage(elements, "参加者IDを入力し、実験開始を押してください。");
    updateUi();
    draw();
  }

  function startExperiment() {
    clearAutoAdvanceTimer();
    if (!elements.participantInput.value.trim()) {
      ui.setMessage(elements, "参加者IDを入力してください。", "fail");
      elements.participantInput.focus();
      return;
    }

    state.conditionIndex = 0;
    state.trialInCondition = 0;
    state.totalTrial = 0;
    state.results = [];
    elements.startBtn.disabled = true;
    elements.downloadCsvBtn.disabled = true;
    elements.downloadJsonBtn.disabled = true;
    prepareTrial();
  }

  function prepareTrial() {
    clearAutoAdvanceTimer();
    const condition = currentCondition();
    if (!condition) {
      finishExperiment();
      return;
    }

    state.status = "ready";
    state.pointerId = null;
    state.lastFailure = null;
    state.currentPath = geometry.makePath(elements.canvas, condition);
    elements.retryBtn.disabled = true;
    elements.nextBtn.disabled = true;
    ui.setMessage(elements, `${condition.name} ${condition.label}: スタート円を押し、経路内を通って終点円でクリックしてください。`);
    draw();
    updateUi();
  }

  function startTrial(point, event) {
    const condition = currentCondition();
    const path = state.currentPath;
    const radius = condition.width / 2;
    if (!geometry.isInsideCircle(point, path.start, radius)) {
      ui.setMessage(elements, "スタート円の内側から開始してください。", "fail");
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
      targetEnterTime: null,
      trajectory: [{ x: point.x, y: point.y, t: 0 }]
    };
    draw();
  }

  function recordMove(point) {
    const condition = currentCondition();
    const trial = state.activeTrial;
    if (!trial || state.status !== "running") return;

    const t = performance.now() - trial.startTime;
    trial.trajectory.push({ x: point.x, y: point.y, t });

    if (!geometry.isInsideCorridor(point, state.currentPath, condition.width)) {
      failTrial("deviation", point);
      return;
    }

    if (geometry.isInsideCircle(point, state.currentPath.end, condition.width / 2)) {
      trial.targetEnterTime ??= performance.now();
    } else {
      trial.targetEnterTime = null;
    }

    draw(point);
  }

  function completeTrial(point) {
    const condition = currentCondition();
    const trial = state.activeTrial;
    if (!trial || state.status !== "running") return;

    trial.trajectory.push({ x: point.x, y: point.y, t: performance.now() - trial.startTime });
    const now = performance.now();
    const stoppedAtTarget = trial.targetEnterTime && now - trial.targetEnterTime >= config.targetDwellMs;
    if (!geometry.isInsideCircle(point, state.currentPath.end, condition.width / 2)) {
      failTrial("endpoint_miss", point);
      return;
    }
    if (!stoppedAtTarget) {
      failTrial("endpoint_not_stopped", point);
      return;
    }

    trial.success = true;
    trial.endTime = now;
    trial.mtMs = Math.round(trial.endTime - trial.startTime);
    trial.endpointX = Number(point.x.toFixed(2));
    trial.endpointY = Number(point.y.toFixed(2));
    commitTrial(trial);
    ui.setMessage(elements, `成功: MT ${trial.mtMs} ms。次の試行へ進みます。`);
    advanceAfterTrial();
  }

  function failTrial(errorType, point) {
    const trial = state.activeTrial;
    if (!trial) return;

    trial.success = false;
    trial.errorType = errorType;
    trial.endTime = performance.now();
    trial.mtMs = Math.round(trial.endTime - trial.startTime);
    trial.endpointX = Number(point.x.toFixed(2));
    trial.endpointY = Number(point.y.toFixed(2));
    commitTrial(trial);
    state.lastFailure = errorType;

    const messages = {
      deviation: "失敗: 経路から逸脱しました。次試行へ進んでください。",
      endpoint_miss: "失敗: 終点円の内側でクリックしてください。",
      endpoint_not_stopped: "失敗: 終点で短く停止してからクリックしてください。",
      pointer_cancel: "失敗: 入力が中断されました。次試行へ進んでください。",
      manual_abort: "失敗: 試行を中断しました。次試行へ進んでください。"
    };
    ui.setMessage(elements, messages[errorType] || "失敗しました。次試行へ進んでください。", "fail");
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
      elements.nextBtn.disabled = false;
      elements.retryBtn.disabled = true;
      ui.setMessage(elements, "条件ブロックが終了しました。休憩後、次へを押してください。", "break");
    } else {
      elements.retryBtn.disabled = true;
      elements.nextBtn.disabled = true;
      scheduleNextTrial();
    }

    draw();
    updateUi();
  }

  function finishExperiment() {
    state.status = "finished";
    elements.nextBtn.disabled = true;
    elements.retryBtn.disabled = true;
    elements.startBtn.disabled = false;
    ui.setMessage(elements, "実験終了です。CSVまたはJSONを保存してください。");
    draw();
    updateUi();
  }

  function nextTrial() {
    clearAutoAdvanceTimer();
    if (state.status === "break" || state.status === "between" || state.status === "failed") {
      prepareTrial();
    }
  }

  function abortActiveTrial() {
    if (state.status === "running" && state.activeTrial) {
      failTrial("manual_abort", state.activeTrial.trajectory.at(-1));
    }
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
    abortActiveTrial
  };
};
