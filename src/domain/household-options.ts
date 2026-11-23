export const MIN_ACTIVE_MEMBERS = 2;
export const MAX_ACTIVE_MEMBERS = 20;

// Persist emoji values, not catalog positions, to keep existing saved avatars valid.
export const avatarOptions = [
  { value: "🌿", name: "Herb", group: "Nature" },
  { value: "☀️", name: "Sun", group: "Nature" },
  { value: "🌙", name: "Moon", group: "Nature" },
  { value: "🌸", name: "Blossom", group: "Nature" },
  { value: "🌻", name: "Sunflower", group: "Nature" },
  { value: "🌵", name: "Cactus", group: "Nature" },
  { value: "🍀", name: "Clover", group: "Nature" },
  { value: "🌈", name: "Rainbow", group: "Nature" },
  { value: "🐱", name: "Cat", group: "Animals" },
  { value: "🐶", name: "Dog", group: "Animals" },
  { value: "🦊", name: "Fox", group: "Animals" },
  { value: "🐼", name: "Panda", group: "Animals" },
  { value: "🐸", name: "Frog", group: "Animals" },
  { value: "🐨", name: "Koala", group: "Animals" },
  { value: "🐙", name: "Octopus", group: "Animals" },
  { value: "🦋", name: "Butterfly", group: "Animals" },
  { value: "🍊", name: "Orange", group: "Food & drink" },
  { value: "🍋", name: "Lemon", group: "Food & drink" },
  { value: "🍒", name: "Cherries", group: "Food & drink" },
  { value: "🍓", name: "Strawberry", group: "Food & drink" },
  { value: "🥑", name: "Avocado", group: "Food & drink" },
  { value: "🍉", name: "Watermelon", group: "Food & drink" },
  { value: "🍄", name: "Mushroom", group: "Food & drink" },
  { value: "☕", name: "Coffee", group: "Food & drink" },
  { value: "🎨", name: "Art", group: "Hobbies" },
  { value: "🎵", name: "Music", group: "Hobbies" },
  { value: "🎸", name: "Guitar", group: "Hobbies" },
  { value: "🎮", name: "Gaming", group: "Hobbies" },
  { value: "📚", name: "Books", group: "Hobbies" },
  { value: "⚽", name: "Soccer", group: "Hobbies" },
  { value: "🏀", name: "Basketball", group: "Hobbies" },
  { value: "🚲", name: "Cycling", group: "Hobbies" },
  { value: "🏡", name: "House", group: "Home & favorites" },
  { value: "🪴", name: "Houseplant", group: "Home & favorites" },
  { value: "💡", name: "Light bulb", group: "Home & favorites" },
  { value: "🛋️", name: "Sofa", group: "Home & favorites" },
  { value: "🧸", name: "Teddy bear", group: "Home & favorites" },
  { value: "🧩", name: "Puzzle", group: "Home & favorites" },
  { value: "🚀", name: "Rocket", group: "Home & favorites" },
  { value: "⭐", name: "Star", group: "Home & favorites" },
] as const;

export const avatarIcons = avatarOptions.map((option) => option.value);
export const avatarGroups = [
  ...new Set(avatarOptions.map((option) => option.group)),
];
