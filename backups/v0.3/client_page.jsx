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
  const searchParams = useSearchParams();
  const mySide = searchParams.get('side');
  const isAdmin = mySide === 'admin';

  useEffect(() => {
    socket.on('update_state', (data) => setGameState(data));
    socket.on('timer_update', (time) => setGameState(prev => ({ ...prev, timer: time })));
    return () => { socket.off('update_state'); socket.off('timer_update'); }
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
                <Image src={getImgPath(gameState.blueBans[i].image)} alt={`Blue Ban ${i + 1}`} fill className="object-cover object-top grayscale opacity-40 animate-in fade-in zoom-in duration-500" sizes="(max-width: 768px) 10vw, 5vw" />
              ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'ban' && isActiveBan('blue', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top grayscale opacity-20 animate-pulse" />
              )}
              {gameState.blueBans[i] && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-3xl">✕</div>}
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
                <Image src={getImgPath(gameState.redBans[i].image)} alt={`Red Ban ${i + 1}`} fill className="object-cover object-top grayscale opacity-40 animate-in fade-in zoom-in duration-500" sizes="(max-width: 768px) 10vw, 5vw" />
              ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'ban' && isActiveBan('red', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top grayscale opacity-20 animate-pulse" />
              )}
              {gameState.redBans[i] && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-3xl">✕</div>}
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
        {/* Bans - Scrollable */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`blue-ban-${i}`} className={`aspect-square h-[50px] min-w-[50px] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
              ${isActiveBan('blue', i) ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110' : 'border-blue-500/30'}
            `}>
              {isActiveBan('blue', i) && <div className={`absolute inset-0 bg-blue-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
              {gameState.blueBans[i] ? (
                <Image src={getImgPath(gameState.blueBans[i].image)} alt={`Blue Ban ${i + 1}`} fill className="object-cover object-top grayscale opacity-40 animate-in fade-in zoom-in duration-500" sizes="50px" />
              ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'ban' && isActiveBan('blue', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top grayscale opacity-20 animate-pulse" sizes="50px" />
              )}
              {gameState.blueBans[i] && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl">✕</div>}
            </div>
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`red-ban-${i}`} className={`aspect-square h-[50px] min-w-[50px] bg-slate-950 border rounded-sm overflow-hidden relative transition-all duration-300
              ${isActiveBan('red', i) ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.8)] scale-110' : 'border-red-500/30'}
            `}>
              {isActiveBan('red', i) && <div className={`absolute inset-0 bg-red-500/30 ${isPanicTime ? 'animate-ping' : 'animate-pulse'}`} />}
              {gameState.redBans[i] ? (
                <Image src={getImgPath(gameState.redBans[i].image)} alt={`Red Ban ${i + 1}`} fill className="object-cover object-top grayscale opacity-40 animate-in fade-in zoom-in duration-500" sizes="50px" />
              ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'ban' && isActiveBan('red', i)) && (
                <Image src={getImgPath(gameState.tempHover.image)} alt="Hover" fill className="object-cover object-top grayscale opacity-20 animate-pulse" sizes="50px" />
              )}
              {gameState.redBans[i] && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl">✕</div>}
            </div>
          ))}
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

        {/* TEAM PICKS - Mobile Horizontal Scroll */}
        <div className="md:hidden flex gap-3 overflow-x-auto custom-scrollbar px-4 py-3 bg-slate-950/50 border-b border-white/10">
          {/* Blue Team Cards */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`mobile-blue-${i}`} className={`min-w-[100px] h-[100px] relative overflow-hidden border rounded-md transition-all duration-500
               ${isActivePick('blue', i) ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'border-blue-500/20 bg-slate-900'}
            `}>
              {gameState.blueTeam[i] ? (
                <div key={`picked-${gameState.blueTeam[i].id}`} className="h-full w-full relative animate-in fade-in slide-in-from-bottom duration-800">
                  <Image src={getImgPath(gameState.blueTeam[i].image)} alt={gameState.blueTeam[i].name} fill className="object-cover opacity-90" sizes="100px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/60 to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[8px] text-blue-300 font-black tracking-wider">P{i + 1}</div>
                    <div className="text-[10px] font-black uppercase text-white truncate">{gameState.blueTeam[i].name}</div>
                  </div>
                </div>
              ) : (gameState.tempHover && currentStep.team === 'blue' && currentStep.type === 'pick' && isActivePick('blue', i)) ? (
                <div key="hover" className="h-full w-full relative animate-pulse">
                  <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-60 grayscale" sizes="100px" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[8px] text-blue-300/80 font-black">HOVER</div>
                    <div className="text-[10px] font-black uppercase text-white/70 truncate">{gameState.tempHover.name}</div>
                  </div>
                </div>
              ) : <div className={`h-full flex items-center justify-center font-black text-4xl ${isActivePick('blue', i) ? 'text-blue-400' : 'text-slate-800'}`}>{i + 1}</div>}
            </div>
          ))}
          {/* Red Team Cards */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={`mobile-red-${i}`} className={`min-w-[100px] h-[100px] relative overflow-hidden border rounded-md transition-all duration-500
               ${isActivePick('red', i) ? 'border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'border-red-500/20 bg-slate-900'}
            `}>
              {gameState.redTeam[i] ? (
                <div key={`picked-${gameState.redTeam[i].id}`} className="h-full w-full relative animate-in fade-in slide-in-from-bottom duration-800">
                  <Image src={getImgPath(gameState.redTeam[i].image)} alt={gameState.redTeam[i].name} fill className="object-cover opacity-90" sizes="100px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-red-600/60 to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[8px] text-red-300 font-black tracking-wider">P{i + 1}</div>
                    <div className="text-[10px] font-black uppercase text-white truncate">{gameState.redTeam[i].name}</div>
                  </div>
                </div>
              ) : (gameState.tempHover && currentStep.team === 'red' && currentStep.type === 'pick' && isActivePick('red', i)) ? (
                <div key="hover" className="h-full w-full relative animate-pulse">
                  <Image src={getImgPath(gameState.tempHover.image)} alt={gameState.tempHover.name} fill className="object-cover opacity-60 grayscale" sizes="100px" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[8px] text-red-300/80 font-black">HOVER</div>
                    <div className="text-[10px] font-black uppercase text-white/70 truncate">{gameState.tempHover.name}</div>
                  </div>
                </div>
              ) : <div className={`h-full flex items-center justify-center font-black text-4xl ${isActivePick('red', i) ? 'text-red-400' : 'text-slate-800'}`}>{i + 1}</div>}
            </div>
          ))}
        </div>

        {/* HERO SELECTOR */}
        <div className={`flex-1 flex flex-col bg-[#01040a] h-full relative z-0 transition-all duration-1000
          ${gameState.finished ? '' : isPanicTime ? 'shadow-[inset_0_0_150px_rgba(220,38,38,0.2)]' : currentStep.team === 'blue' ? 'shadow-[inset_150px_0_200px_-100px_rgba(59,130,246,0.1)]' : 'shadow-[inset_-150px_0_200px_-100px_rgba(239,68,68,0.1)]'}
        `}>
          <div className="p-4 md:p-6 pb-2 space-y-2 md:space-y-4 relative z-30 bg-[#01040a]">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 md:h-[45px]">
              <div className="flex-1 relative h-[40px] md:h-full">
                <span className={`absolute -top-2 left-3 bg-[#01040a] px-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest z-10 ${isPanicTime ? 'text-red-500' : 'text-slate-500'}`}>
                  {isPanicTime ? '⚠️ SELECTION REQUIRED' : 'Hero Database'}
                </span>
                <input className="bg-slate-900/50 border border-slate-800 rounded-md px-3 md:px-4 h-full text-xs w-full focus:outline-none focus:border-white/20 text-white font-bold tracking-widest uppercase" placeholder="SEARCH HERO..." onChange={(e) => setSearch(e.target.value.toLowerCase())} />
              </div>
              {isAdmin && (
                <div className="flex gap-2 h-[40px] md:h-full">
                  {!gameState.started && <button onClick={handleStart} className="h-full px-3 md:px-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-[9px] md:text-[10px] font-black border border-emerald-500/20 rounded-md uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]">Start Draft</button>}
                  {gameState.started && isMyTurn && gameState.tempHover && (
                    <button onClick={handleLockIn} className="h-full px-4 md:px-6 bg-yellow-400 hover:bg-yellow-300 text-black text-[11px] md:text-[12px] font-black rounded-md uppercase transition-all shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse">LOCK IN</button>
                  )}
                  <button onClick={handleReset} className="h-full px-3 md:px-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[9px] md:text-[10px] font-black border border-red-500/20 rounded-md uppercase transition-all">Reset</button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] pl-1">Role Classification</span>
              <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`flex-shrink-0 px-3 md:flex-1 py-1.5 rounded-sm text-[9px] md:text-[10px] font-black uppercase transition-all tracking-tighter border ${roleFilter === r ? 'bg-white text-black border-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-300 active:text-slate-100'}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 md:px-6 custom-scrollbar pb-10 md:pb-10 relative z-30">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
              {heroesData.filter(h => (roleFilter === 'All' || h.role.includes(roleFilter)) && h.name.toLowerCase().includes(search)).map(hero => {
                const isTaken = [...gameState.blueTeam, ...gameState.redTeam, ...gameState.blueBans, ...gameState.redBans].some(h => h.id === hero.id);
                return (
                  <button key={hero.id} onClick={() => handleHeroClick(hero)} disabled={isTaken || !isMyTurn} className={`relative aspect-square rounded-sm overflow-hidden border transition-all duration-300 ${isTaken ? 'grayscale opacity-5 scale-90 pointer-events-none' : 'border-white/5 hover:border-yellow-500/50 active:border-yellow-400 hover:scale-110 active:scale-105'} group`}>
                    <Image src={getImgPath(hero.image)} alt={hero.name} fill className="object-cover" sizes="(max-width: 768px) 33vw, 15vw" />
                    {!isTaken && (
                      <div className="absolute bottom-0 w-full bg-slate-950/90 text-[9px] md:text-[11px] font-black text-center py-0.5 md:py-1 truncate px-1 text-slate-100 uppercase tracking-tighter border-t border-white/10 group-hover:text-yellow-400 group-active:text-yellow-300">
                        {hero.name}
                      </div>
                    )}
                  </button>
                )
              })}
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