import {
  calculateTrainRevenue,
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateDividend,
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
});
