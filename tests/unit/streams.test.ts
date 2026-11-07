import { describe, expect, it } from "vitest";
import { OFFLINE, STREAM_URL, extractYoutubeVideoIds, parseKickChannel, parseTwitchStreams, parseYoutubeVideos } from "@/lib/streams";
import { normalizeStreamHandle } from "@/lib/schemas/content";

describe("Twitch", () => {
  it("marca quem está ao vivo e deixa o resto offline", () => {
    const res = parseTwitchStreams(
      {
        data: [
          {
            user_login: "NinaRP",
            type: "live",
            title: "Patrulha da Leviata",
            viewer_count: 42,
            thumbnail_url: "https://cdn/x-{width}x{height}.jpg",
            game_name: "Grand Theft Auto V",
            started_at: "2026-11-06T22:00:00Z",
          },
        ],
      },
      ["ninarp", "dante"],
    );
    expect(res.get("ninarp")).toEqual({
      isLive: true,
      title: "Patrulha da Leviata",
      viewers: 42,
      thumbnailUrl: "https://cdn/x-640x360.jpg",
      category: "Grand Theft Auto V",
      startedAt: new Date("2026-11-06T22:00:00Z"),
    });
    expect(res.get("dante")).toEqual(OFFLINE);
  });
});

describe("Kick", () => {
  it("live ativa", () => {
    expect(
      parseKickChannel({
        livestream: { is_live: true, session_title: "RP", viewer_count: 7, thumbnail: { url: "https://k/t.jpg" }, categories: [{ name: "GTA V" }], start_time: "2026-11-06 22:00:00" },
      }),
    ).toMatchObject({ isLive: true, title: "RP", viewers: 7, thumbnailUrl: "https://k/t.jpg", category: "GTA V" });
  });
  it("sem livestream = offline", () => {
    expect(parseKickChannel({ livestream: null })).toEqual(OFFLINE);
    expect(parseKickChannel({ livestream: { is_live: false } })).toEqual(OFFLINE);
  });
});

describe("YouTube", () => {
  it("extrai IDs dos vídeos do RSS", () => {
    const rss = "<feed><entry><yt:videoId>abcdefghijk</yt:videoId></entry><entry><yt:videoId>ZYXWVUTSRQP</yt:videoId></entry></feed>";
    expect(extractYoutubeVideoIds(rss)).toEqual(["abcdefghijk", "ZYXWVUTSRQP"]);
  });
  it("live = começou e não terminou", () => {
    const st = parseYoutubeVideos({
      items: [
        { id: "a", liveStreamingDetails: { actualStartTime: "2026-11-05T20:00:00Z", actualEndTime: "2026-11-05T22:00:00Z" } },
        { id: "b", snippet: { title: "Ao vivo!", thumbnails: { high: { url: "https://yt/b.jpg" } } }, liveStreamingDetails: { actualStartTime: "2026-11-06T20:00:00Z", concurrentViewers: "15" } },
      ],
    });
    expect(st).toMatchObject({ isLive: true, title: "Ao vivo!", viewers: 15, thumbnailUrl: "https://yt/b.jpg" });
  });
  it("só vídeos encerrados = offline", () => {
    expect(parseYoutubeVideos({ items: [{ id: "a", liveStreamingDetails: { actualStartTime: "x", actualEndTime: "y" } }] })).toEqual(OFFLINE);
  });
});

describe("normalizeStreamHandle", () => {
  it.each([
    ["TWITCH", "https://www.twitch.tv/NinaRP?sr=a", "ninarp"],
    ["TWITCH", "ninarp", "ninarp"],
    ["KICK", "kick.com/leviata-rp/", "leviata-rp"],
    ["YOUTUBE", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv", "UCabcdefghijklmnopqrstuv"],
  ] as const)("%s %s → %s", (platform, raw, expected) => {
    expect(normalizeStreamHandle(platform, raw)).toBe(expected);
  });

  it.each([
    ["TWITCH", "ab"],
    ["TWITCH", "nome com espaço"],
    ["YOUTUBE", "@leviata"],
    ["KICK", ""],
  ] as const)("%s %s é inválido", (platform, raw) => {
    expect(normalizeStreamHandle(platform, raw)).toBeNull();
  });

  it("monta os links das plataformas", () => {
    expect(STREAM_URL.TWITCH("x")).toBe("https://twitch.tv/x");
    expect(STREAM_URL.KICK("x")).toBe("https://kick.com/x");
    expect(STREAM_URL.YOUTUBE("UC1")).toBe("https://youtube.com/channel/UC1/live");
  });
});
