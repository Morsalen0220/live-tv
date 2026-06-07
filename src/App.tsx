import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  Tv, Search, Heart, History, Share2, HelpCircle, Info, ExternalLink, 
  ChevronRight, Grid, List, MessageSquare, Filter, Sparkles, X, Play, 
  Flame, Zap, Check, Globe, HelpCircle as HelpIcon, Bell, Star,
  Facebook
} from "lucide-react";
import { Channel } from "./types";
import { groupNamesBanglaMap } from "./channels";
import LivePlayer from "./components/LivePlayer";
import LiveChat from "./components/LiveChat";

const CHANNEL_BATCH_SIZE = 600;

const CATEGORY_ORDER = [
  "Bangladesh",
  "India",
  "Sports",
  "News",
  "Movies",
  "Series",
  "Entertainment",
  "Kids",
  "Music",
  "Religious",
  "Documentary",
  "Education",
  "Business",
  "Lifestyle",
  "Travel",
  "Comedy",
  "Culture",
  "Weather",
  "Shopping",
  "Government",
  "General",
  "International",
  "Other",
];

const COUNTRY_GROUPS = new Set([
  "albania", "argentina", "austria", "azerbaijan", "belarus", "belgium", "bosnia and herzegovina",
  "brazil", "bulgaria", "canada", "chile", "china", "costa rica", "croatia", "cyprus", "czech republic",
  "denmark", "dominican republic", "egypt", "estonia", "faroe islands", "finland", "france", "georgia",
  "germany", "greece", "greenland", "hong kong", "hungary", "iceland", "indonesia", "iran", "iraq",
  "ireland", "israel", "italy", "japan", "æ—¥æœ¬ / japan", "korea", "latvia", "lithuania", "luxembourg",
  "mexico", "moldova", "montenegro", "netherlands", "north macedonia", "norway", "pakistan", "poland",
  "portugal", "qatar", "romania", "russia", "saudi arabia", "serbia", "slovakia", "slovenia", "spain",
  "sweden", "switzerland", "taiwan", "turkey", "uk", "ukraine", "united arab emirates", "usa", "venezuela"
]);

const CATEGORY_GROUPS: Record<string, string[]> = {
  Bangladesh: [
    "bangladesh", "bangla", "bangla news", "bangla movies", "bangla music", "indian bangla",
    "indian bangla news", "kolkata bangla", "kolkata bangla movies", "kolkata bangla music"
  ],
  India: ["india", "indian", "hindi"],
  Sports: ["sports", "live sports", "ipl-2026", "psl-2026", "football world cup 2026"],
  News: ["news", "international news", "english news", "news (ar)", "news (es)", "information"],
  Movies: ["movie", "movies", "english movies", "hindi movies", "hindi dabbing movies", "vod italy"],
  Series: ["series", "web series", "drama"],
  Kids: ["kids", "kids;public", "animation", "animation;kids", "family"],
  Music: ["music", "hindi music", "classic;music"],
  Religious: ["religious", "islamic", "relagion channel"],
  Documentary: ["documentary", "documentaries (en)", "science", "infotainment"],
  Education: ["education", "educational"],
  Business: ["business"],
  Lifestyle: ["lifestyle", "cooking", "auto", "relax"],
  Travel: ["travel", "outdoor"],
  Comedy: ["comedy", "classic"],
  Culture: ["culture"],
  Weather: ["weather", "public;weather"],
  Shopping: ["shop"],
  Government: ["legislative", "public", "general;public"],
  General: ["general", "channels", "latest"],
  Other: ["other", "others", "undefined", "imported"],
};

