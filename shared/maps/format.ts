export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles >= 0.1) return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
  const feet = meters * 3.28084;
  return `${Math.round(feet)} ft`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

export function formatStepInstruction(type: string, modifier?: string, name?: string): string {
  const street = name?.trim();
  const onto = street ? ` onto ${street}` : "";
  switch (type) {
    case "depart":
      return street ? `Head toward ${street}` : "Head out";
    case "arrive":
      return street ? `Arrive at ${street}` : "Arrive at destination";
    case "turn":
      if (modifier === "left") return `Turn left${onto}`;
      if (modifier === "right") return `Turn right${onto}`;
      if (modifier === "slight left") return `Slight left${onto}`;
      if (modifier === "slight right") return `Slight right${onto}`;
      if (modifier === "sharp left") return `Sharp left${onto}`;
      if (modifier === "sharp right") return `Sharp right${onto}`;
      return `Turn${onto}`;
    case "continue":
    case "new name":
      return street ? `Continue on ${street}` : "Continue straight";
    case "merge":
      return street ? `Merge onto ${street}` : "Merge";
    case "roundabout":
      return street ? `Take the roundabout to ${street}` : "Take the roundabout";
    case "rotary":
      return street ? `Take the rotary to ${street}` : "Take the rotary";
    case "fork":
      if (modifier === "left") return `Keep left${onto}`;
      if (modifier === "right") return `Keep right${onto}`;
      return `Keep straight${onto}`;
    case "end of road":
      if (modifier === "left") return `At the end of the road, turn left${onto}`;
      if (modifier === "right") return `At the end of the road, turn right${onto}`;
      return `At the end of the road, continue${onto}`;
    default:
      return street ? `Continue toward ${street}` : "Continue";
  }
}
