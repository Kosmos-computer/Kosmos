/**
 * Curated emoji set for the composer picker — grouped for the category nav
 * and keyword-tagged for search. Ported from the Longformer design reference;
 * intentionally a small curated list (not the full Unicode set) to keep the
 * bundle lean.
 */

export interface EmojiEntry {
  emoji: string;
  keywords: string[];
}

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: EmojiEntry[];
}

export const emojiCategories: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      { emoji: "😀", keywords: ["grin", "happy", "smile"] },
      { emoji: "😃", keywords: ["smile", "happy", "joy"] },
      { emoji: "😄", keywords: ["smile", "laugh", "happy"] },
      { emoji: "😁", keywords: ["beam", "grin", "happy"] },
      { emoji: "😆", keywords: ["laugh", "lol", "happy"] },
      { emoji: "😅", keywords: ["sweat", "nervous", "laugh"] },
      { emoji: "🤣", keywords: ["rofl", "laugh", "lol"] },
      { emoji: "😂", keywords: ["joy", "tears", "laugh", "lol"] },
      { emoji: "🙂", keywords: ["slight", "smile"] },
      { emoji: "😉", keywords: ["wink", "flirt"] },
      { emoji: "😊", keywords: ["blush", "smile", "happy"] },
      { emoji: "😇", keywords: ["innocent", "angel", "halo"] },
      { emoji: "🥰", keywords: ["love", "hearts", "smile"] },
      { emoji: "😍", keywords: ["heart", "eyes", "love"] },
      { emoji: "🤩", keywords: ["star", "eyes", "excited"] },
      { emoji: "😘", keywords: ["kiss", "love"] },
      { emoji: "😋", keywords: ["yum", "delicious", "tongue"] },
      { emoji: "😛", keywords: ["tongue", "playful"] },
      { emoji: "😜", keywords: ["wink", "tongue", "crazy"] },
      { emoji: "🤪", keywords: ["zany", "crazy", "goofy"] },
      { emoji: "🤗", keywords: ["hug", "warm"] },
      { emoji: "🤭", keywords: ["giggle", "oops"] },
      { emoji: "🤫", keywords: ["shh", "quiet", "secret"] },
      { emoji: "🤔", keywords: ["think", "hmm", "consider"] },
      { emoji: "😐", keywords: ["neutral", "meh"] },
      { emoji: "😑", keywords: ["expressionless", "blank"] },
      { emoji: "😏", keywords: ["smirk", "sly"] },
      { emoji: "😒", keywords: ["unamused", "meh"] },
      { emoji: "🙄", keywords: ["roll", "eyes", "whatever"] },
      { emoji: "😬", keywords: ["grimace", "awkward"] },
      { emoji: "😌", keywords: ["relieved", "calm"] },
      { emoji: "😔", keywords: ["pensive", "sad"] },
      { emoji: "😴", keywords: ["sleep", "zzz", "tired"] },
      { emoji: "🤯", keywords: ["mind", "blown", "wow"] },
      { emoji: "🥳", keywords: ["party", "celebrate"] },
      { emoji: "😎", keywords: ["cool", "sunglasses"] },
      { emoji: "🤓", keywords: ["nerd", "glasses"] },
      { emoji: "🧐", keywords: ["monocle", "inspect"] },
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    emojis: [
      { emoji: "👍", keywords: ["thumbs", "up", "yes", "ok", "good"] },
      { emoji: "👎", keywords: ["thumbs", "down", "no", "bad"] },
      { emoji: "👌", keywords: ["ok", "perfect"] },
      { emoji: "✌️", keywords: ["peace", "victory"] },
      { emoji: "🤞", keywords: ["cross", "fingers", "luck"] },
      { emoji: "🤘", keywords: ["rock", "horns"] },
      { emoji: "🤙", keywords: ["call", "shaka"] },
      { emoji: "👋", keywords: ["wave", "hello", "hi", "bye"] },
      { emoji: "✋", keywords: ["stop", "high", "five"] },
      { emoji: "🖖", keywords: ["vulcan", "spock"] },
      { emoji: "👏", keywords: ["clap", "applause"] },
      { emoji: "🙌", keywords: ["raise", "celebrate", "hooray"] },
      { emoji: "🤝", keywords: ["handshake", "deal"] },
      { emoji: "🙏", keywords: ["pray", "thanks", "please"] },
      { emoji: "💪", keywords: ["muscle", "strong", "flex"] },
      { emoji: "👊", keywords: ["fist", "bump", "punch"] },
      { emoji: "👈", keywords: ["point", "left"] },
      { emoji: "👉", keywords: ["point", "right"] },
      { emoji: "👆", keywords: ["point", "up"] },
      { emoji: "👇", keywords: ["point", "down"] },
      { emoji: "✍️", keywords: ["write", "pen"] },
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      { emoji: "❤️", keywords: ["heart", "love", "red"] },
      { emoji: "🧡", keywords: ["heart", "orange", "love"] },
      { emoji: "💛", keywords: ["heart", "yellow", "love"] },
      { emoji: "💚", keywords: ["heart", "green", "love"] },
      { emoji: "💙", keywords: ["heart", "blue", "love"] },
      { emoji: "💜", keywords: ["heart", "purple", "love"] },
      { emoji: "🖤", keywords: ["heart", "black", "love"] },
      { emoji: "🤍", keywords: ["heart", "white", "love"] },
      { emoji: "💔", keywords: ["broken", "heart", "sad"] },
      { emoji: "💕", keywords: ["hearts", "love"] },
      { emoji: "💖", keywords: ["sparkling", "heart"] },
      { emoji: "💘", keywords: ["cupid", "arrow", "heart"] },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    emojis: [
      { emoji: "🐶", keywords: ["dog", "puppy", "pet"] },
      { emoji: "🐱", keywords: ["cat", "kitten", "pet"] },
      { emoji: "🐰", keywords: ["rabbit", "bunny"] },
      { emoji: "🦊", keywords: ["fox"] },
      { emoji: "🐻", keywords: ["bear"] },
      { emoji: "🐼", keywords: ["panda"] },
      { emoji: "🦁", keywords: ["lion"] },
      { emoji: "🐸", keywords: ["frog"] },
      { emoji: "🦄", keywords: ["unicorn", "magic"] },
      { emoji: "🐝", keywords: ["bee", "honey"] },
      { emoji: "🦋", keywords: ["butterfly"] },
      { emoji: "🌸", keywords: ["flower", "blossom", "spring"] },
      { emoji: "🌹", keywords: ["rose", "flower", "love"] },
      { emoji: "🌱", keywords: ["seedling", "plant", "grow"] },
      { emoji: "🌲", keywords: ["tree", "evergreen"] },
      { emoji: "🍀", keywords: ["clover", "luck", "four", "leaf"] },
      { emoji: "🌍", keywords: ["earth", "globe", "world"] },
      { emoji: "🌙", keywords: ["moon", "night"] },
      { emoji: "⭐", keywords: ["star"] },
      { emoji: "🌈", keywords: ["rainbow"] },
      { emoji: "☀️", keywords: ["sun", "sunny"] },
      { emoji: "❄️", keywords: ["snow", "cold", "winter"] },
      { emoji: "🔥", keywords: ["fire", "hot", "lit"] },
      { emoji: "💧", keywords: ["droplet", "water"] },
    ],
  },
  {
    id: "food",
    label: "Food",
    emojis: [
      { emoji: "🍎", keywords: ["apple", "fruit", "red"] },
      { emoji: "🍋", keywords: ["lemon", "fruit", "citrus"] },
      { emoji: "🍌", keywords: ["banana", "fruit"] },
      { emoji: "🍉", keywords: ["watermelon", "fruit"] },
      { emoji: "🍓", keywords: ["strawberry", "fruit", "berry"] },
      { emoji: "🥑", keywords: ["avocado"] },
      { emoji: "🥕", keywords: ["carrot", "vegetable"] },
      { emoji: "🍞", keywords: ["bread", "toast"] },
      { emoji: "🧀", keywords: ["cheese"] },
      { emoji: "🍕", keywords: ["pizza", "food"] },
      { emoji: "🍔", keywords: ["burger", "hamburger", "food"] },
      { emoji: "🌮", keywords: ["taco", "mexican"] },
      { emoji: "🥗", keywords: ["salad", "healthy"] },
      { emoji: "🍜", keywords: ["noodles", "ramen", "bowl"] },
      { emoji: "🍣", keywords: ["sushi", "japanese"] },
      { emoji: "🍩", keywords: ["donut", "doughnut", "dessert"] },
      { emoji: "🍪", keywords: ["cookie", "dessert"] },
      { emoji: "🎂", keywords: ["cake", "birthday", "dessert"] },
      { emoji: "🍫", keywords: ["chocolate", "candy"] },
      { emoji: "☕", keywords: ["coffee", "cafe", "drink"] },
      { emoji: "🍵", keywords: ["tea", "drink"] },
      { emoji: "🍺", keywords: ["beer", "drink", "cheers"] },
      { emoji: "🥂", keywords: ["cheers", "champagne", "toast"] },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    emojis: [
      { emoji: "⌚", keywords: ["watch", "time"] },
      { emoji: "📱", keywords: ["phone", "mobile"] },
      { emoji: "💻", keywords: ["laptop", "computer"] },
      { emoji: "⌨️", keywords: ["keyboard", "type"] },
      { emoji: "🖥️", keywords: ["desktop", "monitor"] },
      { emoji: "📷", keywords: ["camera", "photo"] },
      { emoji: "🎧", keywords: ["headphones", "music"] },
      { emoji: "🎤", keywords: ["microphone", "sing"] },
      { emoji: "🎵", keywords: ["music", "note"] },
      { emoji: "🔔", keywords: ["bell", "notification"] },
      { emoji: "💡", keywords: ["light", "bulb", "idea"] },
      { emoji: "📚", keywords: ["books", "read", "study"] },
      { emoji: "📝", keywords: ["memo", "note", "write"] },
      { emoji: "📎", keywords: ["paperclip", "attach"] },
      { emoji: "📌", keywords: ["pin", "pushpin"] },
      { emoji: "📁", keywords: ["folder", "file"] },
      { emoji: "🔒", keywords: ["lock", "secure"] },
      { emoji: "🔑", keywords: ["key", "password"] },
      { emoji: "🛠️", keywords: ["tools", "fix", "build"] },
      { emoji: "⚙️", keywords: ["gear", "settings"] },
      { emoji: "🔧", keywords: ["wrench", "fix"] },
      { emoji: "⚡", keywords: ["lightning", "zap", "fast"] },
      { emoji: "🧪", keywords: ["test", "tube", "science"] },
      { emoji: "🎁", keywords: ["gift", "present"] },
      { emoji: "🎉", keywords: ["party", "tada", "celebrate"] },
      { emoji: "🏆", keywords: ["trophy", "win", "award"] },
      { emoji: "🎮", keywords: ["game", "controller", "play"] },
      { emoji: "🎲", keywords: ["dice", "game", "random"] },
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: [
      { emoji: "✅", keywords: ["check", "done", "yes", "complete"] },
      { emoji: "❌", keywords: ["x", "no", "wrong", "cross"] },
      { emoji: "❓", keywords: ["question", "help"] },
      { emoji: "❗", keywords: ["exclamation", "important"] },
      { emoji: "💯", keywords: ["hundred", "perfect", "score"] },
      { emoji: "🔴", keywords: ["red", "circle", "dot"] },
      { emoji: "🟢", keywords: ["green", "circle"] },
      { emoji: "🔵", keywords: ["blue", "circle"] },
      { emoji: "💬", keywords: ["speech", "bubble", "chat", "comment"] },
      { emoji: "💭", keywords: ["thought", "bubble", "think"] },
      { emoji: "🔁", keywords: ["repeat", "loop"] },
      { emoji: "▶️", keywords: ["play", "start"] },
      { emoji: "⏸️", keywords: ["pause", "stop"] },
      { emoji: "➕", keywords: ["plus", "add"] },
      { emoji: "➖", keywords: ["minus", "subtract"] },
      { emoji: "♾️", keywords: ["infinity", "forever"] },
    ],
  },
];

/** Keyword-filter the categories; empty query returns everything. */
export function filterEmojiCategories(query: string): EmojiCategory[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return emojiCategories;

  return emojiCategories
    .map((category) => ({
      ...category,
      emojis: category.emojis.filter(
        (entry) =>
          entry.keywords.some((keyword) => keyword.includes(normalized)) ||
          category.label.toLowerCase().includes(normalized),
      ),
    }))
    .filter((category) => category.emojis.length > 0);
}
