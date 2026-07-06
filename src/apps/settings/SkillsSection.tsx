/**
 * Settings → Skills — delegates to the same dashboard used by the Skills app.
 */
import { SkillsDashboard } from "../skills/SkillsApp";

export function SkillsSection() {
  return <SkillsDashboard embedded />;
}
