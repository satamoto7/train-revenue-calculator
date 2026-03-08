import { describe, expect, test } from 'vitest';
import {
  buildCompaniesFromTemplate,
  GAME_TEMPLATE_OPTIONS,
  templateRequiresMergerRound,
} from './gameTemplates';

describe('gameTemplates', () => {
  test('公開会社テンプレート一覧を返す', () => {
    expect(GAME_TEMPLATE_OPTIONS).toEqual([
      { id: '18chesapeake', label: '18Chesapeake' },
      { id: '1830', label: '1830' },
      { id: '1846', label: '1846' },
      { id: '1889', label: '1889' },
      { id: 'lost-atlas', label: 'Railways of the Lost Atlas' },
      {
        id: 'lost-atlas-short',
        label: 'Railways of the Lost Atlas (Short Game)',
      },
    ]);
  });

  test('1830 テンプレートから公開会社一覧を生成する', () => {
    const companies = buildCompaniesFromTemplate('1830');

    expect(companies).toHaveLength(8);
    expect(companies[0]).toMatchObject({
      displayName: 'PRR',
      abbr: 'PRR',
      name: 'Pennsylvania Railroad',
      color: '#32763f',
      companyType: 'minor',
    });
    expect(companies[7]).toMatchObject({
      displayName: 'B&M',
      name: 'Boston & Maine Railroad',
      color: '#95c054',
    });
  });

  test('未知のテンプレートIDでは空配列を返す', () => {
    expect(buildCompaniesFromTemplate('unknown')).toEqual([]);
  });

  test('Railways of the Lost Atlas テンプレートは minor 12社と major 6社を生成する', () => {
    const companies = buildCompaniesFromTemplate('lost-atlas');

    expect(companies).toHaveLength(18);
    expect(companies.filter((company) => company.companyType === 'minor')).toHaveLength(12);
    expect(companies.filter((company) => company.companyType === 'major')).toHaveLength(6);
    expect(companies[0]).toMatchObject({
      displayName: 'Adaptive',
      name: 'Adaptive Company',
      companyType: 'minor',
    });
    expect(companies.at(-1)).toMatchObject({
      displayName: 'Experiment',
      name: 'Experiment',
      companyType: 'major',
    });
  });

  test('Railways of the Lost Atlas (Short Game) は対象 minor のみを含む', () => {
    const companies = buildCompaniesFromTemplate('lost-atlas-short');

    expect(companies).toHaveLength(14);
    expect(companies.map((company) => company.displayName)).not.toContain('Adaptive');
    expect(companies.map((company) => company.displayName)).toContain('Agricultural');
    expect(companies.filter((company) => company.companyType === 'major')).toHaveLength(6);
  });

  test('major を含むテンプレートだけ Merger Round を要求する', () => {
    expect(templateRequiresMergerRound('1830')).toBe(false);
    expect(templateRequiresMergerRound('lost-atlas')).toBe(true);
    expect(templateRequiresMergerRound('lost-atlas-short')).toBe(true);
  });
});
