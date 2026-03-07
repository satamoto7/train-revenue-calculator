import {
  calculateORRevenueDistribution,
  calculateTrainRevenue,
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateDividend,
  splitHalfDividendRevenue,
} from './calc';

describe('calc utilities', () => {
  describe('calculateTrainRevenue', () => {
    test('地点収益の合計を返す', () => {
      expect(calculateTrainRevenue([10, 20, 30])).toBe(60);
    });

    test('数値文字列も安全に合計できる', () => {
      expect(calculateTrainRevenue(['10', '20', 30])).toBe(60);
    });

    test('不正値は0として扱う', () => {
      expect(calculateTrainRevenue([10, null, undefined, 'x', NaN])).toBe(10);
    });
  });

  describe('calculateCompanyTrainRevenue', () => {
    test('複数列車の合計収益を返す', () => {
      const trains = [
        { id: 't1', stops: [10, 20] },
        { id: 't2', stops: [30] },
      ];
      expect(calculateCompanyTrainRevenue(trains)).toBe(60);
    });

    test('stopsが欠けていても安全に0扱いする', () => {
      const trains = [{ id: 't1' }, { id: 't2', stops: [10] }];
      expect(calculateCompanyTrainRevenue(trains)).toBe(10);
    });
  });

  describe('calculateCompanyTotalORRevenue', () => {
    test('指定OR数までの収益を合計する', () => {
      const orRevenues = [
        { orNum: 1, revenue: 100 },
        { orNum: 2, revenue: 200 },
        { orNum: 3, revenue: 300 },
      ];
      expect(calculateCompanyTotalORRevenue(orRevenues, 2)).toBe(300);
    });

    test('収益が文字列でも安全に合計する', () => {
      const orRevenues = [
        { orNum: 1, revenue: '100' },
        { orNum: 2, revenue: '200' },
      ];
      expect(calculateCompanyTotalORRevenue(orRevenues, 2)).toBe(300);
    });

    test('OR番号が並び順と不一致でもOR番号ベースで合計する', () => {
      const orRevenues = [
        { orNum: 3, revenue: 300 },
        { orNum: 1, revenue: 100 },
        { orNum: 2, revenue: 200 },
      ];
      expect(calculateCompanyTotalORRevenue(orRevenues, 2)).toBe(300);
    });
  });

  describe('calculateDividend', () => {
    test('割合配当を切り捨てで返す', () => {
      expect(calculateDividend(355, 20)).toBe(71);
      expect(calculateDividend(355, 33)).toBe(117);
    });

    test('不正入力は0として扱う', () => {
      expect(calculateDividend('x', 50)).toBe(0);
      expect(calculateDividend(100, 'y')).toBe(0);
    });
  });

  describe('splitHalfDividendRevenue', () => {
    test('半配当時の配当分を10単位に切り上げる', () => {
      expect(splitHalfDividendRevenue(190)).toEqual({
        dividendRevenue: 100,
        retainedRevenue: 90,
      });
      expect(splitHalfDividendRevenue(200)).toEqual({
        dividendRevenue: 100,
        retainedRevenue: 100,
      });
    });
  });

  describe('calculateORRevenueDistribution', () => {
    const company = {
      stockHoldings: [{ playerId: 'p1', percentage: 60 }],
      treasuryStockPercentage: 10,
      bankPoolPercentage: 20,
    };
    const players = [{ id: 'p1' }, { id: 'p2' }];

    test('配当ではプレイヤー・自社株・市場株を配分する', () => {
      const result = calculateORRevenueDistribution({
        company,
        players,
        totalRevenue: 200,
        mode: 'full',
        bankPoolDividendRecipient: 'market',
      });

      expect(result.distributableRevenue).toBe(200);
      expect(result.playerPayouts).toEqual([{ playerId: 'p1', percentage: 60, amount: 120 }]);
      expect(result.treasury.amount).toBe(20);
      expect(result.marketAmount).toBe(40);
      expect(result.companyAmount).toBe(20);
    });

    test('無配では全収益を会社が受け取る', () => {
      const result = calculateORRevenueDistribution({
        company,
        players,
        totalRevenue: 200,
        mode: 'withhold',
      });

      expect(result.distributableRevenue).toBe(0);
      expect(result.playerPayouts).toEqual([{ playerId: 'p1', percentage: 60, amount: 0 }]);
      expect(result.marketAmount).toBe(0);
      expect(result.companyAmount).toBe(200);
    });

    test('市場株の受取先を会社にした場合は会社収入へ合算する', () => {
      const result = calculateORRevenueDistribution({
        company,
        players,
        totalRevenue: 190,
        mode: 'half',
        bankPoolDividendRecipient: 'company',
      });

      expect(result.distributableRevenue).toBe(100);
      expect(result.retainedRevenue).toBe(90);
      expect(result.marketAmount).toBe(0);
      expect(result.companyAmount).toBe(120);
    });

    test('企業定期収入は配当原資に含めず会社受取へ加算する', () => {
      const result = calculateORRevenueDistribution({
        company,
        players,
        totalRevenue: 100,
        companyIncome: 30,
        mode: 'full',
        bankPoolDividendRecipient: 'market',
      });

      expect(result.distributableRevenue).toBe(100);
      expect(result.companyIncome).toBe(30);
      expect(result.playerPayouts).toEqual([{ playerId: 'p1', percentage: 60, amount: 60 }]);
      expect(result.marketAmount).toBe(20);
      expect(result.companyAmount).toBe(40);
    });
  });
});
