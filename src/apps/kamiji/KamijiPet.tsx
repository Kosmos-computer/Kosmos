import type { EvolutionStage, PetMood } from "./types";

interface KamijiPetProps {
  stage: EvolutionStage;
  mood: PetMood;
  poopCount: number;
}

export function KamijiPet({ stage, mood, poopCount }: KamijiPetProps) {
  const isEgg = stage === "egg";

  return (
    <div className={`arco-kamiji-pet arco-kamiji-pet--${mood} arco-kamiji-pet--${stage}`}>
      <div className="arco-kamiji-pet__scene">
        {poopCount > 0 && (
          <div className="arco-kamiji-pet__poops" aria-hidden="true">
            {Array.from({ length: poopCount }).map((_, i) => (
              <span key={i} className="arco-kamiji-pet__poop" style={{ left: `${20 + i * 18}%` }} />
            ))}
          </div>
        )}

        {isEgg ? (
          <div className="arco-kamiji-pet__egg">
            <div className="arco-kamiji-pet__egg-shell" />
            <div className="arco-kamiji-pet__egg-spot arco-kamiji-pet__egg-spot--1" />
            <div className="arco-kamiji-pet__egg-spot arco-kamiji-pet__egg-spot--2" />
          </div>
        ) : (
          <div className="arco-kamiji-pet__body">
            <div className="arco-kamiji-pet__ears">
              <span className="arco-kamiji-pet__ear arco-kamiji-pet__ear--left" />
              <span className="arco-kamiji-pet__ear arco-kamiji-pet__ear--right" />
            </div>
            <div className="arco-kamiji-pet__face">
              <div className="arco-kamiji-pet__eyes">
                <span className={`arco-kamiji-pet__eye arco-kamiji-pet__eye--left arco-kamiji-pet__eye--${mood}`} />
                <span className={`arco-kamiji-pet__eye arco-kamiji-pet__eye--right arco-kamiji-pet__eye--${mood}`} />
              </div>
              <span className={`arco-kamiji-pet__mouth arco-kamiji-pet__mouth--${mood}`} />
              {mood === "sick" && <span className="arco-kamiji-pet__sweat">💧</span>}
              {mood === "sleeping" && <span className="arco-kamiji-pet__zzz">z z z</span>}
            </div>
            <div className="arco-kamiji-pet__belly" />
            <div className="arco-kamiji-pet__feet">
              <span className="arco-kamiji-pet__foot" />
              <span className="arco-kamiji-pet__foot" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
