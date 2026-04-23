window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Renderer = {
  draw({ canvas, state, condition, pointer = null }) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!condition || !state.currentPath) {
      this.drawIdle(ctx, canvas);
      return;
    }

    this.drawCorridor(ctx, state.currentPath, condition);
    this.drawEndpointLabels(ctx, state.currentPath, condition);
    this.drawTrajectory(ctx, state.activeTrial);
    this.drawPointer(ctx, pointer);
    this.drawConditionLabel(ctx, condition);
  },

  drawIdle(ctx, canvas) {
    ctx.fillStyle = "#667085";
    ctx.font = "22px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("実験開始を押してください", canvas.width / 2, canvas.height / 2);
  },

  drawCorridor(ctx, path, condition) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#91a7bf";
    ctx.lineWidth = condition.width + 4;
    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    ctx.lineTo(path.corner.x, path.corner.y);
    ctx.lineTo(path.end.x, path.end.y);
    ctx.stroke();

    ctx.strokeStyle = "#dfe8f3";
    ctx.lineWidth = condition.width;
    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    ctx.lineTo(path.corner.x, path.corner.y);
    ctx.lineTo(path.end.x, path.end.y);
    ctx.stroke();
  },

  drawEndpointLabels(ctx, path, condition) {
    const radius = condition.width / 2;
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.arc(path.start.x, path.start.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#146c94";
    ctx.beginPath();
    ctx.arc(path.end.x, path.end.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("START", path.start.x, path.start.y);
    ctx.fillText("END", path.end.x, path.end.y);
  },

  drawTrajectory(ctx, trial) {
    if (!trial || trial.trajectory.length <= 1) return;

    ctx.strokeStyle = trial.success ? "#2e7d32" : "#bd2f2f";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    trial.trajectory.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  },

  drawPointer(ctx, pointer) {
    if (!pointer) return;

    ctx.fillStyle = "#17202a";
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2);
    ctx.fill();
  },

  drawConditionLabel(ctx, condition) {
    ctx.fillStyle = "#17202a";
    ctx.font = "16px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${condition.name}: W=${condition.width}px, A=${condition.amplitude}px, ID=${condition.steeringId.toFixed(1)}`, 24, 34);
  }
};