const inferCategoryFromName = (name = "") => {
  const normalizedName = name.toLowerCase();

  if (/\b(news|noticias|cnn|bbc|al jazeera|nbc|sky news|somoy|jamuna|ekattor)\b/.test(normalizedName)) return "News";
  if (/\b(sport|sports|cricket|football|soccer|tennis|golf|racing|espn|ipl|psl)\b/.test(normalizedName)) return "Sports";
  if (/\b(movie|movies|cinema|film|films|bollywood|hollywood)\b/.test(normalizedName)) return "Movies";
  if (/\b(series|drama|serial)\b/.test(normalizedName)) return "Series";
  if (/\b(kids|kid|cartoon|baby|junior|animation|anime)\b/.test(normalizedName)) return "Kids";
  if (/\b(music|radio|hits|songs|tarab)\b/.test(normalizedName)) return "Music";
  if (/\b(islam|islamic|quran|makkah|madinah|religion|religious|gospel)\b/.test(normalizedName)) return "Religious";
  if (/\b(weather|accuweather)\b/.test(normalizedName)) return "Weather";
  if (/\b(business|finance|market|bloomberg)\b/.test(normalizedName)) return "Business";
  if (/\b(documentary|science|history|nature|wild|discovery)\b/.test(normalizedName)) return "Documentary";
  if (/\b(education|school|learn|classroom)\b/.test(normalizedName)) return "Education";
  if (/\b(cooking|food|travel|outdoor|lifestyle|fashion|home)\b/.test(normalizedName)) return "Lifestyle";

  return "";
};

const getChannelCategory = (group = "Undefined", name = "") => {
  const normalizedGroup = (group || "Undefined").trim().toLowerCase();
  const tokens = normalizedGroup.split(";").map((part) => part.trim()).filter(Boolean);
  const matchedCategory = Object.entries(CATEGORY_GROUPS).find(([, groups]) =>
    groups.some((categoryGroup) => {
      const normalizedCategoryGroup = categoryGroup.toLowerCase();
      return normalizedGroup === normalizedCategoryGroup || tokens.includes(normalizedCategoryGroup);
    })
  );

  const nameCategory = inferCategoryFromName(name);
  if (matchedCategory) {
    const category = matchedCategory[0];
    if (["General", "Other"].includes(category) && nameCategory) return nameCategory;
    return category;
  }
  if (COUNTRY_GROUPS.has(normalizedGroup)) return "International";

  return nameCategory || "Other";
};
const FALLBACK_CHANNEL: Channel = {
  name: "Ananda TV",
  logo: "https://s3.aynaott.com/storage/897698f593fc07974fc46881a440733d",
  group: "Bangla",
  url: "https://tvsen6.aynaott.com/anandatv/index.m3u8?e=1779283759&u=78be6644-0a65-48ec-81a4-089ac65a2619&token=504b9350b4703116ca4ab20e4013288e"
};

