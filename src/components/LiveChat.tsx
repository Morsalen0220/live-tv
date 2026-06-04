import React, { useState, useEffect, useRef } from "react";
import { Send, Users, Sparkles, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";

export default function LiveChat({ channelName }: { channelName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("chat_username") || `Viewer_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [activeViewers, setActiveViewers] = useState(1402);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Avatar colors
  const gradients = [
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-blue-500",
    "from-amber-500 to-orange-500",
    "from-emerald-500 to-teal-500",
    "from-fuchsia-100 to-violet-300",
    "from-purple-500 to-indigo-500"
  ];

  const banglaComments = [
    { user: "Arif_BD", text: "মারদাঙ্গা ম্যাচ হচ্ছে স্পোর্টসে! 🔥" },
    { user: "Nusrat_Anis", text: "MorTV streaming is very fast and premium." },
    { user: "Suvo_Islam", text: "Somoy TV-র লাইভ রিপোর্টিং সেই চমৎকার লাগছে।" },
    { user: "Tasnim_Rahman", text: "কলকাতা টিভি আমার এখানে ক্লিয়ার চলতেছে ❤️" },
    { user: "JoyBangla99", text: "জয় বাংলা ভাইয়েরা!" },
    { user: "Mashrafe_Fan", text: "T Sports Live has beautiful frame rates today on mobile!" },
    { user: "Zahid_Qatar", text: "আমি কাতার থেকে লাইভ দেখতেছি, চমৎকার স্পিড!" },
    { user: "Rashedul_K", text: "Any lag issues on mobile? For me it runs ultra-smooth and stable." },
    { user: "Rimi_Hossen", text: "Duronto TV is really sweet for our children!" },
    { user: "Sonia_Dhaka", text: "RTV-র নতুন নাটকটা আসলেই সেরা।" },
    { user: "Aminul_88", text: "মক্কা লাইভ স্ট্রিমটা যুক্ত করার জন্য এডমিনকে অনেক ধন্যবাদ।" },
    { user: "Sayed_Sylhet", text: "সরাসরি দেখার জন্য অসাধারণ ইউজার ইন্টারফেস! নেটফ্লিক্সের মতো ফিল।" },
    { user: "Imran_Pro", text: "Start Sports 1 Hindi quality is absolutely amazing!" },
    { user: "Monir_Vlog", text: "দয়া করে সবাই লিংকটি শেয়ার করুন 🙏" }
  ];

  // Initialize random messages
  useEffect(() => {
    const initial: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * banglaComments.length);
      const commenter = banglaComments[idx];
      initial.push({
        id: `init-${i}`,
        user: commenter.user,
        text: commenter.text,
        time: new Date(Date.now() - (6 - i) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avatar: commenter.user.substring(0, 2).toUpperCase()
      });
    }
    setMessages(initial);
  }, []);

  // Update scrolling
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Periodic simulated messages from global live streams
  useEffect(() => {
    const interval = setInterval(() => {
      // Add a message
      const randIdx = Math.floor(Math.random() * banglaComments.length);
      const randomComment = banglaComments[randIdx];

      setMessages((prev) => [
        ...prev.slice(-35), // Keep last 40 comments
        {
          id: `sim-${Date.now()}`,
          user: randomComment.user,
          text: randomComment.text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          avatar: randomComment.user.substring(0, 2).toUpperCase()
        }
      ]);

      // Modulate reader count randomly
      setActiveViewers((v) => Math.max(120, v + Math.floor(Math.random() * 11) - 5));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Save custom handle
    localStorage.setItem("chat_username", username);

    const newUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      user: username,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avatar: username.substring(0, 2).toUpperCase()
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Upper Panel */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121216] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/10 text-red-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-white text-xs font-bold leading-none">লাইভ চ্যাট (Live Chat)</h4>
            <span className="text-gray-400 text-[10px] leading-tight flex items-center gap-1 mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9147ff] animate-ping" />
              {activeViewers} Watching on {channelName}
            </span>
          </div>
        </div>

        {/* Change Username Input handle */}
        <div className="flex items-center">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-24 bg-white/5 hover:bg-white/10 text-right focus:bg-[#1c1c24] text-[11px] text-gray-300 font-mono px-2 py-1 rounded border border-white/5 outline-none focus:border-[#9147ff] transition-all"
            placeholder="Username"
            title="লাইভ চ্যাট ইউজারনেম"
          />
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        <div className="p-3 mb-2 bg-[#121216] border border-white/5 rounded-xl text-center">
          <p className="text-[#9147ff] text-[11px] font-semibold flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> শুভকামনা ও আড্ডা (MorTV Chat Room)
          </p>
          <p className="text-gray-400 text-[10px] mt-0.5">সবাইকে সম্মানজনক এবং পরিচ্ছন্ন কমেন্ট করতে অনুরোধ করা হচ্ছে।</p>
        </div>

        {messages.map((msg, i) => {
          // Stable color assign based on username string
          const colorIndex = Math.abs(msg.user.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;
          const isMe = msg.user === username;

          return (
            <div key={msg.id} className={`flex gap-2.5 items-start ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}>
              {/* Avatar circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${gradients[colorIndex]} shadow-lg uppercase shrink-0`}>
                {msg.avatar}
              </div>

              {/* Message Box */}
              <div className="flex flex-col max-w-[75%]">
                <span className={`text-[10px] font-mono mb-0.5 flex gap-1 items-center ${isMe ? "text-right text-[#9147ff] justify-end" : "text-gray-500"}`}>
                  {msg.user}
                  <span className="text-[9px] text-gray-600 font-normal">{msg.time}</span>
                </span>
                <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  isMe ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-purple-500/10" : "bg-white/5 hover:bg-white/10 text-gray-300 rounded-tl-none transition-colors"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input panel Form */}
      <form onSubmit={handleSend} className="p-3 bg-[#121216]/90 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="এখানে মন্তব্য লিখুন..."
          className="flex-1 bg-[#0a0a0c] text-white text-xs border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-[#9147ff] transition-all font-sans"
          id="chat-send-input"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-brand-accent to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/15"
          id="chat-send-submit-btn"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
