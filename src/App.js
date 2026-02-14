import React, { useState, useEffect, useCallback } from 'react';

// ローカルストレージのキー
const APP_STORAGE_KEY = 'trainRevenue_18xx_data';

// Default company colors for quick add
const defaultCompanyColors = [
  "赤", "青", "緑", "黄", "黒", "白", "橙", "紫", "桃", "茶", "空", "灰"
];

// --- Helper Components ---

const Modal = ({ message, onClose, showConfirm = false, onConfirm, confirmText = "OK", cancelText = "キャンセル", children }) => {
  if (!message && !children) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby={message ? "modal-message" : undefined}>
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md">
        {message && <p id="modal-message" className="mb-6 text-lg text-gray-700 whitespace-pre-wrap text-center">{message}</p>}
        {children}
        <div className="flex justify-center gap-4 mt-6">
          {showConfirm && (
            <button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
              {confirmText}
            </button>
          )}
          <button
            onClick={onClose}
            className={`${showConfirm ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white'} font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150 ease-in-out`}
          >
            {showConfirm ? cancelText : "閉じる"}
          </button>
        </div>
      </div>
    </div>
  );
};


const RevenueStopEditor = ({ stop, index, onUpdateStop, onDeleteStop, onInsertStopBefore }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(stop.toString()); 

    useEffect(() => { 
        setEditValue(stop.toString());
    }, [stop]);

    const handleUpdate = () => {
        const newValue = parseInt(editValue);
        if (!isNaN(newValue) && newValue >= 0) {
            onUpdateStop(index, newValue);
            setIsEditing(false);
        } else {
            setEditValue(stop.toString()); 
            setIsEditing(false);
        }
    };
    
    const quickChange = (amount) => {
        onUpdateStop(index, Math.max(0, stop + amount));
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 p-1 bg-yellow-100 rounded">
                <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-16 p-1 border border-yellow-400 rounded text-sm"
                    aria-label="収益値を編集"
                    autoFocus
                    onBlur={handleUpdate}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate();
                        if (e.key === 'Escape') {
                            setEditValue(stop.toString()); 
                            setIsEditing(false);
                        }
                    }}
                />
                <button onClick={handleUpdate} className="p-1 bg-green-500 text-white rounded text-xs">✓</button>
                <button onClick={() => {setEditValue(stop.toString()); setIsEditing(false);}} className="p-1 bg-gray-300 rounded text-xs">✕</button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0.5 group">
            <button onClick={() => onInsertStopBefore(index)} className="p-0.5 text-blue-500 hover:bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-xs" aria-label={`地点${index}の前に挿入`}>⊕</button>
            <button type="button" className="relative p-1.5 bg-slate-200 rounded text-sm text-slate-700 cursor-pointer hover:bg-slate-300 text-left" onClick={() => setIsEditing(true)} aria-label={`収益地点 ${stop} を編集`}>
                {stop}
                <span className="absolute -top-3 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button type="button" onClick={(e) => { e.stopPropagation(); quickChange(10);}} className="px-1 bg-green-400 text-white rounded-full text-xs shadow hover:bg-green-500" aria-label={`${stop} を +10`}>+</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); quickChange(-10);}} className="px-1 bg-red-400 text-white rounded-full text-xs shadow hover:bg-red-500" aria-label={`${stop} を -10`}>-</button>
                </span>
            </button>
            <button onClick={() => onDeleteStop(index)} className="p-0.5 text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-xs" aria-label={`地点${index}を削除`}>⊖</button>
        </div>
    );
};

