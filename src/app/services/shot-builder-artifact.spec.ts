import { describe, expect, it } from 'vitest';
import { parseArtifactData, parseEpisodeArtifact } from './shot-builder-artifact';

const episodeResponse = {
  episode: {
    title: 'EP24 · The Haunting Past',
    totalDuration: 24,
    mode: 'M1',
    aspectRatio: '9:16',
    directorNotes: {
      goal: 'Dixie cruza el lote con calma tensa.',
      styleGuide: 'Cara a cara: Dixie mira a cámara solo al cerrar.',
    },
  },
  scenes: [
    {
      scriptNumber: 56,
      scriptLocation: "INT. WYATT'S KITCHEN — DAY",
      title: 'La cocina',
      sceneType: 'present',
      mode: 'M1',
      continuity: { location: 'cocina', timeContinuity: 'continuo', keepWardrobe: true, keepLighting: true },
      shots: [
        {
          id: 'A',
          title: 'Wyatt paces frantically',
          description: 'Wyatt walks back and forth gesticulating while Dixie watches in silence',
          duration: 10,
          start: 0,
          end: 10,
          cuts: 0,
          prompt: {
            en: '[Image1] [Image4]\n\nScene & Mood: ...\n\nMovement: none - single unbroken take',
            zh: '中文翻译 del primer plano',
          },
          notes: { watchFor: ['First frame must already carry the distaste', 'Deer head NOT behind him'] },
        },
      ],
    },
    {
      scriptNumber: 57,
      scriptLocation: 'EXT. PARKING LOT — DAY',
      title: 'El lote',
      sceneType: 'present',
      mode: 'M1',
      continuity: { location: 'estacionamiento' },
      shots: [
        {
          id: 'B',
          title: 'Dixie cruza el lote',
          description: 'Dixie cruza el estacionamiento vacío con el teléfono en la oreja',
          duration: 8,
          start: 10,
          end: 18,
          cuts: 2,
          prompt: {
            en: 'Scene & Mood: ...\n\nMovement: Cut A (0-3s): 0s walk, 1s step; hard cut to Cut B (3-6s): 0s ...; hard cut to Cut C (6-8s): 0s ...',
          },
          notes: { watchFor: ['Reloj 10:58 reforzado en render'] },
        },
      ],
    },
    {
      scriptNumber: 58,
      scriptLocation: 'INT. BANK LOBBY — DAY',
      title: 'El lobby',
      sceneType: 'present',
      mode: 'M1',
      continuity: { location: 'lobby banco' },
      shots: [
        {
          id: 'C',
          title: 'Dixie casa la sala',
          description: 'Dixie entra al lobby y barre la sala',
          duration: 6,
          start: 18,
          end: 24,
          cuts: 0,
          prompt: {
            en: 'Scene & Mood: ...\n\nMovement: none - single unbroken take',
          },
          notes: { watchFor: ['Única línea con lip-sync'] },
        },
      ],
    },
  ],
};

