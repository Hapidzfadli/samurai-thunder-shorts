import { Config } from "@remotion/cli/config";

// Three.js needs a real GL backend in headless Chrome. "swangle" = SwiftShader via ANGLE (works without a GPU).
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
