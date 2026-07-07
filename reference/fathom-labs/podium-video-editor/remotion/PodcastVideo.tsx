import { AbsoluteFill, Img, Audio, useCurrentFrame } from 'remotion'
import React from 'react'
import { useEffect, useState, useRef } from "react"
import * as Inter from "@remotion/google-fonts/Inter"
import * as Oswald from "@remotion/google-fonts/Oswald"
import * as Lora from "@remotion/google-fonts/Lora"
import * as CourierPrime from "@remotion/google-fonts/CourierPrime"
import * as Poppins from "@remotion/google-fonts/Poppins"
import * as ComicNeue from "@remotion/google-fonts/ComicNeue"

export const PodcastVideo: React.FC<{
  imageUrl: string
  backgroundColor: string
  imageOpacityPercent: string
  showTitle: string
  episodeTitle: string
  episodeTitleTopOffsetPixels: number
  clipTitle: string
  clipTitleTopOffsetPixels: number
  transcriptStarts: [][]
  transcriptWords: [][]
  transcriptTopOffsetPixels: number
  start: number
  end: number
  fps: number
  audioUrl: string
  layout: string
  font: string
  fontColor: string
  imageBackgroundColor : string
}> = ({ imageUrl, backgroundColor, imageOpacityPercent, showTitle, episodeTitle, episodeTitleTopOffsetPixels, clipTitle, clipTitleTopOffsetPixels, transcriptStarts, transcriptWords, transcriptTopOffsetPixels, start, end, fps, audioUrl, layout, font ,fontColor, imageBackgroundColor}) => {

  start = parseFloat(start)
  end = parseFloat(end)
  fps = parseInt(fps)

  // #########################################################################
  // This runs once when the component is first rendered (via useEffect)
  // #########################################################################

  // Divide the transcript into chunks using the transcript box element
  // to measure how many lines each chunk should have
  const [chunkedTranscriptWords, setChunkedTranscriptWords] = useState([[]]);
  const [chunkedTranscriptStarts, setChunkedTranscriptStarts] = useState([[]]);
  const [fontFamily, setFontFamily] = useState('Inter');
  const transcriptBox = useRef(null)
  useEffect(() => {
    const timingOffset = 0.2
    let tempChunkedTranscriptWords = [[]]
    let tempChunkedTranscriptStarts = [[]]

    for (let i = 0; i < transcriptStarts.length; i++) {
      const currentWord = transcriptWords[i]
      const currentStart = transcriptStarts[i]

      function startNewChunk() {
        tempChunkedTranscriptStarts.push([])
        tempChunkedTranscriptWords.push([])
        transcriptBox.current.innerHTML = ''
      }
  
      function addCurrentWordToChunk() {
        tempChunkedTranscriptStarts[tempChunkedTranscriptStarts.length - 1].push(currentStart)
        tempChunkedTranscriptWords[tempChunkedTranscriptWords.length - 1].push(currentWord)
      }

      // Skip until we reach the start time
      if (currentStart < start - timingOffset) {
        continue
      }

      // Stop when we reach the end time
      if (currentStart > end) {
        break
      }

      // Add the word to the transcript box
      const span = document.createElement('span')
      span.classList.add('word')
      span.textContent = currentWord
      transcriptBox.current.appendChild(span)

      const tooLong = span.getBoundingClientRect().bottom > transcriptBox.current.getBoundingClientRect().bottom
      const hasPunctuation = currentWord.includes('.') || currentWord.includes('?') || currentWord.includes('!')
     
      if (tooLong) {
        // If the current chunk is too long with the current word, start a new chunk and re-evaluate the current word
        startNewChunk()
        i--
      }
      else if (hasPunctuation) {
        // If the current chunk is not too long and there is punctuation, add the current work in the chunk and start a new chunk
        addCurrentWordToChunk()
        startNewChunk()
      }
      else {
        // Otherwise just add the current word to the current chunk
        addCurrentWordToChunk()
      }
    }

    setChunkedTranscriptWords(tempChunkedTranscriptWords)
    setChunkedTranscriptStarts(tempChunkedTranscriptStarts)
    transcriptBox.current.innerHTML = ''

    // Load font dynamically
    switch (font) {
      case "Oswald":
        setFontFamily(Oswald.loadFont().fontFamily)
        break
      case "Lora":
        setFontFamily(Lora.loadFont().fontFamily)
        break
      case "CourierPrime":
        setFontFamily(CourierPrime.loadFont().fontFamily)
        break
      case "Poppins":
        setFontFamily(Poppins.loadFont().fontFamily)
        break
      case "ComicNeue":
        setFontFamily(ComicNeue.loadFont().fontFamily)
        break
      case "Inter":
      default:
        setFontFamily(Inter.loadFont().fontFamily)
        break
    }
  }, []);

  // #########################################################################
  // This runs to render every frame of the video
  // #########################################################################

  const frame = useCurrentFrame()
  const currentTime = start + (frame / fps)

  function findChunkIndexFor(time) {
    let left = 0
    let right = chunkedTranscriptStarts.length - 1
    let index = -1

    // Use binary search to find the chunk that contains the current time
    while (left <= right) {
      let mid = Math.floor((left + right) / 2)
      
      const chunkStart = chunkedTranscriptStarts[mid][0]
      let chunkEnd = null
      if (chunkedTranscriptStarts[mid + 1]) {
        // If there is a next chunk, use its start time so there is no flickering between chunks
        chunkEnd = chunkedTranscriptStarts[mid + 1][0] 
      } else {
        // Otherwise use the last start of the current chunk
        chunkEnd = chunkedTranscriptStarts[mid][chunkedTranscriptStarts[mid].length - 1]
      }
      
      if (chunkStart <= time && chunkEnd >= time) {
        index = mid
        break
      } else if (chunkStart > time) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    return index
  }

  // Find the correct transcript chunk to display
  const currentChunkIndex = findChunkIndexFor(currentTime)
  const currentChunkStarts = chunkedTranscriptStarts[currentChunkIndex]
  const currentChunkWords = chunkedTranscriptWords[currentChunkIndex]

  // Calculate the opacity of each word in the current chunk
  function calculateChunkWordOpacities(currentTime, currentChunkStarts) {
    if (!currentChunkStarts) return []

    const animationTime = 0.15
    return currentChunkStarts.map((start) => {
      if (start <= currentTime - animationTime) {
        return 1
      } else if (start <= currentTime) {
        return 0.5 + ((currentTime - start) / animationTime) * 0.5
      } else {
        return 0.5
      }
    })
  }

  const currentChunkOpacities = calculateChunkWordOpacities(currentTime, currentChunkStarts)

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor }}>
      <Audio src={audioUrl} startFrom={start * fps} endAt={end * fps} />

      <div id="player" className={layout} style={{ fontFamily }}>
        <div id="video-square">
          <div id="visuals-container">
            <div id="visuals">
              <div id="show-title" style={{ color: fontColor }}><span>{showTitle}</span></div>
              <div id="episode-title" style={{top: episodeTitleTopOffsetPixels + "px" ,color: fontColor}}><span>{episodeTitle}</span></div>
              {imageUrl 
                ? <Img className="feature" src={imageUrl} style={{ opacity: imageOpacityPercent + "%",backgroundColor: imageBackgroundColor,zIndex:1, }} />
                : null
              }
              <div id="clip-title" style={{top: clipTitleTopOffsetPixels + "px" ,color: fontColor}}><span>{clipTitle}</span></div>
              <div id="transcript-box" className="transcript-box" ref={transcriptBox} style={{top: transcriptTopOffsetPixels + "px"}}>
                {currentChunkWords?.map((word, index) => (
                  <span key={index} className="word" style={{opacity: currentChunkOpacities[index],color: fontColor }}>{word}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
