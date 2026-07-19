/**
 * Content Agent pack — install card + first-run checklist with deep links
 * into Notes, Channels, Automations, and Chat (Capsule-like journey on the OS).
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Circle, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Button, Chip } from "../../components/ui";
import { primeComposer } from "../chat/composerBus";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";
import { useActiveAgentProfile } from "../chat/useActiveAgentProfile";
import { notifyAgentsChanged } from "./agentsBus";

const CHECKLIST_STORAGE = "arco.contentPack.checklist";

type LocalChecklist = {
  brandVoice?: boolean;
  firstAskDone?: boolean;
  dismissed?: boolean;
};

function loadLocal(): LocalChecklist {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE) ?? "{}") as LocalChecklist;
  } catch {
    return {};
  }
}

function saveLocal(patch: LocalChecklist): void {
  const next = { ...loadLocal(), ...patch };
  localStorage.setItem(CHECKLIST_STORAGE, JSON.stringify(next));
}

type PackState = Awaited<ReturnType<typeof api.getContentPack>>;

export function ContentPackPanel({ onInstalled }: { onInstalled?: () => void }) {
  const [pack, setPack] = useState<PackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [local, setLocal] = useState<LocalChecklist>(() => loadLocal());
  const { setProfileId } = useActiveAgentProfile();

  const refresh = useCallback(async () => {
    try {
      const data = await api.getContentPack();
      setPack(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Content pack");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const install = async () => {
    setInstalling(true);
    try {
      const result = await api.installContentPack();
      setProfileId(result.profile.id);
      saveLocal({ dismissed: false });
      setLocal(loadLocal());
      notifyAgentsChanged();
      await refresh();
      onInstalled?.();
      openShellWindow({ type: "system", app: "chat" }, systemAppTitle("chat"));
      primeComposer({ text: result.firstAsk, submit: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };

  if (error && !pack) {
    return (
      <div className="arco-agents-pack">
        <p className="arco-settings-intro">{error}</p>
      </div>
    );
  }

  if (!pack) return null;

  if (!pack.installed) {
    return (
      <div className="arco-agents-pack arco-agents-pack--cta">
        <div className="arco-agents-pack__head">
          <Sparkles size={16} aria-hidden="true" />
          <div>
            <h3 className="arco-module-card__title">{pack.name}</h3>
            <p className="arco-module-card__desc">{pack.description}</p>
          </div>
        </div>
        <ul className="arco-agents-pack__bullets">
          <li>Brand voice + weekly social + newsletter skills</li>
          <li>Disabled automation templates you enable when ready</li>
          <li>Bind Slack so drafts land where your team already works</li>
        </ul>
        {error ? <p className="arco-settings-intro">{error}</p> : null}
        <Button variant="primary" disabled={installing} onClick={() => void install()}>
          {installing ? "Installing…" : "Install Content Agent"}
        </Button>
      </div>
    );
  }

  if (local.dismissed) {
    return (
      <div className="arco-agents-pack arco-agents-pack--compact">
        <Chip active>Content Agent installed</Chip>
        <Button
          onClick={() => {
            saveLocal({ dismissed: false });
            setLocal(loadLocal());
          }}
        >
          Show setup checklist
        </Button>
      </div>
    );
  }

  const steps: Array<{
    id: string;
    label: string;
    done: boolean;
    actionLabel: string;
    onAction: () => void;
  }> = [
    {
      id: "brand",
      label: "Capture brand voice in Notes",
      done: Boolean(local.brandVoice),
      actionLabel: "Start in Chat",
      onAction: () => {
        openShellWindow({ type: "system", app: "chat" }, systemAppTitle("chat"));
        primeComposer({
          text: "Help me capture our brand voice in Notes: positioning, audience, tone (3 adjectives + 3 we-don't rules), signature phrases, and words to avoid.",
          submit: false,
        });
        saveLocal({ brandVoice: true });
        setLocal(loadLocal());
      },
    },
    {
      id: "slack",
      label: "Connect Slack in Settings → Channels",
      done: pack.checklist.slackConnected,
      actionLabel: "Open Channels",
      onAction: () => {
        openShellWindow(
          { type: "system", app: "settings" },
          systemAppTitle("settings"),
          { section: "channels" },
        );
      },
    },
    {
      id: "pair",
      label: "DM the bot and approve pairing",
      done: pack.checklist.peerPaired,
      actionLabel: "Open Channels",
      onAction: () => {
        openShellWindow(
          { type: "system", app: "settings" },
          systemAppTitle("settings"),
          { section: "channels" },
        );
      },
    },
    {
      id: "bind",
      label: "Bind the Slack chat to Content Agent",
      done: pack.checklist.peerBoundToContent,
      actionLabel: "Bind peer",
      onAction: () => {
        openShellWindow(
          { type: "system", app: "settings" },
          systemAppTitle("settings"),
          { section: "channels" },
        );
      },
    },
    {
      id: "auto",
      label: "Enable weekly social automation (+ deliver peer)",
      done: pack.checklist.automationEnabled,
      actionLabel: "Open Automations",
      onAction: () => {
        openShellWindow({ type: "system", app: "automations" }, systemAppTitle("automations"));
      },
    },
    {
      id: "ask",
      label: "First ask — draft this week's posts",
      done: Boolean(local.firstAskDone),
      actionLabel: "Prime Chat",
      onAction: () => {
        setProfileId(pack.profileId);
        openShellWindow({ type: "system", app: "chat" }, systemAppTitle("chat"));
        primeComposer({
          text: "Draft this week's LinkedIn and X posts from our brand voice. Hooks first; keep them ready for my approval.",
          submit: false,
        });
        saveLocal({ firstAskDone: true });
        setLocal(loadLocal());
      },
    },
  ];

  return (
    <div className="arco-agents-pack">
      <div className="arco-agents-pack__head">
        <Sparkles size={16} aria-hidden="true" />
        <div>
          <h3 className="arco-module-card__title">Content Agent setup</h3>
          <p className="arco-module-card__desc">
            One step at a time. Slack is a satellite — brand work and deeper edits stay in Kosmos.
            Hosted instances that scale to zero may delay weekly runs until the machine wakes.
          </p>
        </div>
        <Button
          onClick={() => {
            saveLocal({ dismissed: true });
            setLocal(loadLocal());
          }}
        >
          Dismiss
        </Button>
      </div>
      <ol className="arco-agents-pack__checklist">
        {steps.map((step) => (
          <li key={step.id} className={step.done ? "is-done" : undefined}>
            <span className="arco-agents-pack__check" aria-hidden="true">
              {step.done ? <Check size={14} /> : <Circle size={14} />}
            </span>
            <span className="arco-agents-pack__label">{step.label}</span>
            {!step.done ? (
              <Button onClick={step.onAction}>{step.actionLabel}</Button>
            ) : null}
          </li>
        ))}
      </ol>
      {pack.profileId ? (
        <p className="arco-settings-intro">
          Skills: brand-voice, social-batch, newsletter-issue, seo-brief, arco-automation
        </p>
      ) : null}
      <Button onClick={() => void refresh()}>Refresh status</Button>
    </div>
  );
}
