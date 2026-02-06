"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import io from 'socket.io-client';
import heroesData from './heroes.json';

const socket = io.connect("http://localhost:3002");

const DRAFT_ORDER = [
  { team: 'blue', type: 'ban' }, { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' }, { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' }, { team: 'red', type: 'ban' },
  { team: 'blue', type: 'pick' }, { team: 'red', type: 'pick' },
  { team: 'red', type: 'pick' }, { team: 'blue', type: 'pick' },
  { team: 'blue', type: 'pick' }, { team: 'red', type: 'pick' },
  { team: 'red', type: 'ban' }, { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' }, { team: 'blue', type: 'ban' },
  { team: 'red', type: 'pick' }, { team: 'blue', type: 'pick' },
  { team: 'blue', type: 'pick' }, { team: 'red', type: 'pick' }
];

export default function DraftBoard() {
  const [gameState, setGameState] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const searchParams = useSearchParams();
  const mySide = searchParams.get('side');
  const isAdmin = mySide === 'admin';

  useEffect(() => {
    socket.on('update_state', (data) => setGameState(data));
    socket.on('timer_update', (time) => setGameState(prev => ({ ...prev, timer: time })));
    return () => { socket.off('update_state'); socket.off('timer_update'); }
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerWidth < 768;
      setIsPortrait(portrait);
    };

    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!gameState) return <div className="bg-[#01040a] h-screen flex items-center justify-center text-white font-black tracking-[1em] animate-pulse uppercase italic">Syncing...</div>;

  const handleStart = () => {
    console.log('Start button clicked, emitting start_draft');
    socket.emit('start_draft');
  };

  /* Splash Screen Removed */

  const currentStep = DRAFT_ORDER[gameState.stepIndex] || { team: 'none', type: 'end' };
  const isMyTurn = gameState.started && !gameState.finished && (isAdmin || mySide === currentStep.team);
  const isPanicTime = !gameState.finished && gameState.timer <= 10;

  const handleHeroClick = (hero) => {
    if (!isMyTurn) return;
    const allUsed = [...gameState.blueTeam, ...gameState.redTeam, ...gameState.blueBans, ...gameState.redBans];
    if (allUsed.find(h => h.id === hero.id)) return;
    const teamToSubmit = isAdmin ? currentStep.team : mySide;
    socket.emit('hero_hover', { hero, team: teamToSubmit });
  };

  const handleLockIn = () => {
    if (!isMyTurn || !gameState.tempHover) return;
    socket.emit('confirm_lock');
    setIsExpanded(false);
  };

  const handleReset = () => { if (confirm("Reset Draft?")) socket.emit('reset_draft'); }
  const getImgPath = (imgName) => imgName.startsWith('/images/') ? imgName : `/images/${imgName}`;

  const isActiveBan = (team, index) => {
    if (gameState.finished || currentStep.type !== 'ban' || currentStep.team !== team) return false;
    const teamBans = team === 'blue' ? gameState.blueBans : gameState.redBans;
    return teamBans.length === index;
  };

  const isActivePick = (team, index) => {
    if (gameState.finished || currentStep.type !== 'pick' || currentStep.team !== team) return false;
    const teamPicks = team === 'blue' ? gameState.blueTeam : gameState.redTeam;
    return teamPicks.length === index;
  };

  return (
    <div className="bg-[#01040a] h-screen w-screen text-white font-sans overflow-hidden flex flex-col select-none italic">
      {/* HEADER - Desktop */}
      <div className="hidden md:flex justify-between items-center px-8 bg-slate-900 border-b border-white/5 h-[12vh] shadow-2xl relative z-50">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`aspect-square h-[7vh] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
              ${isActiveBan('blue', i) ? 'border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.8)] scale-110 z-10' : 'border-blue-500/30'}
            `}>
              {isActiveBan('blue', i) && <div className={`absolute inset-0 bg-blue-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
              {gameState.blueBans[i] ? (
                <Image src={getImgPath(gameState.blueBans[i].image)} alt={`Blue Ban ${i + 1}`} fill className="object-cover object-top opacity-90 animate-in fade-in zoom-in duration-500" sizes="(max-width: 768px) 10vw, 5vw" />
              ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'ban' && isActiveBan('blue', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top opacity-60 animate-pulse" />
              )}
              {gameState.blueBans[i] && <div className="absolute right-1 bottom-1 text-red-500 font-black text-3xl p-1 bg-slate-950/40 rounded-tl-md leading-none">✕</div>}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <div className={`text-6xl font-black italic tracking-tighter leading-none transition-all duration-300
              ${gameState.finished ? 'text-emerald-400' : isPanicTime ? 'text-red-600 scale-125 animate-bounce' : currentStep.team === 'blue' ? 'text-blue-500' : 'text-red-500'}
            `}>
            {!gameState.started ? "READY" : gameState.finished ? "GG" : gameState.timer}
          </div>
          <div className={`text-[10px] font-black tracking-[0.5em] mt-2 uppercase ${isPanicTime ? 'text-red-400' : 'text-slate-500'}`}>
            {!gameState.started ? "WAITING TO START" : gameState.finished ? "Draft End" : `${currentStep.team} ${currentStep.type}`}
          </div>
        </div>

        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`aspect-square h-[7vh] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
              ${isActiveBan('red', i) ? 'border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-110 z-10' : 'border-red-500/30'}
            `}>
              {isActiveBan('red', i) && <div className={`absolute inset-0 bg-red-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
              {gameState.redBans[i] ? (
                <Image src={getImgPath(gameState.redBans[i].image)} alt={`Red Ban ${i + 1}`} fill className="object-cover object-top opacity-90 animate-in fade-in zoom-in duration-500" sizes="(max-width: 768px) 10vw, 5vw" />
              ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'ban' && isActiveBan('red', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top opacity-60 animate-pulse" />
              )}
              {gameState.redBans[i] && <div className="absolute left-1 bottom-1 text-red-500 font-black text-3xl p-1 bg-slate-950/40 rounded-tr-md leading-none">✕</div>}
            </div>
          ))}
        </div>
      </div>

      {/* HEADER - Mobile */}
      <div className="md:hidden flex flex-col bg-slate-900 border-b border-white/5 py-3 px-4 shadow-2xl relative z-50 space-y-2">
        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-black italic tracking-tighter leading-none transition-all duration-300
              ${gameState.finished ? 'text-emerald-400' : isPanicTime ? 'text-red-600 scale-125 animate-bounce' : currentStep.team === 'blue' ? 'text-blue-500' : 'text-red-500'}
            `}>
            {!gameState.started ? "READY" : gameState.finished ? "GG" : gameState.timer}
          </div>
          <div className={`text-[8px] font-black tracking-[0.3em] mt-1 uppercase ${isPanicTime ? 'text-red-400' : 'text-slate-500'}`}>
            {!gameState.started ? "WAITING TO START" : gameState.finished ? "Draft End" : `${currentStep.team} ${currentStep.type}`}
          </div>
        </div>
        {/* Bans - Split & Fit Screen */}
        <div className="flex justify-between items-center w-full px-1">
          {/* Blue Bans container */}
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={`blue-ban-${i}`} className={`aspect-square h-[40px] min-w-[40px] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
                ${isActiveBan('blue', i) ? 'border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] scale-110' : 'border-blue-500/30'}
              `}>
                {isActiveBan('blue', i) && <div className={`absolute inset-0 bg-blue-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
                {gameState.blueBans[i] ? (
                  <Image src={getImgPath(gameState.blueBans[i].image)} alt={`Blue Ban ${i + 1}`} fill className="object-cover object-top opacity-90 animate-in fade-in zoom-in duration-500" sizes="40px" />
                ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'ban' && isActiveBan('blue', i)) && (
                  <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top opacity-60 animate-pulse" sizes="40px" />
                )}
                {gameState.blueBans[i] && <div className="absolute right-0 bottom-0 text-red-500 font-black text-[12px] leading-none p-1 bg-slate-950/40 rounded-tl-sm">✕</div>}
              </div>
            ))}
          </div>

          {/* Red Bans container */}
          <div className="flex gap-1 justify-end">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={`red-ban-${i}`} className={`aspect-square h-[40px] min-w-[40px] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
                ${isActiveBan('red', i) ? 'border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)] scale-110' : 'border-red-500/30'}
              `}>
                {isActiveBan('red', i) && <div className={`absolute inset-0 bg-red-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
                {gameState.redBans[i] ? (
                  <Image src={getImgPath(gameState.redBans[i].image)} alt={`Red Ban ${i + 1}`} fill className="object-cover object-top opacity-90 animate-in fade-in zoom-in duration-500" sizes="40px" />
                ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'ban' && isActiveBan('red', i)) && (
                  <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top opacity-60 animate-pulse" sizes="40px" />
                )}
                {gameState.redBans[i] && <div className="absolute left-0 bottom-0 text-red-500 font-black text-[12px] leading-none p-1 bg-slate-950/40 rounded-tr-sm">✕</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER - Desktop: Row, Mobile: Column */}
      <div className="flex md:flex-row flex-col flex-1 overflow-hidden h-full">

        {/* BLUE SIDEBAR - Desktop Only */}
        <div className="hidden md:flex w-[30%] flex-col bg-slate-950 h-full relative z-10 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-1 relative overflow-hidden border-b border-white/5 transition-all duration-500
               ${isActivePick('blue', i) ? 'bg-blue-600/20' : ''}
            `}>
              {isActivePick('blue', i) && (
                <>
                  <div className="absolute inset-0 border-[3px] border-blue-400 shadow-[inset_0_0_40px_rgba(59,130,246,0.4),0_0_20px_rgba(59,130,246,0.6)] animate-pulse z-20" />
                  <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-blue-500/20 to-transparent animate-pulse z-10" />
                </>
              )}
              {gameState.blueTeam[i] ? (
                <div key={`picked-${gameState.blueTeam[i].id}`} className="h-full w-full relative animate-in fade-in slide-in-from-left-12 duration-1000">
                  <Image src={getImgPath(gameState.blueTeam[i].image)} alt={gameState.blueTeam[i].name} fill className="object-cover opacity-90 scale-[1.8] origin-top-right !w-auto !h-[140%] !max-w-none !right-[-15%] !top-[-10%] !left-auto" style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} sizes="(max-width: 768px) 100vw, 30vw" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 via-transparent to-transparent z-10" />
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 shadow-[5px_0_20px_rgba(59,130,246,0.8)] z-20" />
                  <div className="absolute top-[10%] left-[-10%] text-9xl font-black text-blue-500/[0.05] uppercase z-0 whitespace-nowrap">{gameState.blueTeam[i].name}</div>
                  <div className="absolute bottom-6 left-10 z-20">
                    <div className="text-xs text-blue-400 font-black tracking-[0.5em] mb-1">PICK {i + 1}</div>
                    <div className="text-4xl lg:text-6xl font-black uppercase text-white tracking-tighter drop-shadow-2xl">{gameState.blueTeam[i].name}</div>
                  </div>
                </div>
              ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'pick' && isActivePick('blue', i)) ? (
                <div key="hover" className="h-full w-full relative animate-pulse">
                  <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-80 scale-[1.8] origin-top-right grayscale !w-auto !h-[140%] !max-w-none !right-[-15%] !top-[-10%] !left-auto" style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-transparent z-10" />
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500/50 shadow-[5px_0_20px_rgba(59,130,246,0.4)] z-20" />
                  <div className="absolute top-[10%] left-[-10%] text-9xl font-black text-blue-500/[0.05] uppercase z-0 whitespace-nowrap">{gameState.tempHover.name}</div>
                  <div className="absolute bottom-6 left-10 z-20">
                    <div className="text-xs text-blue-400/80 font-black tracking-[0.5em] mb-1">HOVERING...</div>
                    <div className="text-4xl lg:text-6xl font-black uppercase text-white/80 tracking-tighter drop-shadow-2xl">{gameState.tempHover.name}</div>
                  </div>
                </div>
              ) : <div className={`h-full flex items-center pl-10 font-black text-9xl italic transition-all duration-500 ${isActivePick('blue', i) ? (isPanicTime ? 'text-red-500' : 'text-blue-400') + ' opacity-100 translate-x-8 scale-110' : 'text-slate-900 opacity-20'}`}>{i + 1}</div>}
            </div>
          ))}
        </div>

        {/* TEAM PICKS - Mobile Vertical Dual-Stack */}
        <div className="md:hidden grid grid-cols-2 flex-1 bg-slate-950 overflow-hidden relative pb-[33vh]">
          {/* Central spine */}
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10 z-30 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />

          {/* Blue Side (Left) */}
          <div className="flex flex-col h-full border-r border-white/5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={`mobile-blue-${i}`} className={`flex-1 relative overflow-hidden border-b border-white/5 transition-all duration-500
                ${isActivePick('blue', i) ? 'bg-blue-600/20' : ''}
              `}>
                {isActivePick('blue', i) && (
                  <>
                    <div className="absolute inset-0 border-[3px] border-blue-400 shadow-[inset_0_0_40px_rgba(59,130,246,0.4),0_0_20px_rgba(59,130,246,0.6)] animate-pulse z-20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent animate-pulse z-10" />
                  </>
                )}
                {gameState.blueTeam[i] ? (
                  <div key={`picked-blue-${gameState.blueTeam[i].id}-${i}`} className="h-full w-full relative animate-in fade-in slide-in-from-left-12 duration-1000">
                    <Image src={getImgPath(gameState.blueTeam[i].image)} alt={gameState.blueTeam[i].name} fill className="object-cover opacity-90 scale-[1.8] origin-right !w-auto !h-full !max-w-none !right-0 !left-auto" style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 via-transparent to-transparent z-10" />
                    <div className="absolute inset-y-0 left-0 w-2 bg-blue-500 shadow-[5px_0_20px_rgba(59,130,246,0.8)] z-20" />
                    <div className="absolute left-3 right-2 bottom-2 z-20 text-left">
                      <div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest opacity-70">PICK {i + 1}</div>
                      <div className="text-2xl font-black uppercase text-white tracking-tighter truncate leading-tight">{gameState.blueTeam[i].name}</div>
                    </div>
                  </div>
                ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'pick' && isActivePick('blue', i)) ? (
                  <div key="hover-blue" className="h-full w-full relative animate-pulse">
                    <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-60 scale-[1.8] origin-right grayscale !w-auto !h-full !max-w-none !right-0 !left-auto" style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 border-[3px] border-blue-400/50 shadow-[inset_0_0_30px_rgba(59,130,246,0.3),0_0_15px_rgba(59,130,246,0.4)] z-20" />
                    <div className="absolute left-3 bottom-2 z-20 text-left">
                      <div className="text-[9px] text-blue-300 font-bold tracking-widest">HOVERING</div>
                      <div className="text-lg font-black uppercase text-white/50 truncate">{gameState.tempHover.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-start pl-4 opacity-10">
                    <span className="text-6xl font-black italic">{i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Red Side (Right) */}
          <div className="flex flex-col h-full">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={`mobile-red-${i}`} className={`flex-1 relative overflow-hidden border-b border-white/5 transition-all duration-500
                ${isActivePick('red', i) ? 'bg-red-600/20' : ''}
              `}>
                {isActivePick('red', i) && (
                  <>
                    <div className="absolute inset-0 border-[3px] border-red-400 shadow-[inset_0_0_40px_rgba(239,68,68,0.4),0_0_20px_rgba(239,68,68,0.6)] animate-pulse z-20" />
                    <div className="absolute inset-0 bg-gradient-to-l from-red-500/20 to-transparent animate-pulse z-10" />
                  </>
                )}
                {gameState.redTeam[i] ? (
                  <div key={`picked-red-${gameState.redTeam[i].id}-${i}`} className="h-full w-full relative animate-in fade-in slide-in-from-right-12 duration-1000">
                    <Image src={getImgPath(gameState.redTeam[i].image)} alt={gameState.redTeam[i].name} fill className="object-cover opacity-90 scale-[1.8] origin-left !w-auto !h-full !max-w-none !left-0 !right-auto" style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-tl from-red-600/40 via-transparent to-transparent z-10" />
                    <div className="absolute inset-y-0 right-0 w-2 bg-red-500 shadow-[-5px_0_20px_rgba(239,68,68,0.8)] z-20" />
                    <div className="absolute right-3 left-2 bottom-2 z-20 text-right">
                      <div className="text-[10px] text-red-300 font-bold uppercase tracking-widest opacity-70">PICK {i + 1}</div>
                      <div className="text-2xl font-black uppercase text-white tracking-tighter truncate leading-tight">{gameState.redTeam[i].name}</div>
                    </div>
                  </div>
                ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'pick' && isActivePick('red', i)) ? (
                  <div key="hover-red" className="h-full w-full relative animate-pulse">
                    <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-60 scale-[1.8] origin-left grayscale !w-auto !h-full !max-w-none !left-0 !right-auto" style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-l from-red-600/30 via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 border-[3px] border-red-400/50 shadow-[inset_0_0_30px_rgba(239,68,68,0.3),0_0_15px_rgba(239,68,68,0.4)] z-20" />
                    <div className="absolute right-3 bottom-2 z-20 text-right">
                      <div className="text-[9px] text-red-300 font-bold tracking-widest">HOVERING</div>
                      <div className="text-lg font-black uppercase text-white/50 truncate">{gameState.tempHover.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-end pr-4 opacity-10">
                    <span className="text-6xl font-black italic">{i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* HERO SELECTOR */}
        <div className={`flex flex-col bg-[#01040a] transition-all duration-500 ease-out z-50
          ${gameState.finished ? '' : isPanicTime ? 'shadow-[inset_0_0_150px_rgba(220,38,38,0.2)]' : currentStep.team === 'blue' ? 'shadow-[inset_150px_0_200px_-100px_rgba(59,130,246,0.1)]' : 'shadow-[inset_-150px_0_200px_-100px_rgba(239,68,68,0.1)]'}
          ${isPortrait ? (isExpanded ? 'fixed inset-x-0 bottom-0 h-screen !z-[60]' : 'fixed inset-x-0 bottom-0 h-[33vh] !z-[60]') + ' border-t border-white/20 shadow-[0_-8px_20px_rgba(0,0,0,0.6)]' : 'flex-1 h-full relative z-0'}
        `}>
          {isPortrait && (
            <div onClick={() => setIsExpanded(!isExpanded)} className="w-full flex flex-col items-center pt-1 pb-2 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors group">
              <span className="text-slate-500 text-xs font-black not-italic transition-transform duration-300 group-hover:text-slate-300">
                {isExpanded ? '▼' : '▲'}
              </span>
            </div>
          )}

          {/* Hero Selection Grid */}
          <div className="flex flex-col transition-all duration-500 ease-in-out overflow-hidden flex-1">
            <div className="p-3 md:p-6 pb-2 space-y-2 md:space-y-4 relative z-30">
              <div className="flex flex-row items-center gap-2 md:gap-4 md:h-[45px]">
                <div className="flex-1 relative h-[32px] md:h-full">
                  <span className={`absolute -top-2 left-3 bg-[#01040a] px-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest z-10 ${isPanicTime ? 'text-red-500' : 'text-slate-500'}`}>
                    {isPanicTime ? '⚠️ SELECTION REQUIRED' : 'Hero Database'}
                  </span>
                  <input className="bg-slate-900/50 border border-slate-800 rounded-md px-3 md:px-4 h-full text-xs w-full focus:outline-none focus:border-white/20 text-white font-bold tracking-widest uppercase" placeholder="SEARCH HERO..." onChange={(e) => setSearch(e.target.value.toLowerCase())} />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 h-[32px] md:h-full">
                    {!gameState.started && <button onClick={handleStart} className="h-full px-3 md:px-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-[9px] md:text-[10px] font-black border border-emerald-500/20 rounded-md uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]">Start Draft</button>}
                    {gameState.started && isMyTurn && gameState.tempHover && (
                      <button
                        onClick={handleLockIn}
                        className={`h-full px-4 md:px-6 text-[11px] md:text-[12px] font-black rounded-md uppercase transition-all animate-pulse
                          ${currentStep.team === 'blue'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)]'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                          }
                        `}
                      >
                        LOCK {currentStep.type}
                      </button>
                    )}
                    <button onClick={handleReset} className="h-full px-3 md:px-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[9px] md:text-[10px] font-black border border-red-500/20 rounded-md uppercase transition-all">Reset</button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] pl-1 block text-center md:text-left">Role Classification</span>
                <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1 justify-center md:justify-start">
                  {['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)} className={`flex-shrink-0 px-3 md:flex-1 py-1.5 rounded-sm text-[9px] md:text-[10px] font-black uppercase transition-all tracking-tighter border ${roleFilter === r ? 'bg-white text-black border-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-300 active:text-slate-100'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 md:px-6 custom-scrollbar pb-10 md:pb-10 relative z-30 scroll-smooth">
              <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
                {[...heroesData]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter(h => (roleFilter === 'All' || h.role.includes(roleFilter)) && h.name.toLowerCase().includes(search)).map(hero => {
                    const isBanned = [...gameState.blueBans, ...gameState.redBans].some(h => h.id === hero.id);
                    const isPicked = [...gameState.blueTeam, ...gameState.redTeam].some(h => h.id === hero.id);
                    const isTaken = isBanned || isPicked;
                    const isTempHovered = !gameState.finished && !isTaken && gameState.tempHover && gameState.tempHover.id === hero.id;
                    const hoverTeam = currentStep.team;

                    return (
                      <button
                        key={hero.id}
                        onClick={() => handleHeroClick(hero)}
                        disabled={isTaken || !isMyTurn}
                        className={`relative aspect-square rounded-sm overflow-hidden border transition-all duration-300 z-0
                        ${isTempHovered
                            ? (hoverTeam === 'blue' ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 animate-pulse !z-10' : 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-110 animate-pulse !z-10')
                            : isTaken ? 'grayscale opacity-30 scale-95 pointer-events-none border-white/5' : 'border-white/5 hover:border-yellow-500/50 active:border-yellow-400 hover:scale-110 active:scale-105 group'
                          }
                      `}
                      >
                        <Image src={getImgPath(hero.image)} alt={hero.name} fill className="object-cover" sizes="(max-width: 768px) 33vw, 15vw" />

                        {/* Ban Hover Overlay */}
                        {isTempHovered && currentStep.type === 'ban' && (
                          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <span className="text-red-500 text-6xl md:text-7xl font-black drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-in zoom-in duration-300">✕</span>
                          </div>
                        )}

                        {/* Permanent Taken Overlays */}
                        {isBanned && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none bg-red-950/20">
                            <span className="text-red-500/80 text-5xl md:text-6xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">✕</span>
                            <div className="absolute inset-x-0 bottom-0 bg-red-600/80 text-white text-[8px] md:text-[9px] font-black py-1 text-center uppercase tracking-widest border-t border-red-400/20">
                              Banned
                            </div>
                          </div>
                        )}
                        {isPicked && (
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-white text-[8px] md:text-[9px] font-black py-1 text-center uppercase z-20 tracking-widest border-t border-white/5">
                            Picked
                          </div>
                        )}

                        {!isTaken && (
                          <div className={`absolute bottom-0 w-full text-[9px] md:text-[11px] font-black text-center py-0.5 md:py-1 truncate px-1 uppercase tracking-tighter border-t transition-colors
                          ${isTempHovered
                              ? (hoverTeam === 'blue' ? 'bg-blue-600/90 text-white border-blue-400' : 'bg-red-600/90 text-white border-red-400')
                              : 'bg-slate-950/90 text-slate-100 border-white/10 group-hover:text-yellow-400 group-active:text-yellow-300'
                            }
                        `}>
                            {hero.name}
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* RED SIDEBAR - Desktop Only */}
        <div className="hidden md:flex w-[30%] flex-col bg-slate-950 h-full relative z-10 border-l border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-1 relative overflow-hidden border-b border-white/5 transition-all duration-500
               ${isActivePick('red', i) ? 'bg-red-600/20' : ''}
            `}>
              {isActivePick('red', i) && (
                <>
                  <div className="absolute inset-0 border-[3px] border-red-400 shadow-[inset_0_0_40px_rgba(239,68,68,0.4),0_0_20px_rgba(239,68,68,0.6)] animate-pulse z-20" />
                  <div className="absolute top-0 bottom-0 right-0 w-full bg-gradient-to-l from-red-500/20 to-transparent animate-pulse z-10" />
                </>
              )}
              {gameState.redTeam[i] ? (
                <div key={`picked-${gameState.redTeam[i].id}`} className="h-full w-full relative animate-in fade-in slide-in-from-right-12 duration-1000">
                  <Image src={getImgPath(gameState.redTeam[i].image)} alt={gameState.redTeam[i].name} fill className="object-cover opacity-90 scale-[1.8] origin-top-left !w-auto !h-[140%] !max-w-none !left-[-15%] !top-[-10%] !right-auto" style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)' }} sizes="(max-width: 768px) 100vw, 30vw" />
                  <div className="absolute inset-0 bg-gradient-to-tl from-red-600/40 via-transparent to-transparent z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500 shadow-[-5px_0_20px_rgba(239,68,68,0.8)] z-20" />
                  <div className="absolute top-[10%] right-[-10%] text-9xl font-black text-red-500/[0.05] uppercase z-0 whitespace-nowrap text-right">{gameState.redTeam[i].name}</div>
                  <div className="absolute bottom-6 right-10 z-20 text-right">
                    <div className="text-xs text-red-400 font-black tracking-[0.5em] mb-1">PICK {i + 1}</div>
                    <div className="text-4xl lg:text-6xl font-black uppercase text-white tracking-tighter drop-shadow-2xl">{gameState.redTeam[i].name}</div>
                  </div>
                </div>
              ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'pick' && isActivePick('red', i)) ? (
                <div key="hover" className="h-full w-full relative animate-pulse">
                  <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-80 scale-[1.8] origin-top-left grayscale !w-auto !h-[140%] !max-w-none !left-[-15%] !top-[-10%] !right-auto" style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)' }} />
                  <div className="absolute inset-0 bg-gradient-to-tl from-red-600/20 via-transparent to-transparent z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500/50 shadow-[-5px_0_20px_rgba(239,68,68,0.4)] z-20" />
                  <div className="absolute top-[10%] right-[-10%] text-9xl font-black text-red-500/[0.05] uppercase z-0 whitespace-nowrap text-right">{gameState.tempHover.name}</div>
                  <div className="absolute bottom-6 right-10 z-20 text-right">
                    <div className="text-xs text-red-400/80 font-black tracking-[0.5em] mb-1">HOVERING...</div>
                    <div className="text-4xl lg:text-6xl font-black uppercase text-white/80 tracking-tighter drop-shadow-2xl">{gameState.tempHover.name}</div>
                  </div>
                </div>
              ) : <div className={`h-full flex items-center justify-end pr-10 font-black text-9xl italic transition-all duration-500 ${isActivePick('red', i) ? (isPanicTime ? 'text-red-500' : 'text-red-400') + ' opacity-100 -translate-x-8 scale-110' : 'text-slate-900 opacity-20'}`}>{i + 1}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}