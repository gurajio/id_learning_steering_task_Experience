window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Ui = {
  collectElements() {
    return {
      canvas: document.getElementById("taskCanvas"),
      participantInput: document.getElementById("participantId"),
      conditionList: document.getElementById("conditionList"),
      message: document.getElementById("message"),
      log: document.getElementById("log"),
      conditionValue: document.getElementById("conditionValue"),
      trialValue: document.getElementById("trialValue"),
      successValue: document.getElementById("successValue"),
      errorValue: document.getElementById("errorValue"),
      hudConditionValue: document.getElementById("hudConditionValue"),
      hudTrialValue: document.getElementById("hudTrialValue"),
      breakTimer: document.getElementById("breakTimer"),
      summaryBody: document.getElementById("summaryBody"),
      startBtn: document.getElementById("startBtn"),
      abortBtn: document.getElementById("abortBtn"),
      pauseResumeBtn: document.getElementById("pauseResumeBtn"),
      breakBtn: document.getElementById("breakBtn"),
      nextBtn: document.getElementById("nextBtn"),
      retryBtn: document.getElementById("retryBtn"),
      downloadCsvBtn: document.getElementById("downloadCsvBtn"),
      downloadJsonBtn: document.getElementById("downloadJsonBtn"),
      fullscreenBtn: document.getElementById("fullscreenBtn")
    };
  },

  setMessage(elements, text, tone = "") {
    elements.message.textContent = text;
    elements.message.className = `message ${tone}`.trim();
  },

  update(elements, { state, conditions, currentCondition, totalTrials }) {
    elements.conditionValue.textContent = currentCondition ? currentCondition.name.replace("条件", "C") : "-";
    elements.trialValue.textContent = `${state.totalTrial} / ${totalTrials}`;
    elements.successValue.textContent = String(state.results.filter((row) => row.success).length);
    elements.errorValue.textContent = String(state.results.filter((row) => !row.success).length);
    if (elements.hudConditionValue) {
      elements.hudConditionValue.textContent = currentCondition ? currentCondition.name.replace("条件", "C") : "-";
    }
    if (elements.hudTrialValue) {
      const trialDisplay = state.status === "idle" || state.status === "finished"
        ? state.totalTrial
        : Math.min(state.totalTrial + 1, totalTrials);
      elements.hudTrialValue.textContent = `${trialDisplay} / ${totalTrials}`;
    }
    if (elements.pauseResumeBtn) {
      elements.pauseResumeBtn.textContent = state.status === "paused" || state.status === "break_timer" || state.status === "break" ? "再開" : "中止";
      elements.pauseResumeBtn.disabled = state.status === "idle" || state.status === "finished";
    }
    if (elements.breakBtn) {
      elements.breakBtn.disabled = state.status === "running" || state.status === "paused" || state.status === "break_timer" || state.status === "idle" || state.status === "finished";
    }
    if (elements.nextBtn) {
      elements.nextBtn.disabled = state.status !== "break";
    }
    this.renderConditionList(elements, conditions, state);
    this.renderSummary(elements, conditions, state.results);
  },

  renderConditionList(elements, conditions, state) {
    elements.conditionList.innerHTML = conditions.map((condition, index) => {
      const className = [
        "condition",
        index === state.conditionIndex && state.status !== "finished" ? "active" : "",
        index < state.conditionIndex || state.status === "finished" ? "done" : ""
      ].join(" ").trim();

      return `
        <div class="${className}">
          <div class="condition-title">${condition.name}</div>
          <div>${condition.trials}試行</div>
          <div class="condition-meta">${condition.label} / W=${condition.width}, A=${condition.amplitude}, ID=${condition.steeringId.toFixed(1)}</div>
        </div>
      `;
    }).join("");
  },

  renderSummary(elements, conditions, results) {
    elements.summaryBody.innerHTML = conditions.map((condition) => {
      const rows = results.filter((row) => row.conditionId === condition.id);
      const successes = rows.filter((row) => row.success);
      const meanMt = successes.length
        ? Math.round(successes.reduce((sum, row) => sum + row.mtMs, 0) / successes.length)
        : "-";
      const errorRate = rows.length
        ? `${Math.round((rows.filter((row) => !row.success).length / rows.length) * 100)}%`
        : "-";
      return `<tr><td>${condition.name}</td><td>${meanMt}</td><td>${errorRate}</td></tr>`;
    }).join("");
  },

  updateLog(elements, row) {
    const result = row.success ? "success" : row.errorType;
    const deviation = row.deviated
      ? `deviation_count=${row.deviationCount}, deviation_total=${row.deviationTotalMs}ms, max_deviation=${row.maxDeviationPx}px`
      : "deviation_count=0";
    elements.log.textContent = [
      `trial=${row.totalTrial}, condition=${row.conditionId}, result=${result}, MT=${row.mtMs}ms`,
      deviation,
      `endpoint=(${row.endpointX}, ${row.endpointY}), trajectory_points=${row.trajectory.length}`,
      "",
      elements.log.textContent === "ログ待機中" ? "" : elements.log.textContent
    ].join("\n").trim();
  },

  setInitialLog(elements) {
    elements.log.textContent = "ログ待機中";
  }
};
