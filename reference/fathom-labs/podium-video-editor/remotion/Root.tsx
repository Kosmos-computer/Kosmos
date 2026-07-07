import { getInputProps } from 'remotion'
import React from "react";
import { Composition } from "remotion";
import { PodcastVideo } from "./PodcastVideo";
import './../styles/globals.css';
import './../styles/square-gradient.png';

const { height, width, start, end, fps } = getInputProps();

export const RemotionRoot: React.FC = () => {
  const numberofFrames = Math.round((end - start) * fps)

  return (
    <>
      <Composition
        id="PodcastVideo"
        durationInFrames={numberofFrames}
        fps={fps}
        width={height}
        height={width}
        component={PodcastVideo}
      />
    </>
  );
};