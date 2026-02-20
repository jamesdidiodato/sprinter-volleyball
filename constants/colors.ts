const orange = "#F57C24";
const navy = "#1B2838";
const navyLight = "#243447";
const cream = "#FFF8F0";
const white = "#FFFFFF";
const gray100 = "#F5F5F5";
const gray200 = "#E8E8E8";
const gray400 = "#BDBDBD";
const gray600 = "#757575";
const gray800 = "#333333";
const green = "#4CAF50";
const red = "#EF5350";

export default {
  light: {
    text: gray800,
    textSecondary: gray600,
    background: gray100,
    card: white,
    tint: orange,
    accent: navy,
    tabIconDefault: gray400,
    tabIconSelected: orange,
    border: gray200,
    success: green,
    error: red,
    setter: "#5C6BC0",
    hitter: orange,
    libero: "#26A69A",
    defender: "#AB47BC",
    cream: cream,
  },
  dark: {
    text: cream,
    textSecondary: gray400,
    background: "#0F1923",
    card: navy,
    tint: orange,
    accent: cream,
    tabIconDefault: gray600,
    tabIconSelected: orange,
    border: navyLight,
    success: green,
    error: red,
    setter: "#7986CB",
    hitter: orange,
    libero: "#4DB6AC",
    defender: "#CE93D8",
    cream: cream,
  },
};
