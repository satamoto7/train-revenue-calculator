import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { load as loadAppState, save as saveAppState } from './storage/appStorage';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import SummaryView from './views/summary/SummaryView';
import ManagementView from './views/management/ManagementView';
import CompanyDetailView from './views/company-detail/CompanyDetailView';

// Default company colors for quick add
const defaultCompanyColors = [
  '赤',
  '青',
  '緑',
  '黄',
  '黒',
  '白',
  '橙',
  '紫',
  '桃',
  '茶',
  '空',
  '灰',
];

const initialAppState = {
  players: [],
  companies: [],
  selectedCompanyId: null,
  numORs: 2,
  currentView: 'summary',
};

const buildORRevenues = (numORs, currentOrRevenues = []) =>
  Array.from({ length: numORs }, (_, idx) => {
    const orNum = idx + 1;
    const existing = currentOrRevenues.find((or) => or.orNum === orNum);
    return existing || { orNum, revenue: 0 };
  });

function appReducer(state, action) {
  switch (action.type) {
    case 'PLAYER_SET_ALL':
      return { ...state, players: action.payload };
    case 'COMPANY_SET_ALL':
      return { ...state, companies: action.payload };
    case 'COMPANY_SELECT':
      return { ...state, selectedCompanyId: action.payload };
    case 'OR_SET_NUM': {
      const numORs = action.payload;
      const companies = state.companies.map((company) => ({
        ...company,
        orRevenues: buildORRevenues(numORs, company.orRevenues || []),
      }));
      return { ...state, numORs, companies };
    }
    case 'VIEW_SET':
      return { ...state, currentView: action.payload };
    case 'APP_LOAD': {
      const next = action.payload;
      return {
        ...state,
        players: next.players || [],
        companies: next.companies || [],
        selectedCompanyId: next.selectedCompanyId || null,
        numORs: next.numORs || 2,
        currentView: next.currentView || state.currentView,
      };
    }
    default:
      return state;
  }
}

// --- Helper Components ---

const NavButton = ({ viewName, currentView, setCurrentView, children }) => {
  const isActive = currentView === viewName;
  return (
    <Button
      type="button"
      onClick={() => setCurrentView(viewName)}
      variant={isActive ? 'primary' : 'secondary'}
      className="flex min-w-[130px] flex-col items-center rounded-t-lg rounded-b-none px-4 py-2 font-medium shadow-none"
    >
      <span>{children}</span>
    </Button>
  );
};

