// Only applies to the CLI (studio / render); the Node APIs in scripts/ take options directly.
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
