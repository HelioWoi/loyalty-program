import { useEffect, useRef } from 'react'

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create a positive success sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    const createSuccessSound = () => {
      const duration = 0.6
      const sampleRate = audioContext.sampleRate
      const numSamples = duration * sampleRate
      const buffer = audioContext.createBuffer(1, numSamples, sampleRate)
      const data = buffer.getChannelData(0)
      
      // Create a "Reward Chime" - pleasant three-note ascending melody (C-E-G)
      const notes = [
        { freq: 523.25, start: 0, duration: 0.2 },      // C5
        { freq: 659.25, start: 0.15, duration: 0.2 },   // E5
        { freq: 783.99, start: 0.3, duration: 0.3 }     // G5
      ]
      
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate
        let sample = 0
        
        // Generate each note
        for (const note of notes) {
          if (t >= note.start && t < note.start + note.duration) {
            const noteTime = t - note.start
            const noteProgress = noteTime / note.duration
            
            // Smooth envelope (attack + decay)
            const attack = Math.min(noteTime / 0.02, 1)
            const decay = Math.exp(-3 * noteProgress)
            const envelope = attack * decay
            
            // Pure sine wave with subtle harmonic
            const fundamental = Math.sin(2 * Math.PI * note.freq * noteTime)
            const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * noteTime) * 0.15
            
            sample += (fundamental + harmonic) * envelope * 0.3
          }
        }
        
        data[i] = sample
      }
      
      return buffer
    }

    audioRef.current = {
      play: () => {
        const source = audioContext.createBufferSource()
        source.buffer = createSuccessSound()
        source.connect(audioContext.destination)
        source.start(0)
        return Promise.resolve()
      }
    } as any
  }, [])

  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err)
      })
    }
  }

  return { playNotification }
}
