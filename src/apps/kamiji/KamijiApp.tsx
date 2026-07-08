import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect } from "react";
import { KamijiPet } from "./KamijiPet";
import { StatusMeters } from "./StatusMeters";
import { ActionPanel } from "./ActionPanel";
import { startKamijiClock, stopKamijiClock, usePetStore } from "./petStore";
import type { EvolutionStage, PetMood } from "./types";

const stageLabels: Record<EvolutionStage, string> = {
  egg: "🥚 Egg",
  baby: "👶 Baby",
  child: "🌱 Child",
  teen: "🌿 Teen",
  adult: "⭐ Adult",
};

const moodLabels: Record<PetMood, string> = {
  happy: "Feeling great!",
  neutral: "Doing okay",
  hungry: "So hungry...",
  tired: "Need rest...",
  sick: "Not feeling well",
  sleeping: "Zzz...",
  dead: "Gone...",
};

function formatAge(minutes: number) {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function KamijiApp() {
  const {
    pet,
    message,
    timeScale,
    isLightsOn,
    performAction,
    setTimeScale,
    toggleLights,
    resetPet,
    dismissMessage,
  } = usePetStore();

  useEffect(() => {
    startKamijiClock();
    return () => stopKamijiClock();
  }, []);

  return (
    <div className="arco-kamiji">
      <div className="arco-kamiji__device">
        <div className="arco-kamiji__header">
          <h1 className="arco-kamiji__title"><T k={I18nKey.APPS$KAMIJI_KAMIJI} /></h1>
          <span className="arco-kamiji__subtitle"><T k={I18nKey.APPS$KAMIJI_VIRTUAL_PET} /></span>
        </div>

        <div className={`arco-kamiji__screen ${!isLightsOn ? "arco-kamiji__screen--dark" : ""}`}>
          <div className="arco-kamiji__screen-info">
            <span>{stageLabels[pet.stage]}</span>
            <span><T k={I18nKey.APPS$KAMIJI_AGE} />{formatAge(pet.ageMinutes)}</span>
          </div>

          <div className="arco-kamiji__pet-area">
            <KamijiPet stage={pet.stage} mood={pet.mood} poopCount={pet.poopCount} />
          </div>

          <div className="arco-kamiji__mood-bar">{moodLabels[pet.mood]}</div>

          {message && (
            <div
              className="arco-kamiji__message"
              onClick={dismissMessage}
              onKeyDown={(e) => e.key === "Enter" && dismissMessage()}
              role="status"
              tabIndex={0}
            >
              {message.text}
            </div>
          )}
        </div>

        <StatusMeters stats={pet.stats} />

        <ActionPanel
          isSleeping={pet.isSleeping}
          isDead={pet.isDead}
          poopCount={pet.poopCount}
          isSick={pet.isSick}
          onAction={performAction}
        />

        <div className="arco-kamiji__controls">
          <label className="arco-kamiji__speed">
            <span><T k={I18nKey.APPS$KAMIJI_SPEED} /></span>
            <input
              type="range"
              min="1"
              max="10"
              value={timeScale}
              onChange={(e) => setTimeScale(Number(e.target.value))}
            />
            <span>{timeScale}<T k={I18nKey.APPS$KAMIJI_X} /></span>
          </label>
          <button
            type="button"
            className="arco-kamiji__light-btn"
            onClick={toggleLights}
            title={i18n.t(I18nKey.APPS$KAMIJI_TOGGLE_LIGHTS)}
          >
            {isLightsOn ? "💡" : "🌑"}
          </button>
          {pet.isDead && (
            <button type="button" className="arco-kamiji__reset-btn" onClick={resetPet}><T k={I18nKey.APPS$KAMIJI_NEW_EGG} /></button>
          )}
        </div>
      </div>

      <p className="arco-kamiji__hint"><T k={I18nKey.APPS$KAMIJI_FEED_PLAY_AND_CLEAN_YOUR_KAMIJI_TURN_OFF_THE_LIGHTS_SO_T} /></p>
    </div>
  );
}
