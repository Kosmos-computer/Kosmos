import type { SocialEmbed, SocialFeedPost } from "@shared/social";
import { SocialFeedVideo } from "./SocialFeedVideo";

function PostEmbeds({ embeds }: { embeds?: SocialEmbed[] }) {
  if (!embeds?.length) return null;
  return (
    <div className="arco-social__embeds">
      {embeds.map((embed, index) => {
        if (embed.type === "images") {
          return (
            <div
              key={`images-${index}`}
              className={`arco-social__media-grid arco-social__media-grid--${Math.min(embed.images.length, 4)}`}
            >
              {embed.images.slice(0, 4).map((image) => (
                <a
                  key={image.fullsize || image.thumb}
                  className="arco-social__media-link"
                  href={image.fullsize || image.thumb}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <img src={image.thumb || image.fullsize} alt={image.alt || ""} loading="lazy" />
                </a>
              ))}
            </div>
          );
        }
        if (embed.type === "video") {
          return <SocialFeedVideo key={`video-${index}`} video={embed.video} />;
        }
        if (embed.type === "external") {
          return (
            <a
              key={`external-${index}`}
              className="arco-social__external"
              href={embed.external.uri}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {embed.external.thumb ? (
                <img src={embed.external.thumb} alt="" loading="lazy" />
              ) : null}
              <div>
                <strong>{embed.external.title}</strong>
                {embed.external.description ? <p>{embed.external.description}</p> : null}
                <small>{embed.external.uri}</small>
              </div>
            </a>
          );
        }
        return (
          <blockquote key={`quote-${index}`} className="arco-social__quote">
            {embed.quote.author ? (
              <header>
                <strong>{embed.quote.author.displayName}</strong>
                <span>@{embed.quote.author.handle}</span>
              </header>
            ) : null}
            <p>{embed.quote.text}</p>
          </blockquote>
        );
      })}
    </div>
  );
}

export function PostMedia({ post }: { post: SocialFeedPost }) {
  return <PostEmbeds embeds={post.embeds} />;
}