describe('parseEpisodeArtifact', () => {
  it('returns null for empty input', () => {
    expect(parseEpisodeArtifact('')).toBeNull();
    expect(parseEpisodeArtifact('   ')).toBeNull();
  });

  it('returns null for the legacy flat format', () => {
    const legacy = JSON.stringify({ totalDuration: 10, shots: [{ id: 'A', prompt: 'legacy' }] });
    expect(parseEpisodeArtifact(legacy)).toBeNull();
  });

  it('parses JSON wrapped in markdown fences', () => {
    const fenced = '```json\n' + JSON.stringify(episodeResponse) + '\n```';
    const data = parseEpisodeArtifact(fenced);
    expect(data).not.toBeNull();
    expect(data?.title).toBe('EP24 · The Haunting Past');
  });

  it('maps episode metadata into ArtifactData', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse));
    expect(data).not.toBeNull();
    expect(data!.title).toBe('EP24 · The Haunting Past');
    expect(data!.totalDuration).toBe(24);
    expect(data!.durationCap).toBe(80);
    expect(data!.scene).toContain("WYATT'S KITCHEN");
    expect(data!.faceToFaceRule).toContain('Cara a cara');
  });

  it('maps every scene shot into ArtifactShot with prompt en/zh and guide', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    expect(data.shots).toHaveLength(3);

    const first = data.shots[0];
    expect(first.id).toBe('A');
    expect(first.title).toBe('Wyatt paces frantically');
    expect(first.duration).toBe(10);
    expect(first.cuts).toBe(0);
    expect(first.prompt).toContain('[Image1]');
    expect(first.promptZh).toBe('中文翻译 del primer plano');
    expect(first.guide.scene).toContain('INT. WYATT');
    expect(first.guide.important).toContain('First frame must already carry the distaste');
  });

  it('uses watchFor as the guide.important fallback chain', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    const last = data.shots[2];
    expect(last.guide.important).toContain('lip-sync');
  });

  it('builds a single "Continuo" cut entry when cuts === 0', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    expect(data.shots[0].guide.cuts).toEqual([['Continuo', 'toma única sin cortes']]);
  });

  it('parses per-cut segments from the Movement block', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    expect(data.shots[1].guide.cuts).toEqual([
      ['Corte 1', 'A (0-3s)'],
      ['Corte 2', 'B (3-6s)'],
      ['Corte 3', 'C (6-8s)'],
    ]);
  });

  it('splits duration proportionally when the prompt has no cut timings', () => {
    const response = JSON.parse(JSON.stringify(episodeResponse)) as typeof episodeResponse;
    response.scenes[1].shots[0].prompt = {
      en: 'Scene & Mood: ...\n\nMovement: hard cut between angles',
    };
    const data = parseEpisodeArtifact(JSON.stringify(response))!;
    expect(data.shots[1].guide.cuts).toEqual([
      ['Corte 1', 'A (0-3s)'],
      ['Corte 2', 'B (3-5s)'],
      ['Corte 3', 'C (5-8s)'],
    ]);
  });

  it('assigns HOOK/SPIKE/BUTTON beats and flags the spike shot', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    expect(data.shots[0].beat).toBe('HOOK');
    expect(data.shots[1].beat).toBe('SPIKE');
    expect(data.shots[1].spike).toBe(true);
    expect(data.shots[2].beat).toBe('BUTTON');
    expect(data.shots[0].spike).toBe(false);
  });

  it('derives conventions from mode, aspect ratio and continuity locks', () => {
    const data = parseEpisodeArtifact(JSON.stringify(episodeResponse))!;
    const labels = data.conventions.map((c) => c.label);
    expect(labels).toContain('Modo');
    expect(labels).toContain('Aspecto');
    expect(labels).toContain('Continuidad');
    const continuity = data.conventions.find((c) => c.label === 'Continuidad');
    expect(continuity?.value).toContain('Lock wardrobe');
    expect(continuity?.value).toContain('Lock iluminación');
  });

  it('falls back to the sequence title when episode.title is missing', () => {
    const response: typeof episodeResponse = {
      ...episodeResponse,
      episode: { ...episodeResponse.episode },
    };
    delete (response.episode as { title?: string }).title;
    const data = parseEpisodeArtifact(JSON.stringify(response))!;
    expect(data.title).toBe('Shot Builder');
  });
});

describe('parseArtifactData legacy path', () => {
  it('still parses the old flat format', () => {
    const legacy = {
      title: 'Old',
      scene: 'S1',
      totalDuration: 10,
      durationCap: 80,
      shots: [{ id: 'A', beat: 'HOOK', duration: 10, cuts: 0, title: 'T', spike: false, prompt: 'p', promptZh: '', guide: { scene: 'S', type: 'Plano', cuts: [], important: '' } }],
      conventions: [],
    };
    expect(parseArtifactData(JSON.stringify(legacy))).not.toBeNull();
  });

  it('returns null for the episode format', () => {
    expect(parseArtifactData(JSON.stringify(episodeResponse))).toBeNull();
  });
});