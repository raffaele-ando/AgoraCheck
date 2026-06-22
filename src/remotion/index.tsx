import {Composition, registerRoot} from "remotion";
import { BrowserRouter } from "react-router-dom";
import Video from "../pages/Video";

export const RemotionRoot = () => (
  <Composition 
    id="Video" 
    component={() => <BrowserRouter><Video /></BrowserRouter>} 
    durationInFrames={800} 
    fps={30} 
    width={1080} 
    height={1920} 
  />
);
registerRoot(RemotionRoot);
