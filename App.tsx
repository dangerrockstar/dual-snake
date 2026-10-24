import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  changeDirection,
  createGame,
  Direction,
  GameSpeed,
  GAME_COLUMNS,
  GAME_ROWS,
  getTickInterval,
  reverseEnds,
  tickGame,
} from './src/game';

const COLORS = {
  background: '#101810',
  panel: '#172218',
  screen: '#b8c98a',
  grid: 'rgba(48, 69, 41, 0.13)',
  ink: '#172313',
  snake: '#344f2d',
  head: '#172b19',
  apple: '#7e3327',
  muted: '#87947e',
  accent: '#d6e7a3',
  button: '#283529',
};

const DIRECTIONS: { direction: Direction; label: string; symbol: string }[] = [
  { direction: 'up', label: 'Up', symbol: '▲' },
  { direction: 'left', label: 'Left', symbol: '◀' },
  { direction: 'down', label: 'Down', symbol: '▼' },
  { direction: 'right', label: 'Right', symbol: '▶' },
];

const BEST_SCORE_KEY = '@dual-snake/best-score';
const SOUND_ENABLED_KEY = '@dual-snake/sound-enabled';
const GAME_SPEED_KEY = '@dual-snake/game-speed';
const PRIVACY_POLICY_URL = 'https://dangerrockstar.github.io/dual-snake/privacy-policy.html';
const SPEED_OPTIONS: { speed: GameSpeed; label: string }[] = [
  { speed: 'slow', label: 'SLOW' },
  { speed: 'normal', label: 'NORMAL' },
  { speed: 'fast', label: 'FAST' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const [game, setGame] = useState(createGame);
  const [bestScore, setBestScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>('normal');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const boardWidth = Math.min(width - 40, 390);
  const cellWidth = boardWidth / GAME_COLUMNS;
  const boardHeight = cellWidth * GAME_ROWS;
  const score = game.score;
  const directionSymbols = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const startSound = useAudioPlayer(require('./assets/audio/start.wav'));
  const eatSound = useAudioPlayer(require('./assets/audio/eat.wav'));
  const reverseSound = useAudioPlayer(require('./assets/audio/reverse.wav'));
  const gameOverSound = useAudioPlayer(require('./assets/audio/game-over.wav'));
  const storageErrorShown = useRef(false);
  const audioErrorShown = useRef(false);
  const previousSoundState = useRef({ status: game.status, score, activeEnd: game.activeEnd });

  const reportStorageError = useCallback(() => {
    if (storageErrorShown.current) return;
    storageErrorShown.current = true;
    Alert.alert(
      'Could not save preferences',
      'Device storage is unavailable. Your best score or sound setting may not be saved.',
    );
  }, []);

  const reportAudioError = useCallback(() => {
    if (audioErrorShown.current) return;
    audioErrorShown.current = true;
    Alert.alert('Sound unavailable', 'The game will continue without sound.');
  }, []);

  const playSound = useCallback(
    async (player: AudioPlayer) => {
      if (!soundEnabled) return;
      try {
        await player.seekTo(0);
        player.play();
      } catch {
        reportAudioError();
      }
    },
    [reportAudioError, soundEnabled],
  );

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([BEST_SCORE_KEY, SOUND_ENABLED_KEY, GAME_SPEED_KEY])
      .then((entries) => {
        if (!active) return;
        const savedBest = entries.find(([key]) => key === BEST_SCORE_KEY)?.[1];
        const parsedBest = savedBest === null || savedBest === undefined ? 0 : Number(savedBest);
        if (Number.isFinite(parsedBest) && parsedBest >= 0) {
          setBestScore((best) => Math.max(best, parsedBest));
        }
        const savedSound = entries.find(([key]) => key === SOUND_ENABLED_KEY)?.[1];
        if (savedSound !== null && savedSound !== undefined) {
          setSoundEnabled(savedSound === 'true');
        }
        const savedSpeed = entries.find(([key]) => key === GAME_SPEED_KEY)?.[1];
        if (savedSpeed === 'slow' || savedSpeed === 'normal' || savedSpeed === 'fast') {
          setGameSpeed(savedSpeed);
        }
        setPreferencesLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setPreferencesLoaded(true);
        reportStorageError();
      });

    return () => {
      active = false;
    };
  }, [reportStorageError]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    AsyncStorage.setItem(BEST_SCORE_KEY, String(bestScore)).catch(reportStorageError);
  }, [bestScore, preferencesLoaded, reportStorageError]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    AsyncStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled)).catch(reportStorageError);
  }, [preferencesLoaded, reportStorageError, soundEnabled]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    AsyncStorage.setItem(GAME_SPEED_KEY, gameSpeed).catch(reportStorageError);
  }, [gameSpeed, preferencesLoaded, reportStorageError]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
    }).catch(reportAudioError);
  }, [reportAudioError]);

  useEffect(() => {
    const previous = previousSoundState.current;
    if (game.status === 'playing' && previous.status !== 'playing') {
      void playSound(startSound);
    } else if (previous.status === 'playing' && game.status === 'over') {
      void playSound(gameOverSound);
    } else if (game.status === 'playing') {
      if (score > previous.score) void playSound(eatSound);
      if (game.activeEnd !== previous.activeEnd) void playSound(reverseSound);
    }
    previousSoundState.current = { status: game.status, score, activeEnd: game.activeEnd };
  }, [
    eatSound,
    game.activeEnd,
    game.status,
    gameOverSound,
    playSound,
    reverseSound,
    score,
    startSound,
  ]);

  useEffect(() => {
    setBestScore((best) => Math.max(best, score));
  }, [score]);

  useEffect(() => {
    if (game.status !== 'playing') return undefined;

    const timer = setInterval(() => {
      setGame((current) => tickGame(current, getTickInterval(gameSpeed, current.score)));
    }, getTickInterval(gameSpeed, score));

    return () => clearInterval(timer);
  }, [game.status, gameSpeed, score]);

  function startGame() {
    setGame((current) => ({ ...current, status: 'playing' }));
  }

  function restartGame() {
    setGame({ ...createGame(), status: 'playing' });
  }

  function handleDirection(direction: Direction) {
    setGame((current) => changeDirection(current, direction));
  }

  function openPrivacyPolicy() {
    void Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
      Alert.alert('Could not open privacy policy', 'Please try again when you have an internet connection.');
    });
  }

  const overlayTitle = game.status === 'over' ? 'GAME OVER' : game.status === 'won' ? 'YOU WIN!' : 'READY?';
  const overlayMessage =
    game.status === 'over'
      ? 'Your snake ran into itself or the edge.'
      : game.status === 'won'
        ? 'You filled the whole screen. Legendary.'
        : 'Guide either end. Collect apples. Keep growing.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>A CLASSIC WITH A TWIST</Text>
            <Text style={styles.title}>DUAL SNAKE</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, game.status === 'playing' && styles.liveDotOn]} />
            <Text style={styles.liveText}>{game.status === 'playing' ? 'PLAYING' : 'ARCADE'}</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{String(score).padStart(3, '0')}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>BEST</Text>
            <Text style={styles.scoreValue}>{String(bestScore).padStart(3, '0')}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>LEVEL</Text>
            <Text style={styles.scoreValue}>{String(1 + Math.floor(score / 50)).padStart(2, '0')}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>BONUS</Text>
            <Text style={styles.scoreValue}>
              {game.bonusFood ? `${Math.ceil(game.bonusFood.timeLeftMs / 1000)}s` : '--'}
            </Text>
          </View>
        </View>

        <View
          accessibilityLabel="Snake game board"
          style={[styles.board, { width: boardWidth, height: boardHeight }]}
        >
          {Array.from({ length: GAME_ROWS + 1 }, (_, row) => (
            <View
              key={`row-${row}`}
              pointerEvents="none"
              style={[styles.gridLineHorizontal, { top: row * cellWidth }]}
            />
          ))}
          {Array.from({ length: GAME_COLUMNS + 1 }, (_, column) => (
            <View
              key={`column-${column}`}
              pointerEvents="none"
              style={[styles.gridLineVertical, { left: column * cellWidth }]}
            />
          ))}
          <View
            style={[
              styles.food,
              {
                left: game.food.x * cellWidth + cellWidth * 0.2,
                top: game.food.y * cellWidth + cellWidth * 0.2,
                width: cellWidth * 0.6,
                height: cellWidth * 0.6,
              },
            ]}
          />
          {game.bonusFood && (
            <View
              accessibilityLabel={`Bonus food, ${Math.ceil(game.bonusFood.timeLeftMs / 1000)} seconds remaining`}
              style={[
                styles.bonusFood,
                {
                  left: game.bonusFood.position.x * cellWidth + cellWidth * 0.04,
                  top: game.bonusFood.position.y * cellWidth + cellWidth * 0.04,
                  width: cellWidth * 0.92,
                  height: cellWidth * 0.92,
                  borderRadius: cellWidth * 0.46,
                },
              ]}
            >
              <Text style={[styles.bonusFoodSymbol, { fontSize: cellWidth * 0.75 }]}>★</Text>
            </View>
          )}
          {game.snake.map((segment, index) => {
            const isActiveHead =
              game.activeEnd === 'start'
                ? index === 0
                : index === game.snake.length - 1;
            const isHead = index === 0 || index === game.snake.length - 1;
            return (
              <View
                key={`${segment.x}-${segment.y}`}
                style={[
                  styles.snakeSegment,
                  isHead && styles.snakeHead,
                  isActiveHead && styles.snakeActiveHead,
                  {
                    left: segment.x * cellWidth + cellWidth * 0.08,
                    top: segment.y * cellWidth + cellWidth * 0.08,
                    width: cellWidth * 0.84,
                    height: cellWidth * 0.84,
                  },
                ]}
              />
            );
          })}
          {game.status !== 'playing' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>{overlayTitle}</Text>
              <Text style={styles.overlayMessage}>{overlayMessage}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={game.status === 'ready' ? 'Start game' : 'Play again'}
                onPress={game.status === 'ready' ? startGame : restartGame}
                style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.startButtonText}>
                  {game.status === 'ready' ? '▶  START GAME' : '↻  PLAY AGAIN'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.controlsHeader}>
          <Text style={styles.sectionTitle}>CONTROLS</Text>
          <View style={styles.controlActions}>
            <Text style={styles.controlHint}>Pick a direction</Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Game sound"
              accessibilityState={{ checked: soundEnabled, disabled: !preferencesLoaded }}
              disabled={!preferencesLoaded}
              onPress={() => setSoundEnabled((enabled) => !enabled)}
              style={({ pressed }) => [
                styles.soundButton,
                !soundEnabled && styles.soundButtonMuted,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.soundButtonText}>{soundEnabled ? '♫ ON' : '♫ OFF'}</Text>
            </Pressable>
          </View>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Game speed" style={styles.speedSelector}>
          {SPEED_OPTIONS.map(({ speed, label }) => {
            const selected = gameSpeed === speed;
            return (
              <Pressable
                key={speed}
                accessibilityRole="radio"
                accessibilityLabel={`${label.toLowerCase()} snake speed`}
                accessibilityState={{ checked: selected, disabled: !preferencesLoaded }}
                disabled={!preferencesLoaded}
                onPress={() => setGameSpeed(speed)}
                style={({ pressed }) => [
                  styles.speedOption,
                  selected && styles.speedOptionSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.speedOptionText, selected && styles.speedOptionTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.controlsRow}>
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <DirectionButton direction="up" symbol="▲" onPress={handleDirection} />
              <View style={styles.dpadSpacer} />
            </View>
            <View style={styles.dpadRow}>
              <DirectionButton direction="left" symbol="◀" onPress={handleDirection} />
              <View style={styles.dpadCenter}>
                <Text style={styles.dpadCenterText}>{directionSymbols[game.direction]}</Text>
              </View>
              <DirectionButton direction="right" symbol="▶" onPress={handleDirection} />
            </View>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <DirectionButton direction="down" symbol="▼" onPress={handleDirection} />
              <View style={styles.dpadSpacer} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reverse direction and switch to the ${game.activeEnd === 'start' ? 'other' : 'opposite'} end of the snake`}
            onPress={() => setGame((current) => reverseEnds(current))}
            style={({ pressed }) => [styles.reverseButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.reverseIcon}>⇄</Text>
            <Text style={styles.reverseLabel}>REVERSE</Text>
            <Text style={styles.reverseCaption}>SWITCH HEAD</Text>
          </Pressable>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipIcon}>✦</Text>
          <Text style={styles.tipText}>
            Two ends, one snake. Tap <Text style={styles.tipStrong}>REVERSE</Text> to take control from the other end.
          </Text>
        </View>
        <Text style={styles.footer}>INSPIRED BY THE CLASSIC. MADE FOR YOUR PHONE.</Text>
        <Pressable
          accessibilityRole="link"
          onPress={openPrivacyPolicy}
          style={({ pressed }) => pressed && styles.privacyLinkPressed}
        >
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DirectionButton({
  direction,
  symbol,
  onPress,
}: {
  direction: Direction;
  symbol: string;
  onPress: (direction: Direction) => void;
}) {
  const label = DIRECTIONS.find((item) => item.direction === direction)?.label ?? direction;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${label.toLowerCase()}`}
      onPress={() => onPress(direction)}
      style={({ pressed }) => [styles.directionButton, pressed && styles.buttonPressed]}
    >
      <Text style={styles.directionSymbol}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  header: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  eyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.1,
    marginBottom: 4,
  },
  title: {
    color: '#eff2dc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.muted,
  },
  liveDotOn: {
    backgroundColor: '#a7c86c',
  },
  liveText: {
    color: '#c1cbb2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  scoreRow: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 13,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  scoreValue: {
    color: COLORS.accent,
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  board: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.screen,
    borderColor: '#687a51',
    borderWidth: 4,
    borderRadius: 9,
    marginBottom: 15,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.grid,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.grid,
  },
  food: {
    position: 'absolute',
    backgroundColor: COLORS.apple,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  bonusFood: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0d477',
    borderColor: '#744b20',
    borderWidth: 1,
  },
  bonusFoodSymbol: {
    color: '#744b20',
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  snakeSegment: {
    position: 'absolute',
    backgroundColor: COLORS.snake,
    borderRadius: 2,
  },
  snakeHead: {
    backgroundColor: COLORS.snake,
    borderWidth: 1.5,
    borderColor: '#a9bc7a',
    borderRadius: 3,
  },
  snakeActiveHead: {
    backgroundColor: COLORS.head,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(184, 201, 138, 0.84)',
  },
  overlayTitle: {
    color: COLORS.ink,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 7,
  },
  overlayMessage: {
    color: '#34412b',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  startButton: {
    borderRadius: 8,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  startButtonText: {
    color: '#edf2d9',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  controlsHeader: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#dce4ce',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  controlHint: {
    color: COLORS.muted,
    fontSize: 10,
  },
  speedSelector: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 9,
  },
  speedOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#354536',
    backgroundColor: COLORS.panel,
    paddingVertical: 7,
  },
  speedOptionSelected: {
    borderColor: '#8fa968',
    backgroundColor: '#2b3c2a',
  },
  speedOptionText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  speedOptionTextSelected: {
    color: COLORS.accent,
  },
  soundButton: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: COLORS.button,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  soundButtonMuted: {
    opacity: 0.65,
  },
  soundButtonText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  controlsRow: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  dpad: {
    gap: 5,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dpadSpacer: {
    width: 42,
    height: 38,
  },
  directionButton: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.button,
    borderWidth: 1,
    borderColor: '#354536',
  },
  directionSymbol: {
    color: '#dce7c5',
    fontSize: 16,
    fontWeight: '800',
  },
  dpadCenter: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: {
    color: '#91a27a',
    fontSize: 14,
  },
  reverseButton: {
    minWidth: 126,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#687750',
    backgroundColor: '#263525',
  },
  reverseIcon: {
    color: COLORS.accent,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '700',
  },
  reverseLabel: {
    color: '#f0f2df',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 3,
  },
  reverseCaption: {
    color: '#a0ae90',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  tip: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
  },
  tipIcon: {
    color: COLORS.accent,
    fontSize: 14,
  },
  tipText: {
    flex: 1,
    color: '#a9b39f',
    fontSize: 10,
    lineHeight: 15,
  },
  tipStrong: {
    color: COLORS.accent,
    fontWeight: '900',
  },
  footer: {
    color: '#657260',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.35,
    marginTop: 'auto',
    paddingTop: 10,
    textAlign: 'center',
  },
  privacyLink: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 10,
    textDecorationLine: 'underline',
  },
  privacyLinkPressed: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