// Main App Component
function App() {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const { players, companies, selectedCompanyId, numORs, currentView } = appState;

  const setPlayers = useCallback(
    (nextValue) => {
      dispatch({
        type: 'PLAYER_SET_ALL',
        payload: typeof nextValue === 'function' ? nextValue(appState.players) : nextValue,
      });
    },
    [appState.players]
  );

  const setCompanies = useCallback(
    (nextValue) => {
      dispatch({
        type: 'COMPANY_SET_ALL',
        payload: typeof nextValue === 'function' ? nextValue(appState.companies) : nextValue,
      });
    },
    [appState.companies]
  );

  const setSelectedCompanyId = useCallback(
    (nextValue) => {
      dispatch({
        type: 'COMPANY_SELECT',
        payload:
          typeof nextValue === 'function' ? nextValue(appState.selectedCompanyId) : nextValue,
      });
    },
    [appState.selectedCompanyId]
  );

  const setCurrentView = useCallback(
    (nextValue) => {
      dispatch({
        type: 'VIEW_SET',
        payload: typeof nextValue === 'function' ? nextValue(appState.currentView) : nextValue,
      });
    },
    [appState.currentView]
  );

  const setNumORs = useCallback(
    (nextValue) => {
      dispatch({
        type: 'OR_SET_NUM',
        payload: typeof nextValue === 'function' ? nextValue(appState.numORs) : nextValue,
      });
    },
    [appState.numORs]
  );

  // データの読み込み
  useEffect(() => {
    const loadData = () => {
      try {
        const loadedState = loadAppState();
        if (loadedState) {
          dispatch({
            type: 'APP_LOAD',
            payload: loadedState,
          });
          if (
            (loadedState.players || []).length === 0 &&
            (loadedState.companies || []).length === 0
          ) {
            dispatch({ type: 'VIEW_SET', payload: 'management' });
          }
        } else {
          dispatch({ type: 'VIEW_SET', payload: 'management' });
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
    try {
      saveAppState({
        players,
        companies,
        selectedCompanyId,
        numORs,
      });
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
      name: `プレイヤー ${players.length + i + 1}`,
    }));
    const updatedPlayers = [...players, ...newPlayers];
    setPlayers(updatedPlayers);
  };

  const handleEditPlayerName = (playerId, newName) => {
    const updatedPlayers = players.map((p) => (p.id === playerId ? { ...p, name: newName } : p));
    setPlayers(updatedPlayers);
  };

  const handleDeletePlayer = (playerIdToDelete) => {
    const playerName = players.find((p) => p.id === playerIdToDelete)?.name;
    setConfirmAction(() => () => {
      const updatedPlayers = players.filter((p) => p.id !== playerIdToDelete);
      const updatedCompanies = companies.map((c) => ({
        ...c,
        stockHoldings: (c.stockHoldings || []).filter((sh) => sh.playerId !== playerIdToDelete),
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
        orRevenues: Array(numORs)
          .fill(null)
          .map((_, orIdx) => ({ orNum: orIdx + 1, revenue: 0 })),
        treasuryStockPercentage: 0, // Initialize treasury stock
      };
    });
    const updatedCompanies = [...companies, ...newCompanies];
    setCompanies(updatedCompanies);
  };

  const handleEditCompanyName = (companyId, newName) => {
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, name: newName } : c
    );
    setCompanies(updatedCompanies);
  };

  const handleSelectCompany = (companyId) => {
    setSelectedCompanyId(companyId);
    setCurrentView('companyDetail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCompany = (companyIdToDelete) => {
    const companyName = companies.find((c) => c.id === companyIdToDelete)?.name;
    setConfirmAction(() => () => {
      const updatedCompanies = companies.filter((c) => c.id !== companyIdToDelete);
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
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        const existingHoldingIndex = (c.stockHoldings || []).findIndex(
          (sh) => sh.playerId === playerId
        );
        let newHoldings = [...(c.stockHoldings || [])];
        if (newPercentage === 0 || newPercentage === null || newPercentage === undefined) {
          newHoldings = newHoldings.filter((sh) => sh.playerId !== playerId);
        } else if (existingHoldingIndex > -1) {
          newHoldings[existingHoldingIndex] = {
            ...newHoldings[existingHoldingIndex],
            percentage: newPercentage,
          };
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
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, treasuryStockPercentage: newPercentage } : c
    );
    setCompanies(updatedCompanies);
  };

  // --- OR Revenue Management ---
  const handleORRevenueChange = (companyId, orNum, revenueStr) => {
    const revenue = parseInt(revenueStr);
    if (isNaN(revenue) && revenueStr !== '') {
      setModalMessage('OR収益には数値を入力してください。');
      return;
    }
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        let currentOrRevenues =
          c.orRevenues ||
          Array(numORs)
            .fill(null)
            .map((_, idx) => ({ orNum: idx + 1, revenue: 0 }));
        let adjustedORRevenues = Array(numORs)
          .fill(null)
          .map((_, idx) => {
            const orNumToFind = idx + 1;
            const existing = currentOrRevenues.find((or) => or.orNum === orNumToFind);
            return existing || { orNum: orNumToFind, revenue: 0 };
          });

        const orIndex = adjustedORRevenues.findIndex((or) => or.orNum === orNum);
        if (orIndex > -1) {
          adjustedORRevenues[orIndex] = {
            ...adjustedORRevenues[orIndex],
            revenue: revenueStr === '' ? 0 : revenue,
          };
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
      const updatedCompanies = companies.map((c) => ({
        ...c,
        orRevenues: Array(numORs)
          .fill(null)
          .map((_, idx) => ({ orNum: idx + 1, revenue: 0 })),
      }));
      setCompanies(updatedCompanies);
      setModalMessage('全企業のOR収益がリセットされました。');
      setConfirmAction(null);
      setModalMessage('');
    });
    setModalMessage('本当に全企業の全OR収益を0にリセットしますか？(次のSR準備用)');
  };

  // --- Train Manipulation ---
  const handleAddNewTrainToCompany = (companyId) => {
    const newTrain = { id: crypto.randomUUID(), stops: [] };
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, trains: [...(c.trains || []), newTrain] } : c
    );
    setCompanies(updatedCompanies);
  };

  const handleUpdateTrainStops = (companyId, trainId, newStops) => {
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        const updatedTrains = (c.trains || []).map((t) =>
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
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        return { ...c, trains: (c.trains || []).filter((t) => t.id !== trainId) };
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
        onClose={() => {
          setModalMessage('');
          setConfirmAction(null);
          setModalContent(null);
        }}
        showConfirm={!!confirmAction}
        onConfirm={() => {
          if (confirmAction) confirmAction();
          setModalMessage('');
          setModalContent(null);
        }}
        confirmText={modalContent ? '保存' : confirmAction ? 'OK' : '閉じる'}
      >
        {modalContent}
      </Modal>
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">18xx 収益計算補助</h1>
      </header>

      <nav className="max-w-4xl mx-auto mb-6 flex justify-center space-x-1 sm:space-x-2 border-b-2 border-indigo-500 pb-px">
        <NavButton viewName="summary" currentView={currentView} setCurrentView={setCurrentView}>
          サマリー
        </NavButton>
        <NavButton viewName="management" currentView={currentView} setCurrentView={setCurrentView}>
          全般管理
        </NavButton>
        <NavButton
          viewName="companyDetail"
          currentView={currentView}
          setCurrentView={setCurrentView}
        >
          企業詳細
        </NavButton>
      </nav>

      {currentView === 'summary' && (
        <SummaryView
          players={players}
          companies={companies}
          numORs={numORs}
          onNavigateToManagement={() => setCurrentView('management')}
        />
      )}

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
          setNumORs={setNumORs}
          handleResetAllORRevenues={handleResetAllORRevenues}
        />
      )}

      {currentView === 'companyDetail' && (
        <CompanyDetailView
          selectedCompany={companies.find((c) => c.id === selectedCompanyId)}
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
