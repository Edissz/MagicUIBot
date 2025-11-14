export const colors = {
  primary: 0xB8FFF9,   // mint blue
  secondary: 0xDCC8FF, // soft purple
  accent: 0xFFFAC8,    // pale yellow
  success: 0xA7FFCF,   // mint green
  danger: 0xFFB8B8,    // soft red
  warning: 0xFFD166,   // amber
  neutral: 0xF8F8FF,   // off white
  info: 0x89CFF0,      // info blue
  ok: 0xA8FFB4         // green-ok
};

export const getColor = (name = "primary") => colors[name] ?? colors.primary;
