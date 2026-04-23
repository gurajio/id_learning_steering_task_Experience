window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.DataExport = {
  makeCsv(results) {
    const header = [
      "participantId", "conditionId", "conditionName", "conditionLabel", "width", "amplitude", "steeringId",
      "conditionOrder", "trialInCondition", "totalTrial", "startedAtIso", "mtMs", "success", "errorType",
      "endpointX", "endpointY", "deviated", "deviationCount", "deviationTotalMs", "maxDeviationPx",
      "deviationEventsJson", "trajectoryJson"
    ];
    const rows = results.map((row) => [
      row.participantId, row.conditionId, row.conditionName, row.conditionLabel, row.width, row.amplitude, row.steeringId,
      row.conditionOrder, row.trialInCondition, row.totalTrial, row.startedAtIso, row.mtMs, row.success, row.errorType,
      row.endpointX, row.endpointY, row.deviated, row.deviationCount, row.deviationTotalMs, row.maxDeviationPx,
      JSON.stringify(row.deviationEvents), JSON.stringify(row.trajectory)
    ].map(this.csvEscape).join(","));
    return [header.join(","), ...rows].join("\n");
  },

  makeJson({ participantId, conditions, results }) {
    return JSON.stringify({
      experiment: "same_id_right_angle_steering_task",
      createdAt: new Date().toISOString(),
      participantId,
      conditions,
      results
    }, null, 2);
  },

  download(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  makeFilename(participantId, extension) {
    const participant = participantId || "unknown";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `steering_same_id_${participant}_${stamp}.${extension}`;
  },

  csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
};
