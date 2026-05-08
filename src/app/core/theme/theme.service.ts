import { Injectable, effect, signal } from '@angular/core'
import { COLOR_PALETTES, ColorPalette, applyThemePalette } from './theme-colors'

const STORAGE_KEY = 'dcs-theme'

interface ThemeState {
  mode: 'light' | 'dark'
  primary: string
  secondary: string
  accent: string
}

function readState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    mode: 'light',
    primary: 'blue',
    secondary: 'purple',
    accent: 'amber',
  }
}

function findPalette(name: string): ColorPalette {
  return COLOR_PALETTES.find(p => p.name === name) ?? COLOR_PALETTES[0]
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<'light' | 'dark'>('light')
  readonly primaryName = signal<string>('blue')
  readonly secondaryName = signal<string>('purple')
  readonly accentName = signal<string>('amber')
  readonly palettes = COLOR_PALETTES

  readonly primaryPalette = signal<ColorPalette>(COLOR_PALETTES[0])
  readonly secondaryPalette = signal<ColorPalette>(COLOR_PALETTES[3])
  readonly accentPalette = signal<ColorPalette>(COLOR_PALETTES[8])

  constructor() {
    const saved = readState()
    this.mode.set(saved.mode)
    this.primaryName.set(saved.primary)
    this.secondaryName.set(saved.secondary)
    this.accentName.set(saved.accent)

    this.primaryPalette.set(findPalette(saved.primary))
    this.secondaryPalette.set(findPalette(saved.secondary))
    this.accentPalette.set(findPalette(saved.accent))

    effect(() => {
      const m = this.mode()
      const p = this.primaryPalette()
      const s = this.secondaryPalette()
      const a = this.accentPalette()
      applyThemePalette(p, s, a, m)
      this.#persist()
    })
  }

  setMode(mode: 'light' | 'dark') {
    this.mode.set(mode)
  }

  toggleMode() {
    this.mode.update(m => m === 'light' ? 'dark' : 'light')
  }

  setPrimary(name: string) {
    this.primaryName.set(name)
    this.primaryPalette.set(findPalette(name))
  }

  setSecondary(name: string) {
    this.secondaryName.set(name)
    this.secondaryPalette.set(findPalette(name))
  }

  setAccent(name: string) {
    this.accentName.set(name)
    this.accentPalette.set(findPalette(name))
  }

  #persist() {
    const state: ThemeState = {
      mode: this.mode(),
      primary: this.primaryName(),
      secondary: this.secondaryName(),
      accent: this.accentName(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}
