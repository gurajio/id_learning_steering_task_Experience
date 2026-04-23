window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Config = {
  targetDwellMs: 200,
  conditions: [
    { id: "C1", name: "条件1", label: "狭いW・短いA", width: 18, amplitude: 216, trials: 40 },
    { id: "C2", name: "条件2", label: "中程度W・中程度A", width: 30, amplitude: 360, trials: 40 },
    { id: "C3", name: "条件3", label: "広いW・長いA", width: 48, amplitude: 576, trials: 40 }
  ].map((condition) => ({
    ...condition,
    steeringId: condition.amplitude / condition.width
  }))
};