const RevenueInput = ({ onAddStop }) => {
  const revenueValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const [customValue, setCustomValue] = useState('');

  const handleAddCustom = () => {
    const value = parseInt(customValue);
    if (!isNaN(value) && value >= 0) {
      onAddStop(value);
      setCustomValue(''); 
    } else {
      console.warn("無効なカスタム値です。数値を入力してください。");
    }
  };

  return (
    <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
      <p className="text-xs font-medium text-gray-700 mb-1.5">新しい収益地点を末尾に追加:</p>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {revenueValues.map((value) => (
          <button
            key={value}
            onClick={() => onAddStop(value)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded text-xs shadow"
          >
            {value}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="カスタム値"
          aria-label="カスタム収益値"
          className="flex-grow p-1.5 border border-gray-300 rounded-md shadow-sm text-xs"
        />
        <button
          onClick={handleAddCustom}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded text-xs shadow"
        >
          追加
        </button>
      </div>
    </div>
  );
};


const TrainCard = ({ train, index, onUpdateTrainStops, onClearTrain, onDeleteTrain }) => {
    const [showRevenueInput, setShowRevenueInput] = useState(false);

    const handleAddStopToEnd = (value) => {
        const newStops = [...train.stops, value];
        onUpdateTrainStops(train.id, newStops);
    };

    const handleUpdateStop = (stopIndex, newValue) => {
        const newStops = [...train.stops];
        newStops[stopIndex] = newValue;
        onUpdateTrainStops(train.id, newStops);
    };

    const handleDeleteStop = (stopIndex) => {
        const newStops = train.stops.filter((_, i) => i !== stopIndex);
        onUpdateTrainStops(train.id, newStops);
    };
    
    const handleInsertStopBefore = (stopIndex) => {
        const newStops = [...train.stops];
        newStops.splice(stopIndex, 0, 0); 
        onUpdateTrainStops(train.id, newStops);
    };


  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-indigo-700">列車 {index + 1}</h3>
        <button onClick={() => onDeleteTrain(train.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">削除</button>
      </div>
      
      <div className="mb-3 min-h-[60px]">
        <p className="text-sm font-medium text-gray-600 mb-1">運行経路 (クリックで編集):</p>
        {train.stops.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {train.stops.map((stop, idx) => (
              <React.Fragment key={idx}>
                <RevenueStopEditor 
                    stop={stop} 
                    index={idx} 
                    onUpdateStop={handleUpdateStop}
                    onDeleteStop={handleDeleteStop}
                    onInsertStopBefore={handleInsertStopBefore}
                />
                {idx < train.stops.length -1 && <span className="text-gray-400 text-xs">+</span>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic text-sm">地点未追加</p>
        )}
         <button onClick={() => setShowRevenueInput(s => !s)} className="mt-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded">
            {showRevenueInput ? '入力欄を閉じる' : '収益地点を末尾に追加'}
        </button>
        {showRevenueInput && <RevenueInput onAddStop={handleAddStopToEnd} />}
      </div>

      <div className="mb-4 text-lg font-bold text-gray-800">
        計算中の列車収益: <span className="text-green-600">{train.stops.reduce((sum, s) => sum + s, 0)}</span>
      </div>
      <button onClick={() => onClearTrain(train.id)} className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-md text-sm">この列車の経路をクリア</button>
    </div>
  );
};

const PercentageInputControl = ({ label, value, onChange }) => {
  const [inputValue, setInputValue] = useState((value || 0).toString());

  useEffect(() => {
    setInputValue((value || 0).toString());
  }, [value]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    let numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;
    onChange(numValue);
    setInputValue(numValue.toString());
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const adjustValue = (amount) => {
    let numValue = parseInt(inputValue);
    if (isNaN(numValue)) numValue = 0;
    numValue = Math.max(0, Math.min(100, numValue + amount));
    onChange(numValue);
    setInputValue(numValue.toString());
  };

  const quickSetValue = (val) => {
    onChange(val);
    setInputValue(val.toString());
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 bg-white rounded-md shadow-sm">
      <span className="font-medium text-gray-700 w-full sm:w-auto sm:min-w-[80px]">{label}:</span>
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <button onClick={() => adjustValue(-10)} className="p-1.5 bg-slate-300 hover:bg-slate-400 rounded text-xs font-mono">-10</button>
        <input
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={`${label}の保有割合`}
          className="p-2 border border-gray-300 rounded-md shadow-sm w-16 text-center text-sm"
        />
        <button onClick={() => adjustValue(10)} className="p-1.5 bg-slate-300 hover:bg-slate-400 rounded text-xs font-mono">+10</button>
        <button onClick={() => quickSetValue(50)} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs">50%</button>
        <span className="text-gray-600 text-sm">%</span>
      </div>
    </div>
  );
};


const NavButton = ({ viewName, currentView, setCurrentView, children }) => (
  <button onClick={() => setCurrentView(viewName)} className={`py-2 px-4 rounded-t-lg font-medium ${currentView === viewName ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>{children}</button>
);

// --- View Components ---
const SummaryView = ({ players, companies, numORs }) => {
    const playerDividends = players.map(player => {
        let totalDividendFromAllORs = 0;
        companies.forEach(company => {
            const companyTotalRevenueAcrossORs = (company.orRevenues || [])
                .slice(0, numORs) 
                .reduce((sum, or) => sum + (or.revenue || 0), 0);
            
            const holding = (company.stockHoldings || []).find(sh => sh.playerId === player.id);
            if (holding && holding.percentage > 0) {
                totalDividendFromAllORs += Math.floor(companyTotalRevenueAcrossORs * (holding.percentage / 100));
            }
        });
        return { ...player, totalDividend: totalDividendFromAllORs };
    });

    const sortedPlayerDividends = [...playerDividends].sort((a, b) => b.totalDividend - a.totalDividend);

    const companySummaries = companies.map(company => {
        const totalRevenueAcrossORs = (company.orRevenues || [])
            .slice(0, numORs)
            .reduce((sum, or) => sum + (or.revenue || 0), 0);
        const orDetails = (company.orRevenues || []).slice(0, numORs).map((or, idx) => `OR${idx+1}: ${or.revenue || 0}`).join(', ');
        return {
            ...company,
            totalRevenueAcrossORs,
            orDetails
        };
    }).sort((a,b) => b.totalRevenueAcrossORs - a.totalRevenueAcrossORs);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">サマリー (全 {numORs} OR合計)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-2xl font-semibold text-teal-700 mb-4">プレイヤー別総配当</h3>
                    {players.length === 0 && <p className="text-gray-500 italic">プレイヤーがいません。</p>}
                    <ul className="space-y-3">
                        {sortedPlayerDividends.map(player => (
                            <li key={player.id} className="flex justify-between items-center p-3 bg-teal-50 rounded-md shadow-sm">
                                <span className="font-medium text-teal-800">{player.name}</span>
                                <span className="font-semibold text-teal-600 text-lg">{player.totalDividend}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-2xl font-semibold text-sky-700 mb-4">企業別総収益</h3>
                    {companies.length === 0 && <p className="text-gray-500 italic">企業がありません。</p>}
                    <ul className="space-y-3">
                        {companySummaries.map(company => (
                            <li key={company.id} className="p-3 bg-sky-50 rounded-md shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-sky-800">{company.name}</span>
                                    <span className="font-semibold text-sky-600 text-lg">{company.totalRevenueAcrossORs}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{company.orDetails}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


const ManagementView = ({ 
    players, handleAddMultiplePlayers, handleDeletePlayer, handleEditPlayerName,
    companies, handleAddMultipleCompanies, handleDeleteCompany, handleSelectCompany, selectedCompanyId,
    numORs, setNumORs, handleResetAllORRevenues
}) => {
    const [numPlayersToAdd, setNumPlayersToAdd] = useState(2);
    const [numCompaniesToAdd, setNumCompaniesToAdd] = useState(4);
    const [editingPlayer, setEditingPlayer] = useState(null); 
    const [editingPlayerNameInput, setEditingPlayerNameInput] = useState("");
    
    const startEditPlayerName = (player) => {
        setEditingPlayer(player);
        setEditingPlayerNameInput(player.name);
    };
    const confirmEditPlayerNameModal = () => {
        if (editingPlayer && editingPlayerNameInput.trim()) {
            handleEditPlayerName(editingPlayer.id, editingPlayerNameInput.trim());
        }
        setEditingPlayer(null);
        setEditingPlayerNameInput("");
    };


    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">全般管理</h2>
             {editingPlayer && (
                <Modal 
                    message={`プレイヤー名編集: ${editingPlayer.name}`} 
                    onClose={() => { setEditingPlayer(null); setEditingPlayerNameInput(""); }}
                >
                    <input
                        type="text"
                        value={editingPlayerNameInput}
                        onChange={(e) => setEditingPlayerNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditPlayerNameModal();
                            if (e.key === 'Escape') { setEditingPlayer(null); setEditingPlayerNameInput("");}
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm mt-2"
                        autoFocus
                    />
                     <button onClick={confirmEditPlayerNameModal} className="mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md w-full">保存</button>
                </Modal>
            )}

            <div className="mb-8 p-4 sm:p-6 bg-yellow-50 rounded-xl shadow-md border border-yellow-200">
                <h3 className="text-2xl font-semibold text-yellow-700 mb-4">ゲーム設定</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                    <label htmlFor="numORs" className="font-medium text-gray-700">運営ラウンド(OR)の数:</label>
                    <select id="numORs" value={numORs} onChange={(e) => setNumORs(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-md shadow-sm">
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}回</option>)}
                    </select>
                </div>
                <button onClick={handleResetAllORRevenues} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md shadow">全企業のOR収益をリセット</button>
            </div>

            <div className="mb-8 p-4 sm:p-6 bg-teal-50 rounded-xl shadow-md border border-teal-200">
                <h3 className="text-2xl font-semibold text-teal-700 mb-4">プレイヤー管理</h3>
                <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
                    <div>
                        <label htmlFor="numPlayersToAdd" className="block text-sm font-medium text-gray-700 mb-1">追加するプレイヤー数:</label>
                        <select id="numPlayersToAdd" value={numPlayersToAdd} onChange={(e) => setNumPlayersToAdd(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-md shadow-sm">
                            {[2,3,4,5].map(n => <option key={n} value={n}>{n}名</option>)}
                        </select>
                    </div>
                    <button onClick={() => handleAddMultiplePlayers(numPlayersToAdd)} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-5 rounded-md shadow">プレイヤーを一括追加</button>
                </div>
                {players.length > 0 && (
                    <div>
                        <h4 className="text-lg font-medium text-gray-700 mb-2">登録済みプレイヤー (クリックで名前編集):</h4>
                        <div className="flex flex-wrap gap-2">
                            {players.map(player => (
                                <div key={player.id} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-md shadow-sm border border-gray-200">
                                    <button type="button" onClick={() => startEditPlayerName(player)} className="text-gray-800 cursor-pointer hover:text-blue-600 bg-transparent border-none p-0 font-inherit text-inherit" aria-label={`プレイヤー「${player.name}」の名前を編集`}>{player.name}</button>
                                    <button onClick={() => handleDeletePlayer(player.id)} title={`プレイヤー「${player.name}」を削除`} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-6 bg-sky-50 rounded-xl shadow-md border border-sky-200">
                <h3 className="text-2xl font-semibold text-sky-700 mb-4">企業管理</h3>
                <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
                     <div>
                        <label htmlFor="numCompaniesToAdd" className="block text-sm font-medium text-gray-700 mb-1">追加する企業数:</label>
                        <select id="numCompaniesToAdd" value={numCompaniesToAdd} onChange={(e) => setNumCompaniesToAdd(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-md shadow-sm">
                            {Array.from({length: 9}, (_, i) => i + 4).map(n => <option key={n} value={n}>{n}社</option>)} {/* 4-12社 */}
                        </select>
                    </div>
                    <button onClick={() => handleAddMultipleCompanies(numCompaniesToAdd)} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-5 rounded-md shadow">企業を一括追加 (色名)</button>
                </div>
                {companies.length > 0 && (
                    <div>
                        <h4 className="text-lg font-medium text-gray-700 mb-2">登録済み企業 (クリックで詳細表示):</h4>
                        <div className="flex flex-wrap gap-2">
                            {companies.map(company => (
                                <div key={company.id} className="flex items-center gap-1">
                                    <button onClick={() => handleSelectCompany(company.id)} className={`py-2 px-4 rounded-md text-sm font-medium ${company.id === selectedCompanyId ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300'}`}>{company.name}</button>
                                    <button onClick={() => handleDeleteCompany(company.id)} title={`企業「${company.name}」を削除`} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {companies.length === 0 && <p className="text-center text-gray-500 italic">企業がありません。</p>}
            </div>
        </div>
    );
};

const CompanyDetailView = ({ 
    selectedCompany, companies, players, 
    handleUpdateTrainStops, handleClearTrain, handleDeleteTrain, handleAddNewTrainToCompany,
    handleStockHoldingChange, handleTreasuryStockChange, // Added handleTreasuryStockChange
    handleORRevenueChange, handleSetTrainRevenueToOR,
    numORs, handleSelectCompany, handleEditCompanyName
}) => {
    const [editingCompanyName, setEditingCompanyName] = useState(false);
    const [newCompanyNameInput, setNewCompanyNameInput] = useState("");

    useEffect(() => {
        if (selectedCompany) {
            setNewCompanyNameInput(selectedCompany.name);
        }
    }, [selectedCompany]);

    const confirmEditCompanyName = () => {
        if (selectedCompany && newCompanyNameInput.trim()) {
            handleEditCompanyName(selectedCompany.id, newCompanyNameInput.trim());
        }
        setEditingCompanyName(false);
    };
    
    if (!selectedCompany) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
                <h2 className="text-3xl font-bold text-slate-700 mb-8">企業詳細</h2>
                <p className="text-gray-600 text-lg">企業が選択されていません。管理画面で企業を選択するか、新しい企業を追加してください。</p>
                {companies.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-700 mb-2">または、ここから企業を選択:</h4>
                        <div className="flex flex-wrap justify-center gap-2">
                            {companies.map(company => (
                                <button key={company.id} onClick={() => handleSelectCompany(company.id)} className="py-2 px-4 rounded-md text-sm font-medium bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300">{company.name}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    const currentTrainCalculationRevenue = (selectedCompany.trains || []).reduce((sum, train) => sum + train.stops.reduce((s, stop) => s + stop, 0), 0);
    const totalORRevenueForCompany = (selectedCompany.orRevenues || []).slice(0, numORs).reduce((sum, or) => sum + (or.revenue || 0), 0);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap justify-center gap-2">
                {companies.map(c => (
                    <button 
                        key={c.id} 
                        onClick={() => handleSelectCompany(c.id)}
                        className={`py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${selectedCompany.id === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="p-4 sm:p-6 bg-purple-50 rounded-xl shadow-md border border-purple-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
                    <div>
                        {editingCompanyName ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={newCompanyNameInput} 
                                    onChange={(e) => setNewCompanyNameInput(e.target.value)}
                                    className="p-2 border border-indigo-300 rounded-md text-2xl font-semibold"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && confirmEditCompanyName()}
                                />
                                <button onClick={confirmEditCompanyName} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">✓</button>
                                <button onClick={() => setEditingCompanyName(false)} className="p-2 bg-gray-300 rounded hover:bg-gray-400">✕</button>
                            </div>
                        ) : (
                             <h2 className="text-2xl font-semibold text-slate-700 flex items-center gap-2">
                                <span className="font-bold text-indigo-600">{selectedCompany.name}</span>
                                <button onClick={() => { setNewCompanyNameInput(selectedCompany.name); setEditingCompanyName(true);}} className="text-xs text-blue-500 hover:text-blue-700 p-1">✏️</button>
                            </h2>
                        )}
                        <p className="text-sm text-gray-600 mt-1">記録済OR収益合計: <span className="font-semibold text-green-700 ml-1">{totalORRevenueForCompany}</span></p>
                    </div>
                </div>

                <div className="mb-8 p-4 bg-lime-50 rounded-lg border border-lime-200">
                    <h3 className="text-xl font-semibold text-lime-800 mb-3">運営ラウンド(OR)別収益入力</h3>
                    <div className="space-y-3">
                        {Array.from({ length: numORs }, (_, i) => i + 1).map(orNum => {
                            const orRevenueEntry = (selectedCompany.orRevenues || []).find(or => or.orNum === orNum);
                            const revenue = orRevenueEntry ? orRevenueEntry.revenue : '';
                            return (
                                <div key={orNum} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-white rounded-md shadow-sm">
                                    <label htmlFor={`or${orNum}-revenue-${selectedCompany.id}`} className="font-medium text-gray-700 w-full sm:w-auto whitespace-nowrap">OR {orNum} 収益:</label>
                                    <input type="number" id={`or${orNum}-revenue-${selectedCompany.id}`} value={revenue} onChange={(e) => handleORRevenueChange(selectedCompany.id, orNum, e.target.value)} placeholder="収益額" className="p-2 border border-gray-300 rounded-md shadow-sm flex-grow w-full sm:w-auto"/>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mb-8 p-4 bg-sky-50 rounded-lg border border-sky-200">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-semibold text-sky-800">列車運行による収益計算</h3>
                        <button onClick={() => handleAddNewTrainToCompany(selectedCompany.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md text-sm">新しい列車を追加</button>
                    </div>
                    <p className="text-md text-gray-700 mb-3">現在の列車計算合計: <span className="font-bold text-green-600">{currentTrainCalculationRevenue}</span></p>
                    {currentTrainCalculationRevenue > 0 && numORs > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-sm text-gray-700">この計算結果を記録:</span>
                            {Array.from({ length: numORs }, (_, i) => i + 1).map(orNum => (
                                <button key={orNum} onClick={() => handleSetTrainRevenueToOR(selectedCompany.id, orNum, currentTrainCalculationRevenue)} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md text-xs shadow">OR {orNum}へ</button>
                            ))}
                        </div>
                    )}
                    {(selectedCompany.trains || []).length === 0 && (<p className="text-center text-gray-500 italic my-4">列車がありません。</p>)}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(selectedCompany.trains || []).map((train, index) => (
                            <TrainCard key={train.id} train={train} index={index} 
                                onUpdateTrainStops={(trainId, newStops) => handleUpdateTrainStops(selectedCompany.id, trainId, newStops)}
                                onClearTrain={(trainId) => handleClearTrain(selectedCompany.id, trainId)}
                                onDeleteTrain={(trainId) => handleDeleteTrain(selectedCompany.id, trainId)}
                            />
                        ))}
                    </div>
                </div>

                {/* Stock Holdings Section */}
                <div className="mb-8 p-4 bg-purple-100 rounded-lg">
                    <h3 className="text-xl font-semibold text-purple-800 mb-3">株式保有状況 ({selectedCompany.name})</h3>
                    <div className="space-y-2">
                        {players.map(player => (
                            <PercentageInputControl
                                key={player.id}
                                label={player.name}
                                value={(selectedCompany.stockHoldings || []).find(sh => sh.playerId === player.id)?.percentage || 0}
                                onChange={(newPercentage) => handleStockHoldingChange(selectedCompany.id, player.id, newPercentage)}
                            />
                        ))}
                        {/* Treasury Stock Input */}
                        <PercentageInputControl
                            label="自社株 (Treasury)"
                            value={selectedCompany.treasuryStockPercentage || 0}
                            onChange={(newPercentage) => handleTreasuryStockChange(selectedCompany.id, newPercentage)}
                        />
                    </div>
                </div>


                {/* Dividend Display */}
                { totalORRevenueForCompany > 0 && 
                  ( (selectedCompany.stockHoldings || []).filter(sh => sh.percentage > 0).length > 0 || (selectedCompany.treasuryStockPercentage || 0) > 0 ) && (
                    <div className="mb-8 p-4 bg-green-50 rounded-lg">
                        <h3 className="text-xl font-semibold text-green-800 mb-3">配当金 (全{numORs}OR合計より) ({selectedCompany.name})</h3>
                        <ul className="space-y-2">
                            {(selectedCompany.stockHoldings || []).filter(sh => sh.percentage > 0).map(sh => {
                                const player = players.find(p => p.id === sh.playerId);
                                if (!player) return null;
                                const dividend = Math.floor(totalORRevenueForCompany * (sh.percentage / 100));
                                return (
                                    <li key={sh.playerId} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                        <span className="font-medium text-gray-700">{player.name} ({sh.percentage}%):</span>
                                        <span className="font-semibold text-green-600">{dividend}</span>
                                    </li>
                                );
                            })}
                            {(selectedCompany.treasuryStockPercentage || 0) > 0 && (
                                <li className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                    <span className="font-medium text-gray-700">自社株 ({selectedCompany.treasuryStockPercentage}%):</span>
                                    <span className="font-semibold text-green-600">
                                        {Math.floor(totalORRevenueForCompany * ((selectedCompany.treasuryStockPercentage || 0) / 100))}
                                    </span>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


// Main App Component
function App() {
  const [players, setPlayers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [numORs, setNumORs] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [currentView, setCurrentView] = useState('summary');

  // データの読み込み
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem(APP_STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setPlayers(parsed.players || []);
          setCompanies(parsed.companies || []);
          setSelectedCompanyId(parsed.selectedCompanyId || null);
          setNumORs(parsed.numORs || 2);
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        setModalMessage('データの読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // データの保存
  const saveData = useCallback(() => {
    const dataToSave = {
      players,
      companies,
      selectedCompanyId,
      numORs,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('データ保存エラー:', error);
      setModalMessage('データの保存に失敗しました。');
    }
  }, [players, companies, selectedCompanyId, numORs]);

  // データが変更されたら自動保存
  useEffect(() => {
    if (!isLoading) {
      saveData();
    }
  }, [players, companies, selectedCompanyId, numORs, saveData, isLoading]);

  // --- Player Management ---
  const handleAddMultiplePlayers = (count) => {
    const newPlayers = Array.from({ length: count }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `プレイヤー ${players.length + i + 1}`
    }));
    const updatedPlayers = [...players, ...newPlayers];
    setPlayers(updatedPlayers);
  };

  const handleEditPlayerName = (playerId, newName) => {
    const updatedPlayers = players.map(p => p.id === playerId ? { ...p, name: newName } : p);
    setPlayers(updatedPlayers);
  };

  const handleDeletePlayer = (playerIdToDelete) => {
    const playerName = players.find(p => p.id === playerIdToDelete)?.name;
    setConfirmAction(() => () => { 
      const updatedPlayers = players.filter(p => p.id !== playerIdToDelete);
      const updatedCompanies = companies.map(c => ({
        ...c,
        stockHoldings: (c.stockHoldings || []).filter(sh => sh.playerId !== playerIdToDelete)
      }));
      setPlayers(updatedPlayers);
      setCompanies(updatedCompanies);
      setConfirmAction(null);
      setModalMessage(''); 
    });
    setModalMessage(`プレイヤー「${playerName}」を削除しますか？株式保有情報も削除されます。`);
  };

  // --- Company Management ---
  const handleAddMultipleCompanies = (count) => {
    const newCompanies = Array.from({ length: count }, (_, i) => {
        const companyName = `${defaultCompanyColors[(companies.length + i) % defaultCompanyColors.length]}会社`;
        return {
            id: crypto.randomUUID(),
            name: companyName,
            trains: [],
            stockHoldings: [],
            orRevenues: Array(numORs).fill(null).map((_, orIdx) => ({ orNum: orIdx + 1, revenue: 0 })),
            treasuryStockPercentage: 0 // Initialize treasury stock
        };
    });
    const updatedCompanies = [...companies, ...newCompanies];
    setCompanies(updatedCompanies);
  };
  
  const handleEditCompanyName = (companyId, newName) => {
    const updatedCompanies = companies.map(c => c.id === companyId ? { ...c, name: newName } : c);
    setCompanies(updatedCompanies);
  };

  const handleSelectCompany = (companyId) => {
    setSelectedCompanyId(companyId);
    setCurrentView('companyDetail');
  };

  const handleDeleteCompany = (companyIdToDelete) => {
    const companyName = companies.find(c => c.id === companyIdToDelete)?.name;
    setConfirmAction(() => () => {
        const updatedCompanies = companies.filter(c => c.id !== companyIdToDelete);
        let newSelectedCompanyId = selectedCompanyId;
        if (selectedCompanyId === companyIdToDelete) {
            newSelectedCompanyId = null; 
            setCurrentView('management'); 
        }
        setCompanies(updatedCompanies);
        setSelectedCompanyId(newSelectedCompanyId);
        setConfirmAction(null);
        setModalMessage('');
    });
    setModalMessage(`企業「${companyName}」を削除しますか？関連データも全て削除されます。`);
  };

  // --- Stock Holding Management ---
  const handleStockHoldingChange = (companyId, playerId, newPercentage) => {
    const updatedCompanies = companies.map(c => {
        if (c.id === companyId) {
            const existingHoldingIndex = (c.stockHoldings || []).findIndex(sh => sh.playerId === playerId);
            let newHoldings = [...(c.stockHoldings || [])];
            if (newPercentage === 0 || newPercentage === null || newPercentage === undefined) { 
                newHoldings = newHoldings.filter(sh => sh.playerId !== playerId);
            } else if (existingHoldingIndex > -1) {
                newHoldings[existingHoldingIndex] = { ...newHoldings[existingHoldingIndex], percentage: newPercentage };
            } else {
                newHoldings.push({ playerId, percentage: newPercentage });
            }
            return { ...c, stockHoldings: newHoldings };
        }
        return c;
    });
    setCompanies(updatedCompanies);
  };
  
  const handleTreasuryStockChange = (companyId, newPercentage) => {
    const updatedCompanies = companies.map(c => 
        c.id === companyId ? { ...c, treasuryStockPercentage: newPercentage } : c
    );
    setCompanies(updatedCompanies);
  };
  
  // --- OR Revenue Management ---
  const handleORRevenueChange = (companyId, orNum, revenueStr) => {
    const revenue = parseInt(revenueStr);
     if (isNaN(revenue) && revenueStr !== '') { setModalMessage("OR収益には数値を入力してください。"); return; }
    const updatedCompanies = companies.map(c => {
        if (c.id === companyId) {
            let currentOrRevenues = c.orRevenues || Array(numORs).fill(null).map((_, idx) => ({ orNum: idx + 1, revenue: 0 }));
            let adjustedORRevenues = Array(numORs).fill(null).map((_, idx) => {
                const orNumToFind = idx + 1;
                const existing = currentOrRevenues.find(or => or.orNum === orNumToFind);
                return existing || { orNum: orNumToFind, revenue: 0 };
            });

            const orIndex = adjustedORRevenues.findIndex(or => or.orNum === orNum);
            if (orIndex > -1) {
                adjustedORRevenues[orIndex] = { ...adjustedORRevenues[orIndex], revenue: revenueStr === '' ? 0 : revenue };
            } 
            return { ...c, orRevenues: adjustedORRevenues };
        }
        return c;
    });
    setCompanies(updatedCompanies);
  };

  const handleSetTrainRevenueToOR = (companyId, orNum, trainRevenue) => {
    handleORRevenueChange(companyId, orNum, trainRevenue.toString());
    setModalMessage(`列車計算収益 ${trainRevenue} を OR ${orNum} に記録しました。`);
  };
  
  const handleResetAllORRevenues = () => {
    setConfirmAction(() => () => {
        const updatedCompanies = companies.map(c => ({
            ...c,
            orRevenues: Array(numORs).fill(null).map((_, idx) => ({ orNum: idx + 1, revenue: 0 }))
        }));
        setCompanies(updatedCompanies);
        setModalMessage("全企業のOR収益がリセットされました。");
        setConfirmAction(null);
        setModalMessage('');
    });
    setModalMessage("本当に全企業の全OR収益を0にリセットしますか？(次のSR準備用)");
  };

  // --- Train Manipulation ---
  const handleAddNewTrainToCompany = (companyId) => {
    const newTrain = { id: crypto.randomUUID(), stops: [] }; 
    const updatedCompanies = companies.map(c => 
      c.id === companyId ? { ...c, trains: [...(c.trains || []), newTrain] } : c
    );
    setCompanies(updatedCompanies);
  };

  const handleUpdateTrainStops = (companyId, trainId, newStops) => {
    const updatedCompanies = companies.map(c => {
      if (c.id === companyId) {
        const updatedTrains = (c.trains || []).map(t => 
          t.id === trainId ? { ...t, stops: newStops } : t 
        );
        return { ...c, trains: updatedTrains };
      }
      return c;
    });
    setCompanies(updatedCompanies);
  };
  
  const handleClearTrain = (companyId, trainId) => {
    handleUpdateTrainStops(companyId, trainId, []); 
  };

  const handleDeleteTrain = (companyId, trainId) => {
    const updatedCompanies = companies.map(c => {
      if (c.id === companyId) {
        return { ...c, trains: (c.trains || []).filter(t => t.id !== trainId) };
      }
      return c;
    });
    setCompanies(updatedCompanies);
  };
  
  // ローディング中の表示（ここに挿入）
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">読み込み中...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-8 font-sans">
      <Modal 
        message={modalMessage} 
        onClose={() => { setModalMessage(''); setConfirmAction(null); setModalContent(null);}}
        showConfirm={!!confirmAction}
        onConfirm={() => { if(confirmAction) confirmAction(); setModalMessage(''); setModalContent(null);}}
        confirmText={ modalContent ? "保存" : (confirmAction ? "OK" : "閉じる") } 
      >
          {modalContent}
      </Modal>
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">18xx 収益計算補助</h1>
      </header>

      <nav className="max-w-4xl mx-auto mb-6 flex justify-center space-x-1 sm:space-x-2 border-b-2 border-indigo-500 pb-px">
        <NavButton viewName="summary" currentView={currentView} setCurrentView={setCurrentView}>サマリー</NavButton>
        <NavButton viewName="management" currentView={currentView} setCurrentView={setCurrentView}>全般管理</NavButton>
        <NavButton viewName="companyDetail" currentView={currentView} setCurrentView={setCurrentView}>企業詳細</NavButton>
      </nav>

      {currentView === 'summary' && <SummaryView players={players} companies={companies} numORs={numORs} />}
      
      {currentView === 'management' && (
        <ManagementView
          players={players} 
          handleAddMultiplePlayers={handleAddMultiplePlayers} 
          handleDeletePlayer={handleDeletePlayer}
          handleEditPlayerName={handleEditPlayerName}
          companies={companies} 
          handleAddMultipleCompanies={handleAddMultipleCompanies} 
          handleDeleteCompany={handleDeleteCompany}
          handleSelectCompany={handleSelectCompany} 
          selectedCompanyId={selectedCompanyId} 
          numORs={numORs} 
          setNumORs={(newNumORs) => {
            const adjustedCompanies = companies.map(c => {
              const currentOrRevenues = c.orRevenues || [];
              const updatedOrRevenues = Array(newNumORs).fill(null).map((_, idx) => {
                const orNumToFind = idx + 1;
                const existing = currentOrRevenues.find(or => or.orNum === orNumToFind);
                return existing || { orNum: orNumToFind, revenue: 0 };
              });
              return { ...c, orRevenues: updatedOrRevenues };
            });
            setNumORs(newNumORs);
            setCompanies(adjustedCompanies);
          }}
          handleResetAllORRevenues={handleResetAllORRevenues}
        />
      )}
      
      {currentView === 'companyDetail' && (
        <CompanyDetailView
          selectedCompany={companies.find(c => c.id === selectedCompanyId)}
          companies={companies} 
          players={players}
          handleAddNewTrainToCompany={handleAddNewTrainToCompany}
          handleUpdateTrainStops={handleUpdateTrainStops}
          handleClearTrain={handleClearTrain}
          handleDeleteTrain={handleDeleteTrain}
          handleStockHoldingChange={handleStockHoldingChange}
          handleTreasuryStockChange={handleTreasuryStockChange} // Pass new handler
          handleORRevenueChange={handleORRevenueChange}
          handleSetTrainRevenueToOR={handleSetTrainRevenueToOR}
          numORs={numORs}
          handleSelectCompany={handleSelectCompany} 
          handleEditCompanyName={handleEditCompanyName}
        />
      )}

      <footer className="text-center mt-12 py-4 border-t border-slate-300">
        <p className="text-sm text-slate-600">&copy; 2024-2025 18xx 収益計算ツール</p>
      </footer>
    </div>
  );
}

export default App;
