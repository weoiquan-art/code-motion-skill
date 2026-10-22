import { Composition } from "remotion";
import { Film } from "./film/Film";
import { DURATION, FPS, HEIGHT, WIDTH } from "./film/timeline.ts";
import { Gallery, GALLERY_DURATION } from "./gallery/Gallery";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    {/* Catalogue of the library: one 60-frame page per group. Delete it once the film no longer needs it. */}
    <Composition id="Gallery" component={Gallery} durationInFrames={GALLERY_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
