import React, { useEffect, useState } from 'react';
import {
  calculateTrainRevenue,
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateDividend,
} from '../../lib/calc';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  COMPANY_COLOR_OPTIONS,
  COMPANY_SYMBOL_OPTIONS,
  getColorTextClass,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerDisplayName,
} from '../../lib/labels';

const RevenueStopEditor = ({
  stop,
  index,
  trainId,
  onUpdateStop,
  onDeleteStop,
  onInsertStopBefore,
  activeStopKey,
  onSetActiveStop,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stop.toString());

  useEffect(() => {
    setEditValue(stop.toString());
  }, [stop]);

  const myKey = `${trainId}-${index}`;
  const isThisActive = activeStopKey === myKey;

  // Mobile: hidden by default, shown when active. Desktop: opacity transition on group-hover.
  const mobileShowClass = isThisActive ? '' : 'hidden sm:inline-flex';
  const mobileShowRowClass = isThisActive ? 'flex' : 'hidden sm:flex';
  const hoverClass =
    'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity';

  const handleUpdate = () => {
    const newValue = parseInt(editValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onUpdateStop(index, newValue);
    } else {
      setEditValue(stop.toString());
    }
    setIsEditing(false);
  };

  const quickChange = (amount) => {
    onUpdateStop(index, Math.max(0, stop + amount));
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 p-1 bg-brand-accent-soft rounded">
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-20 sm:w-16 border-border-strong p-1"
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
        <Button
          type="button"
          onClick={handleUpdate}
          size="md"
          className="px-2 py-1 text-ui-xs bg-status-success hover:brightness-95"
        >
          ✓
        </Button>
        <Button
          type="button"
          onClick={() => {
            setEditValue(stop.toString());
            setIsEditing(false);
          }}
          variant="secondary"
          className="px-2 py-1 text-ui-xs"
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center group relative ${isThisActive ? 'z-10' : ''} sm:hover:z-10`}
    >
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          onClick={() => onInsertStopBefore(index)}
          variant="ghost"
          className={`h-8 w-8 p-0 text-ui-sm text-status-info border border-border-strong hover:bg-brand-accent-soft rounded-full ${mobileShowClass} ${hoverClass}`}
          aria-label={`地点${index}の前に挿入`}
        >
          +
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-w-[2.5rem] min-h-[2.5rem] p-2 text-sm text-center font-mono"
          onClick={() => {
            if (isThisActive) {
              setIsEditing(true);
            } else {
              onSetActiveStop(myKey);
            }
          }}
          aria-label={`収益地点 ${stop} を編集`}
        >
          {stop}
        </Button>
        <Button
          type="button"
          onClick={() => onDeleteStop(index)}
          variant="danger"
          className={`h-8 w-8 p-0 text-ui-sm rounded-full ${mobileShowClass} ${hoverClass}`}
          aria-label={`地点${index}を削除`}
        >
          &times;
        </Button>
      </div>
      <div className={`gap-0.5 mt-0.5 ${mobileShowRowClass} ${hoverClass}`}>
        <Button
          type="button"
          onClick={() => quickChange(10)}
          className="px-1.5 py-0.5 text-ui-xs rounded-full bg-status-success hover:brightness-95"
          aria-label={`${stop} を +10`}
        >
          +10
        </Button>
        <Button
          type="button"
          onClick={() => quickChange(-10)}
          variant="danger"
          className="px-1.5 py-0.5 text-ui-xs rounded-full"
          aria-label={`${stop} を -10`}
        >
          -10
        </Button>
      </div>
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
      console.warn('無効なカスタム値です。数値を入力してください。');
    }
  };

  return (
    <div className="mt-2 p-3 bg-brand-accent-soft rounded-md border border-border-strong">
      <p className="text-ui-sm font-medium text-text-secondary mb-1.5">
        新しい収益地点を末尾に追加:
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-1 mb-2">
        {revenueValues.map((value) => (
          <Button
            type="button"
            key={value}
            onClick={() => onAddStop(value)}
            className="py-2 px-3 sm:py-1 sm:px-2 text-ui-sm sm:text-ui-xs"
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="カスタム値"
          aria-label="カスタム収益値"
          className="flex-grow"
        />
        <Button type="button" onClick={handleAddCustom} className="py-1.5 px-3 text-ui-sm">
          追加
        </Button>
      </div>
    </div>
  );
};

const TrainCard = ({ train, index, onUpdateTrainStops, onClearTrain, onDeleteTrain }) => {
  const [showRevenueInput, setShowRevenueInput] = useState(train.stops.length === 0);
  const [activeStopKey, setActiveStopKey] = useState(null);

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
    setActiveStopKey(null);
  };

  const handleInsertStopBefore = (stopIndex) => {
    const newStops = [...train.stops];
    newStops.splice(stopIndex, 0, 0);
    onUpdateTrainStops(train.id, newStops);
    setActiveStopKey(null);
  };

  const handleSetActiveStop = (key) => {
    setActiveStopKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="bg-surface-elevated p-4 sm:p-6 rounded-xl shadow-lg border border-border-subtle">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-brand-primary">列車 {index + 1}</h3>
        <Button
          type="button"
          onClick={() => onDeleteTrain(train.id)}
          variant="danger"
          className="text-ui-sm"
        >
          削除
        </Button>
      </div>

      <div className="mb-3 min-h-[60px]">
        <p className="text-ui-sm font-medium text-text-secondary mb-1">
          運行経路 (タップ/ホバーで操作):
        </p>
        {train.stops.length > 0 ? (
          <div className="flex flex-wrap items-start gap-2 sm:gap-3">
            {train.stops.map((stop, idx) => (
              <React.Fragment key={idx}>
                <RevenueStopEditor
                  stop={stop}
                  index={idx}
                  trainId={train.id}
                  onUpdateStop={handleUpdateStop}
                  onDeleteStop={handleDeleteStop}
                  onInsertStopBefore={handleInsertStopBefore}
                  activeStopKey={activeStopKey}
                  onSetActiveStop={handleSetActiveStop}
                />
                {idx < train.stops.length - 1 && (
                  <span className="text-text-muted text-xs self-start mt-3">+</span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-text-muted italic text-sm">地点未追加</p>
        )}
        <Button
          type="button"
          onClick={() => setShowRevenueInput((s) => !s)}
          variant="ghost"
          className="mt-2 px-2 py-1 text-ui-xs"
        >
          {showRevenueInput ? '入力欄を閉じる' : '収益地点を末尾に追加'}
        </Button>
        {showRevenueInput && <RevenueInput onAddStop={handleAddStopToEnd} />}
      </div>

      <div className="mb-4 text-lg font-bold text-text-primary">
        計算中の列車収益:{' '}
        <span className="text-status-success">{calculateTrainRevenue(train.stops)}</span>
      </div>
      <Button
        type="button"
        onClick={() => onClearTrain(train.id)}
        variant="danger"
        className="mt-2 w-full text-ui-sm"
      >
        この列車の経路をクリア
      </Button>
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 bg-surface-elevated rounded-md shadow-sm">
      <span className="font-medium text-text-secondary w-full sm:w-auto sm:min-w-[80px]">
        {label}:
      </span>
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <Button
          type="button"
          onClick={() => adjustValue(-10)}
          variant="secondary"
          className="p-1.5 text-ui-sm font-mono"
        >
          -10
        </Button>
        <Input
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={`${label}の保有割合`}
          className="w-20 text-center sm:w-16"
        />
        <Button
          type="button"
          onClick={() => adjustValue(10)}
          variant="secondary"
          className="p-1.5 text-ui-sm font-mono"
        >
          +10
        </Button>
        <Button type="button" onClick={() => quickSetValue(50)} className="p-1.5 text-ui-xs">
          50%
        </Button>
        <span className="text-text-secondary text-ui-sm">%</span>
      </div>
    </div>
  );
};

const CompanyDetailView = ({
  selectedCompany,
  companies,
  players,
  handleUpdateTrainStops,
  handleClearTrain,
  handleDeleteTrain,
  handleAddNewTrainToCompany,
  handleStockHoldingChange,
  handleTreasuryStockChange, // Added handleTreasuryStockChange
  handleORRevenueChange,
  handleSetTrainRevenueToOR,
  numORs,
  handleSelectCompany,
  handleEditCompanyName,
  handleEditCompanySymbol,
  handleEditCompanyColor,
}) => {
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [newCompanyNameInput, setNewCompanyNameInput] = useState('');
  const [showTrains, setShowTrains] = useState(true);
  const [showStockHoldings, setShowStockHoldings] = useState(false);
  const [showDividends, setShowDividends] = useState(false);
  const [orRevenueDrafts, setOrRevenueDrafts] = useState({});

  useEffect(() => {
    if (selectedCompany) {
      setNewCompanyNameInput(selectedCompany.displayName || '');
    }
  }, [selectedCompany]);

  useEffect(() => {
    setOrRevenueDrafts({});
  }, [numORs, selectedCompany?.id]);

  const confirmEditCompanyName = () => {
    if (selectedCompany) {
      handleEditCompanyName(selectedCompany.id, newCompanyNameInput.trim());
    }
    setEditingCompanyName(false);
  };

  if (!selectedCompany) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <SectionHeader size="page" className="mb-8 text-brand-primary">
          企業詳細
        </SectionHeader>
        <p className="text-text-secondary text-lg">
          企業が選択されていません。管理画面で企業を選択するか、新しい企業を追加してください。
        </p>
        {companies.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-text-secondary mb-2">
              または、ここから企業を選択:
            </h4>
            <div className="flex flex-wrap justify-center gap-2">
              {companies.map((company) => (
                <Button
                  type="button"
                  key={company.id}
                  onClick={() => handleSelectCompany(company.id)}
                  variant="secondary"
                  className="py-2 px-4 text-sm text-brand-primary border border-border-strong"
                >
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`text-base leading-none ${getColorTextClass(getCompanyColor(company))}`}
                    >
                      {getCompanySymbol(company)}
                    </span>
                    <span className="text-ui-xs text-text-muted">({getCompanyColor(company)})</span>
                    <span>{getCompanyDisplayName(company)}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentTrainCalculationRevenue = calculateCompanyTrainRevenue(selectedCompany.trains);
  const totalORRevenueForCompany = calculateCompanyTotalORRevenue(
    selectedCompany.orRevenues,
    numORs
  );
  const getORRevenueDraftKey = (companyId, orNum) => `${companyId}:${orNum}`;

  const clearORRevenueDraft = (companyId, orNum) => {
    const key = getORRevenueDraftKey(companyId, orNum);
    setOrRevenueDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const commitORRevenueDraft = (companyId, orNum, currentRevenue) => {
    const key = getORRevenueDraftKey(companyId, orNum);
    const raw = key in orRevenueDrafts ? `${orRevenueDrafts[key]}` : `${currentRevenue}`;
    const trimmed = raw.trim();
    if (trimmed === '') {
      clearORRevenueDraft(companyId, orNum);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      clearORRevenueDraft(companyId, orNum);
      return;
    }
    handleORRevenueChange(companyId, orNum, Math.max(0, parsed));
    clearORRevenueDraft(companyId, orNum);
  };

  const getORRevenueInputValue = (companyId, orNum, currentRevenue) => {
    const key = getORRevenueDraftKey(companyId, orNum);
    return key in orRevenueDrafts ? orRevenueDrafts[key] : currentRevenue;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <SectionHeader size="section" as="h3" className="mb-3 text-brand-primary">
        設定
      </SectionHeader>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {companies.map((c) => {
          const hasRevenue = (c.orRevenues || []).some((or) => (or.revenue || 0) > 0);
          const isSelected = selectedCompany.id === c.id;
          let pillClass;
          let statusLabel;
          if (isSelected) {
            pillClass = 'bg-brand-primary text-white shadow-md';
            statusLabel = '選択中';
          } else if (hasRevenue) {
            pillClass =
              'bg-surface-muted text-brand-primary border border-border-subtle hover:bg-brand-soft';
            statusLabel = '収益あり';
          } else {
            pillClass = 'bg-surface-muted text-brand-primary hover:bg-brand-soft';
            statusLabel = '未入力';
          }
          return (
            <Button
              type="button"
              key={c.id}
              onClick={() => handleSelectCompany(c.id)}
              variant="secondary"
              className={`min-h-11 py-1.5 px-3 rounded-md text-ui-xs sm:text-ui-sm font-medium transition-colors ${pillClass}`}
            >
              <span className="block leading-tight">
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`text-base leading-none ${getColorTextClass(getCompanyColor(c))}`}
                  >
                    {getCompanySymbol(c)}
                  </span>
                  <span className="text-[10px] sm:text-ui-xs text-text-muted">
                    ({getCompanyColor(c)})
                  </span>
                  <span>{getCompanyDisplayName(c)}</span>
                </span>
              </span>
              <span className="block text-[10px] sm:text-ui-xs opacity-90">{statusLabel}</span>
            </Button>
          );
        })}
      </div>
      {companies.length > 1 &&
        (() => {
          const currentCompanyIndex = companies.findIndex((c) => c.id === selectedCompany.id);
          return (
            <div className="mb-6 flex justify-between items-center max-w-sm mx-auto gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (currentCompanyIndex > 0)
                    handleSelectCompany(companies[currentCompanyIndex - 1].id);
                }}
                disabled={currentCompanyIndex === 0}
                variant="secondary"
                className="py-1.5 px-2 sm:px-3 text-ui-xs sm:text-ui-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← 前の企業
              </Button>
              <span className="text-ui-xs sm:text-ui-sm text-text-secondary whitespace-nowrap">
                {currentCompanyIndex + 1} / {companies.length}
              </span>
              <Button
                type="button"
                onClick={() => {
                  if (currentCompanyIndex < companies.length - 1)
                    handleSelectCompany(companies[currentCompanyIndex + 1].id);
                }}
                disabled={currentCompanyIndex === companies.length - 1}
                className="py-1.5 px-2 sm:px-3 text-ui-xs sm:text-ui-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                次の企業 →
              </Button>
            </div>
          );
        })()}

      <div className="p-4 sm:p-6 bg-surface-elevated rounded-xl shadow-md border border-border-subtle">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
          <div>
            {editingCompanyName ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newCompanyNameInput}
                  onChange={(e) => setNewCompanyNameInput(e.target.value)}
                  className="border-border-strong text-2xl font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmEditCompanyName()}
                />
                <Button
                  type="button"
                  onClick={confirmEditCompanyName}
                  className="p-2 bg-status-success hover:brightness-95"
                >
                  ✓
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditingCompanyName(false)}
                  variant="secondary"
                  className="p-2"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <h2 className="text-2xl font-semibold text-brand-primary flex items-center gap-2">
                <span
                  className={`text-xl leading-none ${getColorTextClass(getCompanyColor(selectedCompany))}`}
                  aria-hidden="true"
                >
                  {getCompanySymbol(selectedCompany)}
                </span>
                <span className="font-bold text-brand-accent">
                  {getCompanyDisplayName(selectedCompany)}
                </span>
                <span className="text-ui-xs text-text-muted">
                  ({getCompanyColor(selectedCompany)})
                </span>
                <Button
                  type="button"
                  onClick={() => {
                    setNewCompanyNameInput(selectedCompany.displayName || '');
                    setEditingCompanyName(true);
                  }}
                  variant="ghost"
                  className="text-xs p-1 shadow-none"
                >
                  ✏️
                </Button>
              </h2>
            )}
            <div className="mt-3 rounded-lg border border-border-subtle bg-surface-muted p-3">
              <p className="text-ui-xs text-text-secondary mb-2">
                ここで選んだ記号・色は、企業一覧やサマリーにも表示されます。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="company-symbol" className="text-sm text-text-secondary">
                  記号:
                </label>
                <select
                  id="company-symbol"
                  value={selectedCompany.symbol || '○'}
                  onChange={(e) => handleEditCompanySymbol(selectedCompany.id, e.target.value)}
                  className="rounded border border-border-subtle bg-surface-elevated px-2 py-1 text-sm"
                >
                  {COMPANY_SYMBOL_OPTIONS.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
                <label htmlFor="company-color" className="text-sm text-text-secondary">
                  色:
                </label>
                <select
                  id="company-color"
                  value={selectedCompany.color || '赤'}
                  onChange={(e) => handleEditCompanyColor(selectedCompany.id, e.target.value)}
                  className="rounded border border-border-subtle bg-surface-elevated px-2 py-1 text-sm"
                >
                  {COMPANY_COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              記録済OR収益合計:{' '}
              <span className="font-semibold text-status-success ml-1">
                {totalORRevenueForCompany}
              </span>
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {Array.from({ length: numORs }, (_, i) => i + 1).map((orNum) => {
            const orRevenueEntry = (selectedCompany.orRevenues || []).find(
              (or) => or.orNum === orNum
            );
            const revenue = orRevenueEntry ? orRevenueEntry.revenue : 0;
            const draftKey = getORRevenueDraftKey(selectedCompany.id, orNum);
            return (
              <div key={orNum} className="flex items-center gap-1">
                <label
                  htmlFor={`or${orNum}-revenue-${selectedCompany.id}`}
                  className="text-sm font-medium text-text-secondary whitespace-nowrap"
                >
                  OR{orNum}:
                </label>
                <Input
                  type="number"
                  id={`or${orNum}-revenue-${selectedCompany.id}`}
                  value={getORRevenueInputValue(selectedCompany.id, orNum, revenue)}
                  onChange={(e) =>
                    setOrRevenueDrafts((prev) => ({
                      ...prev,
                      [draftKey]: e.target.value,
                    }))
                  }
                  onBlur={() => commitORRevenueDraft(selectedCompany.id, orNum, revenue)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    commitORRevenueDraft(selectedCompany.id, orNum, revenue);
                  }}
                  placeholder="0"
                  className="w-24 text-sm"
                />
              </div>
            );
          })}
        </div>

        <SectionHeader size="section" as="h3" className="mb-3 text-brand-primary">
          入力
        </SectionHeader>
        <div className="mb-8 p-4 bg-brand-accent-soft rounded-lg border border-border-strong">
          <Button
            type="button"
            onClick={() => setShowTrains((s) => !s)}
            variant="ghost"
            className="flex justify-between items-center w-full mb-1 px-0 shadow-none"
          >
            <h3 className="text-xl font-semibold text-brand-primary">列車運行による収益計算</h3>
            <span className="text-sm text-brand-accent">{showTrains ? '▼' : '▶'}</span>
          </Button>
          <p className="text-sm text-text-secondary mb-3">
            列車計算合計:{' '}
            <span className="font-bold text-status-success">{currentTrainCalculationRevenue}</span>
          </p>
          {showTrains && (
            <>
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  onClick={() => handleAddNewTrainToCompany(selectedCompany.id)}
                  className="py-2 px-4 text-sm"
                >
                  新しい列車を追加
                </Button>
              </div>
              {currentTrainCalculationRevenue > 0 && numORs > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-text-secondary">この計算結果を記録:</span>
                  {Array.from({ length: numORs }, (_, i) => i + 1).map((orNum) => (
                    <Button
                      type="button"
                      key={orNum}
                      onClick={() =>
                        handleSetTrainRevenueToOR(
                          selectedCompany.id,
                          orNum,
                          currentTrainCalculationRevenue
                        )
                      }
                      className="py-1.5 px-3 text-sm bg-status-success hover:brightness-95"
                    >
                      OR {orNum}へ
                    </Button>
                  ))}
                </div>
              )}
              {(selectedCompany.trains || []).length === 0 && (
                <p className="text-center text-text-muted italic my-4">列車がありません。</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(selectedCompany.trains || []).map((train, index) => (
                  <TrainCard
                    key={train.id}
                    train={train}
                    index={index}
                    onUpdateTrainStops={(trainId, newStops) =>
                      handleUpdateTrainStops(selectedCompany.id, trainId, newStops)
                    }
                    onClearTrain={(trainId) => handleClearTrain(selectedCompany.id, trainId)}
                    onDeleteTrain={(trainId) => handleDeleteTrain(selectedCompany.id, trainId)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stock Holdings Section */}
        <div className="mb-8 p-4 bg-surface-muted rounded-lg">
          <Button
            type="button"
            onClick={() => setShowStockHoldings((s) => !s)}
            variant="ghost"
            className="flex justify-between items-center w-full mb-1 px-0 shadow-none"
          >
            <h3 className="text-xl font-semibold text-brand-primary">
              株式保有状況 ({getCompanyDisplayName(selectedCompany)})
            </h3>
            <span className="text-sm text-brand-accent">{showStockHoldings ? '▼' : '▶'}</span>
          </Button>
          {showStockHoldings && (
            <div className="space-y-2 mt-3">
              {players.map((player) => (
                <PercentageInputControl
                  key={player.id}
                  label={getPlayerDisplayName(player)}
                  value={
                    (selectedCompany.stockHoldings || []).find((sh) => sh.playerId === player.id)
                      ?.percentage || 0
                  }
                  onChange={(newPercentage) =>
                    handleStockHoldingChange(selectedCompany.id, player.id, newPercentage)
                  }
                />
              ))}
              {/* Treasury Stock Input */}
              <PercentageInputControl
                label="自社株 (Treasury)"
                value={selectedCompany.treasuryStockPercentage || 0}
                onChange={(newPercentage) =>
                  handleTreasuryStockChange(selectedCompany.id, newPercentage)
                }
              />
            </div>
          )}
        </div>

        <SectionHeader size="section" as="h3" className="mb-3 text-brand-primary">
          確認
        </SectionHeader>
        {/* Dividend Display */}
        {totalORRevenueForCompany > 0 &&
          ((selectedCompany.stockHoldings || []).filter((sh) => sh.percentage > 0).length > 0 ||
            (selectedCompany.treasuryStockPercentage || 0) > 0) && (
            <div className="mb-8 p-4 bg-brand-accent-soft rounded-lg">
              <Button
                type="button"
                onClick={() => setShowDividends((s) => !s)}
                variant="ghost"
                className="flex justify-between items-center w-full mb-1 px-0 shadow-none"
              >
                <h3 className="text-xl font-semibold text-brand-primary">
                  配当金 (全{numORs}OR合計より) ({getCompanyDisplayName(selectedCompany)})
                </h3>
                <span className="text-sm text-status-success">{showDividends ? '▼' : '▶'}</span>
              </Button>
              {showDividends && (
                <ul className="space-y-2 mt-3">
                  {(selectedCompany.stockHoldings || [])
                    .filter((sh) => sh.percentage > 0)
                    .map((sh) => {
                      const player = players.find((p) => p.id === sh.playerId);
                      if (!player) return null;
                      const dividend = calculateDividend(totalORRevenueForCompany, sh.percentage);
                      return (
                        <li
                          key={sh.playerId}
                          className="flex justify-between items-center p-2 bg-surface-elevated rounded-md shadow-sm"
                        >
                          <span className="font-medium text-text-secondary">
                            {getPlayerDisplayName(player)} ({sh.percentage}%):
                          </span>
                          <span className="font-semibold text-status-success">{dividend}</span>
                        </li>
                      );
                    })}
                  {(selectedCompany.treasuryStockPercentage || 0) > 0 && (
                    <li className="flex justify-between items-center p-2 bg-surface-elevated rounded-md shadow-sm">
                      <span className="font-medium text-text-secondary">
                        自社株 ({selectedCompany.treasuryStockPercentage}%):
                      </span>
                      <span className="font-semibold text-status-success">
                        {calculateDividend(
                          totalORRevenueForCompany,
                          selectedCompany.treasuryStockPercentage || 0
                        )}
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default CompanyDetailView;
