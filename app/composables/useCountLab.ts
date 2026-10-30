// Debug: how the PvP countdown ends, switched live from the dock and watched in a room with Replay, until one way is chosen
export type CountLab = {
  /** how the 1 turns into VS */
  swap: 'flip' | 'morph' | 'roll' | 'pop' | 'slam'
  smoke: 'none' | 'soft' | 'wide'
  /** when the smoke starts: with the VS, as it starts to sink, or as it has landed */
  when: 'vs' | 'sink' | 'landing'
  /** three seats, two badges: the VS parts onto both lines, or sinks in the middle while they come up */
  three: 'split' | 'fade'
}

export const useCountLab = () => useState<CountLab>('kd-count-lab', () => ({ swap: 'flip', smoke: 'wide', when: 'landing', three: 'split' }))
