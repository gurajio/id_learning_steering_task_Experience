window.addEventListener("DOMContentLoaded", () => {
  const app = window.SteeringTask;
  const elements = app.Ui.collectElements();
  const experiment = app.Experiment({
    elements,
    config: app.Config,
    geometry: app.Geometry,
    renderer: app.Renderer,
    ui: app.Ui
  });

  elements.canvas.addEventListener("pointerdown", (event) => {
    if (experiment.state.status !== "ready") return;
    experiment.startTrial(app.Geometry.getCanvasPoint(elements.canvas, event), event);
  });

  elements.canvas.addEventListener("pointermove", (event) => {
    if (experiment.state.status === "ready" && event.buttons) {
      const point = app.Geometry.getCanvasPoint(elements.canvas, event);
      const condition = experiment.currentCondition();
      const path = experiment.state.currentPath;
      if (condition && path && app.Geometry.isInsideCircle(point, path.start, condition.width / 2)) {
        experiment.startTrial(point, event);
      }
      return;
    }
    if (experiment.state.status !== "running" || event.pointerId !== experiment.state.pointerId) return;
    experiment.recordMove(app.Geometry.getCanvasPoint(elements.canvas, event));
  });

  elements.canvas.addEventListener("pointerup", (event) => {
    try {
      elements.canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
    if (experiment.state.status !== "running" || event.pointerId !== experiment.state.pointerId) return;
    experiment.completeTrial(app.Geometry.getCanvasPoint(elements.canvas, event));
  });

  elements.canvas.addEventListener("pointercancel", (event) => {
    if (experiment.state.status === "running" && event.pointerId === experiment.state.pointerId) {
      experiment.failTrial("pointer_cancel", app.Geometry.getCanvasPoint(elements.canvas, event));
    }
  });

  elements.startBtn.addEventListener("click", experiment.startExperiment);
  elements.nextBtn.addEventListener("click", experiment.nextTrial);
  elements.retryBtn.addEventListener("click", experiment.nextTrial);
  elements.fullscreenBtn.addEventListener("click", () => document.documentElement.requestFullscreen?.());

  elements.downloadCsvBtn.addEventListener("click", () => {
    const participantId = elements.participantInput.value.trim();
    app.DataExport.download(
      app.DataExport.makeFilename(participantId, "csv"),
      app.DataExport.makeCsv(experiment.state.results),
      "text/csv;charset=utf-8"
    );
  });

  elements.downloadJsonBtn.addEventListener("click", () => {
    const participantId = elements.participantInput.value.trim();
    app.DataExport.download(
      app.DataExport.makeFilename(participantId, "json"),
      app.DataExport.makeJson({
        participantId,
        conditions: app.Config.conditions,
        results: experiment.state.results
      }),
      "application/json;charset=utf-8"
    );
  });

  window.addEventListener("resize", () => experiment.draw());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") experiment.abortActiveTrial();
    if (event.key === "Enter") experiment.nextTrial();
  });

  experiment.resetExperiment();
});
