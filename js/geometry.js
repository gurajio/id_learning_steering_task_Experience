window.SteeringTask = window.SteeringTask || {};

window.SteeringTask.Geometry = {
  makePath(canvas, condition) {
    const segment = condition.amplitude / 2;
    const start = {
      x: Math.max(120, (canvas.width - segment) / 2 - 90),
      y: Math.max(120, (canvas.height - segment) / 2 - 40)
    };
    const corner = { x: start.x + segment, y: start.y };
    const end = { x: corner.x, y: corner.y + segment };
    return { start, corner, end, segment };
  },

  getCanvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  },

  isInsideCircle(point, center, radius) {
    return Math.hypot(point.x - center.x, point.y - center.y) <= radius;
  },

  isInsideCorridor(point, path, width) {
    return this.getCorridorDeviation(point, path, width).outsidePx <= 0;
  },

  getCorridorDeviation(point, path, width) {
    const radius = width / 2;
    const d1 = this.pointToSegmentDistance(point, path.start, path.corner);
    const d2 = this.pointToSegmentDistance(point, path.corner, path.end);
    const distance = Math.min(d1, d2);
    return {
      distance,
      outsidePx: Math.max(0, distance - radius)
    };
  },

  pointToSegmentDistance(point, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = point.x - a.x;
    const wy = point.y - a.y;
    const lenSq = vx * vx + vy * vy;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
    const px = a.x + t * vx;
    const py = a.y + t * vy;
    return Math.hypot(point.x - px, point.y - py);
  }
};
