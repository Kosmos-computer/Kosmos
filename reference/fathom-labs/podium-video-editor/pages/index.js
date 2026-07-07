import { Player } from "@remotion/player";
import { PodcastVideo } from "./../remotion/PodcastVideo";
import { useEffect, useState, useRef } from "react";

export default function Home() {
  const playerRef = useRef(null);

  // **********************************************************
  // Send postMessage events to the window
  // **********************************************************
  const onTimeUpdate = (e) => {
    window.parent.postMessage({ 
      channel: 'podium-video-editor',
      type: 'onFrameUpdate',
      params: {
        frame: e.detail.frame
      }
    }, '*')
  }

  const onPlay = (e) => {
    window.parent.postMessage({ 
      channel: 'podium-video-editor',
      type: 'onPlay',
    }, '*')
  }

  const onPause = (e) => {
    window.parent.postMessage({ 
      channel: 'podium-video-editor',
      type: 'onPause',
    }, '*')
  }

  // **********************************************************
  // Listen for postMessage events from the window
  // **********************************************************
  const [params, setParams] = useState(null)
  useEffect(() => {
    window.addEventListener(
      "message",
      (event) => {
        if (event.data.channel !== "podium-video-editor") return;
        switch (event.data.type) {
          case "update":
            setParams(event.data.params)
            break
          case "play":
            playerRef.current.play()
            playerRef.current.removeEventListener("timeupdate", onTimeUpdate)
            playerRef.current.addEventListener("timeupdate", onTimeUpdate)
            playerRef.current.removeEventListener("play", onPlay)
            playerRef.current.addEventListener("play", onPlay)
            playerRef.current.removeEventListener("pause", onPause)
            playerRef.current.addEventListener("pause", onPause)
            break
          case "pause":
            playerRef.current.pause()
            break
          case "seek":
            const newFrame = event.data.params.frame
            playerRef.current.seekTo(newFrame)
            break
        }
      },
      false
    )
  }, [])

  // **********************************************************
  // Delay rendering until parameters are present (received at 
  // the first update event)
  // **********************************************************
  if (params) {
    return (
      <Player
        ref={playerRef}
        component={PodcastVideo}
        durationInFrames={params.numberofFrames}
        compositionWidth={params.width}
        compositionHeight={params.height}
        controls={params.showControls}
        fps={params.fps}
        inputProps={params.inputProps}
      />
    );
  }
  else {
    return <div />
  }
}
