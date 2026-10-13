'use client';

import Home from '@/components/Home';
import Lobby from '@/components/Lobby';
import Game from '@/components/Game';
import Results from '@/components/Results';
import { useRoom } from '@/lib/useRoom';

export default function Page() {
  const room = useRoom();
  const { game, status } = room;

  if (status === 'idle' || status === 'connecting') {
    return (
      <Home
        busy={status === 'connecting'}
        error={room.error}
        onError={room.setError}
        onCreate={room.createRoom}
        onJoin={room.joinRoom}
      />
    );
  }

  if (!game || game.phase === 'lobby') {
    return <Lobby code={room.code} players={room.presence} myId={room.myId} isHost={room.isHost} onStart={room.startGame} onLeave={room.leave} />;
  }

  if (game.phase === 'playing' || game.phase === 'scoring') {
    return <Game game={game} offset={room.offset} myId={room.myId} onStop={room.sendStop} onSubmit={room.submitAnswers} />;
  }

  return <Results game={game} myId={room.myId} isHost={room.isHost} onNext={room.nextRound} onPlayAgain={room.playAgain} onLeave={room.leave} />;
}