export default function App() {
  const [channelsData, setChannelsData] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel>(FALLBACK_CHANNEL);

  // Search input & active category tab
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("favorites_channels");
      return saved ? JSON.parse(saved) : ["Ananda TV", "T Sports HD", "Somoy TV Feed"];
    } catch {
      return ["Ananda TV"];
    }
  });

  // Recent channels state
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recent_channels");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI state overlays
  const [theaterMode, setTheaterMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [mobileTab, setMobileTab] = useState<"channels" | "chat">("channels");
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});
  const [channelView, setChannelView] = useState<"grid" | "list">(() => {
    return localStorage.getItem("channel_view_mode") === "list" ? "list" : "grid";
  });
  const [visibleChannelCount, setVisibleChannelCount] = useState(CHANNEL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const categoryScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/channels.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load channel list: ${response.status}`);
        }
        return response.json() as Promise<Channel[]>;
      })
      .then((channels) => {
        if (cancelled) return;

        setChannelsData(channels);
        setActiveChannel((current) => {
          if (current.name !== FALLBACK_CHANNEL.name || channels.length === 0) {
            return current;
          }
          return channels[0];
        });
        setChannelsError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setChannelsError(error instanceof Error ? error.message : "Failed to load channel list");
      })
      .finally(() => {
        if (!cancelled) {
          setChannelsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle Favorites toggle
  const toggleFavorite = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (favorites.includes(name)) {
      updated = favorites.filter((f) => f !== name);
      triggerToast(`Removed ${name} from favorites`);
    } else {
      updated = [...favorites, name];
      triggerToast(`Added ${name} to favorites`);
    }
    setFavorites(updated);
    localStorage.setItem("favorites_channels", JSON.stringify(updated));
  };

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  // Add channel to recents list
  const addToRecents = (channel: Channel) => {
    const name = channel.name;
    const filtered = recents.filter((r) => r !== name);
    const updated = [name, ...filtered].slice(0, 10); // Keep max 10
    setRecents(updated);
    localStorage.setItem("recent_channels", JSON.stringify(updated));
  };

  const changeChannelView = (view: "grid" | "list") => {
    setChannelView(view);
    localStorage.setItem("channel_view_mode", view);
  };

  const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const scroller = categoryScrollerRef.current;
    if (!scroller) return;

    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;

    e.preventDefault();
    scroller.scrollLeft += delta;
  };

  // Load selected channel
  const selectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    addToRecents(channel);
    // Smooth scroll player back block on mobile
    const playerEl = document.getElementById("video-player-root");
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        triggerToast("Share link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        triggerToast("Failed to copy link");
      });
  };

  // Dynamic grouping & mapping of groups
  const groupsList = useMemo(() => {
    const list = new Set<string>();
    channelsData.forEach((c) => {
      list.add(getChannelCategory(c.group, c.name));
    });

    return Array.from(list).sort((a, b) => {
      const orderA = CATEGORY_ORDER.indexOf(a);
      const orderB = CATEGORY_ORDER.indexOf(b);
      if (orderA !== -1 || orderB !== -1) {
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      }
      const nameA = (groupNamesBanglaMap[a] || a).toLowerCase();
      const nameB = (groupNamesBanglaMap[b] || b).toLowerCase();
      return nameA.localeCompare(nameB, "bn");
    });
  }, [channelsData]);

  const channelCountsByGroup = useMemo(() => {
    return channelsData.reduce<Record<string, number>>((counts, channel) => {
      const category = getChannelCategory(channel.group, channel.name);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
  }, [channelsData]);

  // Filter channels based on search & category
  const filteredChannels = useMemo(() => {
    return channelsData.filter((c) => {
      const category = getChannelCategory(c.group, c.name);
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (groupNamesBanglaMap[category] || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (activeCategory === "All") {
        return matchesSearch;
      }
      if (activeCategory === "Favorites") {
        return favorites.includes(c.name) && matchesSearch;
      }
      if (activeCategory === "Recent") {
        return recents.includes(c.name) && matchesSearch;
      }
      return category === activeCategory && matchesSearch;
    });
  }, [channelsData, searchQuery, activeCategory, favorites, recents]);

  const visibleFilteredChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleChannelCount);
  }, [filteredChannels, visibleChannelCount]);

  const hasMoreChannels = visibleChannelCount < filteredChannels.length;

  const loadMoreChannels = useCallback(() => {
    setVisibleChannelCount((count) => Math.min(count + CHANNEL_BATCH_SIZE, filteredChannels.length));
  }, [filteredChannels.length]);

  const groupedFilteredChannels = useMemo(() => {
    if (activeCategory !== "All" || searchQuery) {
      return [{ group: activeCategory, channels: visibleFilteredChannels }];
    }

    return groupsList
      .map((group) => ({
        group,
        channels: visibleFilteredChannels.filter((channel) => getChannelCategory(channel.group, channel.name) === group),
      }))
      .filter((section) => section.channels.length > 0);
  }, [activeCategory, groupsList, searchQuery, visibleFilteredChannels]);

  useEffect(() => {
    setVisibleChannelCount(CHANNEL_BATCH_SIZE);
  }, [activeCategory, searchQuery, channelView]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreChannels) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreChannels();
        }
      },
      { rootMargin: "1200px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredChannels.length, hasMoreChannels, loadMoreChannels, visibleChannelCount]);

  useEffect(() => {
    if (!hasMoreChannels) return;

    const handleScroll = () => {
      const distanceToBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (distanceToBottom < 1200) {
        loadMoreChannels();
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMoreChannels, loadMoreChannels, visibleChannelCount]);

  // Featured carousel channels (top premium)
  const featuredChannels = useMemo(() => {
    return channelsData.filter((c) => 
      c.name === "T Sports HD" || 
      c.name === "Ananda TV" || 
      c.name === "Somoy TV Feed" || 
      c.name === "Makkah Live"
    ).slice(0, 3);
  }, [channelsData]);

  return (
    <div className="min-h-screen bg-brand-bg text-[#efeff1] flex flex-col font-sans selection:bg-brand-accent/20 selection:text-brand-accent overflow-x-hidden w-full max-w-full">
      
      {/* Toast Alert Popups */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-brand-sidebar border border-white/15 text-[#efeff1] rounded-lg shadow-xl flex items-center gap-2">
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-brand-sidebar border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo Brand with custom banner */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand-accent flex items-center justify-center shadow shrink-0">
              <Tv className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#efeff1] text-sm sm:text-base font-black tracking-tight uppercase">MorTV</span>
                <span className="bg-white/10 text-gray-300 text-[8px] sm:text-[9px] uppercase px-1 sm:px-1.5 py-0.5 sm:py-0.5 rounded font-bold tracking-wider animate-pulse">PORTAL</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium tracking-wide leading-none mt-0.5">Live OTT Streaming Portal</p>
            </div>
          </div>

          {/* Search bar inside header desktop */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live channels or categories..."
              className="w-full bg-[#16161f] text-xs text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 border border-white/10 focus:border-brand-accent outline-none transition-all focus:bg-[#1a1a24]"
              id="search-main-header-desktop"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Header controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Shortcuts Sheet launcher */}
            <button
              onClick={() => setShowShortcutModal(true)}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-brand-accent transition-all text-gray-400"
              title="Keyboard Shortcuts Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Total count badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-sidebar border border-white/10 rounded-lg text-[10px] font-mono font-bold text-brand-accent">
              <span>{channelsData.length} CHANNELS AVAILABLE</span>
            </div>

            {/* Live Global status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-[9px] sm:text-[10px]">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH BAR */}
      <div className="block md:hidden px-4 pt-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channel name..."
            className="w-full bg-[#111] text-xs text-white placeholder-gray-500 rounded-lg pl-9 pr-4 py-2.5 border border-white/10 focus:border-brand-accent outline-none"
            id="search-mobile-header"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC HERO BANNER FEATURED SLIDER */}
      {!searchQuery && activeCategory === "All" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 hidden md:block">
          <div className="relative bg-[#121216] rounded-xl p-6 md:p-8 border border-white/10 overflow-hidden shadow-md flex flex-col md:flex-row items-center justify-between gap-6">

            <div className="flex-1 space-y-4 text-center md:text-left z-10">
              {/* Premium featured tag */}
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                <span>Featured Streams & Entertainment</span>
              </div>
              <h2 className="text-[#efeff1] text-2xl md:text-3.5xl font-black tracking-tight leading-tight">
                MorTV: Live TV and Entertainment
              </h2>
              <p className="text-gray-400 text-xs md:text-sm max-w-xl leading-relaxed">
                Enjoy seamless playback of your favorite television channels and sports feeds. Powered by a responsive and clean interface crafted for mobile, tablet, and desktop devices!
              </p>
              
              {/* Hot selection clickers */}
              <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-2">
                {featuredChannels.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => selectChannel(c)}
                    className="group flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-brand-accent text-[#efeff1] rounded-lg text-xs font-semibold border border-white/5 hover:border-brand-accent transition-all duration-200"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Graphical design representation */}
            <div className="w-full md:w-auto flex shrink-0 justify-center z-10">
              <div className="bg-brand-sidebar border border-white/10 p-4 rounded-xl shadow-md flex items-center gap-4 max-w-sm">
                {activeChannel.logo && !logoErrors[activeChannel.name] ? (
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-12 h-12 rounded-lg bg-[#09090b] object-contain border border-white/10 shrink-0"
                    onError={() => {
                      setLogoErrors(prev => ({ ...prev, [activeChannel.name]: true }));
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Tv className="w-6 h-6 text-brand-accent animate-pulse" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-brand-accent font-bold font-mono tracking-wider uppercase">NOW PLAYING</p>
                  <p className="text-[#efeff1] text-sm font-bold truncate mt-0.5">{activeChannel.name}</p>
                  <p className="text-gray-500 text-xs font-medium truncate mt-0.5">{activeChannel.group}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              </div>
            </div>

          </div>
        </section>
      )}

      {/* MAIN TWO-COLUMN DASHBOARD */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6 w-full max-w-full overflow-x-hidden" id="main-content-layout">
        
        {/* PLAYER & CHAT AREA CONTAINER */}
        <div className={`grid gap-6 ${theaterMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
          
          {/* Player core area */}
          <div className={`${theaterMode ? "lg:col-span-1" : "lg:col-span-2"} flex flex-col gap-4`}>
            
            {/* Live TV Container component */}
            <LivePlayer 
              channel={activeChannel} 
              theaterMode={theaterMode}
              onToggleTheater={() => setTheaterMode(!theaterMode)}
            />

            {/* Detailed Channel Info beneath player */}
            <div className="bg-brand-sidebar border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                {activeChannel.logo && !logoErrors[activeChannel.name] ? (
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-12 h-12 rounded-lg object-contain bg-black border border-white/10 shrink-0 p-1"
                    onError={() => {
                      setLogoErrors(prev => ({ ...prev, [activeChannel.name]: true }));
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Tv className="w-6 h-6 text-brand-accent" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-base md:text-lg font-extrabold truncate">{activeChannel.name}</h3>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/15 text-gray-300 text-[9px] font-bold rounded uppercase">
                      {activeChannel.group}
                    </span>
                  </div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mt-1 text-brand-accent">
                    Live Streaming Active
                  </p>
                </div>
              </div>

              {/* Utility actions with responsive full-width behavior */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                {/* Favorites button */}
                <button
                  onClick={(e) => toggleFavorite(activeChannel.name, e)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    favorites.includes(activeChannel.name)
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/5"
                  }`}
                  id="header-toggle-favorite-btn"
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(activeChannel.name) ? "fill-current text-rose-500" : ""}`} />
                  {favorites.includes(activeChannel.name) ? "Favorited" : "Add Favorite"}
                </button>

                {/* Share stream button */}
                <button
                  onClick={handleShare}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-brand-accent/10 text-white hover:text-brand-accent transition-all text-xs font-bold border border-white/5"
                  title="Share (Copy Portal Link)"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="flex lg:hidden bg-[#121217] border border-white/10 rounded-xl p-1 gap-1" id="mobile-navigation-tabs">
              <button
                onClick={() => setMobileTab("channels")}
                className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileTab === "channels"
                    ? "bg-brand-accent text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>TV Channels</span>
              </button>
              <button
                onClick={() => setMobileTab("chat")}
                className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileTab === "chat"
                    ? "bg-brand-accent text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat</span>
              </button>
            </div>

          </div>

          {/* Live Chat sidebar column */}
          <div className={`${theaterMode ? "hidden" : "block"} lg:col-span-1 ${mobileTab === "chat" ? "block w-full h-[450px]" : "hidden lg:block"} h-[500px] lg:h-[530px] xl:h-[570px] flex-shrink-0`}>
            <LiveChat channelName={activeChannel.name} />
          </div>

        </div>

        {/* CONTAINER FOR CHANNELS AND FILTERS (Hidden on mobile if chat is open) */}
        <div className={`${mobileTab === "channels" ? "space-y-6 block" : "hidden lg:block lg:space-y-6"} w-full max-w-full overflow-hidden`}>

        {/* NAVIGATION SELECTION FILTER PILLS */}
        <section className="space-y-4 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-brand-accent" />
              <h2 className="text-[#efeff1] text-base md:text-lg font-black tracking-tight uppercase">TV Channel Categories</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 font-medium font-mono">
                showing {visibleFilteredChannels.length} of {filteredChannels.length} streams
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => changeChannelView("grid")}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                    channelView === "grid" ? "bg-brand-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                  title="Icon grid view"
                  aria-label="Icon grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeChannelView("list")}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                    channelView === "list" ? "bg-brand-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                  title="List view with icons"
                  aria-label="List view with icons"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={categoryScrollerRef}
            onWheel={handleCategoryWheel}
            className="category-scrollbar w-full max-w-full overflow-x-auto pb-3 flex items-center gap-1.5 touch-pan-x scroll-smooth"
          >
            {/* All channels Category static */}
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 uppercase tracking-wide flex items-center gap-1.5 ${
                activeCategory === "All"
                  ? "bg-gradient-to-r from-brand-accent to-purple-700 text-white shadow-lg shadow-brand-accent/15 border-transparent"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> All Channels ({channelsData.length})
            </button>

            {/* Custom Favorites tab */}
            <button
              onClick={() => setActiveCategory("Favorites")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 uppercase tracking-wide flex items-center gap-1.5 ${
                activeCategory === "Favorites"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/15"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" /> Favorites ({favorites.length})
            </button>

            {/* Custom Recents tab */}
            <button
              onClick={() => setActiveCategory("Recent")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 uppercase tracking-wide flex items-center gap-1.5 ${
                activeCategory === "Recent"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Recent
            </button>

            {/* Map groups directly from database list */}
            {groupsList.map((g) => {
              const mappedName = groupNamesBanglaMap[g] || g;
              return (
                <button
                  key={g}
                  onClick={() => setActiveCategory(g)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 uppercase tracking-wide ${
                    activeCategory === g
                      ? "bg-brand-accent text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
                  } border border-white/10`}
                >
                  {mappedName} ({channelCountsByGroup[g] || 0})
                </button>
              );
            })}
          </div>
        </section>

        {/* CHANNELS LISTINGS */}
        <section className="space-y-4">
          {channelsLoading ? (
            <div className="bg-brand-sidebar p-12 rounded-lg text-center border border-white/10">
              <div className="w-10 h-10 border-4 border-[#9147ff]/20 border-t-[#9147ff] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-bold text-base">Loading channel list...</p>
              <p className="text-gray-500 text-xs mt-1">Large channel database is loading separately for faster app startup.</p>
            </div>
          ) : channelsError ? (
            <div className="bg-brand-sidebar p-12 rounded-lg text-center border border-red-500/20">
              <Tv className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-white font-bold text-base">Channel list failed to load</p>
              <p className="text-gray-500 text-xs mt-1">{channelsError}</p>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="bg-brand-sidebar p-12 rounded-lg text-center border border-white/10">
              <Tv className="w-12 h-12 text-gray-605 mx-auto mb-3" />
              <p className="text-white font-bold text-base">No channels found</p>
              <p className="text-gray-500 text-xs mt-1">Please try modifying your search parameters or check another tab.</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                className="mt-4 px-4 py-2 bg-brand-accent text-white rounded-lg text-xs font-semibold transition-all hover:bg-opacity-90"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedFilteredChannels.map((section) => (
                <div key={section.group} className="space-y-3">
                  {(activeCategory === "All" && !searchQuery) && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-5 rounded-full bg-brand-accent shrink-0" />
                        <h3 className="text-sm font-black uppercase tracking-wide text-white truncate">
                          {groupNamesBanglaMap[section.group] || section.group}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-500 shrink-0">
                        {channelCountsByGroup[section.group] || section.channels.length} channels
                      </span>
                    </div>
                  )}

                  {channelView === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 w-full max-w-full">
                      {section.channels.map((channel, idx) => {
                        const isActive = activeChannel.name === channel.name;
                        const isFavorite = favorites.includes(channel.name);
                        const hasLogoError = logoErrors[channel.name];

                        return (
                          <div
                            key={`${section.group}-${channel.name}-${idx}`}
                            onClick={() => selectChannel(channel)}
                            className={`group cursor-pointer rounded-lg border p-3 flex flex-col bg-brand-sidebar hover:bg-[#1a1b24] transition-all duration-200 relative min-w-0 w-full ${
                              isActive 
                                ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent"
                                : "border-white/10 hover:border-gray-500"
                            }`}
                          >
                            {isActive && (
                              <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-red-600 text-white rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-white rounded-full" /> PLAYING
                              </div>
                            )}

                            <div className="w-full aspect-video bg-black/60 rounded-lg mb-3 border border-white/5 group-hover:border-white/10 overflow-hidden relative flex items-center justify-center p-3 transition-colors min-w-0">
                              {channel.logo && !hasLogoError ? (
                                <img
                                  src={channel.logo}
                                  alt={channel.name}
                                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                  onError={() => {
                                    setLogoErrors(prev => ({ ...prev, [channel.name]: true }));
                                  }}
                                />
                              ) : (
                                <div className="text-brand-accent font-extrabold text-lg uppercase h-full w-full flex items-center justify-center bg-gray-900/60 rounded-lg font-mono">
                                  {channel.name.charAt(0)}
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-200">
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </div>
                              </div>
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="text-[#efeff1] text-xs font-bold leading-snug truncate group-hover:text-brand-accent transition-colors">
                                  {channel.name}
                                </h4>
                                <button
                                  onClick={(e) => toggleFavorite(channel.name, e)}
                                  className="text-gray-400 hover:text-rose-500 p-0.5 shrink-0 transition-colors"
                                  title={isFavorite ? "Remove favorite" : "Add favorite"}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current text-rose-500" : ""}`} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] text-gray-400 font-mono">
                                <span className="truncate uppercase">{channel.group}</span>
                                <span className="text-gray-500 flex items-center gap-0.5 leading-none shrink-0 font-bold">
                                  1080P HD
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {section.channels.map((channel, idx) => {
                        const isActive = activeChannel.name === channel.name;
                        const isFavorite = favorites.includes(channel.name);
                        const hasLogoError = logoErrors[channel.name];

                        return (
                          <div
                            key={`${section.group}-${channel.name}-${idx}`}
                            onClick={() => selectChannel(channel)}
                            className={`group cursor-pointer rounded-lg border bg-brand-sidebar hover:bg-[#1a1b24] transition-all duration-200 p-3 flex items-center gap-3 min-w-0 ${
                              isActive
                                ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent"
                                : "border-white/10 hover:border-gray-500"
                            }`}
                          >
                            <div className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg bg-black/60 border border-white/5 overflow-hidden flex items-center justify-center p-1.5 shrink-0">
                              {channel.logo && !hasLogoError ? (
                                <img
                                  src={channel.logo}
                                  alt={channel.name}
                                  className="max-h-full max-w-full object-contain"
                                  onError={() => {
                                    setLogoErrors(prev => ({ ...prev, [channel.name]: true }));
                                  }}
                                />
                              ) : (
                                <span className="text-brand-accent font-black text-sm uppercase font-mono">
                                  {channel.name.charAt(0)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate group-hover:text-brand-accent">
                                  {channel.name}
                                </h4>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                                    Playing
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
                                <span className="truncate">{channel.group}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-700 shrink-0" />
                                <span className="shrink-0">1080P HD</span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => toggleFavorite(channel.name, e)}
                              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 flex items-center justify-center shrink-0 transition-colors"
                              title={isFavorite ? "Remove favorite" : "Add favorite"}
                            >
                              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current text-rose-500" : ""}`} />
                            </button>

                            <div className="w-9 h-9 rounded-lg bg-brand-accent/10 text-brand-accent group-hover:bg-brand-accent group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {hasMoreChannels && (
                <div ref={loadMoreRef} className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="w-8 h-8 border-4 border-[#9147ff]/20 border-t-[#9147ff] rounded-full animate-spin" />
                  <button
                    onClick={loadMoreChannels}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-brand-accent text-white border border-white/10 text-xs font-bold transition-all"
                  >
                    Load more channels
                  </button>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {filteredChannels.length - visibleFilteredChannels.length} more remaining
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        </div>

      </main>

      {/* SHORTCUTS INFO MODAL GUIDE */}
      {showShortcutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121217] border border-white/10 rounded-xl w-full max-w-sm p-6 relative shadow-lg animate-fade-in text-sm">
            <button
              onClick={() => setShowShortcutModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-brand-accent" />
              <h3 className="text-white font-black text-base uppercase">Keyboard Shortcut Guide</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Play / Pause:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">Space</kbd>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Mute / Unmute:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">M Key</kbd>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Fullscreen Video:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">F Key</kbd>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Theater mode:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">T Key</kbd>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Reconnect Stream:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">R Key</kbd>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-gray-400">Raise Volume:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">Up Arrow</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lower Volume:</span>
                <kbd className="px-2 py-0.5 bg-white/10 text-brand-accent rounded uppercase">Down Arrow</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutModal(false)}
              className="mt-6 w-full py-2.5 bg-brand-accent hover:bg-opacity-90 text-white font-bold rounded-lg text-xs uppercase"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* FOOTER DETAIL SECTION */}
      {!hasMoreChannels && (
      <footer className="bg-brand-sidebar border-t border-white/10 py-10 mt-12 shrink-0 text-center">
        <div className="max-w-7xl mx-auto px-4 text-xs text-gray-400 space-y-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-[#efeff1] font-extrabold text-base tracking-wider uppercase">
              <Tv className="w-5 h-5 text-brand-accent" />
              <span>MorTV Portal</span>
            </div>
            <p className="text-gray-400 text-xs max-w-sm">
              A clean live TV and entertainment streaming portal.
            </p>
          </div>

          {/* Developer Segment */}
          <div className="max-w-md mx-auto bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-inner">
            <h4 className="text-brand-accent text-[10px] font-mono font-bold tracking-widest uppercase mb-3">DEVELOPER & CREATOR</h4>
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="text-sm font-black text-[#efeff1]">MD Morsalen Islam</span>
              
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                {/* Facebook Button */}
                <a
                  href="https://www.facebook.com/morsalen0220/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1877f2]/10 hover:bg-[#1877f2]/20 text-[#1877f2] hover:text-white font-semibold text-xs rounded-lg border border-[#1877f2]/20 transition-all"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  <span>Facebook Profile</span>
                </a>

                {/* WhatsApp Button */}
                <a
                  href="https://wa.me/8801762783339"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white font-semibold text-xs rounded-lg border border-emerald-500/20 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp: 01762783339</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500 font-mono pt-2">
            <span>MorTV © 2026</span>
            <span>•</span>
            <span>STATIC PLAYER WEB CLIENT</span>
            <span>•</span>
            <span>NO SIGN-UP REQUIRED</span>
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed max-w-xl mx-auto">
            Disclaimer: This application acts strictly as a customizable player client of public domain m3u8 playlists. All logos and feed assets belong to their respective copyright holders.
          </p>
        </div>
      </footer>
      )}

    </div>
  );
}
