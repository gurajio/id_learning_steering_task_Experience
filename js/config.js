window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Config = {
  targetDwellMs: 200,
  conditions: [
    { id: "C1", name: "条件1", label: "狭いW・短いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C2", name: "条件2", label: "中程度W・中程度A", width: 18, amplitude: 216, trials: 100 },
    { id: "C3", name: "条件3", label: "広いW・長いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C4", name: "条件4", label: "狭いW・短いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C5", name: "条件5", label: "中程度W・中程度A", width: 18, amplitude: 216, trials: 100 },
    { id: "C6", name: "条件6", label: "広いW・長いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C7", name: "条件7", label: "狭いW・短いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C8", name: "条件8", label: "中程度W・中程度A", width: 18, amplitude: 216, trials: 100 },
    { id: "C9", name: "条件9", label: "広いW・長いA", width: 18, amplitude: 216, trials: 100 },
    { id: "C10", name: "条件10", label: "広いW・長いA", width: 18, amplitude: 216, trials: 100 }
  ].map((condition) => ({
    ...condition,
    steeringId: condition.amplitude / condition.width
  }))
};
