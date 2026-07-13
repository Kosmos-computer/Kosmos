import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type {
  SocialSidebarLink,
  SocialSuggestedActor,
  SocialTrendItem,
} from "@shared/social";
import { Avatar, Button, Input } from "../../components/ui";
import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import i18n from "../../i18n/index";
import type { SocialNetworkId } from "./types";

export interface SocialSidebarProps {
  network: SocialNetworkId;
  enabled: boolean;
  canFollow: boolean;
  trends: SocialTrendItem[];
  suggestions: SocialSuggestedActor[];
  links: SocialSidebarLink[];
  linksModule?: "discover-feeds" | "trending-links" | "relays" | "communities";
  loading?: boolean;
  searchQuery: string;
  searchResults: SocialSuggestedActor[];
  searchLoading?: boolean;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onOpenActor: (actor: string) => void;
  onToggleFollow: (did: string, followingUri?: string) => void;
}

function trendsTitleKey(network: SocialNetworkId): I18nKey {
  if (network === "mastodon") return I18nKey.APPS$SOCIAL_TRENDING_HASHTAGS;
  return I18nKey.APPS$SOCIAL_TRENDS_FOR_YOU;
}

function linksTitleKey(
  module: SocialSidebarProps["linksModule"],
): I18nKey | null {
  if (module === "discover-feeds") return I18nKey.APPS$SOCIAL_DISCOVER_FEEDS;
  if (module === "trending-links") return I18nKey.APPS$SOCIAL_TRENDING_LINKS;
  if (module === "relays") return I18nKey.APPS$SOCIAL_YOUR_RELAYS;
  if (module === "communities") return I18nKey.APPS$SOCIAL_YOUR_COMMUNITIES;
  return null;
}

