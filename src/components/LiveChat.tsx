import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";

const CHAT_STORAGE_KEY = "mortv_chat_messages";
const USERNAME_STORAGE_KEY = "chat_username";

const sampleComments = [
  { user: "Arif_BD", text: "Sports channel ta smooth cholche!" },
  { user: "Nusrat_Anis", text: "MorTV streaming fast and clean." },
  { user: "Suvo_Islam", text: "Somoy TV live report onek clear." },
  { user: "Tasnim_Rahman", text: "Kolkatta TV amar ekhane clear cholche." },
  { user: "JoyBangla99", text: "Joy Bangla, sobai bhalo thakun." },
  { user: "Mashrafe_Fan", text: "T Sports HD quality ajke darun." },
  { user: "Zahid_Qatar", text: "Qatar theke dekhtesi, speed bhalo." },
  { user: "Rashedul_K", text: "Mobile e amar kono lag hocche na." },
  { user: "Rimi_Hossen", text: "Kids channel gulo bhalo lagche." },
  { user: "Sonia_Dhaka", text: "RTV natok ta khub sundor." },
  { user: "Aminul_88", text: "Makkah Live add korar jonno thanks." },
  { user: "Sayed_Sylhet", text: "Interface ta onek easy and premium." },
  { user: "Imran_Pro", text: "Hindi movie channels aro add koren." },
  { user: "Monir_Vlog", text: "Sobai link ta share korun." },
];

const gradients = [
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-fuchsia-500 to-violet-500",
  "from-purple-500 to-indigo-500",
];

const getInitials = (name: string) => name.trim().slice(0, 2).toUpperCase() || "ME";

const getTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const createSeedMessages = (): ChatMessage[] =>
  sampleComments.slice(0, 6).map((comment, index) => ({
    id: `seed-${index}`,
    user: comment.user,
    text: comment.text,
    time: new Date(Date.now() - (6 - index) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    avatar: getInitials(comment.user),
  }));

export default function LiveChat({ channelName }: { channelName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : createSeedMessages();
    } catch {
      return createSeedMessages();
    }
  });
  const [inputText, setInputText] = useState("");
  const [username, setUsername] = useState(() => {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || `Viewer_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [activeViewers, setActiveViewers] = useState(1402);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const cleanUsername = useMemo(() => username.trim() || "Viewer", [username]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-60)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(USERNAME_STORAGE_KEY, cleanUsername);
  }, [cleanUsername]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      setMessages((prev) => [
        ...prev.slice(-59),
        {
          id: `sim-${Date.now()}`,
          user: randomComment.user,
          text: randomComment.text,
          time: getTime(),
          avatar: getInitials(randomComment.user),
        },
      ]);
      setActiveViewers((count) => Math.max(120, count + Math.floor(Math.random() * 11) - 5));
    }, 9000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev.slice(-59),
      {
        id: `user-${Date.now()}`,
        user: cleanUsername,
        text,
        time: getTime(),
        avatar: getInitials(cleanUsername),
      },
    ]);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#121216] border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/10 text-red-500 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-white text-xs font-bold leading-none">Live Chat</h4>
            <span className="text-gray-400 text-[10px] leading-tight flex items-center gap-1 mt-1 font-mono truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9147ff] animate-ping shrink-0" />
              {activeViewers} watching {channelName}
            </span>
          </div>
        </div>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-24 bg-white/5 hover:bg-white/10 text-right focus:bg-[#1c1c24] text-[11px] text-gray-300 font-mono px-2 py-1 rounded border border-white/5 outline-none focus:border-[#9147ff] transition-all shrink-0"
          placeholder="Username"
          title="Chat username"
        />
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        <div className="p-3 mb-2 bg-[#121216] border border-white/5 rounded-xl text-center">
          <p className="text-[#9147ff] text-[11px] font-semibold flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> MorTV Chat Room
          </p>
          <p className="text-gray-400 text-[10px] mt-1">Please keep comments clean and respectful.</p>
        </div>

        {messages.map((msg) => {
          const colorIndex = Math.abs(msg.user.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;
          const isMe = msg.user === cleanUsername;

          return (
            <div key={msg.id} className={`flex gap-2.5 items-start ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${gradients[colorIndex]} shadow-lg uppercase shrink-0`}>
                {msg.avatar}
              </div>

              <div className="flex flex-col max-w-[75%] min-w-0">
                <span className={`text-[10px] font-mono mb-0.5 flex gap-1 items-center ${isMe ? "text-right text-[#9147ff] justify-end" : "text-gray-500"}`}>
                  <span className="truncate">{msg.user}</span>
                  <span className="text-[9px] text-gray-600 font-normal shrink-0">{msg.time}</span>
                </span>
                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed break-words ${
                  isMe ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-purple-500/10" : "bg-white/5 hover:bg-white/10 text-gray-300 rounded-tl-none transition-colors"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-[#121216]/90 border-t border-white/5 flex gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 min-w-0 bg-[#0a0a0c] text-white text-xs border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-[#9147ff] transition-all font-sans"
          id="chat-send-input"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-gradient-to-r from-brand-accent to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 disabled:hover:scale-100 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/15"
          id="chat-send-submit-btn"
          aria-label="Send chat message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
