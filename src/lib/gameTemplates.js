import { getDefaultCompanySymbol } from './labels';

const GAME_TEMPLATES = [
  {
    id: '18chesapeake',
    label: '18Chesapeake',
    companies: [
      { abbr: 'PRR', name: 'Pennsylvania Railroad', color: '#237333' },
      { abbr: 'PLE', name: 'Pittsburgh and Lake Erie Railroad', color: '#000000' },
      { abbr: 'SRR', name: 'Strasburg Rail Road', color: '#d81e3e' },
      { abbr: 'B&O', name: 'Baltimore & Ohio Railroad', color: '#0189d1' },
      { abbr: 'C&O', name: 'Chesapeake & Ohio Railroad', color: '#a2dced' },
      { abbr: 'LV', name: 'Lehigh Valley Railroad', color: '#fff500' },
      { abbr: 'C&A', name: 'Camden & Amboy Railroad', color: '#f48221' },
      { abbr: 'N&W', name: 'Norfolk & Western Railway', color: '#7b352a' },
    ],
  },
  {
    id: '1830',
    label: '1830',
    companies: [
      { abbr: 'PRR', name: 'Pennsylvania Railroad', color: '#32763f' },
      { abbr: 'NYC', name: 'New York Central Railroad', color: '#474548' },
      { abbr: 'CPR', name: 'Canadian Pacific Railroad', color: '#d1232a' },
      { abbr: 'B&O', name: 'Baltimore & Ohio Railroad', color: '#025aaa' },
      { abbr: 'C&O', name: 'Chesapeake & Ohio Railroad', color: '#add8e6' },
      { abbr: 'ERIE', name: 'Erie Railroad', color: '#fff500' },
      {
        abbr: 'NYNH',
        name: 'New York, New Haven & Hartford Railroad',
        color: '#d88e39',
      },
      { abbr: 'B&M', name: 'Boston & Maine Railroad', color: '#95c054' },
    ],
  },
  {
    id: '1846',
    label: '1846',
    companies: [
      { abbr: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000' },
      { abbr: 'NYC', name: 'New York Central Railroad', color: '#110a0c' },
      { abbr: 'B&O', name: 'Baltimore & Ohio Railroad', color: '#025aaa' },
      { abbr: 'C&O', name: 'Chesapeake & Ohio Railroad', color: '#add8e6' },
      { abbr: 'ERIE', name: 'Erie Railroad', color: '#fff500' },
      { abbr: 'GT', name: 'Grand Trunk Railway', color: '#f58121' },
      { abbr: 'IC', name: 'Illinois Central Railroad', color: '#32763f' },
    ],
  },
  {
    id: '1889',
    label: '1889',
    companies: [
      { abbr: 'AR', name: 'Awa Railroad', color: '#37383a' },
      { abbr: 'IR', name: 'Iyo Railway', color: '#f48221' },
      { abbr: 'SR', name: 'Sanuki Railway', color: '#76a042' },
      { abbr: 'KO', name: 'Takamatsu & Kotohira Electric Railway', color: '#d81e3e' },
      { abbr: 'TR', name: 'Tosa Electric Railway', color: '#00a993' },
      { abbr: 'KU', name: 'Tosa Kuroshio Railway', color: '#0189d1' },
      { abbr: 'UR', name: 'Uwajima Railway', color: '#6f533e' },
    ],
  },
  {
    id: 'lost-atlas',
    label: 'Railways of the Lost Atlas',
    companies: [
      {
        abbr: 'Adaptive',
        name: 'Adaptive Company',
        color: '#c9b7e7',
        companyType: 'minor',
      },
      {
        abbr: 'Agricultural',
        name: 'Agricultural Company',
        color: '#2f6d35',
        companyType: 'minor',
      },
      {
        abbr: 'Bridging',
        name: 'Bridging Company',
        color: '#56b7c5',
        companyType: 'minor',
      },
      {
        abbr: 'Eastern Mining',
        name: 'Eastern Mining Company',
        color: '#a37a47',
        companyType: 'minor',
      },
      {
        abbr: 'Expansive',
        name: 'Expansive Company',
        color: '#e89ac1',
        companyType: 'minor',
      },
      {
        abbr: 'Express',
        name: 'Express Company',
        color: '#d84a4a',
        companyType: 'minor',
      },
      {
        abbr: 'Northern Port',
        name: 'Northern Port Company',
        color: '#355c96',
        companyType: 'minor',
      },
      {
        abbr: 'Overnight',
        name: 'Overnight Company',
        color: '#4f3b31',
        companyType: 'minor',
      },
      {
        abbr: 'Resourceful',
        name: 'Resourceful Company',
        color: '#d8c5a7',
        companyType: 'minor',
      },
      {
        abbr: 'Spacious',
        name: 'Spacious Company',
        color: '#97c94c',
        companyType: 'minor',
      },
      {
        abbr: 'Suburban',
        name: 'Suburban Company',
        color: '#f2c8d5',
        companyType: 'minor',
      },
      {
        abbr: 'Tunneling',
        name: 'Tunneling Company',
        color: '#8f959c',
        companyType: 'minor',
      },
      { abbr: 'Consortium', name: 'Consortium', color: '#d76736', companyType: 'major' },
      { abbr: 'Union', name: 'Union', color: '#e59635', companyType: 'major' },
      { abbr: 'System', name: 'System', color: '#d8c757', companyType: 'major' },
      { abbr: 'Federation', name: 'Federation', color: '#4b8b4f', companyType: 'major' },
      {
        abbr: 'International',
        name: 'International',
        color: '#7bcad9',
        companyType: 'major',
      },
      { abbr: 'Experiment', name: 'Experiment', color: '#8154a8', companyType: 'major' },
    ],
  },
  {
    id: 'lost-atlas-short',
    label: 'Railways of the Lost Atlas (Short Game)',
    companies: [
      {
        abbr: 'Agricultural',
        name: 'Agricultural Company',
        color: '#2f6d35',
        companyType: 'minor',
      },
      {
        abbr: 'Eastern Mining',
        name: 'Eastern Mining Company',
        color: '#a37a47',
        companyType: 'minor',
      },
      {
        abbr: 'Expansive',
        name: 'Expansive Company',
        color: '#e89ac1',
        companyType: 'minor',
      },
      {
        abbr: 'Express',
        name: 'Express Company',
        color: '#d84a4a',
        companyType: 'minor',
      },
      {
        abbr: 'Northern Port',
        name: 'Northern Port Company',
        color: '#355c96',
        companyType: 'minor',
      },
      {
        abbr: 'Resourceful',
        name: 'Resourceful Company',
        color: '#d8c5a7',
        companyType: 'minor',
      },
      {
        abbr: 'Suburban',
        name: 'Suburban Company',
        color: '#f2c8d5',
        companyType: 'minor',
      },
      {
        abbr: 'Tunneling',
        name: 'Tunneling Company',
        color: '#8f959c',
        companyType: 'minor',
      },
      { abbr: 'Consortium', name: 'Consortium', color: '#d76736', companyType: 'major' },
      { abbr: 'Union', name: 'Union', color: '#e59635', companyType: 'major' },
      { abbr: 'System', name: 'System', color: '#d8c757', companyType: 'major' },
      { abbr: 'Federation', name: 'Federation', color: '#4b8b4f', companyType: 'major' },
      {
        abbr: 'International',
        name: 'International',
        color: '#7bcad9',
        companyType: 'major',
      },
      { abbr: 'Experiment', name: 'Experiment', color: '#8154a8', companyType: 'major' },
    ],
  },
];

const createTemplateCompanyId = (templateId, index) =>
  globalThis.crypto?.randomUUID?.() || `${templateId}-company-${index + 1}`;

const findGameTemplate = (templateId) => GAME_TEMPLATES.find((entry) => entry.id === templateId);

export const GAME_TEMPLATE_OPTIONS = GAME_TEMPLATES.map(({ id, label }) => ({
  id,
  label,
}));

export const templateRequiresMergerRound = (templateId) =>
  Boolean(
    findGameTemplate(templateId)?.companies.some((company) => company.companyType === 'major')
  );

export const buildCompaniesFromTemplate = (templateId) => {
  const template = findGameTemplate(templateId);
  if (!template) return [];

  return template.companies.map((company, index) => ({
    id: createTemplateCompanyId(template.id, index),
    name: company.name,
    displayName: company.abbr,
    abbr: company.abbr,
    genericIndex: index + 1,
    color: company.color,
    symbol: getDefaultCompanySymbol(index),
    companyType: company.companyType || 'minor',
  }));
};