function handleLabel(network: SocialNetworkId, handle: string): string {
  if (network === "nostr" || network === "bitsocial") return handle;
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function ActorRow({
  actor,
  network,
  canFollow,
  onOpen,
  onToggleFollow,
}: {
  actor: SocialSuggestedActor;
  network: SocialNetworkId;
  canFollow: boolean;
  onOpen: (actor: string) => void;
  onToggleFollow: (did: string, followingUri?: string) => void;
}) {
  const following = Boolean(actor.viewer?.following);
  return (
    <li>
      <button
        type="button"
        className="arco-social__sidebar-actor-btn"
        onClick={() => onOpen(actor.handle || actor.did)}
      >
        <Avatar name={actor.displayName} src={actor.avatar} size="sm" />
        <div>
          <strong>{actor.displayName}</strong>
          <span>{handleLabel(network, actor.handle)}</span>
        </div>
      </button>
      {canFollow ? (
        <Button
          variant={following ? "ghost" : "primary"}
          onClick={() => onToggleFollow(actor.did, actor.viewer?.following)}
        >
          {following ? (
            <T k={I18nKey.APPS$SOCIAL_UNFOLLOW} />
          ) : (
            <T k={I18nKey.APPS$SOCIAL_FOLLOW} />
          )}
        </Button>
      ) : null}
    </li>
  );
}

export function SocialSidebar({
  network,
  enabled,
  canFollow,
  trends,
  suggestions,
  links,
  linksModule,
  loading,
  searchQuery,
  searchResults,
  searchLoading,
  onSearch,
  onClearSearch,
  onOpenActor,
  onToggleFollow,
}: SocialSidebarProps) {
  const [draft, setDraft] = useState(searchQuery);
  const linksTitle = linksTitleKey(linksModule);
  const searching = draft.trim().length > 0;

  useEffect(() => {
    setDraft(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(() => {
      if (draft.trim() === searchQuery.trim()) return;
      void onSearch(draft);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [draft, enabled, onSearch, searchQuery]);

  return (
    <aside className="arco-social__sidebar">
      <div className="arco-social__sidebar-search">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={i18n.t(I18nKey.APPS$SOCIAL_SEARCH_PEOPLE)}
          aria-label={i18n.t(I18nKey.APPS$SOCIAL_SEARCH_PEOPLE)}
          disabled={!enabled}
          startSlot={<Search size={14} aria-hidden />}
          endSlot={
            draft ? (
              <button
                type="button"
                className="arco-social__sidebar-search-clear"
                aria-label={i18n.t(I18nKey.COMMON$CLOSE)}
                onClick={() => {
                  setDraft("");
                  onClearSearch();
                }}
              >
                <X size={14} />
              </button>
            ) : undefined
          }
        />
      </div>

      {searching ? (
        <section className="arco-social__panel">
          <h2><T k={I18nKey.APPS$SOCIAL_SEARCH_RESULTS} /></h2>
          {searchLoading ? (
            <p className="arco-social__sidebar-status"><T k={I18nKey.APPS$SOCIAL_SEARCHING} /></p>
          ) : null}
          {!searchLoading && searchResults.length === 0 ? (
            <p className="arco-social__sidebar-status"><T k={I18nKey.APPS$SOCIAL_NO_RESULTS} /></p>
          ) : null}
          {searchResults.length > 0 ? (
            <ul className="arco-social__suggestions">
              {searchResults.map((actor) => (
                <ActorRow
                  key={actor.did}
                  actor={actor}
                  network={network}
                  canFollow={canFollow}
                  onOpen={onOpenActor}
                  onToggleFollow={onToggleFollow}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <>
          {trends.length > 0 ? (
            <section className="arco-social__panel">
              <h2><T k={trendsTitleKey(network)} /></h2>
              <ul className="arco-social__trends">
                {trends.map((trend) => (
                  <li key={trend.id}>
                    <button
                      type="button"
                      className="arco-social__trend-btn"
                      onClick={() => {
                        const next = trend.query || trend.title;
                        setDraft(next);
                        onSearch(next);
                      }}
                    >
                      {trend.category ? <span>{trend.category}</span> : null}
                      <strong>{trend.title}</strong>
                      {trend.postCount ? <small>{trend.postCount}</small> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="arco-social__panel">
            <h2><T k={I18nKey.APPS$SOCIAL_WHO_TO_FOLLOW} /></h2>
            {loading ? (
              <p className="arco-social__sidebar-status"><T k={I18nKey.APPS$SOCIAL_LOADING_SUGGESTIONS} /></p>
            ) : null}
            {!loading && suggestions.length === 0 ? (
              <p className="arco-social__sidebar-status">
                {enabled ? (
                  <T k={I18nKey.APPS$SOCIAL_NO_SUGGESTIONS} />
                ) : (
                  <T k={I18nKey.APPS$SOCIAL_LINK_AN_ACCOUNT_TO_LOAD_YOUR_TIMELINE_AND_POST_FROM_KOSM} />
                )}
              </p>
            ) : null}
            {suggestions.length > 0 ? (
              <ul className="arco-social__suggestions">
                {suggestions.map((actor) => (
                  <ActorRow
                    key={actor.did}
                    actor={actor}
                    network={network}
                    canFollow={canFollow}
                    onOpen={onOpenActor}
                    onToggleFollow={onToggleFollow}
                  />
                ))}
              </ul>
            ) : null}
          </section>

          {linksTitle && links.length > 0 ? (
            <section className="arco-social__panel">
              <h2><T k={linksTitle} /></h2>
              <ul className="arco-social__sidebar-links">
                {links.map((link) => (
                  <li key={link.id}>
                    {link.url ? (
                      <a
                        className="arco-social__sidebar-link"
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <strong>{link.title}</strong>
                        {link.subtitle ? <span>{link.subtitle}</span> : null}
                      </a>
                    ) : (
                      <div className="arco-social__sidebar-link">
                        <strong>{link.title}</strong>
                        {link.subtitle ? <span>{link.subtitle}</span> : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </aside>
  );
}
